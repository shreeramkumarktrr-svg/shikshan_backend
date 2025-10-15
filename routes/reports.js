const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const { filterTeacherReports } = require('../middleware/teacherPermissions');

// Import models with error handling
let models;
try {
  models = require('../models');
} catch (error) {
  console.error('Error loading models in reports route:', error);
  models = null;
}

// Health check for reports route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Reports route is working',
    timestamp: new Date().toISOString(),
    modelsLoaded: models !== null
  });
});

// Get available reports
router.get('/', auth, filterTeacherReports, async (req, res) => {
  try {
    console.log('Reports route accessed by user:', req.user?.id, req.user?.role);
    
    const allReports = [
      { id: 'attendance', name: 'Attendance Report', category: 'academic' },
      { id: 'academic', name: 'Academic Performance', category: 'academic' },
      { id: 'student_performance', name: 'Student Performance', category: 'academic' },
      { id: 'homework', name: 'Homework Report', category: 'academic' },
      { id: 'events', name: 'Events Report', category: 'general' },
      { id: 'complaints', name: 'Complaints Report', category: 'general' },
      { id: 'class_summary', name: 'Class Summary', category: 'academic' },
      { id: 'student_list', name: 'Student List', category: 'general' },
      // Financial reports (restricted for teachers)
      { id: 'financial', name: 'Financial Report', category: 'financial' },
      { id: 'fees', name: 'Fee Collection Report', category: 'financial' },
      { id: 'payments', name: 'Payment History', category: 'financial' },
      { id: 'revenue', name: 'Revenue Report', category: 'financial' },
      { id: 'expenses', name: 'Expense Report', category: 'financial' }
    ];

    // Filter reports based on user role
    let availableReports = allReports;
    
    if (req.user.role === 'teacher') {
      // Teachers can only access non-financial reports
      availableReports = allReports.filter(report => report.category !== 'financial');
    }

    console.log('Returning reports for role:', req.user.role, 'Count:', availableReports.length);

    res.json({ 
      success: true,
      message: 'Available reports',
      reports: availableReports,
      userRole: req.user.role,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in reports route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get specific report
router.get('/:reportType', auth, filterTeacherReports, async (req, res) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate, classId, studentId } = req.query;
    
    console.log('Specific report requested:', reportType, 'by user:', req.user?.id, req.user?.role);
    console.log('Query params:', { startDate, endDate, classId, studentId });

    // Validate report type
    const validReports = [
      'attendance', 'academic', 'student_performance', 'homework', 
      'events', 'complaints', 'class_summary', 'student_list',
      'financial', 'fees', 'payments', 'revenue', 'expenses'
    ];

    if (!validReports.includes(reportType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report type',
        reportType,
        validReports
      });
    }

    // For now, return placeholder data
    const reportData = {
      reportType,
      userRole: req.user.role,
      accessGranted: true,
      filters: { startDate, endDate, classId, studentId },
      data: [],
      message: `${reportType} report - implementation in progress`,
      timestamp: new Date().toISOString()
    };

    // Add some mock data based on report type
    switch (reportType) {
      case 'attendance':
        reportData.data = [
          { date: '2024-10-15', present: 25, absent: 5, total: 30 },
          { date: '2024-10-14', present: 28, absent: 2, total: 30 }
        ];
        break;
      case 'student_list':
        reportData.data = [
          { id: 1, name: 'John Doe', class: '10A', rollNumber: '001' },
          { id: 2, name: 'Jane Smith', class: '10A', rollNumber: '002' }
        ];
        break;
      default:
        reportData.data = { message: 'Report data will be implemented soon' };
    }

    res.json({
      success: true,
      ...reportData
    });
  } catch (error) {
    console.error('Error in specific report route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      message: error.message,
      reportType: req.params.reportType,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;