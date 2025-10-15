import { initializeDatabase, createTenant } from './createSchemas.js';
import { getMainPool } from '../config/database.js';
import { pathToFileURL } from 'url';

// Run database migrations
const runMigrations = async () => {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Initialize main database
    await initializeDatabase();
    
    // Create sample tenants for testing
    console.log('📝 Creating sample tenants...');
    
    // Create collegeA tenant
    await createTenant('collegeA', 'College A University');
    console.log('✅ Created collegeA tenant');
    
    // Create collegeB tenant
    await createTenant('collegeB', 'College B Institute');
    console.log('✅ Created collegeB tenant');
    
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




