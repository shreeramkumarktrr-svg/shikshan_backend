const express = require('express');
const Joi = require('joi');
const { Op, sequelize } = require('sequelize');
const { Event, User, School, Class } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createEventSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional(),
  type: Joi.string().valid('announcement', 'event', 'holiday', 'exam', 'meeting', 'celebration').default('announcement'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  classId: Joi.string().uuid().optional(),
  targetAudience: Joi.array().items(Joi.string().valid('students', 'parents', 'teachers', 'staff', 'all')).default(['all']),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  location: Joi.string().optional(),
  sendNotification: Joi.boolean().default(true)
});

const updateEventSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().optional(),
  type: Joi.string().valid('announcement', 'event', 'holiday', 'exam', 'meeting', 'celebration').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  classId: Joi.string().uuid().optional(),
  targetAudience: Joi.array().items(Joi.string().valid('students', 'parents', 'teachers', 'staff', 'all')).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  location: Joi.string().optional(),
  isPublished: Joi.boolean().optional()
});

// Get events statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const baseWhere = {
      schoolId: req.user.schoolId
    };

    // Simplified role-based filtering
    let whereClause = baseWhere;
    if (req.user.role === 'student' || req.user.role === 'parent') {
      whereClause = {
        ...baseWhere,
        isPublished: true
      };
    }

    const totalEvents = await Event.count({ where: whereClause });
    
    const publishedEvents = await Event.count({ 
      where: { ...baseWhere, isPublished: true } 
    });
    
    const upcomingEvents = await Event.count({
      where: {
        ...baseWhere,
        startDate: { 
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.gte]: new Date() }
          ]
        },
        isPublished: true
      }
    });
    
    const activeEvents = await Event.count({
      where: {
        ...baseWhere,
        startDate: { 
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.lte]: new Date() }
          ]
        },
        endDate: { 
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.gte]: new Date() }
          ]
        },
        isPublished: true
      }
    });

    res.json({
      totalEvents,
      publishedEvents,
      upcomingEvents,
      activeEvents,
      eventsByType: {}
    });
  } catch (error) {
    console.error('Get events stats error:', error);
    res.status(500).json({ error: 'Failed to fetch events statistics' });
  }
});

// Get upcoming events
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const whereClause = {
      schoolId: req.user.schoolId,
      startDate: { 
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.gte]: new Date() }
        ]
      },
      isPublished: true
    };

    const events = await Event.findAll({
      where: whereClause,
      limit: parseInt(limit),
      order: [['startDate', 'ASC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section'],
          required: false
        }
      ]
    });

    res.json({ events });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Get all events for a school
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority, classId, published } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      schoolId: req.user.schoolId || req.query.schoolId
    };

    // Filter by type
    if (type) {
      whereClause.type = type;
    }

    // Filter by priority
    if (priority) {
      whereClause.priority = priority;
    }

    // Filter by class
    if (classId) {
      whereClause[Op.or] = [
        { classId: classId },
        { classId: null } // Include school-wide events
      ];
    }

    // Filter by published status
    if (published !== undefined) {
      whereClause.isPublished = published === 'true';
    }

    // Role-based filtering
    if (req.user.role === 'student' || req.user.role === 'parent') {
      whereClause.isPublished = true;
      whereClause[Op.or] = [
        { targetAudience: { [Op.contains]: [req.user.role] } },
        { targetAudience: { [Op.contains]: ['all'] } }
      ];
    }

    const { count, rows: events } = await Event.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['startDate', 'DESC'], ['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section'],
          required: false
        }
      ]
    });

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get event by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section'],
          required: false
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user has access to this event
    if (event.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create new event
router.post('/', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { error, value } = createEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    // Validate class belongs to school if classId provided
    if (value.classId) {
      const classExists = await Class.findOne({
        where: {
          id: value.classId,
          schoolId: req.user.schoolId
        }
      });

      if (!classExists) {
        return res.status(400).json({ error: 'Invalid class ID' });
      }
    }

    const event = await Event.create({
      ...value,
      schoolId: req.user.schoolId,
      createdBy: req.user.id
    });

    // Fetch the created event with associations
    const createdEvent = await Event.findByPk(event.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section'],
          required: false
        }
      ]
    });

    res.status(201).json({
      message: 'Event created successfully',
      event: createdEvent
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { error, value } = updateEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (event.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only creator or admin can edit
    if (event.createdBy !== req.user.id && !['super_admin', 'school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only the creator or admin can edit this event' });
    }

    // Validate class belongs to school if classId provided
    if (value.classId) {
      const classExists = await Class.findOne({
        where: {
          id: value.classId,
          schoolId: req.user.schoolId
        }
      });

      if (!classExists) {
        return res.status(400).json({ error: 'Invalid class ID' });
      }
    }

    await event.update(value);

    // Fetch updated event with associations
    const updatedEvent = await Event.findByPk(event.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'role']
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'grade', 'section'],
          required: false
        }
      ]
    });

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (event.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only creator or admin can delete
    if (event.createdBy !== req.user.id && !['super_admin', 'school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only the creator or admin can delete this event' });
    }

    await event.destroy();

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Mark event as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user has access to this event
    if (event.schoolId !== req.user.schoolId && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add user to readBy array if not already present
    const readBy = event.readBy || [];
    if (!readBy.includes(req.user.id)) {
      readBy.push(req.user.id);
      await event.update({ readBy });
    }

    res.json({ message: 'Event marked as read' });
  } catch (error) {
    console.error('Mark event as read error:', error);
    res.status(500).json({ error: 'Failed to mark event as read' });
  }
});

module.exports = router;