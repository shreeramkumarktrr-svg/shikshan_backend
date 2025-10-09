'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    console.log('🌱 Starting fresh comprehensive data seeding...');

    // Helper function to check if record exists
    const recordExists = async (table, where) => {
      try {
        const whereClause = Object.keys(where).map(key => `"${key}" = '${where[key]}'`).join(' AND ');
        const [results] = await queryInterface.sequelize.query(
          `SELECT COUNT(*) as count FROM "${table}" WHERE ${whereClause}`
        );
        return results[0].count > 0;
      } catch (error) {
        return false;
      }
    };

    // Helper function to generate random date within range
    const randomDate = (start, end) => {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    };

    // Helper function to generate admission number
    const generateAdmissionNumber = (schoolCode, year, index) => {
      return `${schoolCode}${year}${String(index).padStart(3, '0')}`;
    };

    // Create Super Admin (only if doesn't exist)
    const superAdminExists = await recordExists('users', { email: 'admin@shikshan.com' });
    let superAdminId;
    
    if (!superAdminExists) {
      superAdminId = uuidv4();
      const superAdminPasswordHash = await bcrypt.hash('admin123', 10);

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
      } else {
      const [existingAdmin] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE email = 'admin@shikshan.com' LIMIT 1`
      );
      superAdminId = existingAdmin[0].id;
      }

    // School data
    const schoolsData = [
      {
        name: 'Greenwood International School',
        email: 'admin@greenwood.edu',
        phone: '9876543210',
        address: '123 Education Street, Knowledge City, Mumbai 400001',
        establishedYear: 2010,
        code: 'GW'
      },
      {
        name: 'Sunrise Public School',
        email: 'admin@sunrise.edu',
        phone: '9876543220',
        address: '456 Learning Avenue, Education District, Delhi 110001',
        establishedYear: 2005,
        code: 'SP'
      },
      {
        name: 'Bright Future Academy',
        email: 'admin@brightfuture.edu',
        phone: '9876543230',
        address: '789 Scholar Road, Academic Zone, Bangalore 560001',
        establishedYear: 2015,
        code: 'BF'
      },
      {
        name: 'Excellence High School',
        email: 'admin@excellence.edu',
        phone: '9876543240',
        address: '321 Wisdom Street, Study Circle, Chennai 600001',
        establishedYear: 2008,
        code: 'EH'
      }
    ];

    const schools = [];
    const principals = [];
    const teachers = [];
    const classes = [];
    const students = [];
    const parents = [];

    // Create schools and their data
    for (let i = 0; i < schoolsData.length; i++) {
      const schoolData = schoolsData[i];
      let schoolId;
      
      // Check if school exists
      const schoolExists = await recordExists('schools', { email: schoolData.email });
      
      if (!schoolExists) {
        schoolId = uuidv4();
        const trialExpiresAt = new Date();
        trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

        // Create school
        const school = {
          id: schoolId,
          name: schoolData.name,
          email: schoolData.email,
          phone: schoolData.phone,
          address: schoolData.address,
          establishedYear: schoolData.establishedYear,
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
        };
        schools.push(school);
        } else {
        const [existingSchool] = await queryInterface.sequelize.query(
          `SELECT id FROM schools WHERE email = '${schoolData.email}' LIMIT 1`
        );
        schoolId = existingSchool[0].id;
        }

      // Create principal for each school
      const principalEmail = `principal@${schoolData.email.split('@')[1]}`;
      const principalExists = await recordExists('users', { email: principalEmail });
      let principalId;
      
      if (!principalExists) {
        principalId = uuidv4();
        const principalNames = [
          { firstName: 'John', lastName: 'Principal' },
          { firstName: 'Sarah', lastName: 'Anderson' },
          { firstName: 'Michael', lastName: 'Thompson' },
          { firstName: 'Emily', lastName: 'Davis' }
        ];
        
        const principal = {
          id: principalId,
          firstName: principalNames[i].firstName,
          lastName: principalNames[i].lastName,
          email: principalEmail,
          phone: `987654321${i + 1}`,
          passwordHash: await bcrypt.hash('admin123', 10),
          role: 'principal',
          schoolId: schoolId,
          employeeId: `EMP${schoolData.code}001`,
          joiningDate: '2024-01-01',
          isActive: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: now,
          updatedAt: now
        };
        principals.push(principal);
        } else {
        const [existingPrincipal] = await queryInterface.sequelize.query(
          `SELECT id FROM users WHERE email = '${principalEmail}' LIMIT 1`
        );
        principalId = existingPrincipal[0].id;
        }

      // Create 5 teachers for each school
      const teacherNames = [
        { firstName: 'Sarah', lastName: 'Johnson', subjects: ['Mathematics', 'Physics'] },
        { firstName: 'David', lastName: 'Brown', subjects: ['Chemistry', 'Biology'] },
        { firstName: 'Mary', lastName: 'Smith', subjects: ['English', 'Literature'] },
        { firstName: 'Robert', lastName: 'Wilson', subjects: ['History', 'Geography'] },
        { firstName: 'Lisa', lastName: 'Garcia', subjects: ['Hindi', 'Sanskrit'] }
      ];

      const schoolTeachers = [];
      for (let j = 0; j < 5; j++) {
        const teacherEmail = `${teacherNames[j].firstName.toLowerCase()}.${teacherNames[j].lastName.toLowerCase()}@${schoolData.email.split('@')[1]}`;
        const teacherExists = await recordExists('users', { email: teacherEmail });
        
        if (!teacherExists) {
          const teacherId = uuidv4();
          const teacher = {
            id: teacherId,
            firstName: teacherNames[j].firstName,
            lastName: teacherNames[j].lastName,
            email: teacherEmail,
            phone: `98765432${i}${j + 2}`,
            passwordHash: await bcrypt.hash('teacher123', 10),
            role: 'teacher',
            schoolId: schoolId,
            employeeId: `EMP${schoolData.code}${String(j + 2).padStart(3, '0')}`,
            subjects: teacherNames[j].subjects,
            joiningDate: randomDate(new Date('2024-01-01'), new Date('2024-06-01')).toISOString().split('T')[0],
            isActive: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: now,
            updatedAt: now
          };
          teachers.push(teacher);
          schoolTeachers.push(teacher);
        } else {
          const [existingTeacher] = await queryInterface.sequelize.query(
            `SELECT * FROM users WHERE email = '${teacherEmail}' LIMIT 1`
          );
          schoolTeachers.push(existingTeacher[0]);
        }
      }

      // Create 2 classes for each school (Class 9-A and Class 10-A)
      const grades = ['9', '10'];
      for (let g = 0; g < grades.length; g++) {
        const className = `Class ${grades[g]}-A`;
        const classExists = await recordExists('classes', { name: className, schoolId: schoolId });
        
        if (!classExists) {
          const classId = uuidv4();
          const classTeacherId = schoolTeachers[g] ? schoolTeachers[g].id : principalId;
          
          const classData = {
            id: classId,
            name: className,
            grade: grades[g],
            section: 'A',
            schoolId: schoolId,
            classTeacherId: classTeacherId,
            maxStudents: 40,
            room: `Room ${100 + g + 1}`,
            subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'History', 'Geography'],
            timetable: JSON.stringify({
              monday: [
                { period: 1, subject: 'Mathematics', teacher: 'Sarah Johnson', time: '09:00-09:45' },
                { period: 2, subject: 'Physics', teacher: 'Sarah Johnson', time: '09:45-10:30' },
                { period: 3, subject: 'English', teacher: 'Mary Smith', time: '10:45-11:30' },
                { period: 4, subject: 'Chemistry', teacher: 'David Brown', time: '11:30-12:15' }
              ],
              tuesday: [
                { period: 1, subject: 'Biology', teacher: 'David Brown', time: '09:00-09:45' },
                { period: 2, subject: 'Hindi', teacher: 'Lisa Garcia', time: '09:45-10:30' },
                { period: 3, subject: 'History', teacher: 'Robert Wilson', time: '10:45-11:30' },
                { period: 4, subject: 'Geography', teacher: 'Robert Wilson', time: '11:30-12:15' }
              ],
              wednesday: [],
              thursday: [],
              friday: [],
              saturday: []
            }),
            isActive: true,
            createdAt: now,
            updatedAt: now
          };
          classes.push(classData);
          // Create 10 students for each class
          const studentFirstNames = ['Alex', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella'];
          const studentLastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
          
          for (let s = 0; s < 10; s++) {
            const studentEmail = `${studentFirstNames[s].toLowerCase()}.${studentLastNames[s].toLowerCase()}@student.${schoolData.email.split('@')[1]}`;
            const studentExists = await recordExists('users', { email: studentEmail });
            
            if (!studentExists) {
              const studentUserId = uuidv4();
              const studentId = uuidv4();
              const parentUserId = uuidv4();
              
              const studentIndex = g * 10 + s + 1;
              const admissionNumber = generateAdmissionNumber(schoolData.code, '2024', studentIndex);
              
              // Create student user
              const studentUser = {
                id: studentUserId,
                firstName: studentFirstNames[s],
                lastName: studentLastNames[s],
                email: studentEmail,
                phone: `98765${i}${g}${s}${Math.floor(Math.random() * 10)}`,
                passwordHash: await bcrypt.hash('student123', 10),
                role: 'student',
                schoolId: schoolId,
                dateOfBirth: randomDate(new Date('2008-01-01'), new Date('2010-12-31')).toISOString().split('T')[0],
                gender: s % 2 === 0 ? 'male' : 'female',
                address: `${100 + s} Student Lane, ${schoolData.address.split(',')[1]}`,
                isActive: true,
                emailVerified: true,
                phoneVerified: true,
                createdAt: now,
                updatedAt: now
              };
              students.push(studentUser);

              // Create student profile
              const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
              const transportModes = ['walking', 'school_bus', 'private_vehicle', 'public_transport'];
              
              const studentProfile = {
                id: studentId,
                userId: studentUserId,
                classId: classId,
                rollNumber: String(s + 1).padStart(3, '0'),
                admissionNumber: admissionNumber,
                admissionDate: '2024-04-01',
                bloodGroup: bloodGroups[Math.floor(Math.random() * bloodGroups.length)],
                transportMode: transportModes[Math.floor(Math.random() * transportModes.length)],
                busRoute: s % 3 === 0 ? `Route ${String.fromCharCode(65 + (s % 3))}` : null,
                feeCategory: 'regular',
                scholarshipDetails: JSON.stringify({
                  hasScholarship: s % 5 === 0,
                  scholarshipType: s % 5 === 0 ? 'merit' : null,
                  scholarshipAmount: s % 5 === 0 ? 5000 : 0,
                  scholarshipPercentage: s % 5 === 0 ? 10 : 0
                }),
                isActive: true,
                createdAt: now,
                updatedAt: now
              };

              // Create parent user
              const parentEmail = `parent${s + 1}.${studentLastNames[s].toLowerCase()}@gmail.com`;
              const parentUser = {
                id: parentUserId,
                firstName: `Parent${s + 1}`,
                lastName: studentLastNames[s],
                email: parentEmail,
                phone: `98765${i}${g}${s}9${Math.floor(Math.random() * 10)}`,
                passwordHash: await bcrypt.hash('parent123', 10),
                role: 'parent',
                schoolId: schoolId,
                address: studentUser.address,
                isActive: true,
                emailVerified: true,
                phoneVerified: true,
                createdAt: now,
                updatedAt: now
              };
              parents.push(parentUser);

              // Store student profile and parent for later insertion
              studentProfile.parentId = parentUserId;
              students.push(studentProfile);
            }
          }
        } else {
          }
      }
    }

    // Insert all data
    if (schools.length > 0) {
      await queryInterface.bulkInsert('schools', schools);
      }

    if (principals.length > 0 || teachers.length > 0 || students.filter(s => s.role).length > 0 || parents.length > 0) {
      const allUsers = [...principals, ...teachers, ...students.filter(s => s.role), ...parents];
      if (allUsers.length > 0) {
        await queryInterface.bulkInsert('users', allUsers);
        }
    }

    if (classes.length > 0) {
      await queryInterface.bulkInsert('classes', classes);
      }

    // Insert student profiles
    const studentProfiles = students.filter(s => s.userId && s.classId);
    if (studentProfiles.length > 0) {
      await queryInterface.bulkInsert('students', studentProfiles.map(s => {
        const { parentId, ...profile } = s;
        return profile;
      }));
      // Create parent-student relationships
      const parentStudentLinks = [];
      studentProfiles.forEach(profile => {
        parentStudentLinks.push({
          studentId: profile.id,
          parentId: profile.parentId,
          createdAt: now,
          updatedAt: now
        });
      });
      
      if (parentStudentLinks.length > 0) {
        await queryInterface.bulkInsert('StudentParents', parentStudentLinks);
        }
    }

    console.log(`   - 4 Schools (created or verified)`);
    console.log(`   - 4 Principals (created or verified)`);
    console.log(`   - 20 Teachers (created or verified)`);
    console.log(`   - 8 Classes (created or verified)`);
    console.log(`   - 80 Students (created or verified)`);
    console.log(`   - 80 Parents (created or verified)`);
    
    
    
    console.log('Parents: parent[n].[lastname]@gmail.com / parent123');
  },

  async down(queryInterface, Sequelize) {
    try {
      // Delete in reverse order to respect foreign key constraints
      await queryInterface.bulkDelete('StudentParents', null, {});
      await queryInterface.bulkDelete('students', null, {});
      await queryInterface.bulkDelete('classes', null, {});
      await queryInterface.bulkDelete('users', {
        role: {
          [queryInterface.sequelize.Sequelize.Op.in]: ['principal', 'teacher', 'student', 'parent']
        }
      }, {});
      await queryInterface.bulkDelete('schools', null, {});
      await queryInterface.bulkDelete('users', { role: 'super_admin' }, {});
      console.log('Fresh comprehensive data cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up fresh comprehensive data:', error);
    }
  }
};