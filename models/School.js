module.exports = (sequelize, DataTypes) => {
  const School = sequelize.define('School', {
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
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [10, 15]
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    establishedYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1800,
        max: new Date().getFullYear()
      }
    },
    academicYear: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '2024-25'
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Asia/Kolkata'
    },
    locale: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'en'
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'INR'
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('trial', 'active', 'suspended', 'cancelled'),
      allowNull: false,
      defaultValue: 'trial'
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id'
      }
    },
    subscriptionPlan: {
      type: DataTypes.ENUM('basic', 'standard', 'premium'),
      allowNull: false,
      defaultValue: 'basic'
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    maxStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    maxTeachers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        enableSMS: true,
        enableEmail: true,
        enablePushNotifications: true,
        attendanceGracePeriod: 15,
        feeReminderDays: [7, 3, 1],
        academicCalendar: {
          startDate: null,
          endDate: null,
          terms: [],
          holidays: []
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'schools',
    timestamps: true,
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['subscriptionStatus']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  School.associate = (models) => {
    School.hasMany(models.User, {
      foreignKey: 'schoolId',
      as: 'users'
    });
    School.hasMany(models.Class, {
      foreignKey: 'schoolId',
      as: 'classes'
    });
    School.hasMany(models.Event, {
      foreignKey: 'schoolId',
      as: 'events'
    });
    School.hasMany(models.Complaint, {
      foreignKey: 'schoolId',
      as: 'complaints'
    });
    School.belongsTo(models.Subscription, {
      foreignKey: 'subscriptionId',
      as: 'subscription'
    });
    School.hasMany(models.Payment, {
      foreignKey: 'schoolId',
      as: 'payments'
    });
  };

  return School;
};