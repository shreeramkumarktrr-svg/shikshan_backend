'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if subscriptions already exist
    const [existingSubscriptions] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM subscriptions'
    );
    
    if (existingSubscriptions[0].count > 0) {
      console.log('Subscriptions already exist, skipping seeding...');
      return;
    }

    const subscriptions = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Starter',
        description: 'Perfect for small schools getting started with digital management',
        planType: 'basic',
        price: 999.00,
        currency: 'INR',
        billingCycle: 'monthly',
        trialDays: 30,
        maxStudents: 100,
        maxTeachers: 10,
        maxClasses: 20,
        features: JSON.stringify({
          attendance: true,
          homework: true,
          events: true,
          reports: true,
          smsNotifications: false,
          emailNotifications: true,
          mobileApp: false,
          customBranding: false,
          apiAccess: false,
          advancedReports: false,
          bulkImport: false,
          parentPortal: true,
          onlineExams: false,
          feeManagement: false,
          libraryManagement: false,
          transportManagement: false
        }),
        isActive: true,
        isPopular: false,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Super',
        description: 'Ideal for growing schools with advanced features and integrations',
        planType: 'standard',
        price: 1999.00,
        currency: 'INR',
        billingCycle: 'monthly',
        trialDays: 30,
        maxStudents: 500,
        maxTeachers: 50,
        maxClasses: 100,
        features: JSON.stringify({
          attendance: true,
          homework: true,
          events: true,
          reports: true,
          smsNotifications: true,
          emailNotifications: true,
          mobileApp: true,
          customBranding: false,
          apiAccess: false,
          advancedReports: true,
          bulkImport: true,
          parentPortal: true,
          onlineExams: true,
          feeManagement: true,
          libraryManagement: false,
          transportManagement: false
        }),
        isActive: true,
        isPopular: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Advanced',
        description: 'Complete solution for large institutions with unlimited features',
        planType: 'premium',
        price: 3999.00,
        currency: 'INR',
        billingCycle: 'monthly',
        trialDays: 30,
        maxStudents: 2000,
        maxTeachers: 200,
        maxClasses: 500,
        features: JSON.stringify({
          attendance: true,
          homework: true,
          events: true,
          reports: true,
          smsNotifications: true,
          emailNotifications: true,
          mobileApp: true,
          customBranding: true,
          apiAccess: true,
          advancedReports: true,
          bulkImport: true,
          parentPortal: true,
          onlineExams: true,
          feeManagement: true,
          libraryManagement: true,
          transportManagement: true
        }),
        isActive: true,
        isPopular: false,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('subscriptions', subscriptions);
    console.log('Default subscriptions seeded successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('subscriptions', null, {});
  }
};