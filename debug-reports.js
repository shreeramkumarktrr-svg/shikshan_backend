require('dotenv').config();
const express = require('express');

async function debugReports() {
  console.log('🔧 Debugging Reports Route Issues...\n');
  
  try {
    // Test 1: Check environment
    console.log('1. Environment Check:');
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
    console.log('   DB_HOST:', process.env.DB_HOST);
    console.log('   DB_NAME:', process.env.DB_NAME);
    
    // Test 2: Check models loading
    console.log('\n2. Models Loading Test:');
    try {
      const models = require('./models');
      console.log('   ✅ Models loaded successfully');
      console.log('   Available models:', Object.keys(models).filter(key => key !== 'sequelize' && key !== 'Sequelize'));
      
      // Test database connection
      await models.sequelize.authenticate();
      console.log('   ✅ Database connection successful');
    } catch (error) {
      console.log('   ❌ Models/DB error:', error.message);
    }
    
    // Test 3: Check middleware loading
    console.log('\n3. Middleware Loading Test:');
    try {
      const { authenticate } = require('./middleware/auth');
      console.log('   ✅ Auth middleware loaded');
      
      const { filterTeacherReports } = require('./middleware/teacherPermissions');
      console.log('   ✅ Teacher permissions middleware loaded');
    } catch (error) {
      console.log('   ❌ Middleware error:', error.message);
    }
    
    // Test 4: Check reports route loading
    console.log('\n4. Reports Route Loading Test:');
    try {
      const reportsRoute = require('./routes/reports');
      console.log('   ✅ Reports route loaded successfully');
    } catch (error) {
      console.log('   ❌ Reports route error:', error.message);
      console.log('   Stack:', error.stack);
    }
    
    // Test 5: Create minimal server to test route
    console.log('\n5. Minimal Server Test:');
    try {
      const app = express();
      app.use(express.json());
      
      // Add a simple test route
      app.get('/test', (req, res) => {
        res.json({ message: 'Test route working' });
      });
      
      // Try to add reports route
      const reportsRoute = require('./routes/reports');
      app.use('/api/reports', reportsRoute);
      
      console.log('   ✅ Server setup successful');
      
      // Start server briefly to test
      const server = app.listen(3001, () => {
        console.log('   ✅ Test server started on port 3001');
        server.close();
      });
      
    } catch (error) {
      console.log('   ❌ Server setup error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugReports();