const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials - you'll need to update these with actual user credentials
const TEST_CREDENTIALS = {
  email: 'admin@school1.com', // School admin
  password: 'password123'
};

let authToken = '';
let testSchoolId = '';
let testClassId = '';
let testFeeId = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE}/auth/login`, TEST_CREDENTIALS);
    authToken = response.data.token;
    testSchoolId = response.data.user.schoolId;
    console.log('✅ Login successful');
    console.log('User:', response.data.user.firstName, response.data.user.lastName);
    console.log('Role:', response.data.user.role);
    console.log('School ID:', testSchoolId);
    return response.data.user;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getClasses() {
  try {
    console.log('\n📚 Fetching classes...');
    const response = await axios.get(`${API_BASE}/classes`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.length > 0) {
      testClassId = response.data[0].id;
      console.log('✅ Classes fetched successfully');
      console.log('Available classes:', response.data.map(c => `${c.name} - ${c.section}`));
      console.log('Using class ID:', testClassId);
      return response.data;
    } else {
      console.log('⚠️ No classes found');
      return [];
    }
  } catch (error) {
    console.error('❌ Failed to fetch classes:', error.response?.data || error.message);
    throw error;
  }
}

async function createFee() {
  try {
    console.log('\n💰 Creating a new fee...');
    const feeData = {
      title: 'Monthly Tuition Fee',
      description: 'Regular monthly tuition fee for all subjects',
      amount: 5000.00,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      classId: testClassId
    };

    const response = await axios.post(`${API_BASE}/fees`, feeData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    testFeeId = response.data.id;
    console.log('✅ Fee created successfully');
    console.log('Fee ID:', testFeeId);
    console.log('Title:', response.data.title);
    console.log('Amount:', response.data.amount);
    console.log('Students assigned:', response.data.studentFees.length);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create fee:', error.response?.data || error.message);
    throw error;
  }
}

async function getFees() {
  try {
    console.log('\n📋 Fetching all fees...');
    const response = await axios.get(`${API_BASE}/fees`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Fees fetched successfully');
    console.log('Total fees:', response.data.length);
    response.data.forEach(fee => {
      console.log(`- ${fee.title}: ₹${fee.amount} (${fee.studentFees.length} students)`);
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch fees:', error.response?.data || error.message);
    throw error;
  }
}

async function getFeeDetails() {
  try {
    console.log('\n🔍 Fetching fee details...');
    const response = await axios.get(`${API_BASE}/fees/${testFeeId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Fee details fetched successfully');
    console.log('Fee:', response.data.title);
    console.log('Class:', response.data.class.name, '-', response.data.class.section);
    console.log('Student fees:');
    response.data.studentFees.forEach(sf => {
      console.log(`  - ${sf.student.firstName} ${sf.student.lastName}: ₹${sf.amount} (${sf.status})`);
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch fee details:', error.response?.data || error.message);
    throw error;
  }
}

async function recordPayment() {
  try {
    console.log('\n💳 Recording a payment...');
    
    // First get the fee details to find a student fee
    const feeDetails = await axios.get(`${API_BASE}/fees/${testFeeId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (feeDetails.data.studentFees.length === 0) {
      console.log('⚠️ No student fees found to record payment');
      return;
    }

    const studentFee = feeDetails.data.studentFees[0];
    const paymentData = {
      paidAmount: 2500.00, // Partial payment
      paymentMethod: 'cash',
      notes: 'Partial payment received'
    };

    const response = await axios.post(`${API_BASE}/fees/payment/${studentFee.id}`, paymentData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Payment recorded successfully');
    console.log('Student:', response.data.student.firstName, response.data.student.lastName);
    console.log('Amount paid:', response.data.paidAmount);
    console.log('Status:', response.data.status);
    console.log('Remaining balance:', parseFloat(response.data.amount) - parseFloat(response.data.paidAmount));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to record payment:', error.response?.data || error.message);
    throw error;
  }
}

async function getFeeStats() {
  try {
    console.log('\n📊 Fetching fee statistics...');
    const response = await axios.get(`${API_BASE}/fees/stats/overview`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Fee statistics fetched successfully');
    console.log('Total Fees: ₹' + response.data.totalFees);
    console.log('Total Collected: ₹' + response.data.totalCollected);
    console.log('Total Pending: ₹' + response.data.totalPending);
    console.log('Total Overdue: ₹' + response.data.totalOverdue);
    console.log('Collection Rate: ' + response.data.collectionRate + '%');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch fee statistics:', error.response?.data || error.message);
    throw error;
  }
}

async function updateFee() {
  try {
    console.log('\n✏️ Updating fee...');
    const updateData = {
      title: 'Monthly Tuition Fee (Updated)',
      amount: 5500.00,
      description: 'Updated monthly tuition fee with revised amount'
    };

    const response = await axios.put(`${API_BASE}/fees/${testFeeId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Fee updated successfully');
    console.log('New title:', response.data.title);
    console.log('New amount:', response.data.amount);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to update fee:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    console.log('🚀 Starting Fees API Tests\n');
    
    // Login
    await login();
    
    // Get classes
    const classes = await getClasses();
    if (classes.length === 0) {
      console.log('❌ Cannot proceed without classes. Please create some classes first.');
      return;
    }
    
    // Create fee
    await createFee();
    
    // Get all fees
    await getFees();
    
    // Get fee details
    await getFeeDetails();
    
    // Record payment
    await recordPayment();
    
    // Get updated fee details
    await getFeeDetails();
    
    // Get statistics
    await getFeeStats();
    
    // Update fee
    await updateFee();
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();