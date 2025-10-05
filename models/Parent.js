module.exports = (sequelize, DataTypes) => {
  const Parent = sequelize.define('Parent', {
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
    occupation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    workAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    workPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    relationshipType: {
      type: DataTypes.ENUM('father', 'mother', 'guardian', 'other'),
      allowNull: false,
      defaultValue: 'father'
    },
    isEmergencyContact: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    canPickupChild: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'parents',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      }
    ]
  });

  Parent.associate = (models) => {
    Parent.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // Many-to-many with Students through StudentParents
    if (models.Student) {
      Parent.belongsToMany(models.Student, {
        through: 'StudentParents',
        foreignKey: 'parentId',
        otherKey: 'studentId',
        as: 'children'
      });
    }
  };

  return Parent;
};