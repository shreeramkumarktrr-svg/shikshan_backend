'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_fees', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      feeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'fees',
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
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      paidAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      status: {
        type: Sequelize.ENUM('pending', 'partial', 'paid', 'overdue'),
        defaultValue: 'pending'
      },
      paidDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paymentMethod: {
        type: Sequelize.STRING,
        allowNull: true
      },
      transactionId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('student_fees', ['feeId']);
    await queryInterface.addIndex('student_fees', ['studentId']);
    await queryInterface.addIndex('student_fees', ['status']);
    await queryInterface.addIndex('student_fees', ['feeId', 'studentId'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('student_fees');
  }
};