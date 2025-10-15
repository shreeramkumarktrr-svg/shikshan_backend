const { exec } = require('child_process');
require('dotenv').config();

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${description}...`);
    
    exec(command, (error, stdout, stderr) => {
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

async function setupNeon() {
  try {
    console.log('🚀 Setting up Neon database with fresh schema...\n');

    // Run migrations to create tables
    await runCommand('npm run migrate', 'Creating database schema');

    // Optional: Run seeders if you have any
    try {
      await runCommand('npm run seed', 'Running database seeders');
    } catch (error) {
      console.log('ℹ️  No seeders found or seeding failed - this is optional');
    }

    console.log('\n🎉 Neon database setup completed!');
    console.log('\n📝 Your Neon database now has:');
    console.log('✅ All tables created via migrations');
    console.log('✅ Proper schema structure');
    console.log('✅ Ready for your application');
    
    console.log('\n🔄 Testing the setup...');
    await runCommand('node quick-neon-test.js', 'Verifying database setup');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Check your migration files and database configuration');
  }
}

setupNeon();