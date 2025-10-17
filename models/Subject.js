const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subject = sequelize.define('Subject', {
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
        len: [1, 100]
      }
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 20]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('core', 'elective', 'extracurricular', 'language', 'science', 'arts', 'sports'),
      defaultValue: 'core'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    schoolId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'schools',
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
    }
  }, {
    tableName: 'subjects',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'schoolId']
      },
      {
        unique: true,
        fields: ['code', 'schoolId'],
        where: {
          code: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      }
    ]
  });

  Subject.associate = (models) => {
    Subject.belongsTo(models.School, {
      foreignKey: 'schoolId',
      as: 'school'
    });
    
    Subject.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  return Subject;
};