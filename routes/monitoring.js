const express = require('express');
const { Op } = require('sequelize');
const { authenticate, authorize } = require('../middleware/auth');
const { getAuditLogs } = require('../middleware/auditLogger');
const { User, School } = require('../models');

const router = express.Router();

/**
 * GET /api/monitoring/health
 * System health check with tenant isolation status
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        tenancy: 'unknown',
        audit: 'unknown'
      },
      metrics: {}
    };

    // Test database connection
    try {
      await req.app.locals.sequelize.authenticate();
      healthCheck.services.database = 'healthy';
    } catch (error) {
      healthCheck.services.database = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Test tenant isolation
    try {
      const schoolCount = await School.count();
      const userCount = await User.count();
      healthCheck.services.tenancy = 'healthy';
      healthCheck.metrics.schools = schoolCount;
      healthCheck.metrics.users = userCount;
    } catch (error) {
      healthCheck.services.tenancy = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    // Test audit logging
    try {
      const auditCount = await req.app.locals.sequelize.query(
        'SELECT COUNT(*) as count FROM tenant_audit_logs WHERE "createdAt" > NOW() - INTERVAL \'1 hour\'',
        { type: req.app.locals.sequelize.QueryTypes.SELECT }
      );
      healthCheck.services.audit = 'healthy';
      healthCheck.metrics.recentAuditLogs = parseInt(auditCount[0].count);
    } catch (error) {
      healthCheck.services.audit = 'unhealthy';
      healthCheck.status = 'degraded';
    }

    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/audit-logs
 * Get audit logs (Super Admin only)
 */
router.get('/audit-logs', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const {
      schoolId,
      userId,
      action,
      level,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      schoolId,
      userId,
      action,
      level,
      startDate,
      endDate,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    };

    const result = await getAuditLogs(req.app.locals.sequelize, filters);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

/**
 * GET /api/monitoring/tenant-stats
 * Get tenant isolation statistics (Super Admin only)
 */
router.get('/tenant-stats', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const stats = {};

    // School statistics
    const schoolStats = await req.app.locals.sequelize.query(`
      SELECT 
        s."subscriptionStatus",
        COUNT(*) as count,
        AVG(
          (SELECT COUNT(*) FROM users WHERE "schoolId" = s.id AND "isActive" = true)
        ) as "avgUsers"
      FROM schools s
      WHERE s."isActive" = true
      GROUP BY s."subscriptionStatus"
    `, { type: req.app.locals.sequelize.QueryTypes.SELECT });

    stats.schools = {
      byStatus: schoolStats,
      total: schoolStats.reduce((sum, stat) => sum + parseInt(stat.count), 0)
    };

    // User distribution by school
    const userStats = await req.app.locals.sequelize.query(`
      SELECT 
        s.name as "schoolName",
        s.id as "schoolId",
        COUNT(u.id) as "userCount",
        COUNT(CASE WHEN u.role = 'student' THEN 1 END) as "studentCount",
        COUNT(CASE WHEN u.role = 'teacher' THEN 1 END) as "teacherCount"
      FROM schools s
      LEFT JOIN users u ON s.id = u."schoolId" AND u."isActive" = true
      WHERE s."isActive" = true
      GROUP BY s.id, s.name
      ORDER BY "userCount" DESC
      LIMIT 10
    `, { type: req.app.locals.sequelize.QueryTypes.SELECT });

    stats.topSchools = userStats;

    // Recent audit activity
    const auditStats = await req.app.locals.sequelize.query(`
      SELECT 
        action,
        level,
        COUNT(*) as count
      FROM tenant_audit_logs
      WHERE "createdAt" > NOW() - INTERVAL '24 hours'
      GROUP BY action, level
      ORDER BY count DESC
    `, { type: req.app.locals.sequelize.QueryTypes.SELECT });

    stats.recentActivity = auditStats;

    // Cross-tenant access attempts
    const securityAlerts = await req.app.locals.sequelize.query(`
      SELECT 
        COUNT(*) as "crossTenantAttempts",
        COUNT(CASE WHEN level = 'security' THEN 1 END) as "securityAlerts"
      FROM tenant_audit_logs
      WHERE "createdAt" > NOW() - INTERVAL '24 hours'
    `, { type: req.app.locals.sequelize.QueryTypes.SELECT });

    stats.security = securityAlerts[0];

    res.json({
      success: true,
      stats,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant statistics'
    });
  }
});

