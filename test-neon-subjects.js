// Test Neon database connection and subjects table
require('dotenv').config({ path: '.env.production' });

const { Client } = require('pg');

async function testNeonSubjects() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon database');

    // Check if subjects table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'subjects'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ Subjects table exists');
      
      // Count subjects
      const countResult = await client.query('SELECT COUNT(*) FROM subjects');
      console.log(`📊 Number of subjects: ${countResult.rows[0].count}`);
      
      // Show sample subjects
      const sampleResult = await client.query('SELECT name, code, category, "isActive" FROM subjects LIMIT 5');
      console.log('📋 Sample subjects:');
      sampleResult.rows.forEach(subject => {
        console.log(`  - ${subject.name} (${subject.code || 'no code'}) - ${subject.category} - ${subject.isActive ? 'Active' : 'Inactive'}`);
      });
    } else {
      console.log('❌ Subjects table does not exist');
      console.log('💡 Run: npm run migrate:neon');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNeonSubjects();