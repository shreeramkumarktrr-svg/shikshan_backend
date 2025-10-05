module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'classes',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'excused'),
      allowNull: false,
      defaultValue: 'present'
    },
    markedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    markedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    period: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10
      }
    }
  }, {
    tableName: 'attendance',
    timestamps: true,
    indexes: [
      {
        fields: ['studentId']
      },
      {
        fields: ['classId']
      },
      {
        fields: ['date']
      },
      {
        fields: ['markedBy']
      },
      {
        unique: true,
        fields: ['studentId', 'classId', 'date', 'period']
      }
    ]
  });

  Attendance.associate = (models) => {
    Attendance.belongsTo(models.User, {
      foreignKey: 'studentId',
      as: 'student'
    });
    
    Attendance.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class'
    });
    
    Attendance.belongsTo(models.User, {
      foreignKey: 'markedBy',
      as: 'teacher'
    });
  };

  return Attendance;
};