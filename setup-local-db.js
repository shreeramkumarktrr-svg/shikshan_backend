const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function setupLocalDatabase() {
  // First, connect to postgres database to create our database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Shree123',
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const dbName = process.env.DB_NAME || 'shikshan_dev';
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
    const result = await client.query(checkDbQuery, [dbName]);

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      console.log(`Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully`);
    } else {
      console.log(`✅ Database "${dbName}" already exists`);
    }

    await client.end();
    console.log('✅ Local database setup completed');
    console.log('\nNext steps:');
    console.log('1. Run: npm run migrate:local');
    console.log('2. Run: npm run seed:local');
    console.log('3. Run: npm run dev');

  } catch (error) {
    console.error('❌ Error setting up local database:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure PostgreSQL is installed and running locally');
    console.log('2. Check your database credentials in .env.local');
    console.log('3. Make sure you can connect to PostgreSQL with these credentials');
    process.exit(1);
  }
}

setupLocalDatabase();