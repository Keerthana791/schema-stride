import { initializeDatabase, createTenant } from './createSchemas.js';
import { getMainPool } from '../config/database.js';
import { pathToFileURL } from 'url';

// Apply alterations to all existing tenant schemas (idempotent)
const migrateExistingTenants = async () => {
  const mainPool = getMainPool();
  const tenants = await mainPool.query('SELECT tenant_id, schema_name FROM tenant_mapping');
  for (const t of tenants.rows) {
    const schema = t.schema_name;
    console.log(`➡️  Migrating tenant schema: ${schema}`);
    // Create branches table if not exists
    await mainPool.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_branch_name UNIQUE (name)
      )`);
    // Ensure branch_id exists on courses
    await mainPool.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE ${schema}.courses ADD COLUMN branch_id UUID;
        EXCEPTION WHEN duplicate_column THEN
          -- already exists
          NULL;
        END;
      END$$;`);
    // Seed default branch if none
    const branchRes = await mainPool.query(`SELECT id FROM ${schema}.branches WHERE name = $1`, ['CSE']);
    let defaultBranchId = branchRes.rows[0]?.id;
    if (!defaultBranchId) {
      const ins = await mainPool.query(`INSERT INTO ${schema}.branches (name, code) VALUES ($1, $2) RETURNING id`, ['CSE', 'CSE']);
      defaultBranchId = ins.rows[0].id;
    }
    // Backfill null branch_id with default
    await mainPool.query(`UPDATE ${schema}.courses SET branch_id = $1 WHERE branch_id IS NULL`, [defaultBranchId]);
    // Add FK and index (if not present)
    await mainPool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = '${schema}_courses_branch_fk'
        ) THEN
          ALTER TABLE ${schema}.courses
            ADD CONSTRAINT ${schema}_courses_branch_fk FOREIGN KEY (branch_id) REFERENCES ${schema}.branches(id);
        END IF;
      END$$;`);
    await mainPool.query(`CREATE INDEX IF NOT EXISTS idx_courses_branch ON ${schema}.courses(branch_id)`);
    console.log(`✅ Migrated ${schema}`);
  }
};

// Run database migrations
const runMigrations = async () => {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Initialize main database
    await initializeDatabase();
    
    // Create sample tenants for testing (idempotent)
    console.log('📝 Creating sample tenants (idempotent)...');
    const mainPool = getMainPool();
    const existing = await mainPool.query('SELECT tenant_id FROM tenant_mapping');
    const haveA = existing.rows.some(r => r.tenant_id === 'collegeA');
    const haveB = existing.rows.some(r => r.tenant_id === 'collegeB');
    if (!haveA) {
      try {
        await createTenant('collegeA', 'College A University');
        console.log('✅ Created collegeA tenant');
      } catch (e) {
        console.warn('⚠️ Skipping collegeA creation:', e?.message || e);
      }
    } else {
      console.log('ℹ️ collegeA already exists');
    }
    if (!haveB) {
      try {
        await createTenant('collegeB', 'College B Institute');
        console.log('✅ Created collegeB tenant');
      } catch (e) {
        console.warn('⚠️ Skipping collegeB creation:', e?.message || e);
      }
    } else {
      console.log('ℹ️ collegeB already exists');
    }
    
    // Alter existing tenants to new structure
    console.log('🔧 Applying tenant schema alterations...');
    await migrateExistingTenants();

    console.log('🎉 Database migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run if called directly (Windows-safe path comparison)
const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (!process.env.MIGRATE_AS_LIBRARY && (invokedPath === import.meta.url || invokedPath === null)) {
  runMigrations()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runMigrations };




