module.exports = (sequelize, DataTypes) => {
  const Teacher = sequelize.define('Teacher', {
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
    qualification: {
      type: DataTypes.STRING,
      allowNull: true
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    specialization: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    contractType: {
      type: DataTypes.ENUM('permanent', 'contract', 'part_time', 'substitute'),
      allowNull: false,
      defaultValue: 'permanent'
    },
    isClassTeacher: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    joiningDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'teachers',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
        unique: true
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['isClassTeacher']
      }
    ]
  });

  Teacher.associate = (models) => {
    // One-to-one with User
    Teacher.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });
    
    // Many-to-many with Classes through ClassTeachers junction table
    if (models.Class) {
      Teacher.belongsToMany(models.Class, {
        through: 'ClassTeachers',
        foreignKey: 'teacherId',
        otherKey: 'classId',
        as: 'classes'
      });
    }

    // One-to-many with Homework (if teacher creates homework)
    if (models.Homework) {
      Teacher.hasMany(models.Homework, {
        foreignKey: 'teacherId',
        as: 'homework'
      });
    }

    // One-to-many with Attendance (if teacher takes attendance)
    if (models.Attendance) {
      Teacher.hasMany(models.Attendance, {
        foreignKey: 'teacherId',
        as: 'attendanceRecords'
      });
    }
  };

  return Teacher;
};