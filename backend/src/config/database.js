import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Main database connection (for tenant mapping and global operations)
const mainPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'lms_main',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Tenant-specific database connections cache
const tenantPools = new Map();

// Get tenant-specific database connection
export const getTenantPool = async (tenantId) => {
  if (tenantPools.has(tenantId)) {
    return tenantPools.get(tenantId);
  }

  try {
    // Get tenant schema name from main database
    const result = await mainPool.query(
      'SELECT schema_name FROM tenant_mapping WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const schemaName = result.rows[0].schema_name;
    
    // Create new pool for this tenant
    const tenantPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'lms_main',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // Set default schema for this connection
      options: `-c search_path=${schemaName},public`
    });

    tenantPools.set(tenantId, tenantPool);
    return tenantPool;
  } catch (error) {
    console.error('Error getting tenant pool:', error);
    throw error;
  }
};

// Get main database connection
export const getMainPool = () => mainPool;

// Close all connections
export const closeAllConnections = async () => {
  await mainPool.end();
  for (const pool of tenantPools.values()) {
    await pool.end();
  }
  tenantPools.clear();
};

// Test database connection
export const testConnection = async () => {
  try {
    const client = await mainPool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

export default mainPool;