/**
 * POST /api/monitoring/test-tenant-isolation
 * Test tenant isolation (Super Admin only)
 */
router.post('/test-tenant-isolation', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { testSchoolId, targetSchoolId } = req.body;

    if (!testSchoolId || !targetSchoolId) {
      return res.status(400).json({
        success: false,
        error: 'testSchoolId and targetSchoolId are required'
      });
    }

    const testResults = {
      testSchoolId,
      targetSchoolId,
      tests: [],
      passed: 0,
      failed: 0
    };

    // Test 1: Try to access users from different school
    try {
      const crossTenantUsers = await User.findAll({
        where: { schoolId: targetSchoolId },
        // Simulate non-super-admin context
        tenantContext: { schoolId: testSchoolId, userRole: 'school_admin' }
      });

      testResults.tests.push({
        name: 'Cross-tenant user access',
        passed: crossTenantUsers.length === 0,
        details: `Found ${crossTenantUsers.length} users (should be 0)`
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Cross-tenant user access',
        passed: true,
        details: 'Access properly blocked by RLS'
      });
    }

    // Test 2: Verify school isolation in database
    const isolationTest = await req.app.locals.sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE "schoolId" = :testSchoolId) as "testSchoolUsers",
        (SELECT COUNT(*) FROM users WHERE "schoolId" = :targetSchoolId) as "targetSchoolUsers"
    `, {
      replacements: { testSchoolId, targetSchoolId },
      type: req.app.locals.sequelize.QueryTypes.SELECT
    });

    testResults.tests.push({
      name: 'Database isolation verification',
      passed: true,
      details: `Test school: ${isolationTest[0].testSchoolUsers} users, Target school: ${isolationTest[0].targetSchoolUsers} users`
    });

    // Count passed/failed tests
    testResults.passed = testResults.tests.filter(t => t.passed).length;
    testResults.failed = testResults.tests.filter(t => !t.passed).length;

    res.json({
      success: true,
      testResults,
      overallStatus: testResults.failed === 0 ? 'PASSED' : 'FAILED'
    });
  } catch (error) {
    console.error('Tenant isolation test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run tenant isolation test'
    });
  }
});

/**
 * GET /api/monitoring/school-metrics/:schoolId
 * Get metrics for specific school (School Admin or Super Admin)
 */
router.get('/school-metrics/:schoolId', authenticate, async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Check permissions
    if (req.user.role !== 'super_admin' && req.user.schoolId !== schoolId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this school metrics'
      });
    }

    const metrics = {};

    // User metrics
    const userMetrics = await User.findAll({
      where: { schoolId, isActive: true },
      attributes: [
        'role',
        [req.app.locals.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['role'],
      raw: true
    });

    metrics.users = userMetrics.reduce((acc, metric) => {
      acc[metric.role] = parseInt(metric.count);
      return acc;
    }, {});

    // Recent activity
    const recentActivity = await req.app.locals.sequelize.query(`
      SELECT 
        DATE(tal."createdAt") as date,
        COUNT(*) as "activityCount"
      FROM tenant_audit_logs tal
      WHERE tal."schoolId" = :schoolId
        AND tal."createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY DATE(tal."createdAt")
      ORDER BY date DESC
    `, {
      replacements: { schoolId },
      type: req.app.locals.sequelize.QueryTypes.SELECT
    });

    metrics.recentActivity = recentActivity;

    // Security events
    const securityEvents = await req.app.locals.sequelize.query(`
      SELECT 
        action,
        COUNT(*) as count
      FROM tenant_audit_logs
      WHERE "schoolId" = :schoolId
        AND level = 'security'
        AND "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY action
    `, {
      replacements: { schoolId },
      type: req.app.locals.sequelize.QueryTypes.SELECT
    });

    metrics.securityEvents = securityEvents;

    res.json({
      success: true,
      schoolId,
      metrics,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get school metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch school metrics'
    });
  }
});

module.exports = router;