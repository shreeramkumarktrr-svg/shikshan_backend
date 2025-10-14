const { execSync } = require('child_process');
const { sequelize } = require('./models');

async function thoroughCleanup() {
  try {
    console.log('🧹 Thorough Database Cleanup...\n');

    console.log('1️⃣ Connecting to database...');
    
    // Step 1: Drop all indexes first
    console.log('Dropping all indexes...');
    try {
      const [indexes] = await sequelize.query(`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname NOT LIKE '%_pkey'
      `);
      
      for (const index of indexes) {
        try {
          await sequelize.query(`DROP INDEX IF EXISTS "${index.indexname}" CASCADE`);
          console.log(`✅ Dropped index: ${index.indexname}`);
        } catch (error) {
          console.log(`⚠️  Could not drop index ${index.indexname}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Index cleanup had issues:', error.message);
    }
    
    // Step 2: Drop all foreign key constraints
    console.log('Dropping all foreign key constraints...');
    try {
      const [constraints] = await sequelize.query(`
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint 
        WHERE contype = 'f' 
        AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `);
      
      for (const constraint of constraints) {
        try {
          await sequelize.query(`ALTER TABLE ${constraint.table_name} DROP CONSTRAINT IF EXISTS "${constraint.conname}" CASCADE`);
          console.log(`✅ Dropped constraint: ${constraint.conname}`);
        } catch (error) {
          console.log(`⚠️  Could not drop constraint ${constraint.conname}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Constraint cleanup had issues:', error.message);
    }
    
    // Step 3: Drop all tables
    console.log('Dropping all tables...');
    try {
      const [tables] = await sequelize.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
      `);
      
      for (const table of tables) {
        try {
          await sequelize.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
          console.log(`✅ Dropped table: ${table.tablename}`);
        } catch (error) {
          console.log(`⚠️  Could not drop table ${table.tablename}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Table cleanup had issues:', error.message);
    }
    
    // Step 4: Drop all sequences
    console.log('Dropping all sequences...');
    try {
      const [sequences] = await sequelize.query(`
        SELECT sequencename FROM pg_sequences 
        WHERE schemaname = 'public'
      `);
      
      for (const sequence of sequences) {
        try {
          await sequelize.query(`DROP SEQUENCE IF EXISTS "${sequence.sequencename}" CASCADE`);
          console.log(`✅ Dropped sequence: ${sequence.sequencename}`);
        } catch (error) {
          console.log(`⚠️  Could not drop sequence ${sequence.sequencename}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Sequence cleanup had issues:', error.message);
    }
    
    // Step 5: Drop all types (enums)
    console.log('Dropping all custom types...');
    try {
      const [types] = await sequelize.query(`
        SELECT typname FROM pg_type 
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND typtype = 'e'
      `);
      
      for (const type of types) {
        try {
          await sequelize.query(`DROP TYPE IF EXISTS "${type.typname}" CASCADE`);
          console.log(`✅ Dropped type: ${type.typname}`);
        } catch (error) {
          console.log(`⚠️  Could not drop type ${type.typname}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Type cleanup had issues:', error.message);
    }
    
    // Step 6: Drop all functions
    console.log('Dropping all functions...');
    try {
      const [functions] = await sequelize.query(`
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `);
      
      for (const func of functions) {
        try {
          await sequelize.query(`DROP FUNCTION IF EXISTS "${func.proname}"(${func.args}) CASCADE`);
          console.log(`✅ Dropped function: ${func.proname}`);
        } catch (error) {
          console.log(`⚠️  Could not drop function ${func.proname}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Function cleanup had issues:', error.message);
    }
    
    console.log('✅ Database thoroughly cleaned');
    
    // Close the connection
    await sequelize.close();
    console.log('✅ Database connection closed');
    
    // Step 7: Run migrations
    console.log('\n2️⃣ Running migrations...');
    execSync('npx sequelize-cli db:migrate', { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    // Step 8: Run seeders
    console.log('\n3️⃣ Running seeders...');
    try {
      execSync('npx sequelize-cli db:seed --seed 20241008000001-default-subscriptions.js', { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
    } catch (error) {
      console.log('⚠️  Seeder might have already run');
    }
    
    // Step 9: Create test data
    console.log('\n4️⃣ Creating test data...');
    try {
      execSync('node scripts/createTestSchool.js', { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
    } catch (error) {
      console.log('⚠️  Test school creation failed');
    }
    
    console.log('\n🎉 Thorough cleanup and setup completed!');
    console.log('🚀 You can now run: npm start');
    
  } catch (error) {
    console.error('❌ Thorough cleanup failed:', error.message);
    console.error('Stack:', error.stack);
    
    console.error('\n🆘 Final resort - Manual SQL commands:');
    console.error('Connect to your PostgreSQL database and run:');
    console.error('');
    console.error('-- Drop and recreate schema');
    console.error('DROP SCHEMA public CASCADE;');
    console.error('CREATE SCHEMA public;');
    console.error('GRANT ALL ON SCHEMA public TO postgres;');
    console.error('GRANT ALL ON SCHEMA public TO public;');
    console.error('');
    console.error('Then run: npx sequelize-cli db:migrate');
    
    process.exit(1);
  }
}

thoroughCleanup();