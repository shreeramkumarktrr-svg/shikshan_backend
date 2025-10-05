module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'schools',
        key: 'id'
      }
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subscriptions',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'INR'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.ENUM('credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'bank_transfer'),
      allowNull: true
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    gatewayTransactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gatewayResponse: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    billingPeriodStart: {
      type: DataTypes.DATE,
      allowNull: false
    },
    billingPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    indexes: [
      {
        fields: ['schoolId']
      },
      {
        fields: ['subscriptionId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['transactionId']
      },
      {
        fields: ['billingPeriodStart', 'billingPeriodEnd']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: async (payment) => {
        if (!payment.transactionId) {
          payment.transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        }
        if (!payment.invoiceNumber) {
          payment.invoiceNumber = `INV${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        }
      }
    }
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
    Payment.belongsTo(models.Subscription, {
      foreignKey: 'subscriptionId',
      as: 'subscription'
    });
  };

  return Payment;
};