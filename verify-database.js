const { sequelize, User, School } = require('./models');

async function verifyDatabase() {
  console.log('🔍 Verifying Database Connection and Tables');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Test 2: Check if tables exist
    console.log('2. Checking if tables exist...');
    
    try {
      const schoolCount = await School.count();
      console.log(`✅ Schools table exists with ${schoolCount} records`);
    } catch (error) {
      console.log('❌ Schools table issue:', error.message);
    }
    
    try {
      const userCount = await User.count();
      console.log(`✅ Users table exists with ${userCount} records`);
    } catch (error) {
      console.log('❌ Users table issue:', error.message);
    }
    
    // Test 3: Check table structure
    console.log('3. Checking table structures...');
    
    try {
      const userAttributes = Object.keys(User.rawAttributes);
      console.log('✅ User model attributes:', userAttributes.join(', '));
      
      // Check if required fields exist
      const requiredFields = ['id', 'schoolId', 'role', 'isActive'];
      const missingFields = requiredFields.filter(field => !userAttributes.includes(field));
      
      if (missingFields.length > 0) {
        console.log('❌ Missing required fields in User model:', missingFields.join(', '));
      } else {
        console.log('✅ All required fields present in User model');
      }
      
    } catch (error) {
      console.log('❌ Error checking User model structure:', error.message);
    }
    
    // Test 4: Test a simple query
    console.log('4. Testing simple queries...');
    
    try {
      const schools = await School.findAll({ limit: 1 });
      if (schools.length > 0) {
        const school = schools[0];
        console.log(`✅ Sample school found: ${school.name} (${school.id})`);
        
        // Test user query for this school
        try {
          const users = await User.findAll({ 
            where: { schoolId: school.id },
            limit: 5,
            attributes: ['id', 'role', 'isActive']
          });
          console.log(`✅ Found ${users.length} users for this school`);
          
          if (users.length > 0) {
            console.log('   Sample users:');
            users.forEach((user, index) => {
              console.log(`   ${index + 1}. Role: ${user.role}, Active: ${user.isActive}`);
            });
          }
          
          // Test count query
          const activeUserCount = await User.count({
            where: { schoolId: school.id, isActive: true }
          });
          console.log(`✅ Active users count: ${activeUserCount}`);
          
        } catch (error) {
          console.log('❌ Error querying users:', error.message);
        }
        
      } else {
        console.log('⚠️ No schools found in database');
      }
      
    } catch (error) {
      console.log('❌ Error with school queries:', error.message);
    }
    
    // Test 5: Test role-specific counts
    console.log('5. Testing role-specific counts...');
    
    try {
      const schools = await School.findAll({ limit: 1 });
      if (schools.length > 0) {
        const schoolId = schools[0].id;
        
        const roles = ['student', 'teacher', 'parent', 'school_admin', 'principal'];
        
        for (const role of roles) {
          try {
            const count = await User.count({
              where: { schoolId, role, isActive: true }
            });
            console.log(`✅ ${role}: ${count}`);
          } catch (error) {
            console.log(`❌ Error counting ${role}:`, error.message);
          }
        }
      }
      
    } catch (error) {
      console.log('❌ Error with role counts:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
  }
}

verifyDatabase();