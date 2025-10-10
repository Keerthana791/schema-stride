import { initializeDatabase, createTenant } from './createSchemas.js';
import { getMainPool } from '../config/database.js';

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

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
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




