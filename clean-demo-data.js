const { sequelize } = require('./models');

async function cleanDemoData() {
  try {
    console.log('Cleaning existing demo data...');
    
    // Delete in reverse order to respect foreign key constraints
    await sequelize.query(`DELETE FROM events WHERE title = 'Parent-Teacher Meeting'`);
    console.log('Deleted demo events');
    
    await sequelize.query(`DELETE FROM "StudentParents" WHERE "parentId" IN (SELECT id FROM users WHERE email = 'robert.smith@gmail.com')`);
    console.log('Deleted student-parent links');
    
    await sequelize.query(`DELETE FROM students WHERE "admissionNumber" = 'GW2024001'`);
    console.log('Deleted demo students');
    
    await sequelize.query(`DELETE FROM classes WHERE name = 'Class 10-A'`);
    console.log('Deleted demo classes');
    
    await sequelize.query(`DELETE FROM users WHERE email IN (
      'admin@shikshan.com',
      'principal@greenwood.edu', 
      'sarah.johnson@greenwood.edu',
      'alex.smith@student.greenwood.edu',
      'robert.smith@gmail.com'
    )`);
    console.log('Deleted demo users');
    
    await sequelize.query(`DELETE FROM schools WHERE email = 'admin@greenwood.edu'`);
    
    
  } catch (error) {
    console.error('Error cleaning demo data:', error);
  } finally {
    await sequelize.close();
  }
}

cleanDemoData();