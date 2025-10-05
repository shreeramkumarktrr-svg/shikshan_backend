'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('announcement', 'event', 'holiday', 'exam', 'meeting', 'celebration'),
        allowNull: false,
        defaultValue: 'announcement'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium'
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
      classId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      targetAudience: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: ['all']
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      attachments: {
        type: Sequelize.ARRAY(Sequelize.JSONB),
        allowNull: true,
        defaultValue: []
      },
      isPublished: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      sendNotification: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      notificationSent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      readBy: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        allowNull: true,
        defaultValue: []
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
    await queryInterface.addIndex('events', ['schoolId']);
    await queryInterface.addIndex('events', ['classId']);
    await queryInterface.addIndex('events', ['createdBy']);
    await queryInterface.addIndex('events', ['type']);
    await queryInterface.addIndex('events', ['startDate']);
    await queryInterface.addIndex('events', ['isPublished']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('events');
  }
};