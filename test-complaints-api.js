const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testUser = {
  identifier: 'alex.smith@student.greenwood.edu',
  password: 'student123'
};

const testComplaint = {
  title: 'Test Complaint',
  description: 'This is a test complaint to verify the API is working',
  category: 'academic',
  priority: 'medium'
};

async function testComplaintsAPI() {
  try {
    console.log('Testing Complaints API...');
    
    // 1. Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testUser);
    const token = loginResponse.data.token;
    console.log('✓ Login successful');
    
    // Set up headers with token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Test GET complaints
    console.log('2. Getting complaints...');
    const getResponse = await axios.get(`${BASE_URL}/complaints`, { headers });
    console.log('✓ Get complaints successful:', getResponse.data.data.complaints.length, 'complaints found');
    
    // 3. Test POST complaint
    console.log('3. Creating complaint...');
    const createResponse = await axios.post(`${BASE_URL}/complaints`, testComplaint, { headers });
    console.log('✓ Create complaint successful:', createResponse.data.data.complaint.id);
    
    const complaintId = createResponse.data.data.complaint.id;
    
    // 4. Test GET single complaint
    console.log('4. Getting single complaint...');
    const getSingleResponse = await axios.get(`${BASE_URL}/complaints/${complaintId}`, { headers });
    console.log('✓ Get single complaint successful:', getSingleResponse.data.data.complaint.title);
    
    // 5. Test complaint stats
    console.log('5. Getting complaint stats...');
    const statsResponse = await axios.get(`${BASE_URL}/complaints/stats/summary`, { headers });
    console.log('✓ Get stats successful:', statsResponse.data.data);
    
    console.log('\n🎉 All tests passed! Complaints API is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 Make sure you have run the seeders to create test users');
    }
  }
}

testComplaintsAPI();