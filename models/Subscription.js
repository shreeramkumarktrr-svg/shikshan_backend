module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    planType: {
      type: DataTypes.ENUM('basic', 'standard', 'premium'),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'INR'
    },
    billingCycle: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    trialDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      validate: {
        min: 0,
        max: 365
      }
    },
    maxStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: {
        min: 1
      }
    },
    maxTeachers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 1
      }
    },
    maxClasses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      validate: {
        min: 1
      }
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        // Core School Management Features (matching sidebar navigation)
        dashboard: true,
        teachers: true,
        students: true,
        classes: true,
        attendance: true,
        homework: true,
        events: true,
        complaints: true,
        fees: true,
        reports: true,
        // Additional Premium Features
        smsNotifications: false,
        emailNotifications: true,
        mobileApp: false,
        customBranding: false,
        apiAccess: false,
        advancedReports: false,
        bulkImport: false,
        parentPortal: true
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    indexes: [
      {
        fields: ['planType']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['sortOrder']
      }
    ]
  });

  Subscription.associate = (models) => {
    Subscription.hasMany(models.School, {
      foreignKey: 'subscriptionId',
      as: 'schools'
    });
  };

  return Subscription;
};