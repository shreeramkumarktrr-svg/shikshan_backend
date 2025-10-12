'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('complaint_updates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      complaintId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'complaints',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      updateType: {
        type: Sequelize.ENUM('comment', 'status_change', 'assignment', 'resolution'),
        allowNull: false,
        defaultValue: 'comment'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      previousValue: {
        type: Sequelize.STRING,
        allowNull: true
      },
      newValue: {
        type: Sequelize.STRING,
        allowNull: true
      },

      isInternal: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    // Add indexes (with error handling for existing indexes)
    const indexes = [
      ['complaintId'],
      ['updatedBy'],
      ['updateType'],
      ['createdAt']
    ];

    for (const indexFields of indexes) {
      try {
        await queryInterface.addIndex('complaint_updates', indexFields);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('complaint_updates');
  }
};