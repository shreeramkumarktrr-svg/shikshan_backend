'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create homework table
    await queryInterface.createTable('homework', {
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
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: false
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
      teacherId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      assignedDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      dueDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      maxMarks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      attachments: {
        type: Sequelize.ARRAY(Sequelize.JSONB),
        allowNull: false,
        defaultValue: []
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium'
      },
      type: {
        type: Sequelize.ENUM('assignment', 'project', 'reading', 'practice', 'research'),
        allowNull: false,
        defaultValue: 'assignment'
      },
      isPublished: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      allowLateSubmission: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      submissionFormat: {
        type: Sequelize.ENUM('text', 'file', 'both'),
        allowNull: false,
        defaultValue: 'both'
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

    // Create homework_submissions table
    await queryInterface.createTable('homework_submissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      homeworkId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'homework',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      studentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      submissionText: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachments: {
        type: Sequelize.ARRAY(Sequelize.JSONB),
        allowNull: false,
        defaultValue: []
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      isLate: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      status: {
        type: Sequelize.ENUM('submitted', 'graded', 'returned'),
        allowNull: false,
        defaultValue: 'submitted'
      },
      marksObtained: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      gradedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      gradedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    // Add indexes
    await queryInterface.addIndex('homework', ['classId']);
    await queryInterface.addIndex('homework', ['teacherId']);
    await queryInterface.addIndex('homework', ['schoolId']);
    await queryInterface.addIndex('homework', ['subject']);
    await queryInterface.addIndex('homework', ['dueDate']);
    await queryInterface.addIndex('homework', ['isPublished']);

    await queryInterface.addIndex('homework_submissions', ['homeworkId']);
    await queryInterface.addIndex('homework_submissions', ['studentId']);
    await queryInterface.addIndex('homework_submissions', ['status']);
    await queryInterface.addIndex('homework_submissions', ['submittedAt']);
    await queryInterface.addIndex('homework_submissions', ['homeworkId', 'studentId'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('homework_submissions');
    await queryInterface.dropTable('homework');
  }
};