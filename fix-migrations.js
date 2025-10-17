const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixMigrations() {
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

    // Check if SequelizeMeta table exists
    const metaTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SequelizeMeta'
      );
    `);

    if (metaTableExists.rows[0].exists) {
      console.log('SequelizeMeta table exists, checking migration status...');
      
      // Get current migrations
      const migrations = await client.query('SELECT name FROM "SequelizeMeta" ORDER BY name;');
      console.log('Current migrations:', migrations.rows.map(r => r.name));

      // Remove the problematic migration from SequelizeMeta if it exists
      const problematicMigration = '20241015000001-create-inquiries.js';
      await client.query('DELETE FROM "SequelizeMeta" WHERE name = $1', [problematicMigration]);
      console.log(`Removed ${problematicMigration} from migration history`);

      // Drop the Inquiries table if it exists to recreate it properly
      await client.query('DROP TABLE IF EXISTS "Inquiries" CASCADE;');
      console.log('Dropped Inquiries table');

      // Drop any existing enum types for Inquiries
      await client.query('DROP TYPE IF EXISTS "enum_Inquiries_status" CASCADE;');
      console.log('Dropped enum_Inquiries_status type');
    }

    await client.end();
    console.log('✅ Migration fix completed');
    console.log('\nNext steps:');
    console.log('1. Run: npm run migrate:local');
    console.log('2. Run: npm run seed:local');

  } catch (error) {
    console.error('❌ Error fixing migrations:', error.message);
    process.exit(1);
  }
}

fixMigrations();