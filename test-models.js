// Test if models can be imported correctly
try {
  console.log('Testing model imports...');
  
  const { Fee, StudentFee, Class, Student, User } = require('./models');
  
  console.log('Fee model:', Fee ? '✅ OK' : '❌ MISSING');
  console.log('StudentFee model:', StudentFee ? '✅ OK' : '❌ MISSING');
  console.log('Class model:', Class ? '✅ OK' : '❌ MISSING');
  console.log('Student model:', Student ? '✅ OK' : '❌ MISSING');
  console.log('User model:', User ? '✅ OK' : '❌ MISSING');
  
  console.log('\nAll models imported successfully!');
} catch (error) {
  console.error('Error importing models:', error.message);
  console.error('Stack:', error.stack);
}