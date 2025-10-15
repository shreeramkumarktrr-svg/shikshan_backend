const { Client } = require('pg');

async function quickNeonTest() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_BrOZL7VpTWC8@ep-sweet-shape-adp85hj1-pooler.c-2.us-east-1.aws.neon.tech/shikshan?sslmode=require&channel_binding=require',
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Connecting to Neon...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Test query
    const result = await client.query('SELECT version(), now() as current_time');
    console.log('📊 Database version:', result.rows[0].version);
    console.log('📅 Current time:', result.rows[0].current_time);

    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tables found:', tables.rows.length);
    if (tables.rows.length > 0) {
      console.log('   Tables:', tables.rows.map(row => row.table_name).join(', '));
    } else {
      console.log('   No tables found - database is empty');
    }

    await client.end();
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('🔧 DNS resolution failed - check your internet connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('🔧 Connection refused - check the host and port');
    } else if (error.message.includes('password')) {
      console.log('🔧 Authentication failed - check username and password');
    } else if (error.message.includes('SSL')) {
      console.log('🔧 SSL connection issue - check SSL configuration');
    }
  }
}

quickNeonTest();