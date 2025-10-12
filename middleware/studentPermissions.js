const { User, Student, Class } = require('../models');

/**
 * Check if student has permission for a specific feature and action
 * @param {string} featureName - Name of the feature to check
 * @param {string} action - Action type (view, create, update, delete)
 * @returns {boolean} True if student has permission
 */
const hasStudentPermission = (featureName, action = 'view') => {
  const studentPermissions = {
    // 1. Dashboard (Student specific) - View only
    dashboard: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    
    // 2. Teachers (Not visible at all) - No access
    teachers: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    
    // 3. Students (Not visible at all) - No access
    students: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    
    // 4. Classes (Not visible at all) - No access
    classes: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    
    // 5. Attendance (Not visible at all) - No access
    attendance: {
      view: false,
      create: false,
      update: false,
      delete: false
    },
    
    // 6. Homework (can see their homework) - View only for their own
    homework: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    
    // 7. Events (can see the school wide events) - View only
    events: {
      view: true,
      create: false,
      update: false,
      delete: false
    },
    
    // 8. Complaints (can create/modify and overview their complaints) - Limited access
    complaints: {
      view: true,
      create: true,
      update: true,
      delete: false
    },
    
    // 9. Fees (Can see their fees generated for their class) - View only for their own
    fees: {
      view: true,
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
    
    // 10. Reports (Not visible at all) - No access
    reports: {
      view: false,
      create: false,
      update: false,
      delete: false
    }
  };
  
  const featurePermissions = studentPermissions[featureName];
  if (!featurePermissions) {
    return false; // Feature not defined for students
  }
  
  return featurePermissions[action] || false;
};

/**
 * Middleware to check student permissions for specific features
 * @param {string} featureName - Name of the feature to check
 * @param {string} action - Action type (view, create, update, delete)
 * @returns {Function} Express middleware function
 */
const checkStudentPermission = (featureName, action = 'view') => {
  return (req, res, next) => {
    try {
      console.log('🔍 checkStudentPermission called:', featureName, action, 'user role:', req.user?.role);
      
      // Only apply to students
      if (req.user.role !== 'student') {
        console.log('✅ Non-student user, skipping student permission check');
        return next();
      }
      
      const hasPermission = hasStudentPermission(featureName, action);
      console.log('🔍 Student permission check result:', hasPermission);
      
      if (!hasPermission) {
        console.log('❌ Student permission denied for:', featureName, action);
        return res.status(403).json({
          error: 'Students do not have permission for this action',
          code: 'STUDENT_PERMISSION_DENIED',
          feature: featureName,
          action: action
        });
      }
      
      console.log('✅ Student permission granted for:', featureName, action);
      next();
    } catch (error) {
      console.error('❌ Error in checkStudentPermission middleware:', error);
      return res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR',
        details: error.message
      });
    }
  };
};

/**
 * Middleware to ensure students can only access their own data
 * @param {string} paramName - Name of the parameter to check (default: 'id')
 * @returns {Function} Express middleware function
 */
const ensureOwnData = (paramName = 'id') => {
  return async (req, res, next) => {
    // Only apply to students
    if (req.user.role !== 'student') {
      return next();
    }
    
    const targetId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    
    // If no ID specified, they're accessing their own data by default
    if (!targetId) {
      return next();
    }
    
    // For student-specific endpoints, ensure they can only access their own data
    if (paramName === 'studentId' || paramName === 'id') {
      if (targetId !== req.user.id) {
        return res.status(403).json({
          error: 'Students can only access their own data',
          code: 'STUDENT_DATA_ACCESS_DENIED'
        });
      }
    }
    
    next();
  };
};

/**
 * Middleware to filter data for students (only show their own records)
 * @param {string} filterField - Field to filter by (default: 'studentId')
 * @returns {Function} Express middleware function
 */
