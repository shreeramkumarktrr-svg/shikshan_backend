const { execSync } = require('child_process');

console.log('Complete setup with table fixes...');

try {
  // Step 1: Fix junction tables
  console.log('\n1. Fixing junction tables...');
  execSync('node fix-junction-tables.js', { stdio: 'inherit' });
  
  // Step 2: Run migrations to ensure everything is up to date
  console.log('\n2. Running migrations...');
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
  
  // Step 3: Run seeders
  console.log('\n3. Running demo data seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000001-demo-data.js', { stdio: 'inherit' });
  
  console.log('\n4. Running subscription seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000002-default-subscriptions.js', { stdio: 'inherit' });
  
  console.log('\n5. Running comprehensive test data seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000003-comprehensive-test-data.js', { stdio: 'inherit' });
  
  console.log('\n6. Running students and activities seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000004-students-and-activities.js', { stdio: 'inherit' });
  
  console.log('\n7. Running complaints and events seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000005-complaints-and-events.js', { stdio: 'inherit' });
  
  console.log('\n✅ Complete setup finished successfully!');
  console.log('\n=== LOGIN CREDENTIALS ===');
  console.log('Super Admin: admin@shikshan.com / admin123');
  console.log('School Admins: principal1@sunrise.edu, principal2@excellence.edu, principal3@future.edu / admin123');
  console.log('Teachers: [firstname].[lastname]@[school-domain] / teacher123');
  console.log('Students: [firstname].[lastname]@student.[school-domain] / student123');
  console.log('Parents: parent.[firstname].[lastname]@gmail.com / parent123');
  
} catch (error) {
  console.error('❌ Error during complete setup:', error.message);
  process.exit(1);
}