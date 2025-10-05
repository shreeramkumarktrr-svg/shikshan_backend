const { Sequelize } = require('sequelize');
const config = require('./config/database.js');

const sequelize = new Sequelize(config.development);

async function fixJunctionTables() {
  try {
    console.log('Fixing junction tables...');
    
    // Drop existing tables
    console.log('Dropping existing StudentParents table...');
    await sequelize.query('DROP TABLE IF EXISTS "StudentParents" CASCADE');
    
    console.log('Dropping existing ClassTeachers table...');
    await sequelize.query('DROP TABLE IF EXISTS "ClassTeachers" CASCADE');
    
    // Recreate StudentParents table with correct structure
    console.log('Creating StudentParents table with correct structure...');
    await sequelize.query(`
      CREATE TABLE "StudentParents" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "studentId" UUID NOT NULL REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "parentId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "relationshipType" VARCHAR(255) CHECK ("relationshipType" IN ('father', 'mother', 'guardian', 'other')) NOT NULL DEFAULT 'father',
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    
    // Recreate ClassTeachers table with correct structure
    console.log('Creating ClassTeachers table with correct structure...');
    await sequelize.query(`
      CREATE TABLE "ClassTeachers" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "classId" UUID NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "teacherId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "subject" VARCHAR(255) NOT NULL,
        "isClassTeacher" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    
    // Add indexes
    console.log('Adding indexes...');
    await sequelize.query('CREATE INDEX "student_parents_student_id" ON "StudentParents" ("studentId")');
    await sequelize.query('CREATE INDEX "student_parents_parent_id" ON "StudentParents" ("parentId")');
    await sequelize.query('CREATE INDEX "class_teachers_class_id" ON "ClassTeachers" ("classId")');
    await sequelize.query('CREATE INDEX "class_teachers_teacher_id" ON "ClassTeachers" ("teacherId")');
    
    // Add unique constraints
    console.log('Adding unique constraints...');
    await sequelize.query('ALTER TABLE "StudentParents" ADD CONSTRAINT "unique_student_parent" UNIQUE ("studentId", "parentId")');
    await sequelize.query('ALTER TABLE "ClassTeachers" ADD CONSTRAINT "unique_class_teacher_subject" UNIQUE ("classId", "teacherId", "subject")');
    
    console.log('✅ Junction tables fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing junction tables:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixJunctionTables();