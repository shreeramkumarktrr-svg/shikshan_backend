const { QueryInterface, Sequelize } = require('sequelize');
const config = require('./config/database.js');

const sequelize = new Sequelize(config.development);

async function checkTableStructure() {
  try {
    console.log('Checking StudentParents table structure...');
    
    // Check if table exists
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StudentParents'"
    );
    
    if (tables.length === 0) {
      console.log('❌ StudentParents table does not exist');
      return;
    }
    
    console.log('✅ StudentParents table exists');
    
    // Get table structure
    const [columns] = await sequelize.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = 'StudentParents' 
       ORDER BY ordinal_position`
    );
    
    console.log('\nTable structure:');
    console.table(columns);
    
    // Check migration status
    console.log('\n=== Migration Status ===');
    const [migrations] = await sequelize.query(
      "SELECT name FROM \"SequelizeMeta\" ORDER BY name"
    );
    
    console.log('Applied migrations:');
    migrations.forEach(m => console.log(`- ${m.name}`));
    
  } catch (error) {
    console.error('Error checking table structure:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTableStructure();