module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
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
    type: {
      type: DataTypes.ENUM('announcement', 'event', 'holiday', 'exam', 'meeting', 'celebration'),
      allowNull: false,
      defaultValue: 'announcement'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'schools',
        key: 'id'
      }
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'classes',
        key: 'id'
      }
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    targetAudience: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: ['all']
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attachments: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      allowNull: true,
      defaultValue: []
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sendNotification: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    notificationSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    readBy: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: []
    }
  }, {
    tableName: 'events',
    timestamps: true,
    indexes: [
      {
        fields: ['schoolId']
      },
      {
        fields: ['classId']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['type']
      },
      {
        fields: ['startDate']
      },
      {
        fields: ['isPublished']
      }
    ]
  });

  Event.associate = (models) => {
    Event.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
    
    Event.belongsTo(models.Class, {
      foreignKey: 'classId',
      as: 'class'
    });
    
    Event.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return Event;
};