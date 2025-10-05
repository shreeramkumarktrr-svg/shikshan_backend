module.exports = (sequelize, DataTypes) => {
  const Complaint = sequelize.define('Complaint', {
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
        len: [5, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    category: {
      type: DataTypes.ENUM('academic', 'discipline', 'infrastructure', 'transport', 'fee', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed', 'rejected'),
      allowNull: false,
      defaultValue: 'open'
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'schools',
        key: 'id'
      }
    },
    raisedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },

    slaDeadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    feedback: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        rating: null,
        comment: null,
        submittedAt: null
      }
    }
  }, {
    tableName: 'complaints',
    timestamps: true,
    indexes: [
      {
        fields: ['schoolId']
      },
      {
        fields: ['raisedBy']
      },
      {
        fields: ['assignedTo']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['category']
      }
    ]
  });

  Complaint.associate = (models) => {
    Complaint.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
    
    Complaint.belongsTo(models.User, {
      foreignKey: 'raisedBy',
      as: 'complainant'
    });
    
    Complaint.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'assignee'
    });
    
    Complaint.belongsTo(models.User, {
      foreignKey: 'studentId',
      as: 'student'
    });

    Complaint.hasMany(models.ComplaintUpdate, {
      foreignKey: 'complaintId',
      as: 'updates'
    });
  };

  return Complaint;
};