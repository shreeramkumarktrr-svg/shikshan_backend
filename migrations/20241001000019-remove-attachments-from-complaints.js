'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove attachments column from complaints table
    try {
      await queryInterface.removeColumn('complaints', 'attachments');
    } catch (error) {
      console.log('Column attachments may not exist in complaints table:', error.message);
    }

    // Remove attachments column from complaint_updates table
    try {
      await queryInterface.removeColumn('complaint_updates', 'attachments');
    } catch (error) {
      console.log('Column attachments may not exist in complaint_updates table:', error.message);
    }

    // Update the updateType enum to remove 'attachment' option
    try {
      await queryInterface.changeColumn('complaint_updates', 'updateType', {
        type: Sequelize.ENUM('comment', 'status_change', 'assignment', 'resolution'),
        allowNull: false,
        defaultValue: 'comment'
      });
    } catch (error) {
      console.log('Could not update updateType enum:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // Add back attachments column to complaints table
    await queryInterface.addColumn('complaints', 'attachments', {
      type: Sequelize.ARRAY(Sequelize.JSONB),
      allowNull: true,
      defaultValue: []
    });

    // Add back attachments column to complaint_updates table
    await queryInterface.addColumn('complaint_updates', 'attachments', {
      type: Sequelize.ARRAY(Sequelize.JSONB),
      allowNull: true,
      defaultValue: []
    });

    // Restore the updateType enum with 'attachment' option
    await queryInterface.changeColumn('complaint_updates', 'updateType', {
      type: Sequelize.ENUM('comment', 'status_change', 'assignment', 'resolution', 'attachment'),
      allowNull: false,
      defaultValue: 'comment'
    });
  }
};