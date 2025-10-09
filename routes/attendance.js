const express = require('express');
const Joi = require('joi');
const { Op, sequelize } = require('sequelize');
const { Attendance, User, Class, Student, StaffAttendance } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');

const router = express.Router();

// Validation schemas for student attendance
const markAttendanceSchema = Joi.object({
  classId: Joi.string().uuid().required(),
  date: Joi.date().required(),
  attendanceRecords: Joi.array().items(
    Joi.object({
      studentId: Joi.string().uuid().required(),
      status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'excused').required(),
      remarks: Joi.string().optional(),
      period: Joi.number().integer().min(1).max(10).optional()
    })
  ).required()
});

const updateAttendanceSchema = Joi.object({
  status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'excused').required(),
  remarks: Joi.string().optional()
});

// Validation schemas for staff attendance
const markStaffAttendanceSchema = Joi.object({
  date: Joi.date().required(),
  attendanceRecords: Joi.array().items(
    Joi.object({
      staffId: Joi.string().uuid().required(),
      status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'sick_leave', 'casual_leave', 'official_duty').required(),
      checkInTime: Joi.string().optional(),
      checkOutTime: Joi.string().optional(),
      remarks: Joi.string().optional(),
      workingHours: Joi.number().min(0).max(24).optional()
    })
  ).required()
});

const updateStaffAttendanceSchema = Joi.object({
  status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'sick_leave', 'casual_leave', 'official_duty').required(),
  checkInTime: Joi.string().optional(),
  checkOutTime: Joi.string().optional(),
  remarks: Joi.string().optional(),
  workingHours: Joi.number().min(0).max(24).optional()
});

// STUDENT ATTENDANCE ROUTES

// Mark attendance for a class
router.post('/', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { error, value } = markAttendanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const { classId, date, attendanceRecords } = value;

    // Validate class belongs to school
    const cls = await Class.findOne({
      where: {
        id: classId,
        schoolId: req.user.schoolId
      }
    });

    if (!cls) {
      return res.status(400).json({ error: 'Invalid class ID' });
    }

    // Teachers can only mark attendance for their own classes
    if (req.user.role === 'teacher' && cls.classTeacherId !== req.user.id) {
      return res.status(403).json({ error: 'Teachers can only mark attendance for their own classes' });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findAll({
      where: {
        classId,
        date: new Date(date).toISOString().split('T')[0]
      }
    });

    if (existingAttendance.length > 0) {
      return res.status(409).json({ error: 'Attendance already marked for this date' });
    }

    // Validate all students belong to the class
    const studentIds = attendanceRecords.map(record => record.studentId);
    const validStudents = await Student.findAll({
      where: {
        userId: { [Op.in]: studentIds },
        classId,
        isActive: true
      }
    });

    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({ error: 'Some students do not belong to this class' });
    }

    // Create attendance records
    const attendanceData = attendanceRecords.map(record => ({
      studentId: record.studentId,
      classId,
      date: new Date(date).toISOString().split('T')[0],
      status: record.status,
      remarks: record.remarks,
      period: record.period,
      markedBy: req.user.id,
      markedAt: new Date()
    }));

    const createdAttendance = await Attendance.bulkCreate(attendanceData);

    res.status(201).json({
      message: 'Attendance marked successfully',
      recordsCreated: createdAttendance.length
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// Get attendance for a class
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { date, startDate, endDate, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Validate class belongs to school
    const cls = await Class.findOne({
      where: {
        id: classId,
        schoolId: req.user.schoolId
      }
    });

    if (!cls) {
      return res.status(400).json({ error: 'Invalid class ID' });
    }

    const whereClause = { classId };

    // Filter by date range
    if (date) {
      whereClause.date = new Date(date).toISOString().split('T')[0];
    } else if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [
          new Date(startDate).toISOString().split('T')[0],
          new Date(endDate).toISOString().split('T')[0]
        ]
      };
    }

    const { count, rows: attendance } = await Attendance.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section']
        }
      ]
    });

    res.json({
      attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Update individual attendance record
router.put('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { error, value } = updateAttendanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const attendance = await Attendance.findByPk(req.params.id, {
      include: [
        {
          model: Class,
          as: 'class'
        }
      ]
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Check permissions
    if (attendance.class.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Teachers can only update attendance for their own classes
    if (req.user.role === 'teacher' && attendance.class.classTeacherId !== req.user.id) {
      return res.status(403).json({ error: 'Teachers can only update attendance for their own classes' });
    }

    await attendance.update(value);

    const updatedAttendance = await Attendance.findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section']
        }
      ]
    });

    res.json({
      message: 'Attendance updated successfully',
      attendance: updatedAttendance
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

// STAFF ATTENDANCE ROUTES

// Mark staff attendance
router.post('/staff', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { error, value } = markStaffAttendanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const { date, attendanceRecords } = value;

    // Check if attendance already exists for this date
    const staffIds = attendanceRecords.map(record => record.staffId);
    const existingAttendance = await StaffAttendance.findAll({
      where: {
        staffId: { [Op.in]: staffIds },
        date: new Date(date).toISOString().split('T')[0],
        schoolId: req.user.schoolId
      }
    });

    if (existingAttendance.length > 0) {
      return res.status(409).json({ error: 'Attendance already marked for some staff members on this date' });
    }

    // Validate all staff belong to the school
    const validStaff = await User.findAll({
      where: {
        id: { [Op.in]: staffIds },
        schoolId: req.user.schoolId,
        role: { [Op.in]: ['teacher', 'school_admin', 'principal', 'finance_officer', 'support_staff'] },
        isActive: true
      }
    });

    if (validStaff.length !== staffIds.length) {
      return res.status(400).json({ error: 'Some staff members do not belong to this school' });
    }

    // Create staff attendance records
    const attendanceData = attendanceRecords.map(record => ({
      staffId: record.staffId,
      date: new Date(date).toISOString().split('T')[0],
      status: record.status,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      remarks: record.remarks,
      workingHours: record.workingHours || 0,
      markedBy: req.user.id,
      markedAt: new Date(),
      schoolId: req.user.schoolId
    }));

    const createdAttendance = await StaffAttendance.bulkCreate(attendanceData);

    res.status(201).json({
      message: 'Staff attendance marked successfully',
      recordsCreated: createdAttendance.length
    });
  } catch (error) {
    console.error('Mark staff attendance error:', error);
    res.status(500).json({ error: 'Failed to mark staff attendance' });
  }
});

