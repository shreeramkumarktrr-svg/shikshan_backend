'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // StudentParents junction table
    await queryInterface.createTable('StudentParents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      parentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      relationshipType: {
        type: Sequelize.ENUM('father', 'mother', 'guardian', 'other'),
        allowNull: false,
        defaultValue: 'father'
      },
      isPrimary: {
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

    // ClassTeachers junction table
    await queryInterface.createTable('ClassTeachers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      subject: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isClassTeacher: {
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

    // Add indexes
    await queryInterface.addIndex('StudentParents', ['studentId']);
    await queryInterface.addIndex('StudentParents', ['parentId']);
    await queryInterface.addIndex('ClassTeachers', ['classId']);
    await queryInterface.addIndex('ClassTeachers', ['teacherId']);

    // Add unique constraints
    await queryInterface.addConstraint('StudentParents', {
      fields: ['studentId', 'parentId'],
      type: 'unique',
      name: 'unique_student_parent'
    });

    await queryInterface.addConstraint('ClassTeachers', {
      fields: ['classId', 'teacherId', 'subject'],
      type: 'unique',
      name: 'unique_class_teacher_subject'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ClassTeachers');
    await queryInterface.dropTable('StudentParents');
  }
};