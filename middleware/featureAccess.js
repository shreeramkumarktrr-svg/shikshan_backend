const { School, Subscription } = require('../models');

/**
 * Middleware to check if a school has access to a specific feature
 * @param {string} featureName - The feature to check (e.g., 'homework', 'feeManagement')
 * @returns {Function} Express middleware function
 */
const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      // Get school ID from user context or request
      const schoolId = req.user?.schoolId || req.params.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ 
          error: 'School context required',
          code: 'SCHOOL_CONTEXT_MISSING'
        });
      }

      // Get school with subscription details
      const school = await School.findByPk(schoolId, {
        include: [{
          model: Subscription,
          as: 'subscription',
          attributes: ['features', 'name', 'planType']
        }]
      });

      if (!school) {
        return res.status(404).json({ 
          error: 'School not found',
          code: 'SCHOOL_NOT_FOUND'
        });
      }

      // Check if school has active subscription
      if (school.subscriptionStatus !== 'active' && school.subscriptionStatus !== 'trial') {
        return res.status(403).json({ 
          error: 'Subscription is not active',
          code: 'SUBSCRIPTION_INACTIVE',
          subscriptionStatus: school.subscriptionStatus
        });
      }

      // Check if subscription has the required feature
      const subscriptionFeatures = school.subscription?.features || {};
      const hasFeature = subscriptionFeatures[featureName] === true;

      if (!hasFeature) {
        return res.status(403).json({ 
          error: `Access denied. Feature '${featureName}' is not included in your subscription plan.`,
          code: 'FEATURE_NOT_AVAILABLE',
          feature: featureName,
          currentPlan: school.subscription?.name || school.subscriptionPlan,
          availableFeatures: Object.keys(subscriptionFeatures).filter(key => subscriptionFeatures[key] === true)
        });
      }

      // Add feature info to request for logging/analytics
      req.featureAccess = {
        feature: featureName,
        schoolId,
        planType: school.subscription?.planType || school.subscriptionPlan,
        planName: school.subscription?.name
      };

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      res.status(500).json({ 
        error: 'Failed to verify feature access',
        code: 'FEATURE_CHECK_ERROR'
      });
    }
  };
};

/**
 * Get all available features for a school
 * @param {string} schoolId - School ID
 * @returns {Object} Available features and subscription info
 */
const getSchoolFeatures = async (schoolId) => {
  try {
    const school = await School.findByPk(schoolId, {
      include: [{
        model: Subscription,
        as: 'subscription',
        attributes: ['features', 'name', 'planType', 'price', 'currency', 'billingCycle']
      }]
    });

    if (!school) {
      throw new Error('School not found');
    }

    const features = school.subscription?.features || {};
    const availableFeatures = Object.keys(features).filter(key => features[key] === true);
    const unavailableFeatures = Object.keys(features).filter(key => features[key] === false);

    return {
      schoolId,
      subscriptionStatus: school.subscriptionStatus,
      subscription: {
        name: school.subscription?.name,
        planType: school.subscription?.planType || school.subscriptionPlan,
        price: school.subscription?.price,
        currency: school.subscription?.currency,
        billingCycle: school.subscription?.billingCycle
      },
      features: {
        available: availableFeatures,
        unavailable: unavailableFeatures,
        all: features
      },
      limits: {
        maxStudents: school.maxStudents,
        maxTeachers: school.maxTeachers
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Check multiple features at once
 * @param {Array} featureNames - Array of feature names to check
 * @returns {Function} Express middleware function
 */
const checkMultipleFeatures = (featureNames) => {
  return async (req, res, next) => {
    try {
      const schoolId = req.user?.schoolId || req.params.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ 
          error: 'School context required',
          code: 'SCHOOL_CONTEXT_MISSING'
        });
      }

      const school = await School.findByPk(schoolId, {
        include: [{
          model: Subscription,
          as: 'subscription',
          attributes: ['features', 'name', 'planType']
        }]
      });

      if (!school) {
        return res.status(404).json({ 
          error: 'School not found',
          code: 'SCHOOL_NOT_FOUND'
        });
      }

      if (school.subscriptionStatus !== 'active' && school.subscriptionStatus !== 'trial') {
        return res.status(403).json({ 
          error: 'Subscription is not active',
          code: 'SUBSCRIPTION_INACTIVE',
          subscriptionStatus: school.subscriptionStatus
        });
      }

      const subscriptionFeatures = school.subscription?.features || {};
      const missingFeatures = featureNames.filter(feature => !subscriptionFeatures[feature]);

      if (missingFeatures.length > 0) {
        return res.status(403).json({ 
          error: `Access denied. Required features not available: ${missingFeatures.join(', ')}`,
          code: 'FEATURES_NOT_AVAILABLE',
          missingFeatures,
          currentPlan: school.subscription?.name || school.subscriptionPlan
        });
      }

      req.featureAccess = {
        features: featureNames,
        schoolId,
        planType: school.subscription?.planType || school.subscriptionPlan,
        planName: school.subscription?.name
      };

      next();
    } catch (error) {
      console.error('Multiple feature access check error:', error);
      res.status(500).json({ 
        error: 'Failed to verify feature access',
        code: 'FEATURE_CHECK_ERROR'
      });
    }
  };
};

module.exports = {
  checkFeatureAccess,
  getSchoolFeatures,
  checkMultipleFeatures
};