'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('students', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      classId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      rollNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      admissionNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      admissionDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      bloodGroup: {
        type: Sequelize.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
        allowNull: true
      },
      medicalConditions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      previousSchool: {
        type: Sequelize.STRING,
        allowNull: true
      },
      transportMode: {
        type: Sequelize.ENUM('walking', 'school_bus', 'private_vehicle', 'public_transport'),
        allowNull: true,
        defaultValue: 'walking'
      },
      busRoute: {
        type: Sequelize.STRING,
        allowNull: true
      },
      feeCategory: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'regular'
      },
      scholarshipDetails: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          hasScholarship: false,
          scholarshipType: null,
          scholarshipAmount: 0,
          scholarshipPercentage: 0
        }
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('students', ['userId']);
    await queryInterface.addIndex('students', ['classId']);
    await queryInterface.addIndex('students', ['rollNumber']);
    await queryInterface.addIndex('students', ['admissionNumber']);
    
    // Add unique constraint
    await queryInterface.addConstraint('students', {
      fields: ['classId', 'rollNumber'],
      type: 'unique',
      name: 'unique_class_roll_number'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('students');
  }
};