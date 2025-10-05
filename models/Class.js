module.exports = (sequelize, DataTypes) => {
  const Class = sequelize.define('Class', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    grade: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    section: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10]
      }
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'schools',
        key: 'id'
      }
    },
    classTeacherId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    maxStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 40,
      validate: {
        min: 1,
        max: 100
      }
    },
    room: {
      type: DataTypes.STRING,
      allowNull: true
    },
    subjects: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: []
    },
    timetable: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'classes',
    timestamps: true,
    indexes: [
      {
        fields: ['schoolId']
      },
      {
        fields: ['grade']
      },
      {
        fields: ['classTeacherId']
      },
      {
        unique: true,
        fields: ['schoolId', 'grade', 'section']
      }
    ]
  });

  Class.associate = (models) => {
    Class.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
    
    Class.belongsTo(models.User, {
      foreignKey: 'classTeacherId',
      as: 'classTeacher'
    });
    
    if (models.Student) {
      Class.hasMany(models.Student, {
        foreignKey: 'classId',
        as: 'students'
      });
    }
    
    if (models.Attendance) {
      Class.hasMany(models.Attendance, {
        foreignKey: 'classId',
        as: 'attendanceRecords'
      });
    }
    
    if (models.Event) {
      Class.hasMany(models.Event, {
        foreignKey: 'classId',
        as: 'events'
      });
    }
    
    // Many-to-many with Teachers through ClassTeacher
    Class.belongsToMany(models.User, {
      through: 'ClassTeachers',
      foreignKey: 'classId',
      otherKey: 'teacherId',
      as: 'teachers'
    });
  };

  return Class;
};