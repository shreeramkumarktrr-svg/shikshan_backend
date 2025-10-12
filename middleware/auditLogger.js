const { Op } = require('sequelize');

/**
 * Comprehensive audit logging system for multi-tenant application
 */

// Audit log levels
const AUDIT_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SECURITY: 'security'
};

// Actions to audit
const AUDIT_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  CROSS_TENANT_ATTEMPT: 'cross_tenant_attempt',
  PERMISSION_DENIED: 'permission_denied',
  SUBSCRIPTION_CHANGE: 'subscription_change',
  BULK_OPERATION: 'bulk_operation'
};

/**
 * Log audit event to database and console
 */
const logAuditEvent = async (sequelize, eventData) => {
  try {
    const auditLog = {
      userId: eventData.userId || null,
      schoolId: eventData.schoolId || null,
      action: eventData.action,
      tableName: eventData.tableName || null,
      recordId: eventData.recordId || null,
      oldValues: eventData.oldValues || null,
      newValues: eventData.newValues || null,
      ipAddress: eventData.ipAddress || null,
      userAgent: eventData.userAgent || null,
      level: eventData.level || AUDIT_LEVELS.INFO,
      message: eventData.message || null,
      metadata: eventData.metadata || null,
      createdAt: new Date()
    };

    // Try to insert into audit log table (if it exists)
    try {
      // Check if audit table exists first
      const tableExists = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tenant_audit_logs'
        );
      `, { type: sequelize.QueryTypes.SELECT });

      if (tableExists[0].exists) {
        await sequelize.query(`
          INSERT INTO tenant_audit_logs (
            "userId", "schoolId", action, "tableName", "recordId",
            "oldValues", "newValues", "ipAddress", "userAgent",
            level, message, metadata, "createdAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
        `, {
          bind: [
            auditLog.userId,
            auditLog.schoolId,
            auditLog.action,
            auditLog.tableName,
            auditLog.recordId,
            JSON.stringify(auditLog.oldValues),
            JSON.stringify(auditLog.newValues),
            auditLog.ipAddress,
            auditLog.userAgent,
            auditLog.level,
            auditLog.message,
            JSON.stringify(auditLog.metadata),
            auditLog.createdAt
          ],
          type: sequelize.QueryTypes.INSERT
        });
      }
    } catch (dbError) {
      // Database logging failed, continue with console logging
      console.log('Database audit logging not available, using console only');
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 AUDIT [${auditLog.level.toUpperCase()}]:`, {
        action: auditLog.action,
        user: auditLog.userId,
        school: auditLog.schoolId,
        table: auditLog.tableName,
        message: auditLog.message
      });
    }

    // Security alerts for critical events
    if (auditLog.level === AUDIT_LEVELS.SECURITY) {
      console.warn('🚨 SECURITY ALERT:', auditLog);
      // TODO: Send to monitoring system (e.g., Slack, email, etc.)
    }

  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error to avoid breaking the main request
  }
};

/**
 * Middleware to audit all API requests
 */
const auditApiRequests = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original res.json to capture response
  const originalJson = res.json;
  let responseData = null;
  
  res.json = function(data) {
    responseData = data;
    return originalJson.call(this, data);
  };

  // Store original res.end to capture when response is sent
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Log the request after response is sent
    setImmediate(async () => {
      try {
        const auditData = {
          userId: req.user?.id,
          schoolId: req.user?.schoolId,
          action: `${req.method}_${req.route?.path || req.path}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          level: res.statusCode >= 400 ? AUDIT_LEVELS.ERROR : AUDIT_LEVELS.INFO,
          message: `${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`,
          metadata: {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            requestBody: req.method !== 'GET' ? req.body : undefined,
            responseSuccess: responseData?.success,
            errorCode: responseData?.error?.code
          }
        };

        // Only log significant events, not every GET request
        const shouldLog = (
          req.method !== 'GET' || 
          res.statusCode >= 400 || 
          req.originalUrl.includes('/auth/') ||
          req.originalUrl.includes('/admin/')
        );

        if (shouldLog && req.app.locals.sequelize) {
          await logAuditEvent(req.app.locals.sequelize, auditData);
        }
      } catch (error) {
        console.error('Audit logging error:', error);
      }
    });

    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Audit cross-tenant access attempts
 */
const auditCrossTenantAccess = async (req, attemptedSchoolId, actualSchoolId) => {
  if (req.app.locals.sequelize) {
    await logAuditEvent(req.app.locals.sequelize, {
      userId: req.user?.id,
      schoolId: actualSchoolId,
      action: AUDIT_ACTIONS.CROSS_TENANT_ATTEMPT,
      level: AUDIT_LEVELS.SECURITY,
      message: `User attempted to access school ${attemptedSchoolId} but belongs to ${actualSchoolId}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        attemptedSchoolId,
        actualSchoolId,
        url: req.originalUrl,
        method: req.method
      }
    });
  }
};

