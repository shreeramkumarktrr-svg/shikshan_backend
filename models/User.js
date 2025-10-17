const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmailOrEmpty(value) {
          if (value && value.trim() !== '') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              throw new Error('Must be a valid email address');
            }
          }
        }
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [10, 15]
      }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM(
        'super_admin',
        'school_admin', 
        'principal',
        'teacher',
        'student',
        'parent',
        'finance_officer',
        'support_staff'
      ),
      allowNull: false
    },
    profilePic: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        name: null,
        phone: null,
        relationship: null
      }
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'schools',
        key: 'id'
      }
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    joiningDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    subjects: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['phone']
      },
      {
        fields: ['schoolId']
      },
      {
        fields: ['role']
      },
      {
        fields: ['isActive']
      },
      {
        unique: true,
        fields: ['email', 'schoolId'],
        where: {
          email: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.passwordHash) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('passwordHash') && user.passwordHash) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
        }
      }
    }
  });

  User.associate = (models) => {
    User.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
    
    // Student associations
    if (models.Student) {
      User.hasOne(models.Student, {
        foreignKey: 'userId',
        as: 'studentProfile'
      });
    }
    
    // Parent associations
    if (models.Parent) {
      User.hasOne(models.Parent, {
        foreignKey: 'userId',
        as: 'parentProfile'
      });
    }
    
    // Teacher associations
    if (models.Teacher) {
      User.hasOne(models.Teacher, {
        foreignKey: 'userId',
        as: 'teacherProfile'
      });
    }
    
    // Attendance records
    if (models.Attendance) {
      User.hasMany(models.Attendance, {
        foreignKey: 'studentId',
        as: 'attendanceRecords'
      });
    }
    
    // Events created
    if (models.Event) {
      User.hasMany(models.Event, {
        foreignKey: 'createdBy',
        as: 'createdEvents'
      });
    }
    
    // Complaints raised
    if (models.Complaint) {
      User.hasMany(models.Complaint, {
        foreignKey: 'raisedBy',
        as: 'raisedComplaints'
      });
      
      // Complaints assigned
      User.hasMany(models.Complaint, {
        foreignKey: 'assignedTo',
        as: 'assignedComplaints'
      });
    }
  };

  // Instance methods
  User.prototype.validatePassword = async function(password) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(password, this.passwordHash);
  };

  User.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  };

  return User;
};