const express = require('express');
const router = express.Router();
const { Fee, StudentFee, Class, Student, User, Parent } = require('../models');
const { authenticate } = require('../middleware/auth');
const { checkFeatureAccess } = require('../middleware/featureAccess');
const { Op } = require('sequelize');

// Test endpoint to verify routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Fees routes are working!', 
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/fees',
      'POST /api/fees/generate',
      'GET /api/fees/stats/overview'
    ]
  });
});

// Test generate endpoint without auth
router.post('/test-generate', async (req, res) => {
  try {
    // Test database connection
    const feeCount = await Fee.count();
    const studentFeeCount = await StudentFee.count();
    const classCount = await Class.count();
    
    res.json({
      message: 'Generate endpoint is reachable',
      body: req.body,
      timestamp: new Date().toISOString(),
      dbTest: {
        fees: feeCount,
        studentFees: studentFeeCount,
        classes: classCount
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database error',
      error: error.message,
      body: req.body
    });
  }
});

// Get all fees for a school
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, status } = req.query;
    const whereClause = { schoolId: req.user.schoolId };
    
    if (classId) {
      whereClause.classId = classId;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const fees = await Fee.findAll({
      where: whereClause,
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'section'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: StudentFee,
          as: 'studentFees',
          required: false,
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'rollNumber', 'admissionNumber'],
              required: false,
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'firstName', 'lastName'],
                  required: false
                }
              ]
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ fees, success: true });
  } catch (error) {
    console.error('Error fetching fees:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      message: 'Error fetching fees',
      error: error.message,
      success: false 
    });
  }
});

// Get fee by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const fee = await Fee.findOne({
      where: { 
        id: req.params.id,
        schoolId: req.user.schoolId 
      },
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'section']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: StudentFee,
          as: 'studentFees',
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'rollNumber', 'admissionNumber'],
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'firstName', 'lastName']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    res.json(fee);
  } catch (error) {
    console.error('Error fetching fee:', error);
    res.status(500).json({ message: 'Error fetching fee' });
  }
});

// Get student fees (for parents/students)
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status } = req.query;

    // Check permission - parents can only see their child's fees
    if (req.user.role === 'parent') {
      const student = await Student.findOne({
        where: { id: studentId },
        include: [{
          model: Parent,
          as: 'parents',
          include: [{
            model: User,
            as: 'user',
            where: { id: req.user.id }
          }]
        }]
      });
      
      if (!student) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const whereClause = { studentId };
    if (status) {
      whereClause.status = status;
    }

    const studentFees = await StudentFee.findAll({
      where: whereClause,
      include: [
        {
          model: Fee,
          as: 'fee',
          include: [
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'name', 'section']
            }
          ]
        },
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'rollNumber', 'admissionNumber'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(studentFees);
  } catch (error) {
    console.error('Error fetching student fees:', error);
    res.status(500).json({ message: 'Error fetching student fees' });
  }
});

// Get fee statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const { classId } = req.query;
    const whereClause = {};
    
    if (classId) {
      whereClause.classId = classId;
    }

    // Get fees for the school
    const fees = await Fee.findAll({
      where: {
        schoolId: req.user.schoolId,
        ...whereClause
      },
      include: [
        {
          model: StudentFee,
          as: 'studentFees'
        }
      ]
    });

    let totalFees = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    fees.forEach(fee => {
      fee.studentFees.forEach(studentFee => {
        totalFees += parseFloat(studentFee.amount);
        totalCollected += parseFloat(studentFee.paidAmount);
        
        const remaining = parseFloat(studentFee.amount) - parseFloat(studentFee.paidAmount);
        if (remaining > 0) {
          if (new Date(fee.dueDate) < new Date() && studentFee.status !== 'paid') {
            totalOverdue += remaining;
          } else {
            totalPending += remaining;
          }
        }
      });
    });

    res.json({
      totalFees: totalFees.toFixed(2),
      totalCollected: totalCollected.toFixed(2),
      totalPending: totalPending.toFixed(2),
      totalOverdue: totalOverdue.toFixed(2),
      collectionRate: totalFees > 0 ? ((totalCollected / totalFees) * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Error fetching fee statistics:', error);
    res.status(500).json({ message: 'Error fetching fee statistics' });
  }
});

