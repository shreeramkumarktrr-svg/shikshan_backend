'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('schools', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true
      },
      establishedYear: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      academicYear: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '2024-25'
      },
      timezone: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Asia/Kolkata'
      },
      locale: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'en'
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'INR'
      },
      subscriptionStatus: {
        type: Sequelize.ENUM('trial', 'active', 'suspended', 'cancelled'),
        allowNull: false,
        defaultValue: 'trial'
      },
      subscriptionPlan: {
        type: Sequelize.ENUM('basic', 'standard', 'premium'),
        allowNull: false,
        defaultValue: 'basic'
      },
      subscriptionExpiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      maxStudents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      maxTeachers: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      settings: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          enableSMS: true,
          enableEmail: true,
          enablePushNotifications: true,
          attendanceGracePeriod: 15,
          feeReminderDays: [7, 3, 1],
          academicCalendar: {
            startDate: null,
            endDate: null,
            terms: [],
            holidays: []
          }
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
    await queryInterface.addIndex('schools', ['email']);
    await queryInterface.addIndex('schools', ['subscriptionStatus']);
    await queryInterface.addIndex('schools', ['isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('schools');
  }
};