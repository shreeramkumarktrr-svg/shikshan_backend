const { School, User, Subscription } = require('./models');

async function testStatsQuery() {
  console.log('🔍 Testing Stats Query Directly');
  console.log('=' .repeat(40));
  
  try {
    // Test 1: Find a school
    console.log('1. Finding schools...');
    const schools = await School.findAll({ limit: 1 });
    
    if (schools.length === 0) {
      console.log('❌ No schools found in database');
      return;
    }
    
    const school = schools[0];
    console.log(`✅ Found school: ${school.name} (${school.id})`);
    
    // Test 2: Test individual user count queries
    console.log('2. Testing user count queries...');
    
    try {
      const studentCount = await User.count({ 
        where: { schoolId: school.id, role: 'student', isActive: true } 
      });
      console.log(`✅ Student count: ${studentCount}`);
    } catch (error) {
      console.log('❌ Student count failed:', error.message);
    }
    
    try {
      const teacherCount = await User.count({ 
        where: { schoolId: school.id, role: 'teacher', isActive: true } 
      });
      console.log(`✅ Teacher count: ${teacherCount}`);
    } catch (error) {
      console.log('❌ Teacher count failed:', error.message);
    }
    
    try {
      const parentCount = await User.count({ 
        where: { schoolId: school.id, role: 'parent', isActive: true } 
      });
      console.log(`✅ Parent count: ${parentCount}`);
    } catch (error) {
      console.log('❌ Parent count failed:', error.message);
    }
    
    try {
      const adminCount = await User.count({ 
        where: { schoolId: school.id, role: 'school_admin', isActive: true } 
      });
      console.log(`✅ Admin count: ${adminCount}`);
    } catch (error) {
      console.log('❌ Admin count failed:', error.message);
    }
    
    // Test 3: Test Promise.all approach
    console.log('3. Testing Promise.all approach...');
    try {
      const [
        studentCount,
        teacherCount,
        parentCount,
        adminCount,
        principalCount
      ] = await Promise.all([
        User.count({ where: { schoolId: school.id, role: 'student', isActive: true } }),
        User.count({ where: { schoolId: school.id, role: 'teacher', isActive: true } }),
        User.count({ where: { schoolId: school.id, role: 'parent', isActive: true } }),
        User.count({ where: { schoolId: school.id, role: 'school_admin', isActive: true } }),
        User.count({ where: { schoolId: school.id, role: 'principal', isActive: true } })
      ]);
      
      console.log('✅ Promise.all succeeded');
      console.log(`   Students: ${studentCount}`);
      console.log(`   Teachers: ${teacherCount}`);
      console.log(`   Parents: ${parentCount}`);
      console.log(`   Admins: ${adminCount}`);
      console.log(`   Principals: ${principalCount}`);
      
      const stats = {
        users: {
          student: studentCount,
          teacher: teacherCount,
          parent: parentCount,
          school_admin: adminCount + principalCount,
          total: studentCount + teacherCount + parentCount + adminCount + principalCount
        },
        subscription: {
          status: school.subscriptionStatus,
          plan: school.subscriptionPlan,
          expiresAt: school.subscriptionExpiresAt,
          maxStudents: school.maxStudents,
          maxTeachers: school.maxTeachers
        }
      };
      
      console.log('✅ Stats object created successfully:');
      console.log(JSON.stringify(stats, null, 2));
      
    } catch (error) {
      console.log('❌ Promise.all failed:', error.message);
      console.log('Stack trace:', error.stack);
    }
    
    // Test 4: Check if User model is working
    console.log('4. Testing User model...');
    try {
      const allUsers = await User.findAll({ 
        where: { schoolId: school.id },
        attributes: ['id', 'role', 'isActive'],
        limit: 5
      });
      console.log(`✅ Found ${allUsers.length} users for this school`);
      allUsers.forEach(user => {
        console.log(`   - ${user.role} (active: ${user.isActive})`);
      });
    } catch (error) {
      console.log('❌ User model test failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    const { sequelize } = require('./models');
    await sequelize.close();
  }
}

testStatsQuery();