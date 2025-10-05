const bcrypt = require('bcryptjs');
const { User, School } = require('./models');

async function createTestUser() {
  try {
    console.log('Creating test user...');

    // First, create or find a test school
    let school = await School.findOne({ where: { name: 'Test School' } });
    
    if (!school) {
      school = await School.create({
        name: 'Test School',
        address: '123 Test Street',
        phone: '1234567890',
        email: 'test@school.com',
        principalName: 'Test Principal',
        isActive: true
      });
      console.log('✅ Test school created');
    } else {
      console.log('✅ Test school already exists');
    }

    // Check if test user already exists
    let user = await User.findOne({ 
      where: { 
        email: 'admin@test.com',
        schoolId: school.id 
      } 
    });

    if (!user) {
      // Create test admin user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      user = await User.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@test.com',
        phone: '1234567890',
        passwordHash: hashedPassword,
        role: 'school_admin',
        schoolId: school.id,
        isActive: true,
        emailVerified: true
      });
      console.log('✅ Test admin user created');
    } else {
      console.log('✅ Test admin user already exists');
    }

    // Create a test teacher
    let teacher = await User.findOne({ 
      where: { 
        email: 'teacher@test.com',
        schoolId: school.id 
      } 
    });

    if (!teacher) {
      const hashedPassword = await bcrypt.hash('teacher123', 12);
      
      teacher = await User.create({
        firstName: 'Test',
        lastName: 'Teacher',
        email: 'teacher@test.com',
        phone: '1234567891',
        passwordHash: hashedPassword,
        role: 'teacher',
        schoolId: school.id,
        isActive: true,
        emailVerified: true,
        employeeId: 'T001'
      });
      console.log('✅ Test teacher user created');
    } else {
      console.log('✅ Test teacher user already exists');
    }

    console.log('\n🎉 Test users ready!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin User:');
    console.log('  Email: admin@test.com');
    console.log('  Password: admin123');
    console.log('\nTeacher User:');
    console.log('  Email: teacher@test.com');
    console.log('  Password: teacher123');
    console.log('\n🌐 Login at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser();