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

    // Get existing schools and classes
    const [schools] = await queryInterface.sequelize.query(
      `SELECT * FROM schools WHERE email IN ('admin@sunrise.edu', 'admin@excellence.edu', 'admin@future.edu')`
    );

    const [classes] = await queryInterface.sequelize.query(
      `SELECT * FROM classes WHERE "schoolId" IN ('${schools.map(s => s.id).join("', '")}')`
    );

    const [teachers] = await queryInterface.sequelize.query(
      `SELECT * FROM users WHERE role = 'teacher' AND "schoolId" IN ('${schools.map(s => s.id).join("', '")}')`
    );

    console.log('Creating students and activities...');

    // 6. Create 10 students per school with parents
    const students = [];
    const parents = [];
    const studentNames = [
      ['Alex', 'Smith'], ['Emma', 'Johnson'], ['Michael', 'Brown'], ['Sophia', 'Davis'], ['William', 'Miller'],
      ['Olivia', 'Wilson'], ['James', 'Moore'], ['Isabella', 'Taylor'], ['Benjamin', 'Anderson'], ['Charlotte', 'Thomas'],
      ['Lucas', 'Jackson'], ['Amelia', 'White'], ['Henry', 'Harris'], ['Mia', 'Martin'], ['Alexander', 'Thompson'],
      ['Harper', 'Garcia'], ['Sebastian', 'Martinez'], ['Evelyn', 'Robinson'], ['Jack', 'Clark'], ['Abigail', 'Rodriguez'],
      ['Owen', 'Lewis'], ['Emily', 'Lee'], ['Daniel', 'Walker'], ['Elizabeth', 'Hall'], ['Matthew', 'Allen'],
      ['Sofia', 'Young'], ['Joseph', 'Hernandez'], ['Avery', 'King'], ['Samuel', 'Wright'], ['Ella', 'Lopez']
    ];

    let studentCounter = 0;
    for (const school of schools) {
      const schoolClasses = classes.filter(c => c.schoolId === school.id);
      
      for (let i = 0; i < 10; i++) {
        const [firstName, lastName] = studentNames[studentCounter];
        const studentEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.${school.email.split('@')[1]}`;
        const parentEmail = `parent.${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`;
        
        const studentExists = await recordExists('users', { email: studentEmail });
        if (!studentExists) {
          // Create student user
          const studentUserId = uuidv4();
          const studentId = uuidv4();
          const parentUserId = uuidv4();
          const passwordHash = await bcrypt.hash('student123', 12);
          const parentPasswordHash = await bcrypt.hash('parent123', 12);

          // Student user
          await queryInterface.bulkInsert('users', [{
            id: studentUserId,
            firstName: firstName,
            lastName: lastName,
            email: studentEmail,
            phone: `987654${String(studentCounter + 100).padStart(4, '0')}`,
            passwordHash: passwordHash,
            role: 'student',
            schoolId: school.id,
            dateOfBirth: `200${8 + (i % 3)}-0${(i % 12) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
            gender: i % 2 === 0 ? 'male' : 'female',
            address: `${i + 1}00 Student Lane, ${school.name} Area, State 12345`,
            isActive: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: now,
            updatedAt: now
          }]);

          // Parent user
          await queryInterface.bulkInsert('users', [{
            id: parentUserId,
            firstName: `Parent${firstName}`,
            lastName: lastName,
            email: parentEmail,
            phone: `987654${String(studentCounter + 200).padStart(4, '0')}`,
            passwordHash: parentPasswordHash,
            role: 'parent',
            schoolId: school.id,
            address: `${i + 1}00 Student Lane, ${school.name} Area, State 12345`,
            isActive: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: now,
            updatedAt: now
          }]);

          // Student profile
          const classForStudent = schoolClasses[i % schoolClasses.length];
          await queryInterface.bulkInsert('students', [{
            id: studentId,
            userId: studentUserId,
            classId: classForStudent.id,
            rollNumber: String(i + 1).padStart(3, '0'),
            admissionNumber: `${school.name.substring(0, 2).toUpperCase()}2024${String(studentCounter + 1).padStart(3, '0')}`,
            admissionDate: '2024-04-01',
            bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'][i % 8],
            transportMode: ['school_bus', 'private_vehicle', 'walking'][i % 3],
            busRoute: i % 3 === 0 ? `Route ${String.fromCharCode(65 + (i % 5))}` : null,
            feeCategory: 'regular',
            scholarshipDetails: JSON.stringify({
              hasScholarship: i % 5 === 0,
              scholarshipType: i % 5 === 0 ? 'merit' : null,
              scholarshipAmount: i % 5 === 0 ? 5000 : 0,
              scholarshipPercentage: i % 5 === 0 ? 50 : 0
            }),
            isActive: true,
            createdAt: now,
            updatedAt: now
          }]);

          // Link parent to student
          await queryInterface.bulkInsert('StudentParents', [{
            studentId: studentId,
            parentId: parentUserId,
            createdAt: now,
            updatedAt: now
          }]);

          students.push({ 
            id: studentId, 
            userId: studentUserId, 
            schoolId: school.id, 
            classId: classForStudent.id,
            name: `${firstName} ${lastName}`
          });
          parents.push({ id: parentUserId, schoolId: school.id });

          console.log(`Student ${firstName} ${lastName} created for ${school.name}`);
        }
        studentCounter++;
      }
    }

    // 7. Create attendance records for past 10 days
    console.log('Creating attendance records...');
    for (let dayOffset = 10; dayOffset >= 1; dayOffset--) {
      const attendanceDate = new Date();
      attendanceDate.setDate(attendanceDate.getDate() - dayOffset);
      
      // Skip weekends
      if (attendanceDate.getDay() === 0 || attendanceDate.getDay() === 6) continue;

      for (const student of students) {
        const attendanceExists = await recordExists('attendance', { 
          studentId: student.id, 
          date: attendanceDate.toISOString().split('T')[0] 
        });
        
        if (!attendanceExists) {
          const isPresent = Math.random() > 0.1; // 90% attendance rate
          const checkInTime = isPresent ? 
            `${String(8 + Math.floor(Math.random() * 2)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00` : 
            null;
          const checkOutTime = isPresent ? 
            `${String(14 + Math.floor(Math.random() * 2)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00` : 
            null;

          await queryInterface.bulkInsert('attendance', [{
            id: uuidv4(),
            studentId: student.id,
            classId: student.classId,
            date: attendanceDate.toISOString().split('T')[0],
            status: isPresent ? 'present' : (Math.random() > 0.5 ? 'absent' : 'late'),
            checkInTime: checkInTime,
            checkOutTime: checkOutTime,
            remarks: !isPresent ? (Math.random() > 0.5 ? 'Sick' : 'Family emergency') : null,
            markedBy: teachers.find(t => t.schoolId === student.schoolId)?.id,
            createdAt: now,
            updatedAt: now
          }]);
        }
      }
    }

    console.log('Attendance records created for past 10 days');

    // 8. Create homework assignments
    console.log('Creating homework assignments...');
    const homeworkSubjects = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'];
    
    for (const schoolClass of classes) {
      const classTeacher = teachers.find(t => t.id === schoolClass.classTeacherId);
      if (!classTeacher) continue;

      for (let i = 0; i < 5; i++) {
        const subject = homeworkSubjects[i % homeworkSubjects.length];
        const title = `${subject} Assignment ${i + 1}`;
        
        const homeworkExists = await recordExists('homework', { title: title, classId: schoolClass.id });
        if (!homeworkExists) {
          const homeworkId = uuidv4();
          const assignedDate = new Date();
          assignedDate.setDate(assignedDate.getDate() - (5 - i));
          const dueDate = new Date(assignedDate);
          dueDate.setDate(dueDate.getDate() + 7);

          await queryInterface.bulkInsert('homework', [{
            id: homeworkId,
            title: title,
            description: `Complete exercises from chapter ${i + 1} of ${subject} textbook. Show all working steps clearly.`,
            subject: subject,
            classId: schoolClass.id,
            teacherId: classTeacher.id,
            assignedDate: assignedDate,
            dueDate: dueDate,
            maxMarks: 100,
            instructions: 'Write neatly and submit on time. Late submissions will have marks deducted.',
            attachments: null,
            isActive: true,
            createdAt: now,
            updatedAt: now
          }]);

          // Create submissions for some students
          const classStudents = students.filter(s => s.classId === schoolClass.id);
          for (const student of classStudents) {
            if (Math.random() > 0.3) { // 70% submission rate
              const submissionDate = new Date(assignedDate);
              submissionDate.setDate(submissionDate.getDate() + Math.floor(Math.random() * 6) + 1);
              
              await queryInterface.bulkInsert('HomeworkSubmissions', [{
                homeworkId: homeworkId,
                studentId: student.id,
                submissionText: `Completed ${subject} assignment with all exercises solved.`,
                attachments: null,
                submittedAt: submissionDate,
                marksObtained: submissionDate <= dueDate ? 
                  Math.floor(Math.random() * 30) + 70 : // Good marks if on time
                  Math.floor(Math.random() * 20) + 50,  // Lower marks if late
                feedback: 'Good work! Keep it up.',
                gradedAt: new Date(submissionDate.getTime() + 24 * 60 * 60 * 1000),
                gradedBy: classTeacher.id,
                createdAt: now,
                updatedAt: now
              }]);
            }
          }

          console.log(`Homework "${title}" created for ${schoolClass.name}`);
        }
      }
    }

    console.log('Students, attendance, and homework created successfully!');
  },

  async down(queryInterface, Sequelize) {
    try {
      // Clean up in reverse order
      await queryInterface.bulkDelete('HomeworkSubmissions', null, {});
      await queryInterface.bulkDelete('homework', null, {});
      await queryInterface.bulkDelete('attendance', null, {});
      await queryInterface.bulkDelete('StudentParents', null, {});
      await queryInterface.bulkDelete('students', null, {});
      
      // Delete student and parent users
      await queryInterface.bulkDelete('users', {
        role: {
          [queryInterface.sequelize.Sequelize.Op.in]: ['student', 'parent']
        }
      }, {});
      
      console.log('Students and activities data cleaned up');
    } catch (error) {
      console.error('Error cleaning up students and activities data:', error);
    }
  }
};