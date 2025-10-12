const { User } = require('../models');

/**
 * Teacher permission definitions based on requirements
 */
const TEACHER_PERMISSIONS = {
  // 1. Dashboard (Teacher specific) - Full access
  dashboard: {
    view: true,
    create: true,
    update: true,
    delete: true
  },
  
  // 2. Teachers (can't add/update teachers) - Read only
  teachers: {
    view: true,
    create: false,
    update: false,
    delete: false
  },
  
  // 3. Students (can do everything) - Full access
  students: {
    view: true,
    create: true,
    update: true,
    delete: true
  },
  
  // 4. Classes (can't add/update classes) - Read only
  classes: {
    view: true,
    create: false,
    update: false,
    delete: false
  },
  
  // 5. Attendance (can mark their own and all students attendance) - Full access
  attendance: {
    view: true,
    create: true,
    update: true,
    delete: true
  },
  
  // 6. Homework (can do everything) - Full access
  homework: {
    view: true,
    create: true,
    update: true,
    delete: true
  },
  
  // 7. Events (can do everything) - Full access
  events: {
    view: true,
    create: true,
    update: true,
    delete: true
  },
  
  // 8. Complaints (only review and update complaints) - Limited access
  complaints: {
    view: true,
    create: false,
    update: true,
    delete: false
  },
  
  // 9. Fees (Not visible at all) - No access
  fees: {
    view: false,
    create: false,
    update: false,
    delete: false
  },
  feeManagement: {
    view: false,
    create: false,
    update: false,
    delete: false
  },
  
  // 10. Reports (can see everything excluding fees and financial related data) - Read only
  reports: {
    view: true,
    create: false,
    update: false,
    delete: false
  }
};

/**
 * Reports that teachers are NOT allowed to access
 */
const RESTRICTED_REPORTS = [
  'financial',
  'fees',
  'payments',
  'revenue',
  'expenses',
  'fee_collection',
  'payment_history'
];

/**
 * Check if teacher has permission for a specific feature and action
 * @param {string} feature - Feature name
 * @param {string} action - Action type (view, create, update, delete)
 * @returns {boolean} True if teacher has permission
 */
const hasTeacherPermission = (feature, action = 'view') => {
  const featurePermissions = TEACHER_PERMISSIONS[feature];
  if (!featurePermissions) {
    return false; // Feature not defined for teachers
  }
  
  return featurePermissions[action] || false;
};

/**
 * Middleware to check teacher permissions for specific features
 * @param {string} feature - Feature name to check
 * @param {string} action - Action type (view, create, update, delete)
 * @returns {Function} Express middleware function
 */
const checkTeacherPermission = (feature, action = 'view') => {
  return (req, res, next) => {
    // Skip check for non-teacher roles
    if (req.user.role !== 'teacher') {
      return next();
    }
    
    // Check if teacher has permission
    if (!hasTeacherPermission(feature, action)) {
      return res.status(403).json({
        error: 'Teachers do not have permission for this action',
        code: 'TEACHER_PERMISSION_DENIED',
        feature,
        action,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Middleware to block teacher access to fees completely
 */
const blockTeacherFeesAccess = (req, res, next) => {
  if (req.user.role === 'teacher') {
    return res.status(403).json({
      error: 'Teachers do not have access to fee management',
      code: 'TEACHER_PERMISSION_DENIED',
      feature: 'fees',
      action: 'view',
      userRole: req.user.role
    });
  }
  
  next();
};

/**
 * Middleware to filter reports for teachers (exclude financial reports)
 */
const filterTeacherReports = (req, res, next) => {
  if (req.user.role === 'teacher') {
    const reportType = req.params.reportType || req.query.reportType || req.body.reportType;
    
    if (reportType && RESTRICTED_REPORTS.includes(reportType)) {
      return res.status(403).json({
        error: 'Teachers do not have access to financial reports',
        code: 'TEACHER_PERMISSION_DENIED',
        feature: 'reports',
        reportType,
        userRole: req.user.role
      });
    }
  }
  
  next();
};

/**
 * Middleware to ensure teachers can only update complaints, not create or delete
 */
const checkTeacherComplaintPermission = (action) => {
  return (req, res, next) => {
    if (req.user.role === 'teacher') {
      if (action === 'create' || action === 'delete') {
        return res.status(403).json({
          error: 'Teachers can only review and update complaints, not create or delete them',
          code: 'TEACHER_PERMISSION_DENIED',
          feature: 'complaints',
          action,
          userRole: req.user.role
        });
      }
    }
    
    next();
  };
};

/**
 * Middleware to ensure teachers can only view teachers and classes, not modify them
 */
const checkTeacherReadOnlyPermission = (feature) => {
  return (req, res, next) => {
    if (req.user.role === 'teacher') {
      const method = req.method.toLowerCase();
      
      // Allow GET requests (view), block POST, PUT, PATCH, DELETE
      if (['post', 'put', 'patch', 'delete'].includes(method)) {
        return res.status(403).json({
          error: `Teachers can only view ${feature}, not modify them`,
          code: 'TEACHER_PERMISSION_DENIED',
          feature,
          action: method,
          userRole: req.user.role
        });
      }
    }
    
    next();
  };
};

/**
 * Get teacher permissions summary
 * @returns {Object} Teacher permissions object
 */
const getTeacherPermissions = () => {
  return TEACHER_PERMISSIONS;
};

module.exports = {
  hasTeacherPermission,
  checkTeacherPermission,
  blockTeacherFeesAccess,
  filterTeacherReports,
  checkTeacherComplaintPermission,
  checkTeacherReadOnlyPermission,
  getTeacherPermissions,
  TEACHER_PERMISSIONS,
  RESTRICTED_REPORTS
};