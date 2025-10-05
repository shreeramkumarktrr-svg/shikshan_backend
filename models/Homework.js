module.exports = (sequelize, DataTypes) => {
  const Homework = sequelize.define('Homework', {
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
        len: [1, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
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
    teacherId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
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
    assignedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    maxMarks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: {
        min: 1,
        max: 1000
      }
    },
    attachments: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      allowNull: false,
      defaultValue: [],
      comment: 'Array of file objects with name, url, type, size'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    type: {
      type: DataTypes.ENUM('assignment', 'project', 'reading', 'practice', 'research'),
      allowNull: false,
      defaultValue: 'assignment'
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    allowLateSubmission: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    submissionFormat: {
      type: DataTypes.ENUM('text', 'file', 'both'),
      allowNull: false,
      defaultValue: 'both'
    }
  }, {
    tableName: 'homework',
    timestamps: true,
    indexes: [
      {
        fields: ['classId']
      },
      {
        fields: ['teacherId']
      },
      {
        fields: ['schoolId']
      },
      {
        fields: ['subject']
      },
      {
        fields: ['dueDate']
      },
      {
        fields: ['isPublished']
      }
    ]
  });

  Homework.associate = (models) => {
    Homework.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class'
    });
    
    Homework.belongsTo(models.User, {
      foreignKey: 'teacherId',
      as: 'teacher'
    });
    
    Homework.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
    
    if (models.HomeworkSubmission) {
      Homework.hasMany(models.HomeworkSubmission, {
        foreignKey: 'homeworkId',
        as: 'submissions'
      });
    }
  };

  return Homework;
};