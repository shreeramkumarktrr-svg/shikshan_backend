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

    // Create Super Admin
    const superAdminId = uuidv4();
    const superAdminPasswordHash = await bcrypt.hash('admin123', 12);

    if (!(await recordExists('users', { email: 'admin@shikshan.com' }))) {
      await queryInterface.bulkInsert('users', [{
        id: superAdminId,
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@shikshan.com',
        phone: '9999999999',
        passwordHash: superAdminPasswordHash,
        role: 'super_admin',
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Super Admin created');
    } else {
      console.log('Super Admin already exists, skipping...');
    }

    // Create Demo School
    let demoSchoolId = uuidv4();
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

    if (!(await recordExists('schools', { email: 'admin@greenwood.edu' }))) {
      await queryInterface.bulkInsert('schools', [{
        id: demoSchoolId,
        name: 'Greenwood International School',
        email: 'admin@greenwood.edu',
        phone: '9876543210',
        address: '123 Education Street, Knowledge City, State 12345',
        establishedYear: 2010,
        academicYear: '2024-25',
        timezone: 'Asia/Kolkata',
        locale: 'en',
        currency: 'INR',
        subscriptionStatus: 'trial',
        subscriptionPlan: 'standard',
        subscriptionExpiresAt: trialExpiresAt,
        maxStudents: 500,
        maxTeachers: 50,
        settings: JSON.stringify({
          enableSMS: true,
          enableEmail: true,
          enablePushNotifications: true,
          attendanceGracePeriod: 15,
          feeReminderDays: [7, 3, 1],
          academicCalendar: {
            startDate: '2024-04-01',
            endDate: '2025-03-31',
            terms: [
              { name: 'Term 1', startDate: '2024-04-01', endDate: '2024-09-30' },
              { name: 'Term 2', startDate: '2024-10-01', endDate: '2025-03-31' }
            ],
            holidays: [
              { name: 'Independence Day', date: '2024-08-15' },
              { name: 'Gandhi Jayanti', date: '2024-10-02' },
              { name: 'Diwali', date: '2024-11-01' }
            ]
          }
        }),
        isActive: true,
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Demo School created');
    } else {
      // Get existing school ID
      const [existingSchool] = await queryInterface.sequelize.query(
        `SELECT id FROM schools WHERE email = 'admin@greenwood.edu' LIMIT 1`
      );
      demoSchoolId = existingSchool[0].id;
      console.log('Demo School already exists, using existing ID...');
    }

    // Create School Admin
    let schoolAdminId = uuidv4();
    const schoolAdminPasswordHash = await bcrypt.hash('admin123', 12);

    if (!(await recordExists('users', { email: 'principal@greenwood.edu' }))) {
      await queryInterface.bulkInsert('users', [{
        id: schoolAdminId,
        firstName: 'John',
        lastName: 'Principal',
        email: 'principal@greenwood.edu',
        phone: '9876543211',
        passwordHash: schoolAdminPasswordHash,
        role: 'principal',
        schoolId: demoSchoolId,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        joiningDate: '2024-01-01',
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Principal created');
    } else {
      // Get existing principal ID
      const [existingPrincipal] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email = 'principal@greenwood.edu' LIMIT 1`
      );
      schoolAdminId = existingPrincipal[0].id;
      console.log('Principal already exists, using existing ID...');
    }

    // Create Demo Teacher
    let teacherId = uuidv4();
    const teacherPasswordHash = await bcrypt.hash('teacher123', 12);

    if (!(await recordExists('users', { email: 'sarah.johnson@greenwood.edu' }))) {
      await queryInterface.bulkInsert('users', [{
        id: teacherId,
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@greenwood.edu',
        phone: '9876543212',
        passwordHash: teacherPasswordHash,
        role: 'teacher',
        schoolId: demoSchoolId,
        subjects: ['Mathematics', 'Physics'],
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        joiningDate: '2024-01-15',
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Teacher created');
    } else {
      // Get existing teacher ID
      const [existingTeacher] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email = 'sarah.johnson@greenwood.edu' LIMIT 1`
      );
      teacherId = existingTeacher[0].id;
      console.log('Teacher already exists, using existing ID...');
    }

    // Create Demo Class
    let classId = uuidv4();
    const classExists = await recordExists('classes', { name: 'Class 10-A', schoolId: demoSchoolId });

    if (!classExists) {
      await queryInterface.bulkInsert('classes', [{
        id: classId,
        name: 'Class 10-A',
        grade: '10',
        section: 'A',
        schoolId: demoSchoolId,
        classTeacherId: teacherId,
        maxStudents: 40,
        room: 'Room 101',
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi'],
        timetable: JSON.stringify({
          monday: [
            { period: 1, subject: 'Mathematics', teacher: 'Sarah Johnson', time: '09:00-09:45' },
            { period: 2, subject: 'Physics', teacher: 'Sarah Johnson', time: '09:45-10:30' },
            { period: 3, subject: 'English', teacher: 'Mary Smith', time: '10:45-11:30' },
            { period: 4, subject: 'Chemistry', teacher: 'David Brown', time: '11:30-12:15' }
          ],
          tuesday: [
            { period: 1, subject: 'Biology', teacher: 'Lisa Wilson', time: '09:00-09:45' },
            { period: 2, subject: 'Hindi', teacher: 'Raj Kumar', time: '09:45-10:30' },
            { period: 3, subject: 'Mathematics', teacher: 'Sarah Johnson', time: '10:45-11:30' },
            { period: 4, subject: 'Physics', teacher: 'Sarah Johnson', time: '11:30-12:15' }
          ],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: []
        }),
        isActive: true,
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Demo Class created');
    } else {
      // Get existing class ID
      const [existingClass] = await queryInterface.sequelize.query(
        `SELECT id FROM classes WHERE name = 'Class 10-A' AND "schoolId" = '${demoSchoolId}' LIMIT 1`
      );
      classId = existingClass[0].id;
      console.log('Demo Class already exists, using existing ID...');
    }

    // Create Demo Student
    let studentUserId = uuidv4();
    let studentId = uuidv4();
    const studentPasswordHash = await bcrypt.hash('student123', 12);

    if (!(await recordExists('users', { email: 'alex.smith@student.greenwood.edu' }))) {
      await queryInterface.bulkInsert('users', [{
        id: studentUserId,
        firstName: 'Alex',
        lastName: 'Smith',
        email: 'alex.smith@student.greenwood.edu',
        phone: '9876543213',
        passwordHash: studentPasswordHash,
        role: 'student',
        schoolId: demoSchoolId,
        dateOfBirth: '2008-05-15',
        gender: 'male',
        address: '456 Student Lane, Knowledge City, State 12345',
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Student user created');
    } else {
      // Get existing student user ID
      const [existingStudentUser] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email = 'alex.smith@student.greenwood.edu' LIMIT 1`
      );
      studentUserId = existingStudentUser[0].id;
      console.log('Student user already exists, using existing ID...');
    }

    if (!(await recordExists('students', { admissionNumber: 'GW2024001' }))) {
      await queryInterface.bulkInsert('students', [{
        id: studentId,
        userId: studentUserId,
        classId: classId,
        rollNumber: '001',
        admissionNumber: 'GW2024001',
        admissionDate: '2024-04-01',
        bloodGroup: 'O+',
        transportMode: 'school_bus',
        busRoute: 'Route A',
        feeCategory: 'regular',
        scholarshipDetails: JSON.stringify({
          hasScholarship: false,
          scholarshipType: null,
          scholarshipAmount: 0,
          scholarshipPercentage: 0
        }),
        isActive: true,
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Student profile created');
    } else {
      // Get existing student ID
      const [existingStudent] = await queryInterface.sequelize.query(
        `SELECT id FROM students WHERE "admissionNumber" = 'GW2024001' LIMIT 1`
      );
      studentId = existingStudent[0].id;
      console.log('Student profile already exists, using existing ID...');
    }

    // Create Demo Parent
    let parentUserId = uuidv4();
    const parentPasswordHash = await bcrypt.hash('parent123', 12);

    if (!(await recordExists('users', { email: 'robert.smith@gmail.com' }))) {
      await queryInterface.bulkInsert('users', [{
        id: parentUserId,
        firstName: 'Robert',
        lastName: 'Smith',
        email: 'robert.smith@gmail.com',
        phone: '9876543214',
        passwordHash: parentPasswordHash,
        role: 'parent',
        schoolId: demoSchoolId,
        address: '456 Student Lane, Knowledge City, State 12345',
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Parent created');
    } else {
      // Get existing parent ID
      const [existingParent] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email = 'robert.smith@gmail.com' LIMIT 1`
      );
      parentUserId = existingParent[0].id;
      console.log('Parent already exists, using existing ID...');
    }

    // Link Parent to Student
    const parentLinkExists = await recordExists('StudentParents', { studentId: studentId, parentId: parentUserId });
    if (!parentLinkExists) {
      await queryInterface.bulkInsert('StudentParents', [{
        studentId: studentId,
        parentId: parentUserId,
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Parent-Student link created');
    } else {
      console.log('Parent-Student link already exists, skipping...');
    }

    // Create Demo Event
    const eventExists = await recordExists('events', { title: 'Parent-Teacher Meeting', schoolId: demoSchoolId });
    if (!eventExists) {
      await queryInterface.bulkInsert('events', [{
        id: uuidv4(),
        title: 'Parent-Teacher Meeting',
        description: 'Monthly parent-teacher meeting to discuss student progress and upcoming activities.',
        type: 'meeting',
        priority: 'high',
        schoolId: demoSchoolId,
        createdBy: schoolAdminId,
        targetAudience: ['parents', 'teachers'],
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours duration
        location: 'School Auditorium',
        attachments: null,
        isPublished: true,
        sendNotification: true,
        notificationSent: false,
        readBy: null,
        createdAt: now,
        updatedAt: now
      }]);
      console.log('Demo Event created');
    } else {
      console.log('Demo Event already exists, skipping...');
    }

    console.log('Demo data seeded successfully!');
    console.log('Login credentials:');
    console.log('Super Admin: admin@shikshan.com / admin123');
    console.log('Principal: principal@greenwood.edu / admin123');
    console.log('Teacher: sarah.johnson@greenwood.edu / teacher123');
    console.log('Student: alex.smith@student.greenwood.edu / student123');
    console.log('Parent: robert.smith@gmail.com / parent123');
  },

  async down(queryInterface, Sequelize) {
    try {
      // Delete in reverse order to respect foreign key constraints
      await queryInterface.bulkDelete('events', { title: 'Parent-Teacher Meeting' }, {});
      await queryInterface.bulkDelete('StudentParents', null, {});
      await queryInterface.bulkDelete('students', { admissionNumber: 'GW2024001' }, {});
      await queryInterface.bulkDelete('classes', { name: 'Class 10-A' }, {});
      await queryInterface.bulkDelete('users', {
        email: {
          [queryInterface.sequelize.Sequelize.Op.in]: [
            'admin@shikshan.com',
            'principal@greenwood.edu',
            'sarah.johnson@greenwood.edu',
            'alex.smith@student.greenwood.edu',
            'robert.smith@gmail.com'
          ]
        }
      }, {});
      await queryInterface.bulkDelete('schools', { email: 'admin@greenwood.edu' }, {});
      console.log('Demo data cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up demo data:', error);
    }
  }
};