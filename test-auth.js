// Test if auth middleware can be imported correctly
try {
  const auth = require('./middleware/auth');
  
  } catch (error) {
  console.error('Error importing auth middleware:', error.message);
  console.error('Stack:', error.stack);
}