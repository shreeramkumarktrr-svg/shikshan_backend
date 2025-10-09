'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Helper function to check if record exists
    const recordExists = async (table, where) => {
      const [results] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM "${table}" WHERE ${Object.keys(where).map(key => `"${key}" = '${where[key]}'`).join(' AND ')}`
      );
      return results[0].count > 0;
    };

    // Create Super Admin
    const superAdminId = uuidv4();
    const superAdminPasswordHash = await bcrypt.hash('admin123', 12);

    if (!(await recordExists('users', { email: 'admin@shikshan.com' }))) {
      await queryInterface.bulkInsert('users', [{
        id: superAdminId,
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@shikshan.com',
        phone: '9999999999',
        passwordHash: superAdminPasswordHash,
        role: 'super_admin',
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: now,
        updatedAt: now
      }]);
      
    } else {
      console.log('ℹ️  Super Admin already exists, skipping...');
    }

    },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkDelete('users', { 
        email: 'admin@shikshan.com',
        role: 'super_admin'
      }, {});
      console.log('🧹 Super Admin removed successfully');
    } catch (error) {
      }
  }
};