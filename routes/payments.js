const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Payment, School, Subscription } = require('../models');
const { authenticate, authorize, schoolContext } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const createPaymentSchema = Joi.object({
  schoolId: Joi.string().uuid().required(),
  subscriptionId: Joi.string().uuid().required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().length(3).default('INR'),
  paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'bank_transfer').optional(),
  billingPeriodStart: Joi.date().required(),
  billingPeriodEnd: Joi.date().required(),
  dueDate: Joi.date().optional(),
  notes: Joi.string().optional(),
  taxAmount: Joi.number().min(0).default(0),
  discountAmount: Joi.number().min(0).default(0),
  metadata: Joi.object().optional()
});

const updatePaymentSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded').optional(),
  paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'bank_transfer').optional(),
  gatewayTransactionId: Joi.string().optional(),
  gatewayResponse: Joi.object().optional(),
  paidAt: Joi.date().optional(),
  failureReason: Joi.string().optional(),
  notes: Joi.string().optional(),
  metadata: Joi.object().optional()
});

// Get all payments (Super Admin only)
router.get('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      schoolId, 
      subscriptionId,
      startDate,
      endDate 
    } = req.query;
    
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { transactionId: { [Op.iLike]: `%${search}%` } },
        { invoiceNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (schoolId) {
      whereClause.schoolId = schoolId;
    }
    
    if (subscriptionId) {
      whereClause.subscriptionId = subscriptionId;
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'name', 'planType']
        }
      ]
    });

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get payments for a specific school
router.get('/school/:schoolId', authenticate, schoolContext, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { schoolId: req.params.schoolId };
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'name', 'planType']
        }
      ]
    });

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get school payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Create payment
router.post('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { error, value } = createPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    // Verify school and subscription exist
    const school = await School.findByPk(value.schoolId);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const subscription = await Subscription.findByPk(value.subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const payment = await Payment.create(value);

    // Include related data in response
    const paymentWithDetails = await Payment.findByPk(payment.id, {
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'name', 'planType']
        }
      ]
    });

    res.status(201).json({
      message: 'Payment created successfully',
      payment: paymentWithDetails
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Get payment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'name', 'planType', 'price', 'billingCycle']
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check access permissions
    if (req.user.role !== 'super_admin' && payment.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Update payment
router.put('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { error, value } = updatePaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // If marking as completed, set paidAt if not provided
    if (value.status === 'completed' && !value.paidAt && !payment.paidAt) {
      value.paidAt = new Date();
    }

    await payment.update(value);

    // If payment is completed, update school subscription
    if (value.status === 'completed') {
      const school = await School.findByPk(payment.schoolId);
      if (school) {
        const subscription = await Subscription.findByPk(payment.subscriptionId);
        if (subscription) {
          await school.update({
            subscriptionId: payment.subscriptionId,
            subscriptionPlan: subscription.planType,
            subscriptionStatus: 'active',
            subscriptionExpiresAt: payment.billingPeriodEnd,
            maxStudents: subscription.maxStudents,
            maxTeachers: subscription.maxTeachers
          });
        }
      }
    }

    const updatedPayment = await Payment.findByPk(payment.id, {
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'name', 'planType']
        }
      ]
    });

    res.json({
      message: 'Payment updated successfully',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Process payment (simulate payment gateway)
router.post('/:id/process', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { paymentMethod, simulate = 'success' } = req.body;

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment is not in pending status' });
    }

    // Simulate payment processing
    await payment.update({ 
      status: 'processing',
      paymentMethod: paymentMethod || payment.paymentMethod
    });

    // Simulate gateway response after a delay
    setTimeout(async () => {
      try {
        const isSuccess = simulate === 'success';
        const gatewayTransactionId = `GW${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        const updateData = {
          status: isSuccess ? 'completed' : 'failed',
          gatewayTransactionId,
          gatewayResponse: {
            success: isSuccess,
            message: isSuccess ? 'Payment processed successfully' : 'Payment failed due to insufficient funds',
            timestamp: new Date().toISOString()
          }
        };

        if (isSuccess) {
          updateData.paidAt = new Date();
          
          // Update school subscription
          const school = await School.findByPk(payment.schoolId);
          if (school) {
            const subscription = await Subscription.findByPk(payment.subscriptionId);
            if (subscription) {
              await school.update({
                subscriptionId: payment.subscriptionId,
                subscriptionPlan: subscription.planType,
                subscriptionStatus: 'active',
                subscriptionExpiresAt: payment.billingPeriodEnd,
                maxStudents: subscription.maxStudents,
                maxTeachers: subscription.maxTeachers
              });
            }
          }
        } else {
          updateData.failureReason = 'Simulated payment failure';
        }

        await payment.update(updateData);
      } catch (error) {
        console.error('Payment processing simulation error:', error);
      }
    }, 2000);

    res.json({
      message: 'Payment processing initiated',
      payment: {
        id: payment.id,
        status: 'processing',
        transactionId: payment.transactionId
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Get payment analytics
router.get('/analytics/overview', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Total revenue
    const revenueStats = await Payment.findAll({
      where: { 
        status: 'completed',
        ...dateFilter
      },
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'totalRevenue'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalPayments'],
        [require('sequelize').fn('AVG', require('sequelize').col('amount')), 'averagePayment']
      ],
      raw: true
    });

    // Payment status breakdown
    const statusStats = await Payment.findAll({
      where: dateFilter,
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'amount']
      ],
      group: ['status'],
      raw: true
    });

    // Monthly revenue trend
    const monthlyRevenue = await Payment.findAll({
      where: {
        status: 'completed',
        ...dateFilter
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
      revenue: {
        total: parseFloat(revenueStats[0]?.totalRevenue || 0),
        totalPayments: parseInt(revenueStats[0]?.totalPayments || 0),
        average: parseFloat(revenueStats[0]?.averagePayment || 0)
      },
      statusBreakdown: statusStats.reduce((acc, curr) => {
        acc[curr.status] = {
          count: parseInt(curr.count),
          amount: parseFloat(curr.amount || 0)
        };
        return acc;
      }, {}),
      monthlyTrend: monthlyRevenue
    };

    res.json({ analytics });
  } catch (error) {
    console.error('Get payment analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch payment analytics' });
  }
});

module.exports = router;