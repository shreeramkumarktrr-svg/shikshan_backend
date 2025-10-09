'use strict';

const { generateCustomId, generateAdmissionNumber, generateEmployeeId } = require('../utils/idGenerator');

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Starting migration to custom IDs...');

      // Step 1: Add new custom ID columns
      console.log('📝 Adding new custom ID columns...');
      
      // Schools
      await queryInterface.addColumn('schools', 'customId', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      // Users  
      await queryInterface.addColumn('users', 'customId', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      // Students
      await queryInterface.addColumn('students', 'customId', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      // Classes
      await queryInterface.addColumn('classes', 'customId', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      // Step 2: Generate custom IDs for existing records
      console.log('🔢 Generating custom IDs for existing records...');

      // Generate custom IDs for schools
      const schools = await queryInterface.sequelize.query(
        'SELECT id FROM schools ORDER BY "createdAt"',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      for (let i = 0; i < schools.length; i++) {
        const customId = `sch25${(i + 1).toString().padStart(5, '0')}`;
        await queryInterface.sequelize.query(
          'UPDATE schools SET "customId" = :customId WHERE id = :id',
          { 
            replacements: { customId, id: schools[i].id },
            transaction 
          }
        );
      }

      // Generate custom IDs for users
      const users = await queryInterface.sequelize.query(
        'SELECT id, role FROM users ORDER BY "createdAt"',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      for (let i = 0; i < users.length; i++) {
        const customId = `usr25${(i + 1).toString().padStart(5, '0')}`;
        let employeeId = null;
        
        // Generate employee ID for staff
        if (['teacher', 'principal', 'school_admin', 'finance_officer', 'support_staff'].includes(users[i].role)) {
          const staffCount = await queryInterface.sequelize.query(
            'SELECT COUNT(*) as count FROM users WHERE role IN (\'teacher\', \'principal\', \'school_admin\', \'finance_officer\', \'support_staff\') AND "createdAt" <= (SELECT "createdAt" FROM users WHERE id = :id)',
            { 
              replacements: { id: users[i].id },
              type: Sequelize.QueryTypes.SELECT,
              transaction 
            }
          );
          employeeId = `EMP25${staffCount[0].count.toString().padStart(3, '0')}`;
        }

        await queryInterface.sequelize.query(
          'UPDATE users SET "customId" = :customId' + (employeeId ? ', "employeeId" = :employeeId' : '') + ' WHERE id = :id',
          { 
            replacements: { customId, employeeId, id: users[i].id },
            transaction 
          }
        );
      }

      // Generate custom IDs for students
      const students = await queryInterface.sequelize.query(
        'SELECT id FROM students ORDER BY "createdAt"',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      for (let i = 0; i < students.length; i++) {
        const customId = `std25${(i + 1).toString().padStart(5, '0')}`;
        const admissionNumber = `ADM25${(i + 1).toString().padStart(3, '0')}`;
        
        await queryInterface.sequelize.query(
          'UPDATE students SET "customId" = :customId, "admissionNumber" = :admissionNumber WHERE id = :id',
          { 
            replacements: { customId, admissionNumber, id: students[i].id },
            transaction 
          }
        );
      }

      // Generate custom IDs for classes
      const classes = await queryInterface.sequelize.query(
        'SELECT id FROM classes ORDER BY "createdAt"',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      for (let i = 0; i < classes.length; i++) {
        const customId = `cls25${(i + 1).toString().padStart(5, '0')}`;
        await queryInterface.sequelize.query(
          'UPDATE classes SET "customId" = :customId WHERE id = :id',
          { 
            replacements: { customId, id: classes[i].id },
            transaction 
          }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Reverting custom ID migration...');
      
      // Remove custom ID columns
      await queryInterface.removeColumn('schools', 'customId', { transaction });
      await queryInterface.removeColumn('users', 'customId', { transaction });
      await queryInterface.removeColumn('students', 'customId', { transaction });
      await queryInterface.removeColumn('classes', 'customId', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};