// Generate fees for a class for a specific month (temporary debug version)
router.post('/generate-debug', async (req, res) => {
  try {
    console.log('=== GENERATE FEES DEBUG (NO AUTH) ===');
    console.log('Request body:', req.body);
    
    const { title, description, amount, classId, month, year } = req.body;

    // Validate required fields
    if (!title || !amount || !classId || !month || !year) {
      return res.status(400).json({ 
        message: 'Title, amount, class, month, and year are required' 
      });
    }

    // For debugging, just return success without creating anything
    res.status(201).json({
      message: 'Debug: Fee generation would work',
      data: { title, description, amount, classId, month, year },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug generate:', error);
    res.status(500).json({ message: 'Debug error: ' + error.message });
  }
});

// Generate fees for a class for a specific month
router.post('/generate', authenticate, async (req, res) => {
  try {
    console.log('=== GENERATE FEES DEBUG ===');
    console.log('User:', req.user?.id, req.user?.role, req.user?.schoolId);
    console.log('Request body:', req.body);
    
    const { title, description, amount, classId, month, year } = req.body;

    // Validate required fields
    if (!title || !amount || !classId || !month || !year) {
      return res.status(400).json({ 
        message: 'Title, amount, class, month, and year are required' 
      });
    }

    // Check if user has permission (allow more roles for testing)
    if (!['school_admin', 'principal', 'teacher', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only school staff can generate fees.' });
    }

    // Verify class belongs to user's school
    const classExists = await Class.findOne({
      where: { 
        id: classId,
        schoolId: req.user.schoolId 
      }
    });

    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Calculate due date (last day of the month)
    const dueDate = new Date(year, month, 0); // Last day of the month

    // Check if fee already exists for this class and month
    const existingFee = await Fee.findOne({
      where: {
        classId,
        schoolId: req.user.schoolId,
        title: title,
        dueDate: {
          [Op.between]: [
            new Date(year, month - 1, 1), // First day of month
            new Date(year, month, 0)      // Last day of month
          ]
        }
      }
    });

    if (existingFee) {
      return res.status(400).json({ 
        message: 'Fee already exists for this class and month' 
      });
    }

    // Create fee
    const fee = await Fee.create({
      title,
      description: description || `Monthly fee for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      amount,
      dueDate,
      classId,
      schoolId: req.user.schoolId,
      createdBy: req.user.id
    });

    // Get all active students in the class
    const students = await Student.findAll({
      where: { 
        classId,
        isActive: true 
      }
    });

    if (students.length === 0) {
      // Delete the fee if no students found
      await fee.destroy();
      return res.status(400).json({ 
        message: 'No active students found in this class' 
      });
    }

    // Create student fee records for all students in the class
    const studentFeePromises = students.map(student => 
      StudentFee.create({
        feeId: fee.id,
        studentId: student.id,
        amount: amount
      })
    );

    await Promise.all(studentFeePromises);

    // Fetch the created fee with associations
    const createdFee = await Fee.findByPk(fee.id, {
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'section']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: StudentFee,
          as: 'studentFees',
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'rollNumber', 'admissionNumber'],
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'firstName', 'lastName']
                }
              ]
            }
          ]
        }
      ]
    });

    res.status(201).json({
      message: `Fee generated successfully for ${students.length} students`,
      fee: createdFee,
      studentsCount: students.length
    });
  } catch (error) {
    console.error('Error generating fee:', error);
    res.status(500).json({ message: 'Error generating fee' });
  }
});

// Create new fee
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, amount, dueDate, classId } = req.body;

    // Validate required fields
    if (!title || !amount || !dueDate || !classId) {
      return res.status(400).json({ 
        message: 'Title, amount, due date, and class are required' 
      });
    }

    // Check if user has permission (school admin or teacher)
    if (!['school_admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Verify class belongs to user's school
    const classExists = await Class.findOne({
      where: { 
        id: classId,
        schoolId: req.user.schoolId 
      }
    });

    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Create fee
    const fee = await Fee.create({
      title,
      description,
      amount,
      dueDate,
      classId,
      schoolId: req.user.schoolId,
      createdBy: req.user.id
    });

    // Get all students in the class
    const students = await Student.findAll({
      where: { classId }
    });

    // Create student fee records for all students in the class
    const studentFeePromises = students.map(student => 
      StudentFee.create({
        feeId: fee.id,
        studentId: student.id,
        amount: amount
      })
    );

    await Promise.all(studentFeePromises);

    // Fetch the created fee with associations
    const createdFee = await Fee.findByPk(fee.id, {
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'section']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: StudentFee,
          as: 'studentFees',
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'rollNumber', 'admissionNumber'],
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'firstName', 'lastName']
                }
              ]
            }
          ]
        }
      ]
    });

    res.status(201).json(createdFee);
  } catch (error) {
    console.error('Error creating fee:', error);
    res.status(500).json({ message: 'Error creating fee' });
  }
});

// Record fee payment
router.post('/payment/:studentFeeId', authenticate, async (req, res) => {
  try {
    const { studentFeeId } = req.params;
    const { paidAmount, paymentMethod, transactionId, notes } = req.body;

    // Check if user has permission
    if (!['school_admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const studentFee = await StudentFee.findByPk(studentFeeId, {
      include: [
        {
          model: Fee,
          as: 'fee',
          where: { schoolId: req.user.schoolId }
        }
      ]
    });

    if (!studentFee) {
      return res.status(404).json({ message: 'Student fee not found' });
    }

    if (!paidAmount || paidAmount <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const newPaidAmount = parseFloat(studentFee.paidAmount) + parseFloat(paidAmount);
    const totalAmount = parseFloat(studentFee.amount);

    if (newPaidAmount > totalAmount) {
      return res.status(400).json({ 
        message: 'Payment amount exceeds remaining balance' 
      });
    }

    // Determine new status
    let newStatus = 'partial';
    if (newPaidAmount >= totalAmount) {
      newStatus = 'paid';
    }

    // Update student fee
    await studentFee.update({
      paidAmount: newPaidAmount,
      status: newStatus,
      paidDate: newStatus === 'paid' ? new Date() : studentFee.paidDate,
      paymentMethod,
      transactionId,
      notes
    });

    // Fetch updated record
    const updatedStudentFee = await StudentFee.findByPk(studentFeeId, {
      include: [
        {
          model: Fee,
          as: 'fee',
          include: [
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'name', 'section']
            }
          ]
        },
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'rollNumber', 'admissionNumber'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName']
            }
          ]
        }
      ]
    });

    res.json(updatedStudentFee);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: 'Error recording payment' });
  }
});

// Update fee
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, amount, dueDate, status } = req.body;

    // Check if user has permission
    if (!['school_admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const fee = await Fee.findOne({
      where: { 
        id: req.params.id,
        schoolId: req.user.schoolId 
      }
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    // Update fee
    await fee.update({
      title: title || fee.title,
      description: description !== undefined ? description : fee.description,
      amount: amount || fee.amount,
      dueDate: dueDate || fee.dueDate,
      status: status || fee.status
    });

    // If amount changed, update all unpaid student fees
    if (amount && amount !== fee.amount) {
      await StudentFee.update(
        { amount },
        {
          where: {
            feeId: fee.id,
            status: ['pending', 'partial']
          }
        }
      );
    }

    // Fetch updated fee with associations
    const updatedFee = await Fee.findByPk(fee.id, {
      include: [
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'section']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: StudentFee,
          as: 'studentFees',
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'rollNumber', 'admissionNumber'],
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'firstName', 'lastName']
                }
              ]
            }
          ]
        }
      ]
    });

    res.json(updatedFee);
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ message: 'Error updating fee' });
  }
});

// Delete fee
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Check if user has permission
    if (!['school_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const fee = await Fee.findOne({
      where: { 
        id: req.params.id,
        schoolId: req.user.schoolId 
      }
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found' });
    }

    // Check if any payments have been made
    const paidFees = await StudentFee.findOne({
      where: {
        feeId: fee.id,
        paidAmount: { [Op.gt]: 0 }
      }
    });

    if (paidFees) {
      return res.status(400).json({ 
        message: 'Cannot delete fee with existing payments. Set status to inactive instead.' 
      });
    }

    await fee.destroy();
    res.json({ message: 'Fee deleted successfully' });
  } catch (error) {
    console.error('Error deleting fee:', error);
    res.status(500).json({ message: 'Error deleting fee' });
  }
});

module.exports = router;