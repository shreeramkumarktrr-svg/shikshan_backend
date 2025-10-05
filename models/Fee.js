const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Fee = sequelize.define('Fee', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'fees',
    timestamps: true
  });

  Fee.associate = (models) => {
    Fee.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class'
    });
    
    Fee.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
    
    Fee.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    Fee.hasMany(models.StudentFee, {
      foreignKey: 'feeId',
      as: 'studentFees'
    });
  };

  return Fee;
};