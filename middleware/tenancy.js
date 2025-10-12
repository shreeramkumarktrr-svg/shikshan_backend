const { Op } = require('sequelize');

/**
 * Multi-tenancy middleware to enforce school-level data isolation
 */

// List of models that should be filtered by schoolId
const TENANT_MODELS = [
  'User', 'Student', 'Teacher', 'Parent', 'Class', 'Attendance', 
  'Homework', 'HomeworkSubmission', 'Event', 'Complaint', 'Fee', 
  'StudentFee', 'StaffAttendance'
];

// Models that don't need tenant filtering (global models)
const GLOBAL_MODELS = ['School', 'Subscription', 'Payment', 'Inquiry'];

/**
 * Global query interceptor to automatically add schoolId filters
 * This creates a Sequelize hook that adds tenant filtering to all queries
 */
const setupGlobalTenantFiltering = (sequelize) => {
  // Add hooks to automatically filter queries by schoolId
  sequelize.addHook('beforeFind', (options, model) => {
    // Skip if model is not defined or not tenant-aware or if super admin context
    if (!model || !model.name || !TENANT_MODELS.includes(model.name) || 
        (options.tenantContext && options.tenantContext.userRole === 'super_admin')) {
      return;
    }

    // Add schoolId filter if tenant context exists
    if (options.tenantContext && options.tenantContext.schoolId) {
      if (!options.where) {
        options.where = {};
      }
      
      // Only add schoolId filter if not already present
      if (!options.where.schoolId) {
        options.where.schoolId = options.tenantContext.schoolId;
      }
    }
  });

  sequelize.addHook('beforeCreate', (instance, options) => {
    // Skip if instance is not defined or model is not tenant-aware or if super admin context
    if (!instance || !instance.constructor || !instance.constructor.name || 
        !TENANT_MODELS.includes(instance.constructor.name) ||
        (options.tenantContext && options.tenantContext.userRole === 'super_admin')) {
      return;
    }

    // Automatically set schoolId for new records
    if (options.tenantContext && options.tenantContext.schoolId && !instance.schoolId) {
      instance.schoolId = options.tenantContext.schoolId;
    }
  });

  sequelize.addHook('beforeUpdate', (instance, options) => {
    // Skip if instance is not defined
    if (!instance || !instance.changed) {
      return;
    }

    // Prevent updating schoolId (except for super admin)
    if (options.tenantContext && 
        options.tenantContext.userRole !== 'super_admin' && 
        instance.changed('schoolId')) {
      throw new Error('Cannot change school assignment');
    }
  });

  sequelize.addHook('beforeDestroy', (instance, options) => {
    // Skip if instance is not defined
    if (!instance || !instance.constructor || !instance.constructor.name) {
      return;
    }

    // Add schoolId filter for delete operations
    if (TENANT_MODELS.includes(instance.constructor.name) &&
        options.tenantContext && 
        options.tenantContext.userRole !== 'super_admin') {
      
      if (!options.where) {
        options.where = {};
      }
      
      if (!options.where.schoolId) {
        options.where.schoolId = options.tenantContext.schoolId;
      }
    }
  });
};

/**
 * Validate tenant access for specific resources
 * This middleware should be used after authentication
 */
const enforceTenancy = async (req, res, next) => {
  try {
    // Skip for super admin
    if (req.user && req.user.role === 'super_admin') {
      // Set tenant context for super admin (they can access all schools)
      req.tenantContext = {
        schoolId: null, // Super admin has access to all schools
        userId: req.user.id,
        userRole: req.user.role
      };
      return next();
    }

    // Ensure user has school context
    if (!req.user || !req.user.schoolId) {
      return res.status(400).json({
        error: 'User must belong to a school',
        code: 'MISSING_SCHOOL_CONTEXT'
      });
    }

    // Set tenant context in request for use by other middleware
    req.tenantContext = {
      schoolId: req.user.schoolId,
      userId: req.user.id,
      userRole: req.user.role
    };

    next();
  } catch (error) {
    console.error('Tenancy enforcement error:', error);
    res.status(500).json({
      error: 'Failed to enforce tenancy',
      code: 'TENANCY_ERROR'
    });
  }
};

/**
 * Validate that user has access to specific school resources
 */
const validateSchoolAccess = (resourceSchoolId) => {
  return (req, res, next) => {
    // Super admin can access any school
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user belongs to the same school as the resource
    if (req.user.schoolId !== resourceSchoolId) {
      return res.status(403).json({
        error: 'Access denied to this school resource',
        code: 'CROSS_TENANT_ACCESS_DENIED'
      });
    }

    next();
  };
};

