'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('complaints', {
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
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('academic', 'discipline', 'infrastructure', 'transport', 'fee', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium'
      },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'resolved', 'closed', 'rejected'),
        allowNull: false,
        defaultValue: 'open'
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
      raisedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assignedTo: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      studentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      attachments: {
        type: Sequelize.ARRAY(Sequelize.JSONB),
        allowNull: true,
        defaultValue: []
      },
      slaDeadline: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolution: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      feedback: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          rating: null,
          comment: null,
          submittedAt: null
        }
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
    await queryInterface.addIndex('complaints', ['schoolId']);
    await queryInterface.addIndex('complaints', ['raisedBy']);
    await queryInterface.addIndex('complaints', ['assignedTo']);
    await queryInterface.addIndex('complaints', ['status']);
    await queryInterface.addIndex('complaints', ['priority']);
    await queryInterface.addIndex('complaints', ['category']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('complaints');
  }
};