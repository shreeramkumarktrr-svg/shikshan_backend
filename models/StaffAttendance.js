module.exports = (sequelize, DataTypes) => {
  const StaffAttendance = sequelize.define('StaffAttendance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    staffId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'sick_leave', 'casual_leave', 'official_duty'),
      allowNull: false,
      defaultValue: 'present'
    },
    checkInTime: {
      type: DataTypes.TIME,
      allowNull: true
    },
    checkOutTime: {
      type: DataTypes.TIME,
      allowNull: true
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
    workingHours: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: 0
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'schools',
        key: 'id'
      }
    }
  }, {
    tableName: 'staff_attendance',
    timestamps: true,
    indexes: [
      {
        fields: ['staffId']
      },
      {
        fields: ['date']
      },
      {
        fields: ['schoolId']
      },
      {
        fields: ['markedBy']
      },
      {
        unique: true,
        fields: ['staffId', 'date']
      }
    ]
  });

  StaffAttendance.associate = (models) => {
    StaffAttendance.belongsTo(models.User, {
      foreignKey: 'staffId',
      as: 'staff'
    });
    
    StaffAttendance.belongsTo(models.User, {
      foreignKey: 'markedBy',
      as: 'markedByUser'
    });
    
    StaffAttendance.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
  };

  return StaffAttendance;
};