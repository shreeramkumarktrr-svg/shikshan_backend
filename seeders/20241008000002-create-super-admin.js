'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if super admin already exists
    const existingSuperAdmin = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingSuperAdmin.length > 0) {
      console.log('Super admin already exists, skipping creation');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('superadmin123', 12);

    // Create super admin user
    const superAdminId = '550e8400-e29b-41d4-a716-446655440000'; // Fixed UUID for super admin

    await queryInterface.bulkInsert('users', [
      {
        id: superAdminId,
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@shikshan.com',
        phone: '9999999999',
        passwordHash: hashedPassword,
        role: 'super_admin',
        schoolId: null, // Super admin is not tied to any specific school
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    console.log('✅ Super admin created successfully!');
    console.log('📧 Email: superadmin@shikshan.com');
    console.log('🔑 Password: superadmin123');
    console.log('⚠️  Please change the password after first login');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: 'superadmin@shikshan.com',
      role: 'super_admin'
    });
  }
};