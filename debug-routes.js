const express = require('express');
const { authenticate } = require('./middleware/auth');
const { User } = require('./models');

const router = express.Router();

// Debug route to test user authentication and school context
router.get('/debug/user', authenticate, async (req, res) => {
  try {
    console.log('Debug - User info:', {
      id: req.user?.id,
      role: req.user?.role,
      schoolId: req.user?.schoolId,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName
    });

    // Test basic user query
    const users = await User.findAll({
      where: { schoolId: req.user.schoolId },
      limit: 5,
      attributes: ['id', 'firstName', 'lastName', 'role']
    });

    console.log('Debug - Found users:', users.length);

    res.json({
      success: true,
      user: {
        id: req.user.id,
        role: req.user.role,
        schoolId: req.user.schoolId,
        name: `${req.user.firstName} ${req.user.lastName}`
      },
      usersFound: users.length,
      users: users.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({
      error: 'Debug route failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Debug route to test role filtering
router.get('/debug/roles', authenticate, async (req, res) => {
  try {
    const { role } = req.query;
    console.log('Debug - Role query:', role);

    let whereClause = { schoolId: req.user.schoolId };
    
    if (role) {
      if (role.includes(',')) {
        const roles = role.split(',').map(r => r.trim());
        whereClause.role = { [require('sequelize').Op.in]: roles };
        console.log('Debug - Multiple roles:', roles);
      } else {
        whereClause.role = role;
        console.log('Debug - Single role:', role);
      }
    }

    const users = await User.findAll({
      where: whereClause,
      limit: 10,
      attributes: ['id', 'firstName', 'lastName', 'role']
    });

    res.json({
      success: true,
      query: { role },
      whereClause,
      usersFound: users.length,
      users: users.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('Debug roles error:', error);
    res.status(500).json({
      error: 'Debug roles failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;