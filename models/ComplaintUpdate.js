module.exports = (sequelize, DataTypes) => {
  const ComplaintUpdate = sequelize.define('ComplaintUpdate', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    complaintId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'complaints',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updateType: {
      type: DataTypes.ENUM('comment', 'status_change', 'assignment', 'resolution'),
      allowNull: false,
      defaultValue: 'comment'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    previousValue: {
      type: DataTypes.STRING,
      allowNull: true
    },
    newValue: {
      type: DataTypes.STRING,
      allowNull: true
    },

    isInternal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'complaint_updates',
    timestamps: true,
    indexes: [
      {
        fields: ['complaintId']
      },
      {
        fields: ['updatedBy']
      },
      {
        fields: ['updateType']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  ComplaintUpdate.associate = (models) => {
    ComplaintUpdate.belongsTo(models.Complaint, {
      foreignKey: 'complaintId',
      as: 'complaint'
    });
    
    ComplaintUpdate.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });
  };

  return ComplaintUpdate;
};