const { execSync } = require('child_process');

console.log('Testing comprehensive seed data...');

try {
  // Ensure migrations are run
  console.log('\n1. Running migrations...');
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
  
  // Run the comprehensive test data seeder
  console.log('\n2. Running comprehensive test data seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000003-comprehensive-test-data.js', { stdio: 'inherit' });
  
  console.log('\n3. Running students and activities seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000004-students-and-activities.js', { stdio: 'inherit' });
  
  console.log('\n✅ Test seeding completed successfully!');
} catch (error) {
  console.error('❌ Error during test seeding:', error.message);
  process.exit(1);
}