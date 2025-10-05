const express = require('express');
const Joi = require('joi');
const { Op, sequelize } = require('sequelize');
const { User, School, Student, Parent, Teacher, Class } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().min(10).max(15).required(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid('school_admin', 'principal', 'teacher', 'student', 'parent', 'finance_officer', 'support_staff').required(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  address: Joi.string().optional(),
  employeeId: Joi.string().optional(),
  subjects: Joi.array().items(Joi.string()).optional(),
  // Student specific fields
  classId: Joi.string().uuid().optional(),
  rollNumber: Joi.string().optional(),
  parentName: Joi.string().optional(),
  parentContact: Joi.string().min(10).max(15).optional(),
  parentEmail: Joi.string().email().optional(),
  // Teacher specific fields
  classTeacher: Joi.boolean().optional()
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().min(10).max(15).optional(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  address: Joi.string().optional(),
  employeeId: Joi.string().optional(),
  subjects: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional()
});

// Get all users for a school
router.get('/', authenticate, schoolContext, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      schoolId: req.user.schoolId || req.query.schoolId
    };

    // Filter by role - handle comma-separated roles
    if (role) {
      if (role.includes(',')) {
        // Multiple roles provided as comma-separated string
        const roles = role.split(',').map(r => r.trim());
        whereClause.role = { [Op.in]: roles };
      } else {
        // Single role
        whereClause.role = role;
      }
    }

    // Filter by active status
    if (active !== undefined) {
      whereClause.isActive = active === 'true';
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        },
        {
          model: Student,
          as: 'studentProfile',
          required: false,
          include: [
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'name', 'section']
            }
          ]
        },
        {
          model: Teacher,
          as: 'teacherProfile',
          required: false
        },
        {
          model: Parent,
          as: 'parentProfile',
          required: false
        }
      ]
    });

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticate, schoolContext, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        },
        {
          model: Student,
          as: 'studentProfile',
          required: false,
          include: [
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'name', 'grade', 'section']
            }
          ]
        },
        {
          model: Parent,
          as: 'parentProfile',
          required: false
        },
        {
          model: Teacher,
          as: 'teacherProfile',
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has access
    if (user.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: value.email },
          { phone: value.phone }
        ],
        schoolId: req.user.schoolId
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or phone already exists' });
    }

    // Generate default password if not provided
    const password = value.password || `${value.firstName.toLowerCase()}123`;

    const user = await User.create({
      ...value,
      passwordHash: password, // Will be hashed by the model hook
      schoolId: req.user.schoolId
    });

    // Create role-specific profile
    if (value.role === 'student') {
      const studentData = {
        userId: user.id,
        classId: value.classId,
        rollNumber: value.rollNumber || `${Date.now()}`,
        admissionNumber: `ADM${Date.now()}`,
        admissionDate: new Date(),
        isActive: true
      };

      const student = await Student.create(studentData);

      // Create parent profile if parent information is provided
      if (value.parentName && value.parentContact) {
        const parentUser = await User.create({
          firstName: value.parentName.split(' ')[0] || value.parentName,
          lastName: value.parentName.split(' ').slice(1).join(' ') || '',
          email: value.parentEmail,
          phone: value.parentContact,
          role: 'parent',
          schoolId: req.user.schoolId,
          passwordHash: `${value.parentName.toLowerCase().replace(/\s+/g, '')}123`
        });

        await Parent.create({
          userId: parentUser.id
        });

        // Link parent to student (you may need to create a junction table)
        // This depends on your database schema
      }
    } else if (value.role === 'parent') {
      await Parent.create({
        userId: user.id
      });
    } else if (value.role === 'teacher') {
      await Teacher.create({
        userId: user.id,
        specialization: value.subjects || [],
        isClassTeacher: value.classTeacher || false
      });

      // If teacher is assigned as class teacher, update the class
      if (value.classTeacher && value.classId) {
        await Class.update(
          { classTeacherId: user.id },
          { where: { id: value.classId } }
        );
      }
    }

    // Fetch created user without password
    const createdUser = await User.findByPk(user.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      message: 'User created successfully',
      user: createdUser,
      defaultPassword: password
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticate, schoolContext, async (req, res) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    if (user.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only admin or the user themselves can update
    if (user.id !== req.user.id && !['super_admin', 'school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await user.update(value);

    // Fetch updated user without password
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (deactivate)
router.delete('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    if (user.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cannot delete super admin or self
    if (user.role === 'super_admin' || user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete this user' });
    }

    // Deactivate instead of hard delete
    await user.update({ isActive: false });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Change user password
router.put('/:id/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    if (user.id !== req.user.id && !['super_admin', 'school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Verify current password if user is changing their own password
    if (user.id === req.user.id && currentPassword) {
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    await user.update({ passwordHash: newPassword }); // Will be hashed by the model hook

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user statistics
router.get('/stats/summary', authenticate, schoolContext, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.query.schoolId;

    const stats = await User.findAll({
      where: { schoolId, isActive: true },
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    const totalUsers = await User.count({
      where: { schoolId, isActive: true }
    });

    const inactiveUsers = await User.count({
      where: { schoolId, isActive: false }
    });

    res.json({
      totalUsers,
      inactiveUsers,
      usersByRole: stats.reduce((acc, curr) => {
        acc[curr.role] = parseInt(curr.count);
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Alias for stats endpoint (for compatibility)
router.get('/stats', authenticate, schoolContext, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.query.schoolId;

    const stats = await User.findAll({
      where: { schoolId, isActive: true },
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    const totalUsers = await User.count({
      where: { schoolId, isActive: true }
    });

    const inactiveUsers = await User.count({
      where: { schoolId, isActive: false }
    });

    res.json({
      totalUsers,
      inactiveUsers,
      usersByRole: stats.reduce((acc, curr) => {
        acc[curr.role] = parseInt(curr.count);
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Bulk create users
router.post('/bulk', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Users array is required' });
    }

    const results = {
      created: [],
      errors: []
    };

    for (let i = 0; i < users.length; i++) {
      try {
        const userData = users[i];
        
        // Validate each user
        const { error, value } = createUserSchema.validate(userData);
        if (error) {
          results.errors.push({
            row: i + 1,
            data: userData,
            error: error.details.map(d => d.message).join(', ')
          });
          continue;
        }

        // Check if user already exists
        const existingUser = await User.findOne({
          where: {
            [Op.or]: [
              { email: value.email },
              { phone: value.phone }
            ],
            schoolId: req.user.schoolId
          }
        });

        if (existingUser) {
          results.errors.push({
            row: i + 1,
            data: userData,
            error: 'User with this email or phone already exists'
          });
          continue;
        }

        // Generate default password
        const password = value.password || `${value.firstName.toLowerCase()}123`;

        const user = await User.create({
          ...value,
          passwordHash: password,
          schoolId: req.user.schoolId
        });

        // Create role-specific profile
        if (value.role === 'student') {
          await Student.create({ userId: user.id });
        } else if (value.role === 'parent') {
          await Parent.create({ userId: user.id });
        } else if (value.role === 'teacher') {
          await Teacher.create({
            userId: user.id,
            specialization: value.subjects || []
          });
        }

        results.created.push({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          defaultPassword: password
        });

      } catch (error) {
        results.errors.push({
          row: i + 1,
          data: users[i],
          error: error.message
        });
      }
    }

    res.status(201).json({
      message: `Bulk import completed. ${results.created.length} users created, ${results.errors.length} errors.`,
      results
    });

  } catch (error) {
    console.error('Bulk create users error:', error);
    res.status(500).json({ error: 'Failed to create users' });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    if (user.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate new password
    const newPassword = `${user.firstName.toLowerCase()}123`;
    await user.update({ passwordHash: newPassword });

    res.json({ 
      message: 'Password reset successfully',
      newPassword 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Activate/Deactivate user
router.patch('/:id/status', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    if (user.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Cannot deactivate super admin or self
    if (!isActive && (user.role === 'super_admin' || user.id === req.user.id)) {
      return res.status(400).json({ error: 'Cannot deactivate this user' });
    }

    await user.update({ isActive });

    res.json({ 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get users by role
router.get('/role/:role', authenticate, schoolContext, async (req, res) => {
  try {
    const { role } = req.params;
    const { active = 'true' } = req.query;

    const users = await User.findAll({
      where: {
        schoolId: req.user.schoolId,
        role,
        isActive: active === 'true'
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
      order: [['firstName', 'ASC']]
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user activity log
router.get('/:id/activity', authenticate, schoolContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, dateFrom, dateTo, limit = 20 } = req.query;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    if (user.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For now, return mock activity data since we don't have an activity log table
    // In a real implementation, you would create an ActivityLog model and store actual activities
    const mockActivities = [
      {
        id: 1,
        action: 'login',
        description: 'User logged in',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: 'Mumbai, India',
        metadata: {},
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        id: 2,
        action: 'profile_update',
        description: 'Updated profile information',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: 'Mumbai, India',
        metadata: { fields: ['phone', 'address'] },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        id: 3,
        action: 'password_change',
        description: 'Changed password',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        location: 'Mumbai, India',
        metadata: {},
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      }
    ];

    // Filter by action if specified
    let activities = mockActivities;
    if (action) {
      activities = activities.filter(a => a.action === action);
    }

    // Filter by date range if specified
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      activities = activities.filter(a => new Date(a.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      activities = activities.filter(a => new Date(a.createdAt) <= toDate);
    }

    // Limit results
    activities = activities.slice(0, parseInt(limit));

    res.json({ activities });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

module.exports = router;