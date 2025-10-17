// Migrate to Neon database
process.env.ENV_FILE = '.env.production';
require('dotenv').config({ path: '.env.production' });

const { exec } = require('child_process');

console.log('🚀 Running migration on Neon database...');
console.log('Database:', process.env.DB_NAME);
console.log('Host:', process.env.DB_HOST);

exec('npx sequelize-cli db:migrate --env production', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Migration error:', error);
    return;
  }
  if (stderr) {
    console.error('Migration stderr:', stderr);
  }
  console.log('✅ Migration output:', stdout);
  console.log('🎉 Subjects table should now be available on Neon!');
});