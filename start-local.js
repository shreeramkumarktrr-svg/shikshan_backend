// Start server with local database
process.env.ENV_FILE = '.env.local';
require('./server.js');