// Get staff attendance
router.get('/staff', authenticate, async (req, res) => {
  try {
    const { date, startDate, endDate, staffId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { schoolId: req.user.schoolId };

    // Filter by staff member
    if (staffId) {
      whereClause.staffId = staffId;
    }

    // Filter by date range
    if (date) {
      whereClause.date = new Date(date).toISOString().split('T')[0];
    } else if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [
          new Date(startDate).toISOString().split('T')[0],
          new Date(endDate).toISOString().split('T')[0]
        ]
      };
    }

    const { count, rows: attendance } = await StaffAttendance.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'firstName', 'lastName', 'role', 'employeeId']
        },
        {
          model: User,
          as: 'markedByUser',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get staff attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch staff attendance' });
  }
});

// Get staff attendance statistics
router.get('/staff/stats', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { startDate, endDate, staffId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const whereClause = {
      schoolId: req.user.schoolId,
      date: {
        [Op.between]: [
          new Date(startDate).toISOString().split('T')[0],
          new Date(endDate).toISOString().split('T')[0]
        ]
      }
    };

    if (staffId) {
      whereClause.staffId = staffId;
    }

    // Get attendance statistics
    const stats = await StaffAttendance.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const attendanceStats = stats.reduce((acc, curr) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {});

    const totalDays = Object.values(attendanceStats).reduce((sum, count) => sum + count, 0);
    const presentDays = (attendanceStats.present || 0) + (attendanceStats.late || 0) + (attendanceStats.half_day || 0);
    const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0;

    // Get total working hours
    const workingHoursResult = await StaffAttendance.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('workingHours')), 'totalWorkingHours']
      ],
      raw: true
    });

    res.json({
      statistics: {
        ...attendanceStats,
        totalDays,
        presentDays,
        attendancePercentage: parseFloat(attendancePercentage),
        totalWorkingHours: parseFloat(workingHoursResult.totalWorkingHours || 0)
      }
    });
  } catch (error) {
    console.error('Get staff attendance stats error:', error);
    res.status(500).json({ error: 'Failed to fetch staff attendance statistics' });
  }
});

// Update staff attendance record
router.put('/staff/:id', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { error, value } = updateStaffAttendanceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const attendance = await StaffAttendance.findByPk(req.params.id);

    if (!attendance) {
      return res.status(404).json({ error: 'Staff attendance record not found' });
    }

    // Check permissions
    if (attendance.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Teachers can only update their own attendance
    if (req.user.role === 'teacher' && attendance.staffId !== req.user.id) {
      return res.status(403).json({ error: 'Teachers can only update their own attendance' });
    }

    await attendance.update(value);

    const updatedAttendance = await StaffAttendance.findByPk(attendance.id, {
      include: [
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'firstName', 'lastName', 'role', 'employeeId']
        }
      ]
    });

    res.json({
      message: 'Staff attendance updated successfully',
      attendance: updatedAttendance
    });
  } catch (error) {
    console.error('Update staff attendance error:', error);
    res.status(500).json({ error: 'Failed to update staff attendance' });
  }
});

module.exports = router;
