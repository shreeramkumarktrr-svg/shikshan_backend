const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { User, School, Student, Parent, Teacher, Class, sequelize } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');
const { enforceTenancy, enforceSchoolLimits } = require('../middleware/tenancy');

const router = express.Router();

// Validation schemas
const createUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().allow('', null).optional(),
  phone: Joi.string().pattern(/^\d{10,15}$/).required(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid('school_admin', 'principal', 'teacher', 'student', 'parent', 'finance_officer', 'support_staff').required(),
  dateOfBirth: Joi.date().allow('', null).optional(),
  gender: Joi.string().valid('male', 'female', 'other').allow('', null).optional(),
  address: Joi.string().allow('', null).optional(),
  employeeId: Joi.string().allow('', null).optional(),
  subjects: Joi.array().items(Joi.string()).optional(),
  // Student specific fields
  classId: Joi.string().uuid().allow('', null).optional(),
  rollNumber: Joi.string().allow('', null).optional(),
  parentName: Joi.string().allow('', null).optional(),
  parentContact: Joi.string().pattern(/^\d{10,15}$/).allow('', null).optional(),
  parentEmail: Joi.string().email().allow('', null).optional(),
  // Teacher specific fields
  classTeacher: Joi.boolean().optional(),
  // Status field
  isActive: Joi.boolean().optional().default(true),
  // Super admin can specify schoolId
  schoolId: Joi.string().uuid().optional()
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().allow('', null).optional(),
  phone: Joi.string().pattern(/^\d{10,15}$/).allow('', null).optional(),
  password: Joi.string().min(6).optional(), // Allow but ignore during update (for form compatibility)
  role: Joi.string().valid('school_admin', 'principal', 'teacher', 'student', 'parent', 'finance_officer', 'support_staff').optional(), // Allow but restrict who can change
  dateOfBirth: Joi.date().allow('', null).optional(),
  gender: Joi.string().valid('male', 'female', 'other').allow('', null).optional(),
  address: Joi.string().allow('', null).optional(),
  employeeId: Joi.string().allow('', null).optional(),
  subjects: Joi.array().items(Joi.string()).optional(),
  // Student specific fields
  classId: Joi.string().uuid().allow('', null).optional(),
  rollNumber: Joi.string().allow('', null).optional(),
  parentName: Joi.string().allow('', null).optional(),
  parentContact: Joi.string().pattern(/^\d{10,15}$/).allow('', null).optional(),
  parentEmail: Joi.string().email().allow('', null).optional(),
  // Teacher specific fields
  classTeacher: Joi.boolean().optional(),
  // Status field
  isActive: Joi.boolean().optional()
});

