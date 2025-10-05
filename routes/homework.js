const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Homework, HomeworkSubmission, User, Class, Student, School } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');
const { checkFeatureAccess } = require('../middleware/featureAccess');

const router = express.Router();

// Validation schemas
const createHomeworkSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional(),
  instructions: Joi.string().optional(),
  subject: Joi.string().min(1).max(100).required(),
  classId: Joi.string().uuid().optional(),
  assignedDate: Joi.date().optional(),
  dueDate: Joi.date().required(),
  maxMarks: Joi.number().integer().min(1).max(1000).default(100),
  attachments: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    url: Joi.string().uri().required(),
    type: Joi.string().required(),
    size: Joi.number().integer().min(0).required()
  })).default([]),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  type: Joi.string().valid('assignment', 'project', 'reading', 'practice', 'research').default('assignment'),
  allowLateSubmission: Joi.boolean().default(true),
  submissionFormat: Joi.string().valid('text', 'file', 'both').default('both'),
  isPublished: Joi.boolean().default(false)
});

const updateHomeworkSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().optional(),
  instructions: Joi.string().optional(),
  subject: Joi.string().min(1).max(100).optional(),
  dueDate: Joi.date().optional(),
  maxMarks: Joi.number().integer().min(1).max(1000).optional(),
  attachments: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    url: Joi.string().uri().required(),
    type: Joi.string().required(),
    size: Joi.number().integer().min(0).required()
  })).optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  type: Joi.string().valid('assignment', 'project', 'reading', 'practice', 'research').optional(),
  allowLateSubmission: Joi.boolean().optional(),
  submissionFormat: Joi.string().valid('text', 'file', 'both').optional(),
  isPublished: Joi.boolean().optional()
});

const submitHomeworkSchema = Joi.object({
  submissionText: Joi.string().optional(),
  attachments: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    url: Joi.string().uri().required(),
    type: Joi.string().required(),
    size: Joi.number().integer().min(0).required()
  })).default([])
});

const gradeHomeworkSchema = Joi.object({
  marksObtained: Joi.number().integer().min(0).required(),
  feedback: Joi.string().optional()
});

