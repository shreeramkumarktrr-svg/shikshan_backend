'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('staff_attendance', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      staffId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('present', 'absent', 'late', 'half_day', 'sick_leave', 'casual_leave', 'official_duty'),
        allowNull: false,
        defaultValue: 'present'
      },
      checkInTime: {
        type: Sequelize.TIME,
        allowNull: true
      },
      checkOutTime: {
        type: Sequelize.TIME,
        allowNull: true
      },
      markedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      markedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      workingHours: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 0
      },
      schoolId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'schools',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes with error handling
    try {
      await queryInterface.addIndex('staff_attendance', ['staffId'], {
        name: 'staff_attendance_staff_id_idx'
      });
    } catch (error) {
      console.log('Index staff_attendance_staff_id_idx already exists, skipping...');
    }

    try {
      await queryInterface.addIndex('staff_attendance', ['date'], {
        name: 'staff_attendance_date_idx'
      });
    } catch (error) {
      console.log('Index staff_attendance_date_idx already exists, skipping...');
    }

    try {
      await queryInterface.addIndex('staff_attendance', ['schoolId'], {
        name: 'staff_attendance_school_id_idx'
      });
    } catch (error) {
      console.log('Index staff_attendance_school_id_idx already exists, skipping...');
    }

    try {
      await queryInterface.addIndex('staff_attendance', ['markedBy'], {
        name: 'staff_attendance_marked_by_idx'
      });
    } catch (error) {
      console.log('Index staff_attendance_marked_by_idx already exists, skipping...');
    }
    
    // Add unique constraint
    try {
      await queryInterface.addIndex('staff_attendance', ['staffId', 'date'], {
        unique: true,
        name: 'staff_attendance_unique_staff_date'
      });
    } catch (error) {
      console.log('Unique index staff_attendance_unique_staff_date already exists, skipping...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('staff_attendance');
  }
};