module.exports = (sequelize, DataTypes) => {
  const HomeworkSubmission = sequelize.define('HomeworkSubmission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    homeworkId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'homework',
        key: 'id'
      }
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'students',
        key: 'id'
      }
    },
    submissionText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    attachments: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      allowNull: false,
      defaultValue: [],
      comment: 'Array of file objects with name, url, type, size'
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    isLate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('submitted', 'graded', 'returned'),
      allowNull: false,
      defaultValue: 'submitted'
    },
    marksObtained: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    gradedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    gradedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'homework_submissions',
    timestamps: true,
    indexes: [
      {
        fields: ['homeworkId']
      },
      {
        fields: ['studentId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['submittedAt']
      },
      {
        unique: true,
        fields: ['homeworkId', 'studentId']
      }
    ]
  });

  HomeworkSubmission.associate = (models) => {
    HomeworkSubmission.belongsTo(models.Homework, {
      foreignKey: 'homeworkId',
      as: 'homework'
    });
    
    HomeworkSubmission.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'student'
    });
    
    HomeworkSubmission.belongsTo(models.User, {
      foreignKey: 'gradedBy',
      as: 'grader'
    });
  };

  return HomeworkSubmission;
};