// Get all homework for a school/class
router.get('/', authenticate, schoolContext, checkFeatureAccess('homework'), async (req, res) => {
  try {
    const { page = 1, limit = 10, classId, subject, type, priority, status, studentId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      schoolId: req.user.schoolId || req.query.schoolId
    };

    // Filter by class
    if (classId) {
      whereClause.classId = classId;
    }

    // Filter by subject
    if (subject) {
      whereClause.subject = subject;
    }

    // Filter by type
    if (type) {
      whereClause.type = type;
    }

    // Filter by priority
    if (priority) {
      whereClause.priority = priority;
    }

    // Role-based filtering
    if (req.user.role === 'teacher') {
      whereClause.teacherId = req.user.id;
    } else if (req.user.role === 'student') {
      // Get student's class
      const student = await Student.findOne({
        where: { userId: req.user.id },
        include: [{ model: Class, as: 'class' }]
      });
      if (student) {
        whereClause.classId = student.classId;
        whereClause.isPublished = true;
      }
    } else if (req.user.role === 'parent') {
      // Get parent's children's classes
      const children = await Student.findAll({
        include: [{
          model: User,
          as: 'parents',
          where: { id: req.user.id }
        }]
      });
      if (children.length > 0) {
        whereClause.classId = { [Op.in]: children.map(child => child.classId) };
        whereClause.isPublished = true;
      }
    }

    // For students and parents, only show published homework
    if (['student', 'parent'].includes(req.user.role)) {
      whereClause.isPublished = true;
    }

    const includeArray = [
      {
        model: User,
        as: 'teacher',
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: Class,
        as: 'class',
        attributes: ['id', 'name', 'grade', 'section']
      }
    ];

    // Include submissions for specific student or if user is student
    if (studentId || req.user.role === 'student') {
      const submissionWhere = {};
      if (studentId) {
        submissionWhere.studentId = studentId;
      } else if (req.user.role === 'student') {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (student) {
          submissionWhere.studentId = student.id;
        }
      }

      includeArray.push({
        model: HomeworkSubmission,
        as: 'submissions',
        where: submissionWhere,
        required: false,
        include: [{
          model: Student,
          as: 'student',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }]
        }]
      });
    }

    const { count, rows: homework } = await Homework.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['dueDate', 'ASC'], ['createdAt', 'DESC']],
      include: includeArray
    });

    res.json({
      homework,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get homework error:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// Get homework statistics
router.get('/stats/overview', authenticate, schoolContext, checkFeatureAccess('homework'), async (req, res) => {
  try {
    const { classId } = req.query;
    
    const whereClause = {
      schoolId: req.user.schoolId || req.query.schoolId
    };

    if (classId) {
      whereClause.classId = classId;
    }

    // Role-based filtering
    if (req.user.role === 'teacher') {
      whereClause.teacherId = req.user.id;
    }

    const totalHomework = await Homework.count({ where: whereClause });
    const publishedHomework = await Homework.count({ 
      where: { ...whereClause, isPublished: true } 
    });
    const overdueHomework = await Homework.count({
      where: {
        ...whereClause,
        dueDate: { [Op.lt]: new Date() },
        isPublished: true
      }
    });

    const totalSubmissions = await HomeworkSubmission.count({
      include: [{
        model: Homework,
        as: 'homework',
        where: whereClause
      }]
    });

    const gradedSubmissions = await HomeworkSubmission.count({
      where: { status: 'graded' },
      include: [{
        model: Homework,
        as: 'homework',
        where: whereClause
      }]
    });

    res.json({
      totalHomework,
      publishedHomework,
      overdueHomework,
      totalSubmissions,
      gradedSubmissions,
      pendingGrading: totalSubmissions - gradedSubmissions
    });
  } catch (error) {
    console.error('Get homework stats error:', error);
    res.status(500).json({ error: 'Failed to fetch homework statistics' });
  }
});

// Get homework by ID
router.get('/:id', authenticate, schoolContext, checkFeatureAccess('homework'), async (req, res) => {
  try {
    const homework = await Homework.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section']
        },
        {
          model: HomeworkSubmission,
          as: 'submissions',
          include: [
            {
              model: Student,
              as: 'student',
              include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName']
              }]
            },
            {
              model: User,
              as: 'grader',
              attributes: ['id', 'firstName', 'lastName'],
              required: false
            }
          ]
        }
      ]
    });

    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    // Check access permissions
    if (homework.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Filter submissions based on role
    if (req.user.role === 'student') {
      const student = await Student.findOne({ where: { userId: req.user.id } });
      if (student) {
        homework.submissions = homework.submissions.filter(sub => sub.studentId === student.id);
      }
    } else if (req.user.role === 'parent') {
      const children = await Student.findAll({
        include: [{
          model: User,
          as: 'parents',
          where: { id: req.user.id }
        }]
      });
      const childrenIds = children.map(child => child.id);
      homework.submissions = homework.submissions.filter(sub => childrenIds.includes(sub.studentId));
    }

    res.json({ homework });
  } catch (error) {
    console.error('Get homework error:', error);
    res.status(500).json({ error: 'Failed to fetch homework' });
  }
});

// Create new homework
router.post('/', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), checkFeatureAccess('homework'), async (req, res) => {
  try {
    const { error, value } = createHomeworkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    // Validate class belongs to school
    const classExists = await Class.findOne({
      where: {
        id: value.classId,
        schoolId: req.user.schoolId
      }
    });

    if (!classExists) {
      return res.status(400).json({ error: 'Invalid class ID' });
    }

    // Validate due date is in the future
    if (new Date(value.dueDate) <= new Date()) {
      return res.status(400).json({ error: 'Due date must be in the future' });
    }

    const homework = await Homework.create({
      ...value,
      schoolId: req.user.schoolId,
      teacherId: req.user.id
    });

    // Fetch the created homework with associations
    const createdHomework = await Homework.findByPk(homework.id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section']
        }
      ]
    });

    res.status(201).json({
      message: 'Homework created successfully',
      homework: createdHomework
    });
  } catch (error) {
    console.error('Create homework error:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

// Update homework
router.put('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), checkFeatureAccess('homework'), async (req, res) => {
  try {
    const { error, value } = updateHomeworkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const homework = await Homework.findByPk(req.params.id);
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    // Check permissions
    if (homework.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only creator or admin can edit
    if (homework.teacherId !== req.user.id && !['super_admin', 'school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only the creator or admin can edit this homework' });
    }

    // Validate due date if provided
    if (value.dueDate && new Date(value.dueDate) <= new Date()) {
      return res.status(400).json({ error: 'Due date must be in the future' });
    }

    await homework.update(value);

    // Fetch updated homework with associations
    const updatedHomework = await Homework.findByPk(homework.id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section']
        }
      ]
    });

    res.json({
      message: 'Homework updated successfully',
      homework: updatedHomework
    });
  } catch (error) {
    console.error('Update homework error:', error);
    res.status(500).json({ error: 'Failed to update homework' });
  }
});

