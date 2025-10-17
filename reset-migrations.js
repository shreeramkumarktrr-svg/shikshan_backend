const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function resetMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Shree123',
    database: process.env.DB_NAME || 'shikshan_dev'
  });

  try {
    await client.connect();
    console.log('Connected to local database');

    // Drop all tables to start fresh
    console.log('Dropping all tables...');
    
    const dropTablesQuery = `
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `;
    
    await client.query(dropTablesQuery);
    console.log('✅ All tables dropped successfully');

    await client.end();
    console.log('✅ Database reset completed');
    console.log('\nNext steps:');
    console.log('1. Run: npm run migrate:local');
    console.log('2. Run: npm run seed:local');

  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    process.exit(1);
  }
}

resetMigrations();