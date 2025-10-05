'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      planType: {
        type: Sequelize.ENUM('basic', 'standard', 'premium'),
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'INR'
      },
      billingCycle: {
        type: Sequelize.ENUM('monthly', 'quarterly', 'yearly'),
        allowNull: false,
        defaultValue: 'monthly'
      },
      trialDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
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
      maxClasses: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 20
      },
      features: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isPopular: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes (with error handling for existing indexes)
    try {
      await queryInterface.addIndex('subscriptions', ['planType']);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex('subscriptions', ['isActive']);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex('subscriptions', ['sortOrder']);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subscriptions');
  }
};