// Get all users for a school
router.get('/', authenticate, enforceTenancy, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, active, hasClass, schoolId } = req.query;
    const offset = (page - 1) * limit;

    // Determine school ID - super admin can query any school, others use their own
    const targetSchoolId = req.user.role === 'super_admin' && schoolId
      ? schoolId
      : req.user.schoolId;

    if (!targetSchoolId) {
      return res.status(400).json({ error: 'School ID is required' });
    }

    const whereClause = {
      schoolId: targetSchoolId
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
    if (active !== undefined && active !== '') {
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

    // Class assignment filter (for teachers)
    if (hasClass !== undefined && hasClass !== '' && role === 'teacher') {
      const { Class } = require('../models');
      if (hasClass === 'true') {
        // Teachers with classes - user ID should exist in classes as classTeacherId
        whereClause.id = {
          [Op.in]: sequelize.literal(`(SELECT "classTeacherId" FROM "Classes" WHERE "classTeacherId" IS NOT NULL AND "schoolId" = '${targetSchoolId}')`)
        };
      } else if (hasClass === 'false') {
        // Teachers without classes - user ID should NOT exist in classes as classTeacherId
        whereClause.id = {
          [Op.notIn]: sequelize.literal(`(SELECT "classTeacherId" FROM "Classes" WHERE "classTeacherId" IS NOT NULL AND "schoolId" = '${targetSchoolId}')`)
        };
      }
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
router.get('/:id', authenticate, async (req, res) => {
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

    // Check if user has access - super admin can access any user, others only their school
    if (req.user.role !== 'super_admin' && user.schoolId !== req.user.schoolId) {
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

    // Determine school ID - super admin can specify schoolId, others use their own
    const targetSchoolId = req.user.role === 'super_admin'
      ? (value.schoolId || req.query.schoolId || req.user.schoolId)
      : req.user.schoolId;

    if (!targetSchoolId) {
      return res.status(400).json({ error: 'School ID is required' });
    }

    // Check school limits for non-super admin users
    if (req.user.role !== 'super_admin') {
      const school = req.user.school;
      if (!school) {
        return res.status(400).json({ error: 'School information not found' });
      }

      // Check subscription status
      if (school.subscriptionStatus !== 'active' && school.subscriptionStatus !== 'trial') {
        return res.status(403).json({
          error: 'School subscription is not active',
          code: 'SUBSCRIPTION_INACTIVE',
          subscriptionStatus: school.subscriptionStatus
        });
      }

      // Check student limit
      if (value.role === 'student') {
        const studentCount = await User.count({
          where: { schoolId: targetSchoolId, role: 'student', isActive: true }
        });

        if (studentCount >= school.maxStudents) {
          return res.status(403).json({
            error: `Student limit reached. Maximum allowed: ${school.maxStudents}`,
            code: 'STUDENT_LIMIT_EXCEEDED',
            currentCount: studentCount,
            maxAllowed: school.maxStudents
          });
        }
      }

      // Check teacher limit
      if (value.role === 'teacher') {
        const teacherCount = await User.count({
          where: { schoolId: targetSchoolId, role: 'teacher', isActive: true }
        });

        if (teacherCount >= school.maxTeachers) {
          return res.status(403).json({
            error: `Teacher limit reached. Maximum allowed: ${school.maxTeachers}`,
            code: 'TEACHER_LIMIT_EXCEEDED',
            currentCount: teacherCount,
            maxAllowed: school.maxTeachers
          });
        }
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: value.email },
          { phone: value.phone }
        ],
        schoolId: targetSchoolId
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or phone already exists' });
    }

    // Validate and generate password
    let password = value.password;
    if (password && password.length < 6) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Password must be at least 6 characters long']
      });
    }

    // Generate default password if not provided
    if (!password) {
      password = `${value.firstName.toLowerCase()}123`;
    }

    // Clean the data - convert empty strings to null for optional fields
    const cleanedValue = { ...value };
    const fieldsToClean = [
      'classId', 'email', 'employeeId', 'dateOfBirth', 'address',
      'rollNumber', 'parentName', 'parentContact', 'parentEmail', 'gender'
    ];

    fieldsToClean.forEach(field => {
      if (cleanedValue[field] === '') {
        cleanedValue[field] = null;
      }
    });

    const user = await User.create({
      ...cleanedValue,
      passwordHash: password, // Will be hashed by the model hook
      schoolId: targetSchoolId
    });

    // Create role-specific profile
    if (value.role === 'student') {
      const studentData = {
        userId: user.id,
        classId: cleanedValue.classId || null, // Use cleaned value or null
        rollNumber: value.rollNumber || `ROLL${Date.now()}${Math.floor(Math.random() * 1000)}`,
        admissionNumber: `ADM${Date.now()}${Math.floor(Math.random() * 1000)}`,
        admissionDate: new Date(),
        isActive: true
      };

      try {
        const student = await Student.create(studentData);
        console.log('Student profile created:', student.id);
      } catch (studentError) {
        console.error('Student profile creation failed:', studentError);
        // If student profile creation fails, we should still continue
        // The user is created, just without the student profile
      }

      // Create parent profile if parent information is provided
      if (value.parentName && value.parentContact) {
        try {
          const parentUser = await User.create({
            firstName: value.parentName.split(' ')[0] || value.parentName,
            lastName: value.parentName.split(' ').slice(1).join(' ') || '',
            email: value.parentEmail || null,
            phone: value.parentContact,
            role: 'parent',
            schoolId: targetSchoolId,
            passwordHash: `${value.parentName.toLowerCase().replace(/\s+/g, '')}123`
          });

          await Parent.create({
            userId: parentUser.id
          });

          console.log('Parent profile created:', parentUser.id);
          // Link parent to student (you may need to create a junction table)
          // This depends on your database schema
        } catch (parentError) {
          console.error('Parent profile creation failed:', parentError);
          // Continue even if parent creation fails
        }
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
router.put('/:id', authenticate, async (req, res) => {
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

    // Check permissions - super admin can update any user, others only their school
    if (req.user.role !== 'super_admin' && user.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only admin or the user themselves can update
    if (user.id !== req.user.id && !['super_admin', 'school_admin', 'principal'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Remove password from update data (password updates should use separate endpoint)
    const updateData = { ...value };
    delete updateData.password;

    // Handle role changes with proper permissions
    if (updateData.role && updateData.role !== user.role) {
      // Only super admin and school admin can change roles
      if (!['super_admin', 'school_admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions to change user role' });
      }
      
      // Super admin can change any role, school admin has restrictions
      if (req.user.role === 'school_admin') {
        // School admin cannot create other school admins or super admins
        if (['super_admin', 'school_admin'].includes(updateData.role)) {
          return res.status(403).json({ error: 'Cannot assign admin roles' });
        }
      }
    }

    // Extract student-specific fields before updating user
    const studentFields = {
      classId: value.classId,
      rollNumber: value.rollNumber
    };

    // Remove student-specific fields from user update data
    delete updateData.classId;
    delete updateData.rollNumber;
    delete updateData.parentName;
    delete updateData.parentContact;
    delete updateData.parentEmail;

    await user.update(updateData);

    // Handle student-specific updates
    if (user.role === 'student') {
      // Find or create student profile
      let studentProfile = await Student.findOne({ where: { userId: user.id } });
      
      if (studentProfile) {
        // Update existing student profile
        const studentUpdateData = {};
        if (studentFields.classId !== undefined) {
          studentUpdateData.classId = studentFields.classId === '' ? null : studentFields.classId;
        }
        if (studentFields.rollNumber !== undefined) {
          studentUpdateData.rollNumber = studentFields.rollNumber === '' ? null : studentFields.rollNumber;
        }
        
        if (Object.keys(studentUpdateData).length > 0) {
          await studentProfile.update(studentUpdateData);
        }
      } else if (studentFields.classId || studentFields.rollNumber) {
        // Create student profile if it doesn't exist and we have student data
        await Student.create({
          userId: user.id,
          classId: studentFields.classId === '' ? null : studentFields.classId,
          rollNumber: studentFields.rollNumber || `ROLL${Date.now()}${Math.floor(Math.random() * 1000)}`,
          admissionNumber: `ADM${Date.now()}${Math.floor(Math.random() * 1000)}`,
          admissionDate: new Date(),
          isActive: true
        });
      }
    }

    // Fetch updated user without password, including student profile
    const updatedUser = await User.findByPk(user.id, {
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
          include: [
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'name', 'grade', 'section']
            }
          ]
        }
      ]
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Failed to update user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete user (deactivate)
router.delete('/:id', authenticate, authorize('super_admin', 'school_admin', 'principal'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions - super admin can delete any user, others only their school
    if (req.user.role !== 'super_admin' && user.schoolId !== req.user.schoolId) {
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

    // Check school permissions - super admin can change any password, others only their school
    if (req.user.role !== 'super_admin' && user.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check role permissions
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
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    console.log('=== USER STATS SUMMARY DEBUG ===');
    console.log('User:', req.user?.id, req.user?.role, req.user?.schoolId);
    console.log('Query params:', req.query);
    
    // Determine school ID - super admin can query any school, others use their own
    const schoolId = req.user.role === 'super_admin' && req.query.schoolId
      ? req.query.schoolId
      : req.user.schoolId;

    if (!schoolId) {
      console.log('ERROR: No school ID found for user:', req.user?.id, 'Role:', req.user?.role);
      return res.status(400).json({ error: 'School ID is required' });
    }

    console.log('Fetching users for school:', schoolId);

    // Get all users for the school
    const allUsers = await User.findAll({
      where: { schoolId },
      attributes: ['role', 'isActive'],
      raw: true
    });

    console.log('Found users:', allUsers.length);

    // Calculate stats manually
    const totalUsers = allUsers.filter(user => user.isActive).length;
    const inactiveUsers = allUsers.filter(user => !user.isActive).length;

    const usersByRole = {};
    allUsers.forEach(user => {
      if (user.isActive) {
        usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
      }
    });

    console.log('Returning stats:', { totalUsers, inactiveUsers, usersByRole });

    res.json({
      totalUsers,
      inactiveUsers,
      usersByRole
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Alias for stats endpoint (for compatibility)
router.get('/stats', authenticate, async (req, res) => {
  try {
    console.log('=== USER STATS ALIAS DEBUG ===');
    console.log('User:', req.user?.id, req.user?.role, req.user?.schoolId);
    console.log('Query params:', req.query);
    
    // Determine school ID - super admin can query any school, others use their own
    const schoolId = req.user.role === 'super_admin' && req.query.schoolId
      ? req.query.schoolId
      : req.user.schoolId;

    if (!schoolId) {
      console.log('ERROR: No school ID found for user:', req.user?.id, 'Role:', req.user?.role);
      return res.status(400).json({ error: 'School ID is required' });
    }

    console.log('Fetching users for school:', schoolId);

    // Get all users for the school
    const allUsers = await User.findAll({
      where: { schoolId },
      attributes: ['role', 'isActive'],
      raw: true
    });

    console.log('Found users:', allUsers.length);

    // Calculate stats manually
    const totalUsers = allUsers.filter(user => user.isActive).length;
    const inactiveUsers = allUsers.filter(user => !user.isActive).length;

    const usersByRole = {};
    allUsers.forEach(user => {
      if (user.isActive) {
        usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
      }
    });

    res.json({
      totalUsers,
      inactiveUsers,
      usersByRole
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

        // Clean the data - convert empty strings to null for optional fields
        const cleanedValue = { ...value };
        if (cleanedValue.classId === '') cleanedValue.classId = null;
        if (cleanedValue.email === '') cleanedValue.email = null;
        if (cleanedValue.employeeId === '') cleanedValue.employeeId = null;
        if (cleanedValue.dateOfBirth === '') cleanedValue.dateOfBirth = null;
        if (cleanedValue.address === '') cleanedValue.address = null;

        const user = await User.create({
          ...cleanedValue,
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

    // Check permissions - super admin can reset any password, others only their school
    if (req.user.role !== 'super_admin' && user.schoolId !== req.user.schoolId) {
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

    // Check permissions - super admin can update any user status, others only their school
    if (req.user.role !== 'super_admin' && user.schoolId !== req.user.schoolId) {
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
router.get('/role/:role', authenticate, enforceTenancy, async (req, res) => {
  try {
    const { role } = req.params;
    const { active } = req.query;

    const whereClause = {
      schoolId: req.user.schoolId,
      role
    };

    // Filter by active status only if specified
    if (active !== undefined) {
      whereClause.isActive = active === 'true';
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'isActive'],
      order: [['firstName', 'ASC']]
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user activity log
router.get('/:id/activity', authenticate, async (req, res) => {
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