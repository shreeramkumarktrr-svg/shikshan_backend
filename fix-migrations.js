const { QueryInterface, Sequelize } = require('sequelize');
const db = require('./models');

async function fixMigrations() {
  try {
    console.log('Checking migration state...');
    
    // Check if staff_attendance table exists
    const [results] = await db.sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'staff_attendance'
    `);
    
    if (results.length === 0) {
      console.log('staff_attendance table does not exist, creating...');
      
      // Create the table manually
      await db.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "staff_attendance" (
          "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          "staffId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "date" DATE NOT NULL,
          "status" VARCHAR(20) NOT NULL DEFAULT 'present' CHECK ("status" IN ('present', 'absent', 'late', 'half_day', 'sick_leave', 'casual_leave', 'official_duty')),
          "checkInTime" TIME,
          "checkOutTime" TIME,
          "markedBy" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "markedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "remarks" TEXT,
          "workingHours" DECIMAL(4,2) DEFAULT 0,
          "schoolId" UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      
      // Create indexes
      await db.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "staff_attendance_staff_id_idx" ON "staff_attendance" ("staffId");
      `);
      
      await db.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "staff_attendance_date_idx" ON "staff_attendance" ("date");
      `);
      
      await db.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "staff_attendance_school_id_idx" ON "staff_attendance" ("schoolId");
      `);
      
      await db.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "staff_attendance_marked_by_idx" ON "staff_attendance" ("markedBy");
      `);
      
      await db.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "staff_attendance_unique_staff_date" ON "staff_attendance" ("staffId", "date");
      `);
      
      console.log('✅ staff_attendance table created successfully');
      
      // Mark migration as completed
      await db.sequelize.query(`
        INSERT INTO "SequelizeMeta" ("name") 
        VALUES ('20241001000015-create-staff-attendance.js')
        ON CONFLICT DO NOTHING;
      `);
      
      console.log('✅ Migration marked as completed');
    } else {
      console.log('✅ staff_attendance table already exists');
    }
    
    // Check for duplicate index issue in subscriptions
    try {
      await db.sequelize.query(`
        DROP INDEX IF EXISTS "subscriptions_plan_type";
      `);
      console.log('✅ Removed duplicate subscriptions index');
    } catch (error) {
      console.log('No duplicate index to remove');
    }
    
    console.log('\n🎉 Migration fixes completed!');
    console.log('You can now start the server with: npm start');
    
  } catch (error) {
    console.error('❌ Error fixing migrations:', error);
  } finally {
    await db.sequelize.close();
  }
}

fixMigrations();