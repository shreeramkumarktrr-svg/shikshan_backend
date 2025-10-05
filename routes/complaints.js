const express = require('express');
const { Op } = require('sequelize');
const { User, Complaint, ComplaintUpdate, School } = require('../models');
const { authenticate: auth } = require('../middleware/auth');

const router = express.Router();

// Get all complaints with filters
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      assignedTo,
      raisedBy,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply school filter based on user role
    if (req.user.role !== 'super_admin') {
      where.schoolId = req.user.schoolId;
    }

    // Apply role-based filters
    if (req.user.role === 'student') {
      where.raisedBy = req.user.id;
    } else if (req.user.role === 'parent') {
      // Parents can see complaints raised by them or their children
      const children = await User.findAll({
        where: { parentId: req.user.id, role: 'student' },
        attributes: ['id']
      });
      const childIds = children.map(child => child.id);
      where[Op.or] = [
        { raisedBy: req.user.id },
        { raisedBy: { [Op.in]: childIds } },
        { studentId: { [Op.in]: childIds } }
      ];
    }

    // Apply filters
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;
    if (raisedBy) where.raisedBy = raisedBy;

    // Search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: complaints } = await Complaint.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'complainant',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaints'
    });
  }
});

// Get single complaint with updates
router.get('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'complainant',
          attributes: ['id', 'firstName', 'lastName', 'role', 'email', 'phone']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'role', 'email']
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        },
        {
          model: ComplaintUpdate,
          as: 'updates',
          include: [
            {
              model: User,
              as: 'updater',
              attributes: ['id', 'firstName', 'lastName', 'role']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    // Check access permissions
    const canAccess =
      req.user.role === 'super_admin' ||
      complaint.schoolId === req.user.schoolId ||
      complaint.raisedBy === req.user.id ||
      complaint.assignedTo === req.user.id;

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Filter internal updates for students and parents
    if (['student', 'parent'].includes(req.user.role)) {
      complaint.updates = complaint.updates.filter(update => !update.isInternal);
    }

    res.json({
      success: true,
      data: { complaint }
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaint'
    });
  }
});

// Create new complaint
router.post('/', auth, async (req, res) => {
  try {
    console.log('🔄 Received complaint creation request');
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    const {
      title,
      description,
      category = 'other',
      priority = 'medium',
      studentId
    } = req.body;



    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    // Validate user has schoolId
    if (!req.user.schoolId) {
      return res.status(400).json({
        success: false,
        error: 'User must be associated with a school to create complaints'
      });
    }

    // Calculate SLA deadline based on priority
    const slaHours = {
      urgent: 4,
      high: 24,
      medium: 72,
      low: 168
    };
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours[priority]);

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority,
      schoolId: req.user.schoolId,
      raisedBy: req.user.id,
      studentId: studentId || (req.user.role === 'student' ? req.user.id : null),
      slaDeadline
    });

    // Create initial update
    await ComplaintUpdate.create({
      complaintId: complaint.id,
      updatedBy: req.user.id,
      updateType: 'comment',
      message: 'Complaint created'
    });

    // Auto-assign based on category and school hierarchy
    await autoAssignComplaint(complaint);

    const complaintWithDetails = await Complaint.findByPk(complaint.id, {
      include: [
        {
          model: User,
          as: 'complainant',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: { complaint: complaintWithDetails },
      message: 'Complaint created successfully'
    });
  } catch (error) {
    console.error('❌ Create complaint error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      sql: error.sql,
      original: error.original
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to create complaint',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update complaint status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, resolution, isInternal = false } = req.body;

    // Check if user can update status
    if (!['teacher', 'principal', 'school_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    // Check school access
    if (req.user.role !== 'super_admin' && complaint.schoolId !== req.user.schoolId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const previousStatus = complaint.status;
    const updateData = { status };

    // Set resolution details if resolving
    if (status === 'resolved' && resolution) {
      updateData.resolution = resolution;
      updateData.resolvedAt = new Date();
    }

    await complaint.update(updateData);

    // Create status update record
    await ComplaintUpdate.create({
      complaintId: complaint.id,
      updatedBy: req.user.id,
      updateType: 'status_change',
      message: resolution || `Status changed from ${previousStatus} to ${status}`,
      previousValue: previousStatus,
      newValue: status,
      isInternal
    });

    const updatedComplaint = await Complaint.findByPk(complaint.id, {
      include: [
        {
          model: User,
          as: 'complainant',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }
      ]
    });

    res.json({
      success: true,
      data: { complaint: updatedComplaint },
      message: 'Complaint status updated successfully'
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update complaint status'
    });
  }
});

// Add comment/update to complaint
router.post('/:id/updates', auth, async (req, res) => {
  try {
    const { message, isInternal = false } = req.body;

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    // Check access permissions
    const canUpdate =
      req.user.role === 'super_admin' ||
      complaint.schoolId === req.user.schoolId ||
      complaint.raisedBy === req.user.id ||
      complaint.assignedTo === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const update = await ComplaintUpdate.create({
      complaintId: complaint.id,
      updatedBy: req.user.id,
      updateType: 'comment',
      message,
      isInternal: isInternal && ['teacher', 'principal', 'school_admin', 'super_admin'].includes(req.user.role)
    });

    const updateWithDetails = await ComplaintUpdate.findByPk(update.id, {
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: { update: updateWithDetails },
      message: 'Update added successfully'
    });
  } catch (error) {
    console.error('Add complaint update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add update'
    });
  }
});

// Assign complaint
router.put('/:id/assign', auth, async (req, res) => {
  try {
    const { assignedTo } = req.body;

    // Check if user can assign complaints
    if (!['principal', 'school_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    // Check school access
    if (req.user.role !== 'super_admin' && complaint.schoolId !== req.user.schoolId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Verify assignee exists and belongs to same school
    const assignee = await User.findByPk(assignedTo);
    if (!assignee || (req.user.role !== 'super_admin' && assignee.schoolId !== req.user.schoolId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignee'
      });
    }

    const previousAssignee = complaint.assignedTo;
    await complaint.update({ assignedTo });

    // Create assignment update
    await ComplaintUpdate.create({
      complaintId: complaint.id,
      updatedBy: req.user.id,
      updateType: 'assignment',
      message: `Complaint assigned to ${assignee.firstName} ${assignee.lastName}`,
      previousValue: previousAssignee,
      newValue: assignedTo,
      isInternal: true
    });

    const updatedComplaint = await Complaint.findByPk(complaint.id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'role']
        }
      ]
    });

    res.json({
      success: true,
      data: { complaint: updatedComplaint },
      message: 'Complaint assigned successfully'
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign complaint'
    });
  }
});

