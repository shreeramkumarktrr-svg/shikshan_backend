const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudentFee = sequelize.define('StudentFee', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    feeId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'partial', 'paid', 'overdue'),
      defaultValue: 'pending'
    },
    paidDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'student_fees',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['feeId', 'studentId']
      }
    ]
  });

  StudentFee.associate = (models) => {
    StudentFee.belongsTo(models.Fee, {
      foreignKey: 'feeId',
      as: 'fee'
    });
    
    StudentFee.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'student'
    });
  };

  return StudentFee;
};