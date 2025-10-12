'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('🚀 Setting up multi-tenant security infrastructure...');

      // First, check if tables exist and have schoolId column
      const tenantTables = [
        'users', 'students', 'teachers', 'parents', 'classes', 
        'attendance', 'homework', 'events', 'complaints', 'fees'
      ];

      // Create extension for UUID if not exists
      await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
      console.log('✅ UUID extension enabled');

      // Create audit log table for tenant access (if not exists)
      try {
        await queryInterface.createTable('tenant_audit_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('uuid_generate_v4()'),
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        schoolId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        action: {
          type: Sequelize.STRING,
          allowNull: false
        },
        tableName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        recordId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        oldValues: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        newValues: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        ipAddress: {
          type: Sequelize.INET,
          allowNull: true
        },
        userAgent: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        level: {
          type: Sequelize.ENUM('info', 'warn', 'error', 'security'),
          allowNull: false,
          defaultValue: 'info'
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
        });
        console.log('✅ Audit log table created');
      } catch (error) {
        if (error.original?.code === '42P07') {
          console.log('⚠️  Audit log table already exists, skipping creation...');
        } else {
          throw error;
        }
      }

      // Create indexes for audit table (with error handling)
      const indexes = [
        { fields: ['userId'], name: 'tenant_audit_logs_user_id' },
        { fields: ['schoolId'], name: 'tenant_audit_logs_school_id' },
        { fields: ['createdAt'], name: 'tenant_audit_logs_created_at' },
        { fields: ['action'], name: 'tenant_audit_logs_action' },
        { fields: ['level'], name: 'tenant_audit_logs_level' }
      ];

      for (const index of indexes) {
        try {
          await queryInterface.addIndex('tenant_audit_logs', index.fields, {
            name: index.name,
            concurrently: false
          });
          console.log(`✅ Created index: ${index.name}`);
        } catch (error) {
          if (error.original?.code === '42P07') {
            console.log(`⚠️  Index ${index.name} already exists, skipping...`);
          } else {
            console.log(`❌ Error creating index ${index.name}:`, error.message);
          }
        }
      }
      console.log('✅ Audit log indexes processed');

      // Create function to set school context
      try {
        await queryInterface.sequelize.query(`
          CREATE OR REPLACE FUNCTION set_school_context(school_uuid uuid, user_role text DEFAULT NULL)
          RETURNS void AS $$
          BEGIN
            IF school_uuid IS NOT NULL THEN
              PERFORM set_config('app.current_school_id', school_uuid::text, true);
            ELSE
              PERFORM set_config('app.current_school_id', '', true);
            END IF;
            
            IF user_role IS NOT NULL THEN
              PERFORM set_config('app.user_role', user_role, true);
            ELSE
              PERFORM set_config('app.user_role', '', true);
            END IF;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log('✅ School context function created');
      } catch (error) {
        console.log('⚠️  School context function creation error:', error.message);
      }

      // Create function to get current school context
      try {
        await queryInterface.sequelize.query(`
          CREATE OR REPLACE FUNCTION get_current_school_id()
          RETURNS uuid AS $$
          BEGIN
            RETURN CASE 
              WHEN current_setting('app.current_school_id', true) = '' THEN NULL
              ELSE current_setting('app.current_school_id', true)::uuid
            END;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log('✅ Get school context function created');
      } catch (error) {
        console.log('⚠️  Get school context function error:', error.message);
      }

      // Create function to check if user is super admin
      try {
        await queryInterface.sequelize.query(`
          CREATE OR REPLACE FUNCTION is_super_admin()
          RETURNS boolean AS $$
          BEGIN
            RETURN current_setting('app.user_role', true) = 'super_admin';
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log('✅ Super admin check function created');
      } catch (error) {
        console.log('⚠️  Super admin function error:', error.message);
      }

      // Create audit trigger function
      try {
        await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION audit_tenant_access()
        RETURNS trigger AS $$
        DECLARE
          current_user_id uuid;
          current_school_id uuid;
        BEGIN
          -- Get current context (may be null)
          BEGIN
            current_user_id := current_setting('app.current_user_id', true)::uuid;
          EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
          END;
          
          BEGIN
            current_school_id := get_current_school_id();
          EXCEPTION WHEN OTHERS THEN
            current_school_id := NULL;
          END;
          
          IF TG_OP = 'DELETE' THEN
            INSERT INTO tenant_audit_logs (
              "userId", "schoolId", action, "tableName", "recordId", 
              "oldValues", "createdAt"
            ) VALUES (
              current_user_id, current_school_id, 'DELETE', 
              TG_TABLE_NAME, OLD.id, row_to_json(OLD), NOW()
            );
            RETURN OLD;
          ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO tenant_audit_logs (
              "userId", "schoolId", action, "tableName", "recordId", 
              "oldValues", "newValues", "createdAt"
            ) VALUES (
              current_user_id, current_school_id, 'UPDATE', 
              TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), NOW()
            );
            RETURN NEW;
          ELSIF TG_OP = 'INSERT' THEN
            INSERT INTO tenant_audit_logs (
              "userId", "schoolId", action, "tableName", "recordId", 
              "newValues", "createdAt"
            ) VALUES (
              current_user_id, current_school_id, 'INSERT', 
              TG_TABLE_NAME, NEW.id, row_to_json(NEW), NOW()
            );
            RETURN NEW;
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        console.log('✅ Audit trigger function created');
      } catch (error) {
        console.log('⚠️  Audit trigger function error:', error.message);
      }

      // Enable RLS and create policies for each tenant table
      let rlsEnabledCount = 0;
      for (const table of tenantTables) {
        try {
          // Check if table exists
          const tableExists = await queryInterface.sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = '${table}'
            );
          `);

          if (tableExists[0][0].exists) {
            // Check if table has schoolId column
            const hasSchoolId = await queryInterface.sequelize.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = '${table}'
                AND column_name = 'schoolId'
              );
            `);

            if (hasSchoolId[0][0].exists) {
              // Enable RLS
              await queryInterface.sequelize.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
              
              // Create policy for school isolation
              await queryInterface.sequelize.query(`
                CREATE POLICY ${table}_school_isolation ON "${table}"
                FOR ALL
                TO PUBLIC
                USING (
                  is_super_admin() = true
                  OR "schoolId" = get_current_school_id()
                  OR get_current_school_id() IS NULL
                );
              `);

              // Create audit trigger
              await queryInterface.sequelize.query(`
                CREATE TRIGGER ${table}_audit_trigger
                AFTER INSERT OR UPDATE OR DELETE ON "${table}"
                FOR EACH ROW EXECUTE FUNCTION audit_tenant_access();
              `);

              rlsEnabledCount++;
              console.log(`✅ RLS enabled for table: ${table}`);
            } else {
              console.log(`⚠️  Table ${table} exists but has no schoolId column, skipping RLS...`);
            }
          } else {
            console.log(`⚠️  Table ${table} does not exist, skipping...`);
          }
        } catch (error) {
          console.log(`❌ Error setting up RLS for ${table}:`, error.message);
        }
      }

      console.log(`✅ Row Level Security setup completed for ${rlsEnabledCount} tables`);
      console.log('🎉 Multi-tenant security infrastructure is ready!');

    } catch (error) {
      console.error('❌ Error setting up multi-tenant security:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Rolling back multi-tenant security infrastructure...');

    const tenantTables = [
      'users', 'students', 'teachers', 'parents', 'classes', 
      'attendance', 'homework', 'events', 'complaints', 'fees'
    ];

    // Drop triggers, policies and disable RLS
    for (const table of tenantTables) {
      try {
        await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS ${table}_audit_trigger ON "${table}";`);
        await queryInterface.sequelize.query(`DROP POLICY IF EXISTS ${table}_school_isolation ON "${table}";`);
        await queryInterface.sequelize.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;`);
        console.log(`✅ Cleaned up ${table}`);
      } catch (error) {
        console.log(`⚠️  Error cleaning up ${table}:`, error.message);
      }
    }

    // Drop functions
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS audit_tenant_access();`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS is_super_admin();`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS get_current_school_id();`);
    await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS set_school_context(uuid, text);`);
    console.log('✅ Functions dropped');

    // Drop audit table
    await queryInterface.dropTable('tenant_audit_logs');
    console.log('✅ Audit table dropped');

    console.log('🎉 Multi-tenant security rollback completed');
  }
};