/**
 * Middleware to ensure all created records include schoolId
 */
const enforceSchoolIdOnCreate = (req, res, next) => {
  // Skip for super admin
  if (req.user && req.user.role === 'super_admin') {
    return next();
  }

  // Automatically add schoolId to request body for create operations
  if (req.method === 'POST' && req.user && req.user.schoolId) {
    req.body.schoolId = req.user.schoolId;
  }

  next();
};

/**
 * Audit middleware to log cross-tenant access attempts
 */
const auditTenantAccess = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log potential security issues
    if (res.statusCode === 403 && req.user) {
      console.warn('TENANT_ACCESS_DENIED:', {
        userId: req.user.id,
        userSchoolId: req.user.schoolId,
        requestedResource: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Validate school subscription and limits
 */
const enforceSchoolLimits = async (req, res, next) => {
  try {
    // Skip for super admin
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    // For non-super admin users, ensure they have school information
    if (!req.user || !req.user.schoolId) {
      return res.status(400).json({
        error: 'User must belong to a school',
        code: 'MISSING_SCHOOL_CONTEXT'
      });
    }

    const school = req.user.school;
    if (!school) {
      return res.status(400).json({
        error: 'School information not found',
        code: 'SCHOOL_NOT_FOUND'
      });
    }

    // Check subscription status
    if (school.subscriptionStatus !== 'active' && school.subscriptionStatus !== 'trial') {
      return res.status(403).json({
        error: 'School subscription is not active',
        code: 'SUBSCRIPTION_INACTIVE',
        subscriptionStatus: school.subscriptionStatus
      });
    }

    // Check limits for POST requests (creating new resources)
    if (req.method === 'POST') {
      const { User } = require('../models');
      
      // Check student limit
      if (req.body.role === 'student' || req.originalUrl.includes('/students')) {
        const studentCount = await User.count({
          where: { schoolId: school.id, role: 'student', isActive: true }
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
      if (req.body.role === 'teacher' || req.originalUrl.includes('/teachers')) {
        const teacherCount = await User.count({
          where: { schoolId: school.id, role: 'teacher', isActive: true }
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

    next();
  } catch (error) {
    console.error('School limits check error:', error);
    res.status(500).json({
      error: 'Failed to validate school limits',
      code: 'LIMITS_CHECK_ERROR'
    });
  }
};

/**
 * Middleware to add tenant context to Sequelize operations
 */
const addTenantContext = (req, res, next) => {
  // Skip if no user or super admin
  if (!req.user || req.user.role === 'super_admin') {
    return next();
  }

  // Store original Sequelize methods and add tenant context
  const originalQuery = req.app.locals.sequelize.query;
  
  // Override sequelize.query to add tenant context
  req.app.locals.sequelize.query = function(sql, options = {}) {
    if (req.tenantContext) {
      options.tenantContext = req.tenantContext;
    }
    return originalQuery.call(this, sql, options);
  };

  // Override model methods to add tenant context
  Object.values(req.app.locals.sequelize.models).forEach(model => {
    if (TENANT_MODELS.includes(model.name)) {
      const originalFindAll = model.findAll;
      const originalFindOne = model.findOne;
      const originalCount = model.count;
      const originalCreate = model.create;
      const originalUpdate = model.update;
      const originalDestroy = model.destroy;

      model.findAll = function(options = {}) {
        if (req.tenantContext) {
          options.tenantContext = req.tenantContext;
        }
        return originalFindAll.call(this, options);
      };

      model.findOne = function(options = {}) {
        if (req.tenantContext) {
          options.tenantContext = req.tenantContext;
        }
        return originalFindOne.call(this, options);
      };

      model.count = function(options = {}) {
        if (req.tenantContext) {
          options.tenantContext = req.tenantContext;
        }
        return originalCount.call(this, options);
      };

      model.create = function(values, options = {}) {
        if (req.tenantContext) {
          options.tenantContext = req.tenantContext;
        }
        return originalCreate.call(this, values, options);
      };

      model.update = function(values, options = {}) {
        if (req.tenantContext) {
          options.tenantContext = req.tenantContext;
        }
        return originalUpdate.call(this, values, options);
      };

      model.destroy = function(options = {}) {
        if (req.tenantContext) {
          options.tenantContext = req.tenantContext;
        }
        return originalDestroy.call(this, options);
      };
    }
  });

  next();
};

module.exports = {
  enforceTenancy,
  validateSchoolAccess,
  enforceSchoolIdOnCreate,
  auditTenantAccess,
  enforceSchoolLimits,
  setupGlobalTenantFiltering,
  addTenantContext,
  TENANT_MODELS,
  GLOBAL_MODELS
};