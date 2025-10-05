const { sequelize } = require('./models');

async function resetMigrations() {
  try {
    console.log('Resetting migrations...');
    
    // Get list of migrations that have been run
    const [migrations] = await sequelize.query(`
      SELECT name FROM "SequelizeMeta" 
      WHERE name IN (
        '20241001000012-create-subscriptions.js',
        '20241001000013-create-payments.js', 
        '20241001000014-add-subscription-to-schools.js',
        '20241001000016-create-complaint-updates.js'
      )
      ORDER BY name DESC
    `);

    console.log('Found migrations to reset:', migrations.map(m => m.name));

    // Remove these migrations from SequelizeMeta
    for (const migration of migrations) {
      await sequelize.query(`DELETE FROM "SequelizeMeta" WHERE name = ?`, {
        replacements: [migration.name]
      });
      console.log(`Removed migration record: ${migration.name}`);
    }

    console.log('Migration records reset. You can now run migrations again.');
    
  } catch (error) {
    console.error('Error resetting migrations:', error);
  } finally {
    await sequelize.close();
  }
}

resetMigrations();