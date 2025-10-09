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
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'classes',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    rollNumber: {
      type: DataTypes.STRING,
      allowNull: true, // Allow null initially, can be set later
      validate: {
        len: [1, 50]
      }
    },
    admissionNumber: {
      type: DataTypes.STRING,
      allowNull: true, // Allow null initially, will be generated
      unique: true,
      validate: {
        len: [1, 50]
      }
    },
    admissionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
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
    },
    emergencyContact: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emergencyContactName: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'students',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
        unique: true
      },
      {
        fields: ['classId']
      },
      {
        fields: ['rollNumber']
      },
      {
        fields: ['admissionNumber'],
        unique: true
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['admissionDate']
      }
    ]
  });

  Student.associate = (models) => {
    // One-to-one with User
    Student.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
    
    // Many-to-one with Class
    Student.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class'
    });
    
    // One-to-many with Attendance
    if (models.Attendance) {
      Student.hasMany(models.Attendance, {
        foreignKey: 'studentId',
        as: 'attendanceRecords'
      });
    }

    // One-to-many with Homework Submissions
    if (models.HomeworkSubmission) {
      Student.hasMany(models.HomeworkSubmission, {
        foreignKey: 'studentId',
        as: 'homeworkSubmissions'
      });
    }

    // One-to-many with Student Fees
    if (models.StudentFee) {
      Student.hasMany(models.StudentFee, {
        foreignKey: 'studentId',
        as: 'fees'
      });
    }
    
    // Many-to-many with Parents through StudentParents junction table
    if (models.Parent) {
      Student.belongsToMany(models.Parent, {
        through: 'StudentParents',
        foreignKey: 'studentId',
        otherKey: 'parentId',
        as: 'parents'
      });
    }
  };

  return Student;
};