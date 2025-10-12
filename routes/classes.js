const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { sequelize, Class, User, School, Student } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');
const { enforceTenancy } = require('../middleware/tenancy');

const router = express.Router();

/* ------------------------ Validation Schemas ------------------------ */

// Class creation schema
const createClassSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  grade: Joi.string().trim().required(),
  section: Joi.string().trim().min(1).max(10).required(),
  classTeacherId: Joi.string().uuid().allow(null, '').empty('').optional(),
  maxStudents: Joi.number().integer().min(1).max(100).default(40),
  room: Joi.string().trim().allow(null, '').empty('').optional(),
  subjects: Joi.array().items(Joi.string()).default([])
});

// Class update schema
const updateClassSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).optional(),
  classTeacherId: Joi.string().uuid().allow(null, '').empty('').optional(),
  maxStudents: Joi.number().integer().min(1).max(100).optional(),
  room: Joi.string().trim().allow(null, '').empty('').optional(),
  subjects: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional()
});

// Timetable schema generator
const daySchema = Joi.array().items(
  Joi.object({
    period: Joi.number().integer().min(1).max(10).required(),
    subject: Joi.string().required(),
    teacher: Joi.string().required(),
    time: Joi.string().required()
  })
);

const timetableSchema = Joi.object(
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    .reduce((acc, day) => ({ ...acc, [day]: daySchema.default([]) }), {})
);

/* ------------------------ Helper ------------------------ */
const hasAccess = (user, cls) =>
  user.role === 'super_admin' || user.schoolId === cls.schoolId;

/* ------------------------ Routes ------------------------ */

// GET all classes
router.get('/', authenticate, enforceTenancy, schoolContext, async (req, res) => {
  try {
    const { page = 1, limit = 10, grade, search, active } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = {
      schoolId: req.user.schoolId || req.query.schoolId
    };

    if (grade) whereClause.grade = grade;
    if (active !== undefined && active !== '') whereClause.isActive = active === 'true';

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { grade: { [Op.iLike]: `%${search}%` } },
        { section: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: classes } = await Class.findAndCountAll({
      where: whereClause,
      limit: limitNum,
      offset,
      order: [['grade', 'ASC'], ['section', 'ASC']],
      include: [
        { model: User, as: 'classTeacher', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: Student, as: 'students', attributes: ['id'], required: false },
        { model: School, as: 'school', attributes: ['id', 'name'] }
      ]
    });

    const classesWithCounts = classes.map(cls => ({
      ...cls.toJSON(),
      studentCount: cls.students ? cls.students.length : 0
    }));

    res.json({
      classes: classesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        pages: Math.ceil(count / limitNum)
      }
    });
  } catch (error) {
    console.error('Get classes error:', error.message, error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// GET class by ID
router.get('/:id', authenticate, schoolContext, async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id, {
      include: [
        { model: User, as: 'classTeacher', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'], required: false },
        { model: Student, as: 'students', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }] },
        { model: School, as: 'school', attributes: ['id', 'name'] }
      ]
    });

    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (!hasAccess(req.user, cls)) return res.status(403).json({ error: 'Access denied' });

    res.json({ class: cls });
  } catch (error) {
    console.error('Get class error:', error.message, error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// CREATE new class
router.post('/', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { error, value } = createClassSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

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

    if (value.classTeacherId) {
      const teacher = await User.findOne({
        where: {
          id: value.classTeacherId,
          schoolId: req.user.schoolId,
          role: 'teacher',
          isActive: true
        }
      });
      if (!teacher) return res.status(400).json({ error: 'Invalid class teacher ID' });
    }

    const cls = await Class.create({ ...value, schoolId: req.user.schoolId });

    const createdClass = await Class.findByPk(cls.id, {
      include: [
        { model: User, as: 'classTeacher', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: School, as: 'school', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      message: 'Class created successfully',
      data: createdClass
    });
  } catch (error) {
    console.error('Create class error:', error.message, error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// UPDATE class
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
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (!hasAccess(req.user, cls)) return res.status(403).json({ error: 'Access denied' });

    // Handle teacher change or removal
    if (value.hasOwnProperty('classTeacherId')) {
      if (value.classTeacherId) {
        const teacher = await User.findOne({
          where: {
            id: value.classTeacherId,
            schoolId: req.user.schoolId,
            role: 'teacher',
            isActive: true
          }
        });
        if (!teacher) return res.status(400).json({ error: 'Invalid class teacher ID' });
      } else {
        value.classTeacherId = null;
      }
    }

    await cls.update(value);

    const updatedClass = await Class.findByPk(cls.id, {
      include: [
        { model: User, as: 'classTeacher', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: School, as: 'school', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      message: 'Class updated successfully',
      data: updatedClass
    });
  } catch (error) {
    console.error('Update class error:', error.message, error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// DELETE class
router.delete('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (!hasAccess(req.user, cls)) return res.status(403).json({ error: 'Access denied' });

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
    console.error('Delete class error:', error.message, error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// GET class timetable
router.get('/:id/timetable', authenticate, schoolContext, async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id, {
      attributes: ['id', 'name', 'grade', 'section', 'timetable', 'schoolId']
    });

    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (!hasAccess(req.user, cls)) return res.status(403).json({ error: 'Access denied' });

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
    console.error('Get timetable error:', error.message, error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// UPDATE class timetable
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
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (!hasAccess(req.user, cls)) return res.status(403).json({ error: 'Access denied' });

    if (req.user.role === 'teacher' && cls.classTeacherId !== req.user.id) {
      return res.status(403).json({ error: 'Teachers can only update their own class timetable' });
    }

    await cls.update({ timetable: value });

    res.json({
      message: 'Timetable updated successfully',
      data: value
    });
  } catch (error) {
    console.error('Update timetable error:', error.message, error);
    res.status(500).json({ error: 'Failed to update timetable' });
  }
});

// GET class students
router.get('/:id/students', authenticate, schoolContext, async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (!hasAccess(req.user, cls)) return res.status(403).json({ error: 'Access denied' });

    const students = await Student.findAll({
      where: { classId: req.params.id, isActive: true },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'dateOfBirth'] }
      ],
      order: [['rollNumber', 'ASC']]
    });

    res.json({ students });
  } catch (error) {
    console.error('Get class students error:', error.message, error);
    res.status(500).json({ error: 'Failed to fetch class students' });
  }
});

module.exports = router;
