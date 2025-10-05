const jwt = require('jsonwebtoken');
const { User, School } = require('../models');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'subscriptionStatus', 'isActive']
        }
      ]
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }
    
    // Check if school is active (except for super admin)
    if (user.role !== 'super_admin' && user.school && !user.school.isActive) {
      return res.status(403).json({ error: 'School account is inactive' });
    }
    
    req.user = user;
    req.schoolId = user.schoolId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Authorization middleware - check roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
};

// School context middleware - ensure user belongs to the school
const schoolContext = (req, res, next) => {
  const schoolId = req.params.schoolId || req.params.id || req.body.schoolId || req.query.schoolId;
  
  // Super admin can access any school
  if (req.user.role === 'super_admin') {
    return next();
  }
  
  // Other users can only access their own school
  if (schoolId && schoolId !== req.user.schoolId) {
    return res.status(403).json({ error: 'Access denied to this school' });
  }
  
  next();
};

// Permission-based authorization
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Super admin has all permissions
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    // Check if user has the specific permission
    const userPermissions = req.user.permissions || {};
    if (!userPermissions[permission]) {
      return res.status(403).json({ 
        error: 'Permission denied',
        required: permission
      });
    }
    
    next();
  };
};

// Rate limiting for sensitive operations
const sensitiveOperation = (req, res, next) => {
  // Add additional security checks for sensitive operations
  // like password changes, user deletion, etc.
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  schoolContext,
  hasPermission,
  sensitiveOperation
};