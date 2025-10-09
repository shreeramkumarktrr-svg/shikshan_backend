const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { School, User, Subscription, sequelize } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');
const { getSchoolFeatures } = require('../middleware/featureAccess');

const router = express.Router();

// Validation schemas
const createSchoolSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10).max(15).optional(),
  address: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
  subscriptionId: Joi.string().uuid().required(),
  maxStudents: Joi.number().integer().min(10).default(100),
  maxTeachers: Joi.number().integer().min(1).default(10)
});

const updateSchoolSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().min(10).max(15).optional().allow(''),
  address: Joi.string().optional().allow(''),
  website: Joi.alternatives().try(
    Joi.string().uri(),
    Joi.string().allow('')
  ).optional(),
  establishedYear: Joi.alternatives().try(
    Joi.number().integer().min(1800).max(new Date().getFullYear()),
    Joi.string().allow(''),
    Joi.allow(null)
  ).optional(),
  academicYear: Joi.string().optional().allow(''),
  timezone: Joi.string().optional().allow(''),
  locale: Joi.string().optional().allow(''),
  currency: Joi.string().optional().allow(''),
  settings: Joi.object().optional()
});

// Get all schools (Super Admin only)
router.get('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status) {
      whereClause.subscriptionStatus = status;
    }

    const { count, rows: schools } = await School.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'role'],
          where: { isActive: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'name', 'planType', 'price', 'currency', 'billingCycle'],
          required: false
        }
      ]
    });

    // Add user counts
    const schoolsWithCounts = schools.map(school => ({
      ...school.toJSON(),
      userCounts: {
        total: school.users.length,
        admins: school.users.filter(u => ['school_admin', 'principal'].includes(u.role)).length,
        teachers: school.users.filter(u => u.role === 'teacher').length,
        students: school.users.filter(u => u.role === 'student').length,
        parents: school.users.filter(u => u.role === 'parent').length
      }
    }));

    res.json({
      schools: schoolsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// Create new school (Super Admin only)
router.post('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { error, value } = createSchoolSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    // Check if school with email already exists
    const existingSchool = await School.findOne({
      where: { email: value.email }
    });

    if (existingSchool) {
      return res.status(409).json({ error: 'School with this email already exists' });
    }

    // Verify subscription exists
    const subscription = await Subscription.findByPk(value.subscriptionId);
    if (!subscription) {
      return res.status(400).json({ error: 'Invalid subscription plan selected' });
    }

    // Set trial expiration based on subscription trial days
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + subscription.trialDays);

    const school = await School.create({
      ...value,
      subscriptionPlan: subscription.planType,
      subscriptionStatus: 'trial',
      subscriptionExpiresAt: trialExpiresAt,
      maxStudents: subscription.maxStudents,
      maxTeachers: subscription.maxTeachers
    });

    res.status(201).json({
      message: 'School created successfully',
      school
    });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// Get school by ID
router.get('/:id', authenticate, schoolContext, async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'isActive'],
          where: { isActive: true },
          required: false
        },
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'name', 'planType', 'price', 'currency', 'billingCycle', 'features'],
          required: false
        }
      ]
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Add user counts
    const userCounts = {
      total: school.users.length,
      admins: school.users.filter(u => ['school_admin', 'principal'].includes(u.role)).length,
      teachers: school.users.filter(u => u.role === 'teacher').length,
      students: school.users.filter(u => u.role === 'student').length,
      parents: school.users.filter(u => u.role === 'parent').length
    };

    res.json({
      school: {
        ...school.toJSON(),
        userCounts
      }
    });
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

// Update school
router.put('/:id', authenticate, schoolContext, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { error, value } = updateSchoolSchema.validate(req.body);
    if (error) {return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message),
        receivedData: req.body
      });
    }

    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Clean the data before updating
    const updateData = {};
    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        if (key === 'establishedYear') {
          // Handle establishedYear specifically
          if (value[key] === '' || value[key] === null) {
            updateData[key] = null;
          } else {
            updateData[key] = parseInt(value[key]);
          }
        } else if (value[key] !== '') {
          updateData[key] = value[key];
        }
      }
    });
    
    console.log('Cleaned update data:', updateData);
    
    try {
      await school.update(updateData);
      } catch (dbError) {
      console.error('Database update error:', dbError);
      return res.status(400).json({ 
        error: 'Database update failed', 
        details: dbError.message,
        field: dbError.path || 'unknown'
      });
    }

    res.json({
      message: 'School updated successfully',
      school
    });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// Update school subscription (Super Admin only)
