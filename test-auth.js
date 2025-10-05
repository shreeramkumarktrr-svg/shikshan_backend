// Test if auth middleware can be imported correctly
try {
  console.log('Testing auth middleware import...');
  
  const auth = require('./middleware/auth');
  
  console.log('Auth middleware:', auth ? '✅ OK' : '❌ MISSING');
  console.log('Auth type:', typeof auth);
  
  console.log('\nAuth middleware imported successfully!');
} catch (error) {
  console.error('Error importing auth middleware:', error.message);
  console.error('Stack:', error.stack);
}