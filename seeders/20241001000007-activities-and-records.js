'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    console.log('📚 Starting activities and records seeding...');

    // Get all schools, classes, teachers, and students
    const [schools] = await queryInterface.sequelize.query('SELECT id FROM schools ORDER BY "createdAt"');
    const [classes] = await queryInterface.sequelize.query('SELECT id, "schoolId", "classTeacherId" FROM classes ORDER BY "createdAt"');
    const [teachers] = await queryInterface.sequelize.query('SELECT id, "schoolId" FROM users WHERE role = \'teacher\' ORDER BY "createdAt"');
    const [students] = await queryInterface.sequelize.query('SELECT s.id, s."userId", s."classId", u."schoolId" FROM students s JOIN users u ON s."userId" = u.id ORDER BY s."createdAt"');
    const [parents] = await queryInterface.sequelize.query('SELECT id, "schoolId" FROM users WHERE role = \'parent\' ORDER BY "createdAt"');

    // Helper function to get random item from array
    const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];
    
    // Helper function to get random date within range
    const randomDate = (start, end) => {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    };

    // Helper function to get past date
    const getPastDate = (daysAgo) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return date;
    };

    // Helper function to get future date
    const getFutureDate = (daysAhead) => {
      const date = new Date();
      date.setDate(date.getDate() + daysAhead);
      return date;
    };

    // Create homework assignments
    const homework = [];
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'History', 'Geography'];
    const homeworkTypes = ['assignment', 'project', 'reading', 'practice', 'research'];
    const priorities = ['low', 'medium', 'high', 'urgent'];

    const homeworkTitles = {
      Mathematics: ['Algebra Problems Set 1', 'Geometry Theorems Practice', 'Calculus Integration', 'Statistics Assignment'],
      Physics: ['Newton\'s Laws Experiment', 'Optics Lab Report', 'Electricity Circuits', 'Wave Motion Study'],
      Chemistry: ['Periodic Table Analysis', 'Chemical Bonding Report', 'Organic Compounds Study', 'Acid-Base Reactions'],
      Biology: ['Cell Structure Diagram', 'Photosynthesis Process', 'Human Anatomy Study', 'Ecosystem Analysis'],
      English: ['Essay on Climate Change', 'Shakespeare Analysis', 'Grammar Exercises', 'Creative Writing'],
      Hindi: ['कविता विश्लेषण', 'व्याकरण अभ्यास', 'निबंध लेखन', 'कहानी समीक्षा'],
      History: ['Ancient Civilizations', 'Independence Movement', 'World War Analysis', 'Cultural Heritage Study'],
      Geography: ['Map Reading Exercise', 'Climate Patterns Study', 'Natural Resources Report', 'Population Geography']
    };

    for (const classData of classes) {
      const classTeachers = teachers.filter(t => t.schoolId === classData.schoolId);
      
      // Create 3-5 homework assignments per class
      for (let i = 0; i < Math.floor(Math.random() * 3) + 3; i++) {
        const subject = getRandomItem(subjects);
        const teacher = getRandomItem(classTeachers);
        const titles = homeworkTitles[subject] || ['General Assignment'];
        
        homework.push({
          id: uuidv4(),
          title: getRandomItem(titles),
          description: `Complete the ${subject.toLowerCase()} assignment as discussed in class. Follow the instructions carefully and submit on time.`,
          instructions: `1. Read the chapter thoroughly\n2. Solve all problems\n3. Write neat and clean\n4. Submit before due date`,
          subject: subject,
          classId: classData.id,
          teacherId: teacher.id,
          schoolId: classData.schoolId,
          assignedDate: getPastDate(Math.floor(Math.random() * 7) + 1).toISOString().split('T')[0],
          dueDate: getFutureDate(Math.floor(Math.random() * 7) + 3).toISOString().split('T')[0],
          maxMarks: [20, 25, 30, 50, 100][Math.floor(Math.random() * 5)],
          attachments: [],
          priority: getRandomItem(priorities),
          type: getRandomItem(homeworkTypes),
          isPublished: true,
          allowLateSubmission: Math.random() > 0.3,
          submissionFormat: getRandomItem(['text', 'file', 'both']),
          createdAt: now,
          updatedAt: now
        });
      }
    }

    await queryInterface.bulkInsert('homework', homework);
    // Create attendance records for the last 30 days
    const attendance = [];
    const attendanceStatuses = ['present', 'absent', 'late', 'half_day', 'excused'];
    
    for (let day = 0; day < 30; day++) {
      const date = getPastDate(day);
      
      // Skip weekends (assuming Saturday and Sunday are holidays)
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      for (const student of students) {
        const classData = classes.find(c => c.id === student.classId);
        if (!classData) continue;
        
        // 85% chance of being present
        const status = Math.random() < 0.85 ? 'present' : getRandomItem(['absent', 'late', 'half_day']);
        
        attendance.push({
          id: uuidv4(),
          studentId: student.userId,
          classId: student.classId,
          date: date.toISOString().split('T')[0],
          status: status,
          markedBy: classData.classTeacherId,
          markedAt: new Date(date.getTime() + Math.random() * 4 * 60 * 60 * 1000), // Random time during school hours
          remarks: status !== 'present' ? `Student was ${status}` : null,
          period: 1,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    await queryInterface.bulkInsert('attendance', attendance);
    // Create complaints
    const complaints = [];
    const complaintCategories = ['academic', 'discipline', 'infrastructure', 'transport', 'fee', 'other'];
    const complaintStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    
    const complaintTitles = {
      academic: ['Difficulty in Mathematics', 'Need Extra Classes', 'Homework Too Much', 'Teacher Explanation Unclear'],
      discipline: ['Bullying Issue', 'Classroom Disturbance', 'Uniform Violation', 'Late Coming Habit'],
      infrastructure: ['Broken Desk', 'Poor Lighting', 'Washroom Issue', 'Playground Maintenance'],
      transport: ['Bus Delay', 'Route Change Request', 'Driver Behavior', 'Bus Overcrowding'],
      fee: ['Fee Structure Query', 'Payment Issue', 'Scholarship Application', 'Late Fee Waiver'],
      other: ['Lost Property', 'Canteen Food Quality', 'Library Book Issue', 'Sports Equipment']
    };

    // Create 2-3 complaints per school
    for (const school of schools) {
      const schoolParents = parents.filter(p => p.schoolId === school.id);
      const schoolTeachers = teachers.filter(t => t.schoolId === school.id);
      
      for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
        const category = getRandomItem(complaintCategories);
        const titles = complaintTitles[category];
        const status = getRandomItem(complaintStatuses);
        const raisedBy = getRandomItem(schoolParents);
        const assignedTo = status !== 'open' ? getRandomItem(schoolTeachers) : null;
        
        const createdDate = getPastDate(Math.floor(Math.random() * 15) + 1);
        
        complaints.push({
          id: uuidv4(),
          title: getRandomItem(titles),
          description: `This is a detailed description of the ${category} complaint. The issue needs to be addressed promptly to ensure student welfare and smooth school operations.`,
          category: category,
          priority: getRandomItem(priorities),
          status: status,
          schoolId: school.id,
          raisedBy: raisedBy.id,
          assignedTo: assignedTo?.id || null,
          studentId: null,
          slaDeadline: new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days SLA
          resolvedAt: status === 'resolved' || status === 'closed' ? 
            new Date(createdDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) : null,
          resolution: status === 'resolved' || status === 'closed' ? 
            'The issue has been resolved successfully. Thank you for bringing this to our attention.' : null,
          feedback: status === 'resolved' || status === 'closed' ? JSON.stringify({
            rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
            comment: 'Thank you for resolving the issue promptly.',
            submittedAt: new Date().toISOString()
          }) : null,
          createdAt: createdDate,
          updatedAt: now
        });
      }
    }

    await queryInterface.bulkInsert('complaints', complaints);
    // Create fees
    const fees = [];
    const feeTypes = [
      { title: 'Tuition Fee - Term 1', amount: 15000 },
      { title: 'Tuition Fee - Term 2', amount: 15000 },
      { title: 'Library Fee', amount: 1000 },
      { title: 'Laboratory Fee', amount: 2000 },
      { title: 'Sports Fee', amount: 1500 },
      { title: 'Transport Fee', amount: 3000 },
      { title: 'Examination Fee', amount: 500 },
      { title: 'Development Fee', amount: 2500 }
    ];

    for (const classData of classes) {
      // Create 3-4 different fees per class
      for (let i = 0; i < Math.floor(Math.random() * 2) + 3; i++) {
        const feeType = getRandomItem(feeTypes);
        const creator = teachers.find(t => t.id === classData.classTeacherId);
        
        fees.push({
          id: uuidv4(),
          title: feeType.title,
          description: `${feeType.title} for academic year 2024-25. Please pay before the due date to avoid late fees.`,
          amount: feeType.amount + (Math.random() * 1000 - 500), // Add some variation
          dueDate: getFutureDate(Math.floor(Math.random() * 30) + 15), // 15-45 days from now
          classId: classData.id,
          schoolId: classData.schoolId,
          createdBy: creator.id,
          status: 'active',
          createdAt: now,
          updatedAt: now
        });
      }
    }

    await queryInterface.bulkInsert('fees', fees);
    // Create student fees (individual fee assignments)
    const studentFees = [];
    const [createdFees] = await queryInterface.sequelize.query('SELECT id, "classId", amount FROM fees');
    
    for (const fee of createdFees) {
      const classStudents = students.filter(s => s.classId === fee.classId);
      
      for (const student of classStudents) {
        const paymentStatuses = ['pending', 'paid', 'overdue', 'partial'];
        const status = getRandomItem(paymentStatuses);
        
        let paidAmount = 0;
        let paidDate = null;
        
        if (status === 'paid') {
          paidAmount = fee.amount;
          paidDate = getPastDate(Math.floor(Math.random() * 10) + 1);
        } else if (status === 'partial') {
          paidAmount = fee.amount * (0.3 + Math.random() * 0.4); // 30-70% paid
          paidDate = getPastDate(Math.floor(Math.random() * 5) + 1);
        }
        
        studentFees.push({
          id: uuidv4(),
          studentId: student.id,
          feeId: fee.id,
          amount: fee.amount,
          paidAmount: paidAmount,
          status: status,
          dueDate: getFutureDate(Math.floor(Math.random() * 30) + 15),
          paidDate: paidDate,
          paymentMethod: paidAmount > 0 ? getRandomItem(['cash', 'online', 'cheque', 'card']) : null,
          transactionId: paidAmount > 0 ? `TXN${Date.now()}${Math.floor(Math.random() * 1000)}` : null,
          remarks: status === 'overdue' ? 'Payment overdue, please pay immediately' : null,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    await queryInterface.bulkInsert('StudentFees', studentFees);
    // Create some events
    const events = [];
    const eventTypes = ['meeting', 'celebration', 'sports', 'academic', 'cultural'];
    const eventTitles = [
      'Parent-Teacher Meeting',
      'Annual Sports Day',
      'Science Exhibition',
      'Cultural Festival',
      'Independence Day Celebration',
      'Teachers Day Program',
      'Annual Function',
      'Inter-School Competition'
    ];

    for (const school of schools) {
      const schoolTeachers = teachers.filter(t => t.schoolId === school.id);
      
      // Create 2-3 events per school
      for (let i = 0; i < Math.floor(Math.random() * 2) + 2; i++) {
        const startDate = getFutureDate(Math.floor(Math.random() * 30) + 5);
        const endDate = new Date(startDate.getTime() + (2 + Math.random() * 4) * 60 * 60 * 1000); // 2-6 hours duration
        
        events.push({
          id: uuidv4(),
          title: getRandomItem(eventTitles),
          description: 'Join us for this important school event. Your participation is highly encouraged.',
          type: getRandomItem(eventTypes),
          priority: getRandomItem(priorities),
          schoolId: school.id,
          createdBy: getRandomItem(schoolTeachers).id,
          targetAudience: JSON.stringify(['students', 'parents', 'teachers']),
          startDate: startDate,
          endDate: endDate,
          location: 'School Auditorium',
          attachments: null,
          isPublished: true,
          sendNotification: true,
          notificationSent: Math.random() > 0.5,
          readBy: null,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    await queryInterface.bulkInsert('events', events);
    
    
    
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkDelete('events', null, {});
      await queryInterface.bulkDelete('StudentFees', null, {});
      await queryInterface.bulkDelete('fees', null, {});
      await queryInterface.bulkDelete('complaints', null, {});
      await queryInterface.bulkDelete('attendance', null, {});
      await queryInterface.bulkDelete('homework', null, {});
      console.log('Activities and records cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up activities and records:', error);
    }
  }
};