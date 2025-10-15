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

async function runSeeder() {
  try {
    console.log('🚀 Running super admin seeder on Neon database...\n');
    console.log('🔧 Using Neon configuration:');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log(`   SSL: ${process.env.DB_SSL}`);

    // Run the specific seeder
    await runCommand('npx sequelize-cli db:seed --seed 20241008000002-create-super-admin.js', 'Running super admin seeder');

    console.log('\n🎉 Super admin seeder completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   📧 Email: superadmin@shikshan.com');
    console.log('   🔑 Password: superadmin123');
    console.log('   ⚠️  Please change the password after first login');

  } catch (error) {
    console.error('\n❌ Seeder failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure migrations have been run first');
    console.log('2. Check your Neon connection');
    console.log('3. Verify the seeder file exists');
  }
}

runSeeder();