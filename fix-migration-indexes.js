const { sequelize } = require('./models');

async function fixMigrationIssues() {
  try {
    // Drop problematic indexes if they exist
    const indexesToDrop = [
      'subscriptions_plan_type',
      'subscriptions_is_active', 
      'subscriptions_sort_order',
      'payments_school_id',
      'payments_subscription_id',
      'payments_status',
      'payments_transaction_id',
      'payments_billing_period_start_billing_period_end',
      'payments_created_at',
      'schools_subscription_id'
    ];

    for (const indexName of indexesToDrop) {
      try {
        await sequelize.query(`DROP INDEX IF EXISTS "${indexName}"`);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`Index ${indexName} doesn't exist or couldn't be dropped`);
      }
    }

    // Check if subscriptionId column exists in schools table
    try {
      const [results] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'schools' 
        AND column_name = 'subscriptionId'
        AND table_schema = 'public'
      `);
      
      if (results.length > 0) {
        console.log('subscriptionId column already exists in schools table');
      } else {
        console.log('subscriptionId column does not exist in schools table');
      }
    } catch (error) {
      }

    console.log('Migration issue cleanup completed. You can now run migrations.');
    
  } catch (error) {
    console.error('Error fixing migration issues:', error);
  } finally {
    await sequelize.close();
  }
}

fixMigrationIssues();