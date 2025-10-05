'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Helper function to check if record exists
    const recordExists = async (table, where) => {
      const [results] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM "${table}" WHERE ${Object.keys(where).map(key => `"${key}" = '${where[key]}'`).join(' AND ')}`
      );
      return results[0].count > 0;
    };

    console.log('Starting comprehensive test data seeding...');

    // 1. Ensure subscription plans exist (Basic, Standard, Premium)
    const subscriptionPlans = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Starter',
        planType: 'basic',
        price: 999.00,
        maxStudents: 100,
        maxTeachers: 10
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Super',
        planType: 'standard',
        price: 1999.00,
        maxStudents: 500,
        maxTeachers: 50
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Advanced',
        planType: 'premium',
        price: 3999.00,
        maxStudents: 2000,
        maxTeachers: 200
      }
    ];

    // Create subscriptions if they don't exist
    for (const plan of subscriptionPlans) {
      const exists = await recordExists('subscriptions', { id: plan.id });
      if (!exists) {
        await queryInterface.bulkInsert('subscriptions', [{
          id: plan.id,
          name: plan.name,
          description: `${plan.name} plan for schools`,
          planType: plan.planType,
          price: plan.price,
          currency: 'INR',
          billingCycle: 'monthly',
          trialDays: 30,
          maxStudents: plan.maxStudents,
          maxTeachers: plan.maxTeachers,
          maxClasses: Math.floor(plan.maxStudents / 20),
          features: JSON.stringify({
            attendance: true,
            homework: true,
            events: true,
            reports: true,
            smsNotifications: plan.planType !== 'basic',
            emailNotifications: true,
            mobileApp: plan.planType !== 'basic',
            customBranding: plan.planType === 'premium',
            apiAccess: plan.planType === 'premium',
            advancedReports: plan.planType !== 'basic',
            bulkImport: plan.planType !== 'basic',
            parentPortal: true,
            onlineExams: plan.planType !== 'basic',
            feeManagement: plan.planType !== 'basic',
            libraryManagement: plan.planType === 'premium',
            transportManagement: plan.planType === 'premium'
          }),
          isActive: true,
          isPopular: plan.planType === 'standard',
          sortOrder: plan.planType === 'basic' ? 1 : plan.planType === 'standard' ? 2 : 3,
          createdAt: now,
          updatedAt: now
        }]);
        console.log(`Subscription plan ${plan.name} created`);
      } else {
        await queryInterface.sequelize.query(
          `UPDATE subscriptions SET name = '${plan.name}' WHERE id = '${plan.id}'`
        );
        console.log(`Subscription plan ${plan.name} updated`);
      }
    }

    // 2. Create three schools with respective plans
    const schools = [
      {
        id: uuidv4(),
        name: 'Sunrise Academy',
        email: 'admin@sunrise.edu',
        phone: '9876543220',
        address: '123 Sunrise Street, Education City, State 12345',
        subscriptionPlan: 'basic',
        subscriptionId: subscriptionPlans[0].id
      },
      {
        id: uuidv4(),
        name: 'Excellence Public School',
        email: 'admin@excellence.edu',
        phone: '9876543221',
        address: '456 Excellence Avenue, Knowledge Town, State 12345',
        subscriptionPlan: 'standard',
        subscriptionId: subscriptionPlans[1].id
      },
      {
        id: uuidv4(),
        name: 'Future International School',
        email: 'admin@future.edu',
        phone: '9876543222',
        address: '789 Future Boulevard, Innovation City, State 12345',
        subscriptionPlan: 'premium',
        subscriptionId: subscriptionPlans[2].id
      }
    ];

    const createdSchools = [];
    for (const school of schools) {
      const exists = await recordExists('schools', { email: school.email });
      if (!exists) {
        const trialExpiresAt = new Date();
        trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

        await queryInterface.bulkInsert('schools', [{
          id: school.id,
          name: school.name,
          email: school.email,
          phone: school.phone,
          address: school.address,
          establishedYear: 2015,
          academicYear: '2024-25',
          timezone: 'Asia/Kolkata',
          locale: 'en',
          currency: 'INR',
          subscriptionStatus: 'active',
          subscriptionPlan: school.subscriptionPlan,
          subscriptionId: school.subscriptionId,
          subscriptionExpiresAt: trialExpiresAt,
          maxStudents: subscriptionPlans.find(p => p.planType === school.subscriptionPlan).maxStudents,
          maxTeachers: subscriptionPlans.find(p => p.planType === school.subscriptionPlan).maxTeachers,
          settings: JSON.stringify({
            enableSMS: true,
            enableEmail: true,
            enablePushNotifications: true,
            attendanceGracePeriod: 15,
            feeReminderDays: [7, 3, 1]
          }),
          isActive: true,
          createdAt: now,
          updatedAt: now
        }]);
        createdSchools.push(school);
        console.log(`School ${school.name} created`);
      } else {
        const [existingSchool] = await queryInterface.sequelize.query(
          `SELECT * FROM schools WHERE email = '${school.email}' LIMIT 1`
        );
        createdSchools.push({ ...school, id: existingSchool[0].id });
        console.log(`School ${school.name} already exists`);
      }
    }

    // 3. Create school admins for each school
    const schoolAdmins = [];
    for (let i = 0; i < createdSchools.length; i++) {
      const school = createdSchools[i];
      const adminEmail = `principal${i + 1}@${school.email.split('@')[1]}`;
      
      const exists = await recordExists('users', { email: adminEmail });
      if (!exists) {
        const adminId = uuidv4();
        const passwordHash = await bcrypt.hash('admin123', 12);

        await queryInterface.bulkInsert('users', [{
          id: adminId,
          firstName: `Principal${i + 1}`,
          lastName: 'Admin',
          email: adminEmail,
          phone: `987654321${i + 5}`,
          passwordHash: passwordHash,
          role: 'principal',
          schoolId: school.id,
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
          joiningDate: '2024-01-01',
          createdAt: now,
          updatedAt: now
        }]);
        schoolAdmins.push({ id: adminId, schoolId: school.id, email: adminEmail });
        console.log(`School admin created for ${school.name}`);
      }
    }

    // 4. Create teachers for each school (3 per school)
    const teachers = [];
    const teacherNames = [
      ['Sarah', 'Johnson'], ['Mike', 'Davis'], ['Lisa', 'Wilson'],
      ['David', 'Brown'], ['Emma', 'Taylor'], ['James', 'Anderson'],
      ['Maria', 'Garcia'], ['Robert', 'Martinez'], ['Jennifer', 'Lopez']
    ];

    for (let schoolIndex = 0; schoolIndex < createdSchools.length; schoolIndex++) {
      const school = createdSchools[schoolIndex];
      
      for (let teacherIndex = 0; teacherIndex < 3; teacherIndex++) {
        const globalIndex = schoolIndex * 3 + teacherIndex;
        const [firstName, lastName] = teacherNames[globalIndex];
        const teacherEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${school.email.split('@')[1]}`;
        
        const exists = await recordExists('users', { email: teacherEmail });
        if (!exists) {
          const teacherId = uuidv4();
          const passwordHash = await bcrypt.hash('teacher123', 12);

          await queryInterface.bulkInsert('users', [{
            id: teacherId,
            firstName: firstName,
            lastName: lastName,
            email: teacherEmail,
            phone: `987654${String(globalIndex + 30).padStart(4, '0')}`,
            passwordHash: passwordHash,
            role: 'teacher',
            schoolId: school.id,
            subjects: ['Mathematics', 'Science', 'English'][teacherIndex % 3] ? 
              [['Mathematics', 'Physics'], ['Science', 'Chemistry'], ['English', 'Hindi']][teacherIndex] : 
              ['Mathematics'],
            isActive: true,
            emailVerified: true,
            phoneVerified: true,
            joiningDate: '2024-01-15',
            createdAt: now,
            updatedAt: now
          }]);
          teachers.push({ id: teacherId, schoolId: school.id, email: teacherEmail });
          console.log(`Teacher ${firstName} ${lastName} created for ${school.name}`);
        }
      }
    }

    // 5. Create classes for each school
    const classes = [];
    for (let schoolIndex = 0; schoolIndex < createdSchools.length; schoolIndex++) {
      const school = createdSchools[schoolIndex];
      const schoolTeachers = teachers.filter(t => t.schoolId === school.id);
      
      for (let classIndex = 0; classIndex < 3; classIndex++) {
        const className = `Class ${8 + classIndex}-A`;
        const exists = await recordExists('classes', { name: className, schoolId: school.id });
        
        if (!exists) {
          const classId = uuidv4();
          const classTeacher = schoolTeachers[classIndex % schoolTeachers.length];

          await queryInterface.bulkInsert('classes', [{
            id: classId,
            name: className,
            grade: String(8 + classIndex),
            section: 'A',
            schoolId: school.id,
            classTeacherId: classTeacher?.id,
            maxStudents: 40,
            room: `Room ${101 + classIndex}`,
            subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'],
            timetable: JSON.stringify({
              monday: [
                { period: 1, subject: 'Mathematics', time: '09:00-09:45' },
                { period: 2, subject: 'Science', time: '09:45-10:30' },
                { period: 3, subject: 'English', time: '10:45-11:30' },
                { period: 4, subject: 'Hindi', time: '11:30-12:15' }
              ]
            }),
            isActive: true,
            createdAt: now,
            updatedAt: now
          }]);
          classes.push({ id: classId, schoolId: school.id, name: className });
          console.log(`Class ${className} created for ${school.name}`);
        }
      }
    }

    console.log('Phase 1 completed: Schools, admins, teachers, and classes created');
  },

  async down(queryInterface, Sequelize) {
    try {
      // Clean up in reverse order
      await queryInterface.bulkDelete('classes', {
        name: {
          [queryInterface.sequelize.Sequelize.Op.in]: ['Class 8-A', 'Class 9-A', 'Class 10-A']
        }
      }, {});
      
      await queryInterface.bulkDelete('users', {
        email: {
          [queryInterface.sequelize.Sequelize.Op.like]: '%@sunrise.edu'
        }
      }, {});
      
      await queryInterface.bulkDelete('users', {
        email: {
          [queryInterface.sequelize.Sequelize.Op.like]: '%@excellence.edu'
        }
      }, {});
      
      await queryInterface.bulkDelete('users', {
        email: {
          [queryInterface.sequelize.Sequelize.Op.like]: '%@future.edu'
        }
      }, {});
      
      await queryInterface.bulkDelete('schools', {
        email: {
          [queryInterface.sequelize.Sequelize.Op.in]: [
            'admin@sunrise.edu',
            'admin@excellence.edu', 
            'admin@future.edu'
          ]
        }
      }, {});
      
      console.log('Comprehensive test data cleaned up');
    } catch (error) {
      console.error('Error cleaning up comprehensive test data:', error);
    }
  }
};