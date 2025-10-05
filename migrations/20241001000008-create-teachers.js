'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('teachers', {
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
      qualification: {
        type: Sequelize.STRING,
        allowNull: true
      },
      experience: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      specialization: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: []
      },
      salary: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      contractType: {
        type: Sequelize.ENUM('permanent', 'contract', 'part_time', 'substitute'),
        allowNull: false,
        defaultValue: 'permanent'
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

    await queryInterface.addIndex('teachers', ['userId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('teachers');
  }
};