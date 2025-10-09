'use strict';

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

    // Get existing data
    const [schools] = await queryInterface.sequelize.query(
      `SELECT * FROM schools WHERE email IN ('admin@sunrise.edu', 'admin@excellence.edu', 'admin@future.edu')`
    );

    const [users] = await queryInterface.sequelize.query(
      `SELECT * FROM users WHERE "schoolId" IN ('${schools.map(s => s.id).join("', '")}')`
    );

    const [students] = await queryInterface.sequelize.query(
      `SELECT s.*, u.firstName, u.lastName FROM students s 
       JOIN users u ON s."userId" = u.id 
       WHERE u."schoolId" IN ('${schools.map(s => s.id).join("', '")}')`
    );

    // 9. Create complaints
    const complaintTypes = ['academic', 'behavioral', 'facility', 'transport', 'fee', 'other'];
    const complaintTitles = [
      'Difficulty understanding Mathematics concepts',
      'Bullying incident in playground',
      'Broken desk in classroom',
      'Bus delay issues',
      'Fee payment confusion',
      'Lost textbook replacement',
      'Homework load too heavy',
      'Canteen food quality',
      'Library book availability',
      'Sports equipment maintenance'
    ];

    let complaintCounter = 0;
    for (const school of schools) {
      const schoolUsers = users.filter(u => u.schoolId === school.id);
      const schoolStudents = students.filter(s => schoolUsers.find(u => u.id === s.userId));
      const parents = schoolUsers.filter(u => u.role === 'parent');
      const teachers = schoolUsers.filter(u => u.role === 'teacher');
      const principal = schoolUsers.find(u => u.role === 'principal');

      // Create 3-5 complaints per school
      const numComplaints = 3 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < numComplaints; i++) {
        const title = complaintTitles[complaintCounter % complaintTitles.length];
        const type = complaintTypes[i % complaintTypes.length];
        
        const complaintExists = await recordExists('complaints', { 
          title: title, 
          schoolId: school.id 
        });
        
        if (!complaintExists) {
          const complaintId = uuidv4();
          const complainant = Math.random() > 0.5 ? 
            parents[Math.floor(Math.random() * parents.length)] : 
            teachers[Math.floor(Math.random() * teachers.length)];
          
          const student = complainant.role === 'parent' ? 
            schoolStudents[Math.floor(Math.random() * schoolStudents.length)] : 
            null;

          const createdDate = new Date();
          createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));

          await queryInterface.bulkInsert('complaints', [{
            id: complaintId,
            title: title,
            description: `Detailed description of the ${type} issue that needs attention and resolution.`,
            type: type,
            priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            status: ['open', 'in_progress', 'resolved'][Math.floor(Math.random() * 3)],
            schoolId: school.id,
            complainantId: complainant.id,
            studentId: student?.id || null,
            assignedTo: principal?.id || null,
            attachments: null,
            createdAt: createdDate,
            updatedAt: createdDate
          }]);

          // Add some complaint updates
          if (Math.random() > 0.5) {
            const updateDate = new Date(createdDate);
            updateDate.setDate(updateDate.getDate() + Math.floor(Math.random() * 5) + 1);

            await queryInterface.bulkInsert('ComplaintUpdates', [{
              complaintId: complaintId,
              message: 'We have received your complaint and are looking into the matter.',
              updatedBy: principal?.id || complainant.id,
              attachments: null,
              createdAt: updateDate,
              updatedAt: updateDate
            }]);
          }

          console.log(`Complaint "${title}" created for ${school.name}`);
        }
        complaintCounter++;
      }
    }

    // 10. Create events for each school (5 per school)
    const eventTypes = ['meeting', 'exam', 'holiday', 'sports', 'cultural', 'academic'];
    const eventTitles = [
      'Parent-Teacher Meeting',
      'Annual Sports Day',
      'Science Exhibition',
      'Cultural Festival',
      'Mid-term Examinations',
      'Independence Day Celebration',
      'Teacher Training Workshop',
      'School Annual Function',
      'Health Checkup Camp',
      'Library Week',
      'Mathematics Olympiad',
      'Art Competition',
      'Field Trip to Museum',
      'Career Guidance Session',
      'Environmental Awareness Program'
    ];

    let eventCounter = 0;
    for (const school of schools) {
      const principal = users.find(u => u.role === 'principal' && u.schoolId === school.id);
      
      for (let i = 0; i < 5; i++) {
        const title = eventTitles[eventCounter % eventTitles.length];
        const type = eventTypes[i % eventTypes.length];
        
        const eventExists = await recordExists('events', { 
          title: title, 
          schoolId: school.id 
        });
        
        if (!eventExists) {
          const startDate = new Date();
          // Mix of past, current, and future events
          const dayOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
          startDate.setDate(startDate.getDate() + dayOffset);
          
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + (type === 'exam' ? 3 : 2)); // Exams are longer

          const targetAudience = type === 'meeting' ? ['parents', 'teachers'] :
                               type === 'exam' ? ['students'] :
                               type === 'sports' ? ['students', 'parents'] :
                               ['students', 'teachers', 'parents'];

          await queryInterface.bulkInsert('events', [{
            id: uuidv4(),
            title: title,
            description: `${title} - An important ${type} event for our school community. Please mark your calendars and participate actively.`,
            type: type,
            priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            schoolId: school.id,
            createdBy: principal?.id || users.find(u => u.schoolId === school.id)?.id,
            targetAudience: targetAudience,
            startDate: startDate,
            endDate: endDate,
            location: type === 'exam' ? 'Examination Hall' :
                     type === 'sports' ? 'School Playground' :
                     type === 'meeting' ? 'School Auditorium' :
                     'School Campus',
            attachments: null,
            isPublished: true,
            sendNotification: true,
            notificationSent: dayOffset <= 0, // Past events have notifications sent
            readBy: null,
            createdAt: now,
            updatedAt: now
          }]);

          console.log(`Event "${title}" created for ${school.name}`);
        }
        eventCounter++;
      }
    }

    
    console.log('✓ 3 Subscription Plans (Starter, Super, Advanced)');
    console.log('✓ 3 Schools with respective subscription plans');
    console.log('✓ 1 School admin per school (3 total)');
    console.log('✓ 3 Teachers per school (9 total)');
    console.log('✓ 10 Students per school with parents (30 students, 30 parents)');
    
    console.log('✓ 3-5 Complaints per school with updates');
    console.log('✓ 5 Events per school (15 total)');
    
    
    console.log('Parents: parent.[firstname].[lastname]@gmail.com / parent123');
  },

  async down(queryInterface, Sequelize) {
    try {
      // Clean up in reverse order
      await queryInterface.bulkDelete('events', {
        schoolId: {
          [queryInterface.sequelize.Sequelize.Op.in]: await queryInterface.sequelize.query(
            `SELECT id FROM schools WHERE email IN ('admin@sunrise.edu', 'admin@excellence.edu', 'admin@future.edu')`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
          ).then(schools => schools.map(s => s.id))
        }
      }, {});
      
      await queryInterface.bulkDelete('ComplaintUpdates', null, {});
      await queryInterface.bulkDelete('complaints', {
        schoolId: {
          [queryInterface.sequelize.Sequelize.Op.in]: await queryInterface.sequelize.query(
            `SELECT id FROM schools WHERE email IN ('admin@sunrise.edu', 'admin@excellence.edu', 'admin@future.edu')`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
          ).then(schools => schools.map(s => s.id))
        }
      }, {});
      
      console.log('Complaints and events data cleaned up');
    } catch (error) {
      console.error('Error cleaning up complaints and events data:', error);
    }
  }
};