// Get complaint statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const where = {};

    // Apply school filter based on user role
    if (req.user.role !== 'super_admin') {
      where.schoolId = req.user.schoolId;
    }

    // Apply role-based filters
    if (req.user.role === 'student') {
      where.raisedBy = req.user.id;
    } else if (req.user.role === 'teacher') {
      where.assignedTo = req.user.id;
    }

    const [
      totalComplaints,
      openComplaints,
      inProgressComplaints,
      resolvedComplaints,
      urgentComplaints
    ] = await Promise.all([
      Complaint.count({ where }),
      Complaint.count({ where: { ...where, status: 'open' } }),
      Complaint.count({ where: { ...where, status: 'in_progress' } }),
      Complaint.count({ where: { ...where, status: 'resolved' } }),
      Complaint.count({ where: { ...where, priority: 'urgent' } })
    ]);

    // Category breakdown
    const categoryStats = await Complaint.findAll({
      where,
      attributes: [
        'category',
        [Complaint.sequelize.fn('COUNT', Complaint.sequelize.col('id')), 'count']
      ],
      group: ['category']
    });

    res.json({
      success: true,
      data: {
        totalComplaints,
        openComplaints,
        inProgressComplaints,
        resolvedComplaints,
        urgentComplaints,
        categoryStats: categoryStats.map(stat => ({
          category: stat.category,
          count: parseInt(stat.dataValues.count)
        }))
      }
    });
  } catch (error) {
    console.error('Get complaint stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaint statistics'
    });
  }
});

// Auto-assignment helper function
async function autoAssignComplaint(complaint) {
  try {
    // Find appropriate assignee based on category and school hierarchy
    let assignee = null;

    // For academic complaints, try to assign to a teacher first
    if (complaint.category === 'academic') {
      assignee = await User.findOne({
        where: {
          schoolId: complaint.schoolId,
          role: 'teacher',
          isActive: true
        },
        order: [['createdAt', 'ASC']] // Round-robin style
      });
    }

    // If no teacher found or other categories, assign to principal
    if (!assignee) {
      assignee = await User.findOne({
        where: {
          schoolId: complaint.schoolId,
          role: 'principal',
          isActive: true
        }
      });
    }

    // If no principal, assign to school admin
    if (!assignee) {
      assignee = await User.findOne({
        where: {
          schoolId: complaint.schoolId,
          role: 'school_admin',
          isActive: true
        }
      });
    }

    if (assignee) {
      await complaint.update({ assignedTo: assignee.id });

      // Create assignment update - use the complaint creator as updatedBy for auto-assignment
      await ComplaintUpdate.create({
        complaintId: complaint.id,
        updatedBy: complaint.raisedBy,
        updateType: 'assignment',
        message: `Auto-assigned to ${assignee.firstName} ${assignee.lastName}`,
        newValue: assignee.id,
        isInternal: true
      });
    }
  } catch (error) {
    console.error('Auto-assignment error:', error);
  }
}

module.exports = router;