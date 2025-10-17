const express = require('express');
const { Subject, User, School } = require('../models');
const { authenticate } = require('../middleware/auth');
const { enforceTenancy } = require('../middleware/tenancy');
const { Op } = require('sequelize');
const router = express.Router();

// Get all subjects for a school
router.get('/', authenticate, enforceTenancy, async (req, res) => {
  try {
    const { category, isActive, search } = req.query;
    
    const whereClause = {
      schoolId: req.user.schoolId
    };

    // Filter by category
    if (category) {
      whereClause.category = category;
    }

    // Filter by active status
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Search by name or code
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const subjects = await Subject.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: subjects
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subjects'
    });
  }
});

// Get subject by ID
router.get('/:id', authenticate, enforceTenancy, async (req, res) => {
  try {
    const subject = await Subject.findOne({
      where: {
        id: req.params.id,
        schoolId: req.user.schoolId
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    res.json({
      success: true,
      data: subject
    });
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subject'
    });
  }
});

// Create new subject
router.post('/', authenticate, enforceTenancy, async (req, res) => {
  try {
    // Check permissions
    if (!['school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create subjects'
      });
    }

    const { name, code, description, category } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Subject name is required'
      });
    }

    // Check if subject with same name already exists in this school
    const existingSubject = await Subject.findOne({
      where: {
        name: name.trim(),
        schoolId: req.user.schoolId
      }
    });

    if (existingSubject) {
      return res.status(400).json({
        success: false,
        error: 'A subject with this name already exists'
      });
    }

    // Check if code is provided and unique
    if (code && code.trim()) {
      const existingCode = await Subject.findOne({
        where: {
          code: code.trim(),
          schoolId: req.user.schoolId
        }
      });

      if (existingCode) {
        return res.status(400).json({
          success: false,
          error: 'A subject with this code already exists'
        });
      }
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: code ? code.trim() : null,
      description: description ? description.trim() : null,
      category: category || 'core',
      schoolId: req.user.schoolId,
      createdBy: req.user.id
    });

    // Fetch the created subject with associations
    const createdSubject = await Subject.findByPk(subject.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdSubject,
      message: 'Subject created successfully'
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'Subject name or code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create subject'
    });
  }
});

// Update subject
router.put('/:id', authenticate, enforceTenancy, async (req, res) => {
  try {
    // Check permissions
    if (!['school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update subjects'
      });
    }

    const { name, code, description, category, isActive } = req.body;

    const subject = await Subject.findOne({
      where: {
        id: req.params.id,
        schoolId: req.user.schoolId
      }
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Subject name is required'
      });
    }

    // Check if subject with same name already exists (excluding current subject)
    if (name.trim() !== subject.name) {
      const existingSubject = await Subject.findOne({
        where: {
          name: name.trim(),
          schoolId: req.user.schoolId,
          id: { [Op.ne]: req.params.id }
        }
      });

      if (existingSubject) {
        return res.status(400).json({
          success: false,
          error: 'A subject with this name already exists'
        });
      }
    }

    // Check if code is provided and unique (excluding current subject)
    if (code && code.trim() && code.trim() !== subject.code) {
      const existingCode = await Subject.findOne({
        where: {
          code: code.trim(),
          schoolId: req.user.schoolId,
          id: { [Op.ne]: req.params.id }
        }
      });

      if (existingCode) {
        return res.status(400).json({
          success: false,
          error: 'A subject with this code already exists'
        });
      }
    }

    // Update subject
    await subject.update({
      name: name.trim(),
      code: code ? code.trim() : null,
      description: description ? description.trim() : null,
      category: category || subject.category,
      isActive: isActive !== undefined ? isActive : subject.isActive
    });

    // Fetch updated subject with associations
    const updatedSubject = await Subject.findByPk(subject.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedSubject,
      message: 'Subject updated successfully'
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'Subject name or code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update subject'
    });
  }
});

// Delete subject
router.delete('/:id', authenticate, enforceTenancy, async (req, res) => {
  try {
    // Check permissions
    if (!['school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete subjects'
      });
    }

    const subject = await Subject.findOne({
      where: {
        id: req.params.id,
        schoolId: req.user.schoolId
      }
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    // TODO: Check if subject is being used in classes, homework, etc.
    // For now, we'll allow deletion but in production you might want to:
    // 1. Soft delete (set isActive to false)
    // 2. Check for dependencies before deletion
    // 3. Cascade delete or prevent deletion if in use

    await subject.destroy();

    res.json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete subject'
    });
  }
});

// Get subject categories
router.get('/meta/categories', authenticate, async (req, res) => {
  try {
    const categories = [
      { value: 'core', label: 'Core Subject' },
      { value: 'elective', label: 'Elective' },
      { value: 'extracurricular', label: 'Extracurricular' },
      { value: 'language', label: 'Language' },
      { value: 'science', label: 'Science' },
      { value: 'arts', label: 'Arts' },
      { value: 'sports', label: 'Sports' }
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

module.exports = router;