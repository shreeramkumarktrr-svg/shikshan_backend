'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('subjects', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.ENUM('core', 'elective', 'extracurricular', 'language', 'science', 'arts', 'sports'),
        defaultValue: 'core',
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
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
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add unique constraint for name per school
    await queryInterface.addConstraint('subjects', {
      fields: ['name', 'schoolId'],
      type: 'unique',
      name: 'subjects_name_school_unique'
    });

    // Add unique constraint for code per school (where code is not null)
    await queryInterface.addIndex('subjects', {
      fields: ['code', 'schoolId'],
      unique: true,
      where: {
        code: {
          [Sequelize.Op.ne]: null
        }
      },
      name: 'subjects_code_school_unique'
    });

    // Add index for schoolId
    await queryInterface.addIndex('subjects', {
      fields: ['schoolId'],
      name: 'subjects_school_id_index'
    });

    // Add index for category
    await queryInterface.addIndex('subjects', {
      fields: ['category'],
      name: 'subjects_category_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('subjects');
  }
};