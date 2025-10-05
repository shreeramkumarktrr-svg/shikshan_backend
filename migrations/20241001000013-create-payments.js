'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      subscriptionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'subscriptions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'INR'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      paymentMethod: {
        type: Sequelize.ENUM('credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'bank_transfer'),
        allowNull: true
      },
      transactionId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      gatewayTransactionId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      gatewayResponse: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      billingPeriodStart: {
        type: Sequelize.DATE,
        allowNull: false
      },
      billingPeriodEnd: {
        type: Sequelize.DATE,
        allowNull: false
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      failureReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      invoiceNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      taxAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      discountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
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

    // Add indexes (with error handling for existing indexes)
    const indexes = [
      ['schoolId'],
      ['subscriptionId'],
      ['status'],
      ['transactionId'],
      ['billingPeriodStart', 'billingPeriodEnd'],
      ['createdAt']
    ];

    for (const indexFields of indexes) {
      try {
        await queryInterface.addIndex('payments', indexFields);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payments');
  }
};