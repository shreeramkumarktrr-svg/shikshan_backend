const axios = require('axios');

// Test the reports API
async function testReportsAPI() {
  const baseURL = process.env.API_URL || 'http://localhost:5000/api';
  
  console.log('🔧 Testing Reports API...\n');
  console.log('Base URL:', baseURL);
  
  try {
    // Test health check first
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${baseURL}/reports/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test without authentication (should fail)
    console.log('\n2. Testing without auth (should fail)...');
    try {
      await axios.get(`${baseURL}/reports`);
      console.log('❌ Should have failed without auth');
    } catch (error) {
      console.log('✅ Correctly rejected without auth:', error.response?.status, error.response?.data?.error);
    }
    
    // You would need a valid token to test authenticated routes
    console.log('\n3. To test authenticated routes, you need a valid JWT token');
    console.log('   Get a token by logging in first, then test:');
    console.log('   GET /api/reports (with Authorization: Bearer <token>)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testReportsAPI();