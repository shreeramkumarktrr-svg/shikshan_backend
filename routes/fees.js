const express = require('express');
const router = express.Router();
const { Fee, StudentFee, Class, Student, User, Parent } = require('../models');
const { authenticate } = require('../middleware/auth');
const { checkFeatureAccess } = require('../middleware/featureAccess');
const { blockTeacherFeesAccess } = require('../middleware/teacherPermissions');
const { checkStudentPermission, checkFeeAccess } = require('../middleware/studentPermissions');
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

// Test endpoint to check models and associations
router.get('/test-models', authenticate, async (req, res) => {
  try {
    console.log('🧪 Testing models for user:', req.user.id, 'role:', req.user.role);
    
    // Test Student model
    const student = await Student.findOne({
      where: { userId: req.user.id }
    });
    
    console.log('Student found:', !!student, student?.id);
    
    if (student) {
      // Test StudentFee model
      const studentFees = await StudentFee.findAll({
        where: { studentId: student.id },
        limit: 1
      });
      
      console.log('StudentFees found:', studentFees.length);
      
      // Test with includes
      const studentFeesWithIncludes = await StudentFee.findAll({
        where: { studentId: student.id },
        include: [
          {
            model: Fee,
            as: 'fee'
          }
        ],
        limit: 1
      });
      
      console.log('StudentFees with includes:', studentFeesWithIncludes.length);
    }
    
    res.json({
      success: true,
      userId: req.user.id,
      userRole: req.user.role,
      studentFound: !!student,
      studentId: student?.id,
      message: 'Models test completed'
    });
  } catch (error) {
    console.error('❌ Models test error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Debug endpoint - no middleware
router.get('/debug-user', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        role: req.user.role,
        schoolId: req.user.schoolId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user's fees (for students) - Simple version
router.get('/my-fees-simple', authenticate, async (req, res) => {
  try {
    console.log('🔍 Simple my-fees endpoint called by user:', req.user.id, 'role:', req.user.role);
    
    // Only students can use this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({ 
        error: 'This endpoint is only for students',
        code: 'STUDENT_ONLY_ENDPOINT'
      });
    }

    // Get the student profile for the logged-in user
    const student = await Student.findOne({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found. Please contact your school administrator.',
        code: 'STUDENT_PROFILE_NOT_FOUND'
      });
    }

    // Fetch student fees without complex includes first
    const studentFees = await StudentFee.findAll({
      where: { studentId: student.id }
    });

    console.log('✅ Simple student fees found:', studentFees.length);
    res.json({ 
      studentFees,
      studentId: student.id,
      userId: req.user.id
    });
  } catch (error) {
    console.error('❌ Error in simple my-fees:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});

// Get student's fee statistics
router.get('/my-stats', authenticate, checkStudentPermission('fees', 'view'), async (req, res) => {
  try {
    // Only students can use this endpoint
    if (req.user.role !== 'student') {
      return res.status(403).json({ 
        error: 'This endpoint is only for students',
        code: 'STUDENT_ONLY_ENDPOINT'
      });
    }

    // Get the student profile
    const student = await Student.findOne({
      where: { userId: req.user.id }
    });

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found',
        code: 'STUDENT_PROFILE_NOT_FOUND'
      });
    }

    // Get student's fee statistics
    const studentFees = await StudentFee.findAll({
      where: { studentId: student.id },
      include: [
        {
          model: Fee,
          as: 'fee',
          attributes: ['amount', 'dueDate']
        }
      ]
    });

    const totalFees = studentFees.reduce((sum, sf) => sum + (sf.fee?.amount || 0), 0);
    const totalPaid = studentFees.reduce((sum, sf) => sum + (sf.paidAmount || 0), 0);
    const totalPending = studentFees.filter(sf => sf.status === 'pending').reduce((sum, sf) => sum + (sf.fee?.amount || 0) - (sf.paidAmount || 0), 0);
    const totalOverdue = studentFees.filter(sf => sf.status === 'overdue').reduce((sum, sf) => sum + (sf.fee?.amount || 0) - (sf.paidAmount || 0), 0);

    res.json({
      totalFees,
      totalPaid,
      totalPending,
      totalOverdue,
      feeCount: studentFees.length
    });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch your fee statistics',
      code: 'FETCH_STUDENT_STATS_FAILED'
    });
  }
});

