const express = require('express');
const Joi = require('joi');
const { Op, sequelize } = require('sequelize');
const { Class, User, School, Student } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createClassSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  grade: Joi.string().required(),
  section: Joi.string().min(1).max(10).required(),
  classTeacherId: Joi.string().uuid().optional(),
  maxStudents: Joi.number().integer().min(1).max(100).default(40),
  room: Joi.string().optional(),
  subjects: Joi.array().items(Joi.string()).default([])
});

const updateClassSchema = Joi.object({
  name: Joi.string().min(1).max(50).optional(),
  classTeacherId: Joi.string().uuid().optional(),
  maxStudents: Joi.number().integer().min(1).max(100).optional(),
  room: Joi.string().optional(),
  subjects: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional()
});

const timetableSchema = Joi.object({
  monday: Joi.array().items(Joi.object({
    period: Joi.number().integer().min(1).max(10).required(),
    subject: Joi.string().required(),
    teacher: Joi.string().required(),
    time: Joi.string().required()
  })).default([]),
  tuesday: Joi.array().items(Joi.object({
    period: Joi.number().integer().min(1).max(10).required(),
    subject: Joi.string().required(),
    teacher: Joi.string().required(),
    time: Joi.string().required()
  })).default([]),
  wednesday: Joi.array().items(Joi.object({
    period: Joi.number().integer().min(1).max(10).required(),
    subject: Joi.string().required(),
    teacher: Joi.string().required(),
    time: Joi.string().required()
  })).default([]),
  thursday: Joi.array().items(Joi.object({
    period: Joi.number().integer().min(1).max(10).required(),
    subject: Joi.string().required(),
    teacher: Joi.string().required(),
    time: Joi.string().required()
  })).default([]),
  friday: Joi.array().items(Joi.object({
    period: Joi.number().integer().min(1).max(10).required(),
    subject: Joi.string().required(),
    teacher: Joi.string().required(),
    time: Joi.string().required()
  })).default([]),
  saturday: Joi.array().items(Joi.object({
    period: Joi.number().integer().min(1).max(10).required(),
    subject: Joi.string().required(),
    teacher: Joi.string().required(),
    time: Joi.string().required()
  })).default([])
});

// Get all classes for a school
router.get('/', authenticate, schoolContext, async (req, res) => {
  try {
    const { page = 1, limit = 10, grade, search, active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      schoolId: req.user.schoolId || req.query.schoolId
    };

    // Filter by grade
    if (grade) {
      whereClause.grade = grade;
    }

    // Filter by active status
    if (active !== undefined) {
      whereClause.isActive = active === 'true';
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { grade: { [Op.iLike]: `%${search}%` } },
        { section: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: classes } = await Class.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['grade', 'ASC'], ['section', 'ASC']],
      include: [
        {
          model: User,
          as: 'classTeacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: Student,
          as: 'students',
          attributes: ['id'],
          required: false
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }
      ]
    });

    // Add student count to each class
    const classesWithCounts = classes.map(cls => ({
      ...cls.toJSON(),
      studentCount: cls.students ? cls.students.length : 0
    }));

    res.json({
      classes: classesWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class by ID
router.get('/:id', authenticate, schoolContext, async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'classTeacher',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false
        },
        {
          model: Student,
          as: 'students',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
            }
          ]
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check if user has access
    if (cls.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ class: cls });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Create new class
router.post('/', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { error, value } = createClassSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    // Check if class already exists
    const existingClass = await Class.findOne({
      where: {
        schoolId: req.user.schoolId,
        grade: value.grade,
        section: value.section
      }
    });

    if (existingClass) {
      return res.status(409).json({ error: 'Class with this grade and section already exists' });
    }

    // Validate class teacher if provided
    if (value.classTeacherId) {
      const teacher = await User.findOne({
        where: {
          id: value.classTeacherId,
          schoolId: req.user.schoolId,
          role: 'teacher',
          isActive: true
        }
      });

      if (!teacher) {
        return res.status(400).json({ error: 'Invalid class teacher ID' });
      }
    }

    const cls = await Class.create({
      ...value,
      schoolId: req.user.schoolId
    });

    // Fetch created class with associations
    const createdClass = await Class.findByPk(cls.id, {
      include: [
        {
          model: User,
          as: 'classTeacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      message: 'Class created successfully',
      class: createdClass
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class
router.put('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { error, value } = updateClassSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const cls = await Class.findByPk(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permissions
    if (cls.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate class teacher if provided
    if (value.classTeacherId) {
      const teacher = await User.findOne({
        where: {
          id: value.classTeacherId,
          schoolId: req.user.schoolId,
          role: 'teacher',
          isActive: true
        }
      });

      if (!teacher) {
        return res.status(400).json({ error: 'Invalid class teacher ID' });
      }
    }

    await cls.update(value);

    // Fetch updated class with associations
    const updatedClass = await Class.findByPk(cls.id, {
      include: [
        {
          model: User,
          as: 'classTeacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      message: 'Class updated successfully',
      class: updatedClass
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class
router.delete('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permissions
    if (cls.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if class has students
    const studentCount = await Student.count({
      where: { classId: cls.id, isActive: true }
    });

    if (studentCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete class with active students',
        studentCount 
      });
    }

    await cls.destroy();

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Get class timetable
router.get('/:id/timetable', authenticate, schoolContext, async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id, {
      attributes: ['id', 'name', 'grade', 'section', 'timetable']
    });

    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permissions
    if (cls.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ 
      class: {
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        section: cls.section
      },
      timetable: cls.timetable || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
      }
    });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Update class timetable
router.put('/:id/timetable', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { error, value } = timetableSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const cls = await Class.findByPk(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permissions
    if (cls.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Teachers can only update their own class timetable
    if (req.user.role === 'teacher' && cls.classTeacherId !== req.user.id) {
      return res.status(403).json({ error: 'Teachers can only update their own class timetable' });
    }

    await cls.update({ timetable: value });

    res.json({
      message: 'Timetable updated successfully',
      timetable: value
    });
  } catch (error) {
    console.error('Update timetable error:', error);
    res.status(500).json({ error: 'Failed to update timetable' });
  }
});

// Get class students
router.get('/:id/students', authenticate, schoolContext, async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check permissions
    if (cls.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const students = await Student.findAll({
      where: { classId: req.params.id, isActive: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth']
        }
      ],
      order: [['rollNumber', 'ASC']]
    });

    res.json({ students });
  } catch (error) {
    console.error('Get class students error:', error);
    res.status(500).json({ error: 'Failed to fetch class students' });
  }
});

module.exports = router;