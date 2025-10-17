// Start server with Neon database
process.env.ENV_FILE = '.env.production';
require('./server.js');