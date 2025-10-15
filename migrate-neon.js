const { exec } = require('child_process');
require('dotenv').config();

// Set environment variables for Neon
process.env.NODE_ENV = 'development';
process.env.DB_HOST = 'ep-sweet-shape-adp85hj1-pooler.c-2.us-east-1.aws.neon.tech';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'shikshan';
process.env.DB_USER = 'neondb_owner';
process.env.DB_PASSWORD = 'npg_BrOZL7VpTWC8';
process.env.DB_SSL = 'true';

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${description}...`);
    
    const childProcess = exec(command, {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DB_HOST: 'ep-sweet-shape-adp85hj1-pooler.c-2.us-east-1.aws.neon.tech',
        DB_PORT: '5432',
        DB_NAME: 'shikshan',
        DB_USER: 'neondb_owner',
        DB_PASSWORD: 'npg_BrOZL7VpTWC8',
        DB_SSL: 'true'
      }
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr && !stderr.includes('NOTICE')) {
        console.log(`⚠️  ${stderr}`);
      }
      if (stdout) {
        console.log(`✅ ${stdout}`);
      }
      console.log(`✅ ${description} completed successfully`);
      resolve(stdout);
    });
  });
}

async function migrateNeon() {
  try {
    console.log('🚀 Running migrations on Neon database...\n');
    console.log('🔧 Using Neon configuration:');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log(`   SSL: ${process.env.DB_SSL}`);

    // Run migrations
    await runCommand('npx sequelize-cli db:migrate', 'Running database migrations');

    console.log('\n🎉 Migrations completed successfully!');
    
    // Test the result
    console.log('\n🔄 Testing the migrated database...');
    await runCommand('node quick-neon-test.js', 'Verifying database setup');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your Neon connection string');
    console.log('2. Verify SSL configuration');
    console.log('3. Ensure migration files are valid');
  }
}

migrateNeon();