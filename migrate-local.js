// Set environment to development and load local env
process.env.ENV_FILE = '.env.local';
process.env.NODE_ENV = 'development';
require('dotenv').config({ path: '.env.local' });

// Import and run Sequelize CLI programmatically
const { exec } = require('child_process');

console.log('Running local migration with development environment...');
console.log('Database config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER
});

exec('npx sequelize-cli db:migrate --env development', (error, stdout, stderr) => {
  if (error) {
    console.error('Migration error:', error);
    return;
  }
  if (stderr) {
    console.error('Migration stderr:', stderr);
  }
  console.log('Migration output:', stdout);
});