router.put('/:id/subscription', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { subscriptionStatus, subscriptionId, subscriptionExpiresAt, maxStudents, maxTeachers } = req.body;

    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const updateData = {};
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
    if (subscriptionExpiresAt) updateData.subscriptionExpiresAt = subscriptionExpiresAt;
    if (maxStudents) updateData.maxStudents = maxStudents;
    if (maxTeachers) updateData.maxTeachers = maxTeachers;

    // If subscriptionId is provided, update subscription details
    if (subscriptionId) {
      const subscription = await Subscription.findByPk(subscriptionId);
      if (!subscription) {
        return res.status(400).json({ error: 'Invalid subscription plan selected' });
      }
      
      updateData.subscriptionId = subscriptionId;
      updateData.subscriptionPlan = subscription.planType;
      updateData.maxStudents = subscription.maxStudents;
      updateData.maxTeachers = subscription.maxTeachers;
    }

    await school.update(updateData);

    res.json({
      message: 'School subscription updated successfully',
      school
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Deactivate school (Super Admin only)
router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    await school.update({ isActive: false });

    // Also deactivate all users in the school
    await User.update(
      { isActive: false },
      { where: { schoolId: req.params.id } }
    );

    res.json({
      message: 'School deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate school error:', error);
    res.status(500).json({ error: 'Failed to deactivate school' });
  }
});

// Duplicate route removed - using the one with proper middleware below

// Get school statistics
router.get('/:id/stats', authenticate, schoolContext, async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get user counts one by one to isolate any issues
    let studentCount = 0;
    let teacherCount = 0;
    let parentCount = 0;
    let adminCount = 0;
    let principalCount = 0;

    try {
      studentCount = await User.count({ 
        where: { schoolId: req.params.id, role: 'student', isActive: true } 
      });
      console.log('Student count:', studentCount);
    } catch (error) {
      console.error('Error counting students:', error);
    }

    try {
      teacherCount = await User.count({ 
        where: { schoolId: req.params.id, role: 'teacher', isActive: true } 
      });
      console.log('Teacher count:', teacherCount);
    } catch (error) {
      console.error('Error counting teachers:', error);
    }

    try {
      parentCount = await User.count({ 
        where: { schoolId: req.params.id, role: 'parent', isActive: true } 
      });
      console.log('Parent count:', parentCount);
    } catch (error) {
      console.error('Error counting parents:', error);
    }

    try {
      adminCount = await User.count({ 
        where: { schoolId: req.params.id, role: 'school_admin', isActive: true } 
      });
      console.log('Admin count:', adminCount);
    } catch (error) {
      console.error('Error counting admins:', error);
    }

    try {
      principalCount = await User.count({ 
        where: { schoolId: req.params.id, role: 'principal', isActive: true } 
      });
      console.log('Principal count:', principalCount);
    } catch (error) {
      console.error('Error counting principals:', error);
    }

    const stats = {
      users: {
        student: studentCount,
        teacher: teacherCount,
        parent: parentCount,
        school_admin: adminCount + principalCount,
        total: studentCount + teacherCount + parentCount + adminCount + principalCount
      },
      subscription: {
        status: school.subscriptionStatus,
        plan: school.subscriptionPlan,
        expiresAt: school.subscriptionExpiresAt,
        maxStudents: school.maxStudents,
        maxTeachers: school.maxTeachers
      }
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get school stats error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch school statistics',
      details: error.message 
    });
  }
});

// Get school features and subscription details
router.get('/:id/features', authenticate, schoolContext, async (req, res) => {
  try {
    const features = await getSchoolFeatures(req.params.id);
    res.json({ features });
  } catch (error) {
    console.error('Get school features error:', error);
    res.status(500).json({ error: 'Failed to fetch school features' });
  }
});

module.exports = router;