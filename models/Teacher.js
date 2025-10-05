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
      references: {
        model: 'users',
        key: 'id'
      }
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
    }
  }, {
    tableName: 'teachers',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      }
    ]
  });

  Teacher.associate = (models) => {
    Teacher.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    // Many-to-many with Classes through ClassTeachers
    if (models.Class) {
      Teacher.belongsToMany(models.Class, {
        through: 'ClassTeachers',
        foreignKey: 'teacherId',
        otherKey: 'classId',
        as: 'classes'
      });
    }
  };

  return Teacher;
};