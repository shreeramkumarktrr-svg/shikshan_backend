const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { User, School } = require('../models');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().min(10).max(15).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('school_admin', 'principal', 'teacher', 'student', 'parent', 'finance_officer', 'support_staff').required(),
  schoolId: Joi.string().uuid().optional()
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(), // email or phone
  password: Joi.string().required(),
  schoolId: Joi.string().uuid().optional()
});

const otpLoginSchema = Joi.object({
  phone: Joi.string().min(10).max(15).required(),
  otp: Joi.string().length(6).required(),
  schoolId: Joi.string().uuid().optional()
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const { firstName, lastName, email, phone, password, role, schoolId } = value;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [email ? 'email' : 'phone']: email || phone,
        ...(schoolId && { schoolId })
      }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists with this email/phone' 
      });
    }

    // Validate school exists if schoolId provided
    if (schoolId) {
      const school = await School.findByPk(schoolId);
      if (!school || !school.isActive) {
        return res.status(400).json({ error: 'Invalid or inactive school' });
      }
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      passwordHash: password, // Will be hashed by the model hook
      role,
      schoolId
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        schoolId: user.schoolId
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login with email/phone and password
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const { identifier, password, schoolId } = value;

    // Find user by email or phone
    const whereClause = {
      [identifier.includes('@') ? 'email' : 'phone']: identifier,
      isActive: true
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const user = await User.findOne({
      where: whereClause,
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'subscriptionStatus', 'isActive']
        }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check school status
    if (user.school && !user.school.isActive) {
      return res.status(403).json({ error: 'School account is inactive' });
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    // Generate token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        schoolId: user.schoolId,
        school: user.school
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// OTP Login (placeholder - requires SMS service integration)
router.post('/otp-login', async (req, res) => {
  try {
    const { error, value } = otpLoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const { phone, otp, schoolId } = value;

    // TODO: Implement OTP verification with SMS service
    // For now, accept '123456' as valid OTP for demo
    if (otp !== '123456') {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    const user = await User.findOne({
      where: {
        phone,
        isActive: true,
        ...(schoolId && { schoolId })
      },
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'subscriptionStatus', 'isActive']
        }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Update last login and phone verification
    await user.update({ 
      lastLoginAt: new Date(),
      phoneVerified: true
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId
    });

    res.json({
      message: 'OTP login successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        schoolId: user.schoolId,
        school: user.school
      },
      token
    });
  } catch (error) {
    console.error('OTP login error:', error);
    res.status(500).json({ error: 'OTP login failed' });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'logo', 'subscriptionStatus', 'isActive']
        }
      ]
    });

    res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePic: user.profilePic,
        schoolId: user.schoolId,
        school: user.school,
        permissions: user.permissions,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Send OTP (placeholder)
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }

    // TODO: Implement SMS service integration
    // For demo, just return success
    console.log(`OTP sent to ${phone}: 123456`);

    res.json({
      message: 'OTP sent successfully',
      phone,
      expiresIn: 300 // 5 minutes
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Logout (client-side token removal, server-side could implement token blacklisting)
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, just return success as logout is handled client-side
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;