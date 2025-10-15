const { Sequelize } = require('sequelize');
require('dotenv').config();

// Test Neon connection
async function testNeonConnection() {
  const neonConnectionString = 'postgresql://neondb_owner:npg_BrOZL7VpTWC8@ep-sweet-shape-adp85hj1-pooler.c-2.us-east-1.aws.neon.tech/shikshan?sslmode=require&channel_binding=require';
  
  console.log('🔄 Testing Neon database connection...');
  
  const sequelize = new Sequelize(neonConnectionString, {
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Neon connection successful!');
    
    // Test basic query
    const [results] = await sequelize.query('SELECT version() as version, now() as current_time');
    console.log('📊 Database info:', results[0]);
    
    // Check if tables exist
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Existing tables:', tables.map(t => t.table_name));
    
    await sequelize.close();
    console.log('✅ Connection test completed successfully');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your internet connection');
    console.log('2. Verify the Neon connection string');
    console.log('3. Ensure your Neon database is active');
    console.log('4. Check if your IP is whitelisted (if applicable)');
  }
}

testNeonConnection();