// Delete homework
router.delete('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), checkFeatureAccess('homework'), async (req, res) => {
  try {
    const homework = await Homework.findByPk(req.params.id);
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    // Check permissions
    if (homework.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only creator or admin can delete
    if (homework.teacherId !== req.user.id && !['super_admin', 'school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only the creator or admin can delete this homework' });
    }

    await homework.destroy();

    res.json({ message: 'Homework deleted successfully' });
  } catch (error) {
    console.error('Delete homework error:', error);
    res.status(500).json({ error: 'Failed to delete homework' });
  }
});

// Submit homework (students only)
router.post('/:id/submit', authenticate, authorize('student'), checkFeatureAccess('homework'), async (req, res) => {
  try {
    const { error, value } = submitHomeworkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const homework = await Homework.findByPk(req.params.id);
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    if (!homework.isPublished) {
      return res.status(400).json({ error: 'Homework is not published yet' });
    }

    // Get student record
    const student = await Student.findOne({ where: { userId: req.user.id } });
    if (!student) {
      return res.status(400).json({ error: 'Student record not found' });
    }

    // Check if homework belongs to student's class
    if (homework.classId !== student.classId) {
      return res.status(403).json({ error: 'This homework is not assigned to your class' });
    }

    // Check if already submitted
    const existingSubmission = await HomeworkSubmission.findOne({
      where: {
        homeworkId: homework.id,
        studentId: student.id
      }
    });

    if (existingSubmission) {
      return res.status(400).json({ error: 'Homework already submitted' });
    }

    // Check if late submission is allowed
    const isLate = new Date() > new Date(homework.dueDate);
    if (isLate && !homework.allowLateSubmission) {
      return res.status(400).json({ error: 'Late submissions are not allowed for this homework' });
    }

    // Validate submission format
    if (homework.submissionFormat === 'text' && !value.submissionText) {
      return res.status(400).json({ error: 'Text submission is required' });
    }
    if (homework.submissionFormat === 'file' && (!value.attachments || value.attachments.length === 0)) {
      return res.status(400).json({ error: 'File submission is required' });
    }

    const submission = await HomeworkSubmission.create({
      homeworkId: homework.id,
      studentId: student.id,
      submissionText: value.submissionText,
      attachments: value.attachments,
      isLate
    });

    // Fetch submission with associations
    const createdSubmission = await HomeworkSubmission.findByPk(submission.id, {
      include: [
        {
          model: Homework,
          as: 'homework',
          attributes: ['id', 'title', 'subject', 'maxMarks']
        },
        {
          model: Student,
          as: 'student',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }]
        }
      ]
    });

    res.status(201).json({
      message: 'Homework submitted successfully',
      submission: createdSubmission
    });
  } catch (error) {
    console.error('Submit homework error:', error);
    res.status(500).json({ error: 'Failed to submit homework' });
  }
});

// Grade homework submission
router.put('/:id/submissions/:submissionId/grade', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), checkFeatureAccess('homework'), async (req, res) => {
  try {
    const { error, value } = gradeHomeworkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const homework = await Homework.findByPk(req.params.id);
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    const submission = await HomeworkSubmission.findByPk(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check permissions
    if (homework.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate marks don't exceed maximum
    if (value.marksObtained > homework.maxMarks) {
      return res.status(400).json({ error: `Marks cannot exceed maximum marks (${homework.maxMarks})` });
    }

    await submission.update({
      marksObtained: value.marksObtained,
      feedback: value.feedback,
      status: 'graded',
      gradedAt: new Date(),
      gradedBy: req.user.id
    });

    // Fetch updated submission with associations
    const updatedSubmission = await HomeworkSubmission.findByPk(submission.id, {
      include: [
        {
          model: Homework,
          as: 'homework',
          attributes: ['id', 'title', 'subject', 'maxMarks']
        },
        {
          model: Student,
          as: 'student',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName']
          }]
        },
        {
          model: User,
          as: 'grader',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      message: 'Homework graded successfully',
      submission: updatedSubmission
    });
  } catch (error) {
    console.error('Grade homework error:', error);
    res.status(500).json({ error: 'Failed to grade homework' });
  }
});

module.exports = router;