// Get current user's fees (for students)
router.get('/my-fees', authenticate, checkStudentPermission('fees', 'view'), async (req, res) => {
  try {
    console.log('🔍 My-fees endpoint called by user:', req.user.id, 'role:', req.user.role);
    
    // Only students can use this endpoint
    if (req.user.role !== 'student') {
      console.log('❌ Non-student trying to access my-fees:', req.user.role);
      return res.status(403).json({ 
        error: 'This endpoint is only for students',
        code: 'STUDENT_ONLY_ENDPOINT'
      });
    }

    console.log('🔍 Looking for student profile for userId:', req.user.id);
    
    // Get the student profile for the logged-in user
    const student = await Student.findOne({
      where: { userId: req.user.id },
      attributes: ['id']
    });

    console.log('🔍 Student profile found:', !!student, student?.id);

    if (!student) {
      console.log('❌ Student profile not found for userId:', req.user.id);
      return res.status(404).json({
        error: 'Student profile not found. Please contact your school administrator.',
        code: 'STUDENT_PROFILE_NOT_FOUND'
      });
    }

    console.log('🔍 Fetching student fees for studentId:', student.id);
    
    // Fetch student fees
    const studentFees = await StudentFee.findAll({
      where: { studentId: student.id },
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

    console.log('✅ Student fees found:', studentFees.length);
    res.json({ studentFees });
  } catch (error) {
    console.error('❌ Error fetching student fees:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch your fees. Please try again later.',
      code: 'FETCH_STUDENT_FEES_FAILED',
      details: error.message
    });
  }
});

// Get fee statistics
router.get('/stats/overview', authenticate, blockTeacherFeesAccess, async (req, res) => {
  // Students should use /my-stats endpoint instead
  if (req.user.role === 'student') {
    return res.status(403).json({
      error: 'Students should use /my-stats endpoint',
      code: 'USE_MY_STATS_ENDPOINT'
    });
  }
  try {
    console.log('📊 Fetching fee statistics for user:', req.user.role, 'schoolId:', req.user.schoolId);
    
    const { classId } = req.query;
    const whereClause = {};
    
    // Apply school filter based on user role
    if (req.user.role !== 'super_admin') {
      whereClause.schoolId = req.user.schoolId;
    }
    
    if (classId) {
      whereClause.classId = classId;
    }

    console.log('📊 Using where clause:', whereClause);

    // Simplified queries with better error handling
    let totalFees = 0;
    let totalCollected = 0;
    let totalStudentFees = 0;
    let paidStudentFees = 0;

    try {
      totalFees = await Fee.sum('amount', { where: whereClause }) || 0;
      console.log('📊 Total fees:', totalFees);
    } catch (feeError) {
      console.error('Error calculating total fees:', feeError);
    }

    try {
      // Get all student fees for the school
      const studentFeeWhere = {};
      if (req.user.role !== 'super_admin') {
        // For non-super admin, we need to join with Fee to filter by school
        const schoolFees = await Fee.findAll({
          where: whereClause,
          attributes: ['id']
        });
        const feeIds = schoolFees.map(fee => fee.id);
        
        if (feeIds.length > 0) {
          studentFeeWhere.feeId = { [Op.in]: feeIds };
          
          totalStudentFees = await StudentFee.count({ where: studentFeeWhere });
          paidStudentFees = await StudentFee.count({ 
            where: { ...studentFeeWhere, status: 'paid' } 
          });
          totalCollected = await StudentFee.sum('paidAmount', { where: studentFeeWhere }) || 0;
        }
      } else {
        // Super admin can query directly
        totalStudentFees = await StudentFee.count();
        paidStudentFees = await StudentFee.count({ where: { status: 'paid' } });
        totalCollected = await StudentFee.sum('paidAmount') || 0;
      }
      
      console.log('📊 Student fees stats:', { totalStudentFees, paidStudentFees, totalCollected });
    } catch (studentFeeError) {
      console.error('Error calculating student fee stats:', studentFeeError);
    }

    const totalPending = Math.max(0, totalFees - totalCollected);
    const collectionRate = totalFees > 0 ? ((totalCollected / totalFees) * 100).toFixed(2) : 0;

    const result = {
      totalFees,
      totalCollected,
      totalPending,
      totalOverdue: 0, // Calculate based on due dates if needed
      collectionRate: parseFloat(collectionRate)
    };

    console.log('📊 Final stats result:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching fee statistics:', error);
    console.error('Error stack:', error.stack);
    
    // Return default stats to prevent UI errors
    res.json({
      totalFees: 0,
      totalCollected: 0,
      totalPending: 0,
      totalOverdue: 0,
      collectionRate: 0
    });
  }
});

// Get all fees for a school
router.get('/', authenticate, blockTeacherFeesAccess, checkStudentPermission('fees', 'view'), checkFeeAccess('view'), async (req, res) => {
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

// Get fee by ID (MUST be after specific routes like /my-fees)
router.get('/:id', authenticate, blockTeacherFeesAccess, async (req, res) => {
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
          attributes: ['id', 'studentId', 'feeId', 'amount', 'paidAmount', 'status', 'paidDate', 'paymentMethod', 'createdAt', 'updatedAt'],
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
router.get('/student/:studentId', authenticate, blockTeacherFeesAccess, checkStudentPermission('fees', 'view'), checkFeeAccess('view'), async (req, res) => {
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

// Update bulk payments for a fee
router.put('/:id/payments/bulk', authenticate, blockTeacherFeesAccess, async (req, res) => {
  try {
    // Check if user has permission to manage fees
    const allowedRoles = ['school_admin', 'principal'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'You do not have permission to update fee payments',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const { id } = req.params;
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ 
        error: 'Updates array is required',
        code: 'INVALID_UPDATES_FORMAT'
      });
    }

    // Verify the fee exists and belongs to the user's school
    const fee = await Fee.findOne({
      where: { 
        id,
        schoolId: req.user.schoolId 
      }
    });

    if (!fee) {
      return res.status(404).json({ 
        error: 'Fee not found',
        code: 'FEE_NOT_FOUND'
      });
    }

    // Process each update
    const results = [];
    for (const update of updates) {
      try {
        const { studentFeeId, status, paidAmount, paidDate, paymentMethod } = update;

        console.log('🔍 Looking for studentFee:', { studentFeeId, feeId: id });
        
        // Find the student fee
        const studentFee = await StudentFee.findOne({
          where: { 
            id: studentFeeId,
            feeId: id
          },
          include: [
            {
              model: Student,
              as: 'student',
              include: [
                {
                  model: User,
                  as: 'user',
                  where: { schoolId: req.user.schoolId }
                }
              ]
            }
          ]
        });
        
        console.log('🔍 StudentFee found:', !!studentFee, studentFee?.id);

        if (!studentFee) {
          results.push({
            studentFeeId,
            success: false,
            error: 'Student fee not found'
          });
          continue;
        }

        // Prepare update data
        const updateData = {};
        if (status) updateData.status = status;
        if (paidAmount !== undefined) updateData.paidAmount = parseFloat(paidAmount) || 0;
        if (paidDate) updateData.paidDate = new Date(paidDate);
        if (paymentMethod) updateData.paymentMethod = paymentMethod;

        // Auto-set payment date if status is paid and no date provided
        if (status === 'paid' && !paidDate && !studentFee.paidDate) {
          updateData.paidDate = new Date();
        }

        console.log('🔄 Updating studentFee with data:', updateData);
        
        // Update the student fee
        const updatedStudentFee = await studentFee.update(updateData);
        
        console.log('✅ StudentFee updated:', updatedStudentFee.toJSON());

        results.push({
          studentFeeId,
          success: true,
          message: 'Payment updated successfully'
        });

      } catch (updateError) {
        console.error('Error updating student fee:', updateError);
        results.push({
          studentFeeId: update.studentFeeId,
          success: false,
          error: updateError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Updated ${successCount} payments successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
      summary: {
        total: updates.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Error updating bulk payments:', error);
    res.status(500).json({ 
      error: 'Failed to update payments',
      code: 'BULK_UPDATE_FAILED',
      details: error.message
    });
  }
});

// POST routes and other methods would go here...

module.exports = router;