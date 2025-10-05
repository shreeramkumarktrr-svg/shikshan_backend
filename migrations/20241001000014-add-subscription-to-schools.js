'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('schools');
    
    if (!tableDescription.subscriptionId) {
      await queryInterface.addColumn('schools', 'subscriptionId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'subscriptions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    // Add index if it doesn't exist
    try {
      await queryInterface.addIndex('schools', ['subscriptionId']);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('schools');
    
    if (tableDescription.subscriptionId) {
      await queryInterface.removeColumn('schools', 'subscriptionId');
    }
  }
};