const filterStudentData = (filterField = 'studentId') => {
  return (req, res, next) => {
    // Only apply to students
    if (req.user.role !== 'student') {
      return next();
    }
    
    // Add student filter to query parameters
    if (filterField === 'studentId') {
      req.query.studentId = req.user.id;
    } else if (filterField === 'userId') {
      req.query.userId = req.user.id;
    }
    
    // Remove any attempts to access other students' data
    delete req.query.classId; // Students shouldn't filter by class
    delete req.query.schoolId; // Already handled by tenancy
    
    next();
  };
};

/**
 * Check if student can access homework submission features
 * @param {string} action - Action type (view, submit, update)
 * @returns {Function} Express middleware function
 */
const checkHomeworkAccess = (action = 'view') => {
  return async (req, res, next) => {
    // Only apply to students
    if (req.user.role !== 'student') {
      return next();
    }
    
    const homeworkId = req.params.id || req.params.homeworkId;
    
    if (homeworkId && (action === 'submit' || action === 'update')) {
      try {
        // Get student's class information
        const student = await Student.findOne({
          where: { userId: req.user.id },
          include: [{ model: Class, as: 'class' }]
        });
        
        if (!student || !student.class) {
          return res.status(403).json({
            error: 'Student must be enrolled in a class to submit homework',
            code: 'STUDENT_CLASS_REQUIRED'
          });
        }
        
        // Store student info for use in route handlers
        req.studentInfo = student;
        
      } catch (error) {
        console.error('Error checking student homework access:', error);
        return res.status(500).json({ error: 'Failed to verify student access' });
      }
    }
    
    next();
  };
};

/**
 * Check if student can access complaint features
 * @param {string} action - Action type (view, create, update)
 * @returns {Function} Express middleware function
 */
const checkComplaintAccess = (action = 'view') => {
  return (req, res, next) => {
    // Only apply to students
    if (req.user.role !== 'student') {
      return next();
    }
    
    // Students can create, view, and update their own complaints
    if (action === 'create') {
      // Ensure the complaint is being created by the student
      if (req.body.studentId && req.body.studentId !== req.user.id) {
        return res.status(403).json({
          error: 'Students can only create complaints for themselves',
          code: 'STUDENT_COMPLAINT_ACCESS_DENIED'
        });
      }
      req.body.studentId = req.user.id; // Force student ID
    }
    
    next();
  };
};

/**
 * Check if student can access fee information
 * @param {string} action - Action type (view)
 * @returns {Function} Express middleware function
 */
const checkFeeAccess = (action = 'view') => {
  return async (req, res, next) => {
    // Only apply to students
    if (req.user.role !== 'student') {
      return next();
    }
    
    // Students can only view their own fees
    if (action !== 'view') {
      return res.status(403).json({
        error: 'Students can only view fee information',
        code: 'STUDENT_FEE_ACCESS_DENIED'
      });
    }
    
    // For the /fees/student/:studentId route, verify the studentId matches the logged-in user
    const requestedStudentId = req.params.studentId;
    if (requestedStudentId) {
      try {
        // Get the student profile for the logged-in user
        const { Student } = require('../models');
        const studentProfile = await Student.findOne({
          where: { userId: req.user.id }
        });
        
        if (!studentProfile) {
          return res.status(404).json({
            error: 'Student profile not found',
            code: 'STUDENT_PROFILE_NOT_FOUND'
          });
        }
        
        // Check if the requested studentId matches the user's student profile
        if (requestedStudentId !== studentProfile.id) {
          return res.status(403).json({
            error: 'Students can only access their own fee information',
            code: 'STUDENT_FEE_ACCESS_DENIED'
          });
        }
      } catch (error) {
        console.error('Error checking student fee access:', error);
        return res.status(500).json({
          error: 'Failed to verify student access',
          code: 'STUDENT_ACCESS_CHECK_FAILED'
        });
      }
    }
    
    next();
  };
};

module.exports = {
  hasStudentPermission,
  checkStudentPermission,
  ensureOwnData,
  filterStudentData,
  checkHomeworkAccess,
  checkComplaintAccess,
  checkFeeAccess
};