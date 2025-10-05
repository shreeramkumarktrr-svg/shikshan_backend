const express = require('express');
const Joi = require('joi');
const { Op, sequelize } = require('sequelize');
const { School, User } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createSchoolSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10).max(15).optional(),
  address: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
  subscriptionPlan: Joi.string().valid('basic', 'standard', 'premium').default('basic'),
  maxStudents: Joi.number().integer().min(10).default(100),
  maxTeachers: Joi.number().integer().min(1).default(10)
});

const updateSchoolSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().min(10).max(15).optional(),
  address: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
  academicYear: Joi.string().optional(),
  timezone: Joi.string().optional(),
  locale: Joi.string().optional(),
  currency: Joi.string().optional(),
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

    // Set trial expiration (30 days from now)
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

    const school = await School.create({
      ...value,
      subscriptionStatus: 'trial',
      subscriptionExpiresAt: trialExpiresAt
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
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    await school.update(value);

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
    const { subscriptionStatus, subscriptionPlan, subscriptionExpiresAt, maxStudents, maxTeachers } = req.body;

    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const updateData = {};
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
    if (subscriptionPlan) updateData.subscriptionPlan = subscriptionPlan;
    if (subscriptionExpiresAt) updateData.subscriptionExpiresAt = subscriptionExpiresAt;
    if (maxStudents) updateData.maxStudents = maxStudents;
    if (maxTeachers) updateData.maxTeachers = maxTeachers;

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

// Get school statistics
router.get('/:id/stats', authenticate, schoolContext, async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get user counts
    const userCounts = await User.findAll({
      where: { schoolId: req.params.id, isActive: true },
      attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['role'],
      raw: true
    });

    const stats = {
      users: userCounts.reduce((acc, curr) => {
        acc[curr.role] = parseInt(curr.count);
        return acc;
      }, {}),
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
    res.status(500).json({ error: 'Failed to fetch school statistics' });
  }
});

module.exports = router;