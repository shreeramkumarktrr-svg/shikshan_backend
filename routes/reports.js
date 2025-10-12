const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const { filterTeacherReports } = require('../middleware/teacherPermissions');

// Get available reports
router.get('/', auth, filterTeacherReports, (req, res) => {
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

  res.json({ 
    message: 'Available reports',
    reports: availableReports,
    userRole: req.user.role
  });
});

// Get specific report
router.get('/:reportType', auth, filterTeacherReports, (req, res) => {
  const { reportType } = req.params;
  
  res.json({ 
    message: `${reportType} report - to be implemented`,
    reportType,
    userRole: req.user.role,
    accessGranted: true
  });
});

module.exports = router;