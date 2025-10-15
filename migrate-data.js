const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

// Local database configuration
const LOCAL_DB = {
  host: 'localhost',
  port: 5432,
  database: 'shikshan_dev',
  user: 'postgres',
  password: 'Shree123'
};

// Neon database configuration
const NEON_CONNECTION = 'postgresql://neondb_owner:npg_BrOZL7VpTWC8@ep-sweet-shape-adp85hj1-pooler.c-2.us-east-1.aws.neon.tech/shikshan?sslmode=require&channel_binding=require';

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${description}...`);
    console.log(`Command: ${command}`);
    
    exec(command, { env: { ...process.env, PGPASSWORD: LOCAL_DB.password } }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr && !stderr.includes('NOTICE')) {
        console.log(`⚠️  Warning: ${stderr}`);
      }
      if (stdout) {
        console.log(`✅ Output: ${stdout}`);
      }
      console.log(`✅ ${description} completed successfully`);
      resolve(stdout);
    });
  });
}

async function migrateData() {
  try {
    console.log('🚀 Starting data migration to Neon...\n');

    // Step 1: Create backup of local database
    const backupFile = `shikshan_backup_${Date.now()}.sql`;
    const pgDumpCommand = `pg_dump -h ${LOCAL_DB.host} -p ${LOCAL_DB.port} -U ${LOCAL_DB.user} -d ${LOCAL_DB.database} -f ${backupFile} --no-owner --no-privileges --clean --if-exists`;
    
    await runCommand(pgDumpCommand, 'Creating database backup');

    // Step 2: Import backup to Neon
    const importCommand = `psql "${NEON_CONNECTION}" -f ${backupFile}`;
    await runCommand(importCommand, 'Importing data to Neon');

    // Step 3: Run migrations on Neon to ensure schema is up to date
    console.log('\n🔄 Running migrations on Neon...');
    await runCommand('npm run migrate', 'Running Sequelize migrations');

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test your application with Neon');
    console.log('2. Update NODE_ENV or use neon config in production');
    console.log(`3. Clean up backup file: ${backupFile}`);
    console.log('4. Update any deployment configurations');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure PostgreSQL client tools (pg_dump, psql) are installed');
    console.log('2. Check that local database is running and accessible');
    console.log('3. Verify local database credentials');
    console.log('4. Make sure you have proper permissions on both databases');
  }
}

// Check if pg_dump and psql are available
async function checkTools() {
  try {
    await runCommand('pg_dump --version', 'Checking pg_dump');
    await runCommand('psql --version', 'Checking psql');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL client tools not found');
    console.log('\n📥 Install PostgreSQL client tools:');
    console.log('1. Download from: https://www.postgresql.org/download/windows/');
    console.log('2. Or use chocolatey: choco install postgresql');
    console.log('3. Or use scoop: scoop install postgresql');
    return false;
  }
}

async function main() {
  console.log('🔧 Checking prerequisites...');
  
  const toolsAvailable = await checkTools();
  if (!toolsAvailable) {
    console.log('\n❌ Please install PostgreSQL client tools first');
    return;
  }

  console.log('\n✅ All tools available, proceeding with migration...');
  await migrateData();
}

main();