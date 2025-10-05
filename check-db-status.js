const { execSync } = require('child_process');

console.log('Checking database migration status...');

try {
  console.log('\n=== Migration Status ===');
  execSync('npx sequelize-cli db:migrate:status', { stdio: 'inherit' });
  
  console.log('\n=== Running pending migrations ===');
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
  
  console.log('\n=== Final Migration Status ===');
  execSync('npx sequelize-cli db:migrate:status', { stdio: 'inherit' });
  
  console.log('\n✅ Database migrations completed!');
} catch (error) {
  console.error('❌ Error with database migrations:', error.message);
  process.exit(1);
}