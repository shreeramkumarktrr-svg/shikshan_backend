const { execSync } = require('child_process');

console.log('Running all seeders in order...');

try {
  // First ensure all migrations are run
  console.log('\n0. Ensuring all migrations are run...');
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
  
  // Run seeders in order
  console.log('\n1. Running demo data seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000001-demo-data.js', { stdio: 'inherit' });
  
  console.log('\n2. Running subscription seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000002-default-subscriptions.js', { stdio: 'inherit' });
  
  console.log('\n3. Running comprehensive test data seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000003-comprehensive-test-data.js', { stdio: 'inherit' });
  
  console.log('\n4. Running students and activities seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000004-students-and-activities.js', { stdio: 'inherit' });
  
  console.log('\n5. Running complaints and events seeder...');
  execSync('npx sequelize-cli db:seed --seed 20241001000005-complaints-and-events.js', { stdio: 'inherit' });
  
  console.log('\n✅ All seeders completed successfully!');
} catch (error) {
  console.error('❌ Error running seeders:', error.message);
  process.exit(1);
}