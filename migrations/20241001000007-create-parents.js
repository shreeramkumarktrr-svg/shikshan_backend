'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('parents', {
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
      occupation: {
        type: Sequelize.STRING,
        allowNull: true
      },
      workAddress: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      workPhone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      relationshipType: {
        type: Sequelize.ENUM('father', 'mother', 'guardian', 'other'),
        allowNull: false,
        defaultValue: 'father'
      },
      isEmergencyContact: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      canPickupChild: {
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

    await queryInterface.addIndex('parents', ['userId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('parents');
  }
};