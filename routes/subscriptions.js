const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Subscription, School, Payment } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createSubscriptionSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().optional(),
  planType: Joi.string().valid('basic', 'standard', 'premium').required(),
  price: Joi.number().min(0).required(),
  currency: Joi.string().length(3).default('INR'),
  billingCycle: Joi.string().valid('monthly', 'quarterly', 'yearly').default('monthly'),
  trialDays: Joi.number().integer().min(0).max(365).default(30),
  maxStudents: Joi.number().integer().min(1).required(),
  maxTeachers: Joi.number().integer().min(1).required(),
  maxClasses: Joi.number().integer().min(1).required(),
  features: Joi.object().optional(),
  isActive: Joi.boolean().default(true),
  isPopular: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().default(0)
});

const updateSubscriptionSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  currency: Joi.string().length(3).optional(),
  billingCycle: Joi.string().valid('monthly', 'quarterly', 'yearly').optional(),
  trialDays: Joi.number().integer().min(0).max(365).optional(),
  maxStudents: Joi.number().integer().min(1).optional(),
  maxTeachers: Joi.number().integer().min(1).optional(),
  maxClasses: Joi.number().integer().min(1).optional(),
  features: Joi.object().optional(),
  isActive: Joi.boolean().optional(),
  isPopular: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional()
});

// Get all subscriptions
router.get('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { includeInactive = false } = req.query;

    const whereClause = {};
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const subscriptions = await Subscription.findAll({
      where: whereClause,
      order: [['sortOrder', 'ASC'], ['planType', 'ASC']],
      include: [
        {
          model: School,
          as: 'schools',
          attributes: ['id', 'name', 'subscriptionStatus'],
          required: false
        }
      ]
    });

    // Add school counts to each subscription
    const subscriptionsWithCounts = subscriptions.map(subscription => ({
      ...subscription.toJSON(),
      schoolCount: subscription.schools.length,
      activeSchoolCount: subscription.schools.filter(s => s.subscriptionStatus === 'active').length
    }));

    res.json({ subscriptions: subscriptionsWithCounts });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Get public subscriptions (for school registration)
router.get('/public', async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['planType', 'ASC']],
      attributes: [
        'id', 'name', 'description', 'planType', 'price', 'currency', 
        'billingCycle', 'trialDays', 'maxStudents', 'maxTeachers', 
        'maxClasses', 'features', 'isPopular'
      ]
    });

    res.json({ subscriptions });
  } catch (error) {
    console.error('Get public subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Create subscription
router.post('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { error, value } = createSubscriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    // Check if subscription with same planType already exists
    const existingSubscription = await Subscription.findOne({
      where: { planType: value.planType, isActive: true }
    });

    if (existingSubscription) {
      return res.status(409).json({ 
        error: `Active subscription plan for ${value.planType} already exists` 
      });
    }

    const subscription = await Subscription.create(value);

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Get subscription by ID
router.get('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id, {
      include: [
        {
          model: School,
          as: 'schools',
          attributes: ['id', 'name', 'email', 'subscriptionStatus', 'createdAt'],
          required: false
        }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Update subscription
router.put('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { error, value } = updateSubscriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await subscription.update(value);

    res.json({
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Delete subscription (soft delete by setting isActive to false)
router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Check if any schools are using this subscription
    const schoolCount = await School.count({
      where: { 
        subscriptionId: req.params.id,
        subscriptionStatus: { [Op.in]: ['active', 'trial'] }
      }
    });

    if (schoolCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete subscription. ${schoolCount} schools are currently using this plan.` 
      });
    }

    await subscription.update({ isActive: false });

    res.json({
      message: 'Subscription deactivated successfully'
    });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

// Get subscription analytics
router.get('/:id/analytics', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Get school counts by status
    const schoolStats = await School.findAll({
      where: { subscriptionId: req.params.id },
      attributes: [
        'subscriptionStatus',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['subscriptionStatus'],
      raw: true
    });

    // Get revenue data
    const revenueStats = await Payment.findAll({
      where: { 
        subscriptionId: req.params.id,
        status: 'completed'
      },
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'totalRevenue'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalPayments']
      ],
      raw: true
    });

    // Get monthly revenue trend (last 12 months)
    const monthlyRevenue = await Payment.findAll({
      where: {
        subscriptionId: req.params.id,
        status: 'completed',
        createdAt: {
          [Op.gte]: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000)
        }
      },
      attributes: [
        [require('sequelize').fn('DATE_TRUNC', 'month', require('sequelize').col('createdAt')), 'month'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'revenue'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'payments']
      ],
      group: [require('sequelize').fn('DATE_TRUNC', 'month', require('sequelize').col('createdAt'))],
      order: [[require('sequelize').fn('DATE_TRUNC', 'month', require('sequelize').col('createdAt')), 'ASC']],
      raw: true
    });

    const analytics = {
      schoolStats: schoolStats.reduce((acc, curr) => {
        acc[curr.subscriptionStatus] = parseInt(curr.count);
        return acc;
      }, {}),
      revenue: {
        total: parseFloat(revenueStats[0]?.totalRevenue || 0),
        totalPayments: parseInt(revenueStats[0]?.totalPayments || 0),
        monthly: monthlyRevenue
      }
    };

    res.json({ analytics });
  } catch (error) {
    console.error('Get subscription analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription analytics' });
  }
});

module.exports = router;