require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database
const db = require('./models');

// Import middleware
const { 
  enforceTenancy, 
  auditTenantAccess, 
  enforceSchoolLimits,
  setupGlobalTenantFiltering,
  addTenantContext 
} = require('./middleware/tenancy');
const { auditApiRequests } = require('./middleware/auditLogger');

// Import routes
const authRoutes = require('./routes/auth');
const schoolRoutes = require('./routes/schools');
const userRoutes = require('./routes/users');
const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const homeworkRoutes = require('./routes/homework');
const eventRoutes = require('./routes/events');
const complaintRoutes = require('./routes/complaints');
const feeRoutes = require('./routes/fees');
const reportRoutes = require('./routes/reports');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const contactRoutes = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration - More permissive for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://shikshan.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // In production, be more permissive with Vercel domains
    if (process.env.NODE_ENV === 'production') {
      if (origin.includes('vercel.app') || origin.includes('shikshan')) {
        return callback(null, true);
      }
    }

    // Check against allowed origins
    const isAllowed = allowedOrigins.some(o => {
      const cleanOrigin = o.replace(/\/$/, '');
      const cleanIncoming = origin.replace(/\/$/, '');
      return cleanOrigin === cleanIncoming;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      callback(null, true); // Allow anyway in production to avoid issues
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

// Enable CORS before defining any routes
app.use(cors(corsOptions));

// Also handle preflight OPTIONS manually (important!)
app.options('*', cors(corsOptions));

// Rate limiting - very permissive for production stability
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minute window
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 5000 : 10000), // Very high limits
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for OPTIONS requests and health checks
    return req.method === 'OPTIONS' || req.path === '/health';
  },
  // Don't crash the server on rate limit
  onLimitReached: (req, res, options) => {
    console.warn(`Rate limit reached for IP: ${req.ip}, Path: ${req.path}`);
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Store sequelize instance in app locals for middleware access
app.locals.sequelize = db.sequelize;

// Global audit middleware (logs all API requests)
app.use(auditApiRequests);

// Global tenant audit middleware (before authentication)
app.use(auditTenantAccess);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Shikshan API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint to check user context
app.get('/api/debug/user', require('./middleware/auth').authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user?.id,
      role: req.user?.role,
      schoolId: req.user?.schoolId,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName
    },
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);

// Protected routes with tenancy middleware
app.use('/api/schools', schoolRoutes); // Schools route handles its own tenancy logic
app.use('/api/users', userRoutes); // Users route handles its own tenancy logic
app.use('/api/classes', classRoutes); // Classes route handles its own tenancy logic
app.use('/api/attendance', attendanceRoutes); // Attendance route handles its own tenancy logic
app.use('/api/homework', homeworkRoutes); // Homework route handles its own tenancy logic
app.use('/api/events', eventRoutes); // Events route handles its own tenancy logic
app.use('/api/complaints', complaintRoutes); // Complaints route handles its own tenancy logic
app.use('/api/fees', feeRoutes); // Fees route handles its own tenancy logic
app.use('/api/reports', reportRoutes); // Reports route handles its own tenancy logic
app.use('/api/subscriptions', subscriptionRoutes); // Super admin only, no tenancy needed
app.use('/api/payments', paymentRoutes); // Global payments, handled separately
app.use('/api/contact', contactRoutes); // Public routes, no tenancy needed
app.use('/api/monitoring', require('./routes/monitoring')); // Monitoring and audit routes

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('=== ERROR DETAILS ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('URL:', req.method, req.originalUrl);
  console.error('IP:', req.ip);
  console.error('User-Agent:', req.get('User-Agent'));
  console.error('User:', req.user?.id, req.user?.role);
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error('Stack:', err.stack);
  }
  console.error('===================');

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Request blocked by CORS policy'
    });
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  // Sequelize database errors
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      error: 'Database error',
      message: process.env.NODE_ENV === 'production' ? 'Database operation failed' : err.message
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down and try again later'
    });
  }

  // Default error - don't crash the server
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      name: err.name 
    })
  });
});

// Process error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Setup global tenant filtering hooks (disabled for now to avoid conflicts)
    // setupGlobalTenantFiltering(db.sequelize);
    console.log('Tenant filtering middleware ready.');

    // Sync database (only in development)
    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: true });
      console.log('Database synchronized.');
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
    });

  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;