// Seed Neon database
process.env.ENV_FILE = '.env.production';
require('dotenv').config({ path: '.env.production' });

const { exec } = require('child_process');

console.log('🌱 Running seeders on Neon database...');
console.log('Database:', process.env.DB_NAME);
console.log('Host:', process.env.DB_HOST);

exec('npx sequelize-cli db:seed:all --env production', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Seeder error:', error);
    return;
  }
  if (stderr) {
    console.error('Seeder stderr:', stderr);
  }
  console.log('✅ Seeder output:', stdout);
  console.log('🎉 Sample data should now be available on Neon!');
});