/**
 * Audit authentication events
 */
const auditAuthEvent = async (sequelize, eventType, userData, req, success = true) => {
  const auditData = {
    userId: userData.id,
    schoolId: userData.schoolId,
    action: eventType,
    level: success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.SECURITY,
    message: `${eventType} ${success ? 'successful' : 'failed'} for user ${userData.email}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: {
      email: userData.email,
      role: userData.role,
      success
    }
  };

  await logAuditEvent(sequelize, auditData);
};

/**
 * Audit data changes (CRUD operations)
 */
const auditDataChange = async (sequelize, action, tableName, recordId, oldData, newData, req) => {
  const auditData = {
    userId: req.user?.id,
    schoolId: req.user?.schoolId,
    action,
    tableName,
    recordId,
    oldValues: oldData,
    newValues: newData,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    level: AUDIT_LEVELS.INFO,
    message: `${action.toUpperCase()} operation on ${tableName}`,
    metadata: {
      recordId,
      hasOldData: !!oldData,
      hasNewData: !!newData
    }
  };

  await logAuditEvent(sequelize, auditData);
};

/**
 * Audit subscription and billing events
 */
const auditSubscriptionEvent = async (sequelize, schoolId, action, details, req) => {
  const auditData = {
    userId: req.user?.id,
    schoolId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGE,
    level: AUDIT_LEVELS.INFO,
    message: `Subscription ${action} for school ${schoolId}`,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: {
      subscriptionAction: action,
      ...details
    }
  };

  await logAuditEvent(sequelize, auditData);
};

/**
 * Get audit logs with filtering
 */
const getAuditLogs = async (sequelize, filters = {}) => {
  const {
    schoolId,
    userId,
    action,
    level,
    startDate,
    endDate,
    page = 1,
    limit = 50
  } = filters;

  const whereClause = {};
  
  if (schoolId) whereClause.schoolId = schoolId;
  if (userId) whereClause.userId = userId;
  if (action) whereClause.action = action;
  if (level) whereClause.level = level;
  
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
    if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
  }

  const offset = (page - 1) * limit;

  const query = `
    SELECT 
      tal.*,
      u."firstName" || ' ' || u."lastName" as "userName",
      u.email as "userEmail",
      s.name as "schoolName"
    FROM tenant_audit_logs tal
    LEFT JOIN users u ON tal."userId" = u.id
    LEFT JOIN schools s ON tal."schoolId" = s.id
    WHERE ${Object.keys(whereClause).length > 0 ? 
      Object.keys(whereClause).map(key => `tal."${key}" = :${key}`).join(' AND ') : 
      '1=1'
    }
    ORDER BY tal."createdAt" DESC
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM tenant_audit_logs tal
    WHERE ${Object.keys(whereClause).length > 0 ? 
      Object.keys(whereClause).map(key => `tal."${key}" = :${key}`).join(' AND ') : 
      '1=1'
    }
  `;

  const [logs, countResult] = await Promise.all([
    sequelize.query(query, {
      replacements: { ...whereClause, limit, offset },
      type: sequelize.QueryTypes.SELECT
    }),
    sequelize.query(countQuery, {
      replacements: whereClause,
      type: sequelize.QueryTypes.SELECT
    })
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total: parseInt(countResult[0].total),
      pages: Math.ceil(countResult[0].total / limit)
    }
  };
};

module.exports = {
  AUDIT_LEVELS,
  AUDIT_ACTIONS,
  logAuditEvent,
  auditApiRequests,
  auditCrossTenantAccess,
  auditAuthEvent,
  auditDataChange,
  auditSubscriptionEvent,
  getAuditLogs
};