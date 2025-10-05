module.exports = (sequelize, DataTypes) => {
  const Student = sequelize.define('Student', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
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
    rollNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    admissionNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    admissionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    bloodGroup: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: true
    },
    medicalConditions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    previousSchool: {
      type: DataTypes.STRING,
      allowNull: true
    },
    transportMode: {
      type: DataTypes.ENUM('walking', 'school_bus', 'private_vehicle', 'public_transport'),
      allowNull: true,
      defaultValue: 'walking'
    },
    busRoute: {
      type: DataTypes.STRING,
      allowNull: true
    },
    feeCategory: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'regular'
    },
    scholarshipDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        hasScholarship: false,
        scholarshipType: null,
        scholarshipAmount: 0,
        scholarshipPercentage: 0
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'students',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['classId']
      },
      {
        fields: ['rollNumber']
      },
      {
        fields: ['admissionNumber']
      },
      {
        unique: true,
        fields: ['classId', 'rollNumber']
      }
    ]
  });

  Student.associate = (models) => {
    Student.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Student.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class'
    });
    
    if (models.Attendance) {
      Student.hasMany(models.Attendance, {
        foreignKey: 'studentId',
        as: 'attendanceRecords'
      });
    }
    
    // Many-to-many with Parents through StudentParent
    Student.belongsToMany(models.User, {
      through: 'StudentParents',
      foreignKey: 'studentId',
      otherKey: 'parentId',
      as: 'parents'
    });
  };

  return Student;
};