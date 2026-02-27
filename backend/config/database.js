import pg from 'pg';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend root so scripts work when run from backend/ or backend/test/
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

// Build connection config
const getConnectionConfig = () => {
  // If DATABASE_URL is provided, use it (but add SSL for Google Cloud SQL)
  if (process.env.DATABASE_URL) {
    // Check if it's a Google Cloud SQL connection (has cloud sql domain or is not localhost)
    const isCloudSQL = process.env.DATABASE_URL.includes('cloudsql') ||
                       process.env.DATABASE_URL.includes('googleapis.com') ||
                       (!process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'));
    
    // Remove sslmode from URL - we'll handle SSL programmatically
    // This prevents the URL parameter from overriding our SSL config
    let connectionString = process.env.DATABASE_URL;
    connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '');
    
    return {
      connectionString: connectionString,
      // Google Cloud SQL requires SSL but we need to disable certificate verification
      ssl: isCloudSQL ? {
        rejectUnauthorized: false // Disable certificate verification for Google Cloud SQL
      } : false,
      // Connection pool settings - tuned for high concurrency (PetrolData/LatestPetrol fire 20+ parallel requests)
      max: 40,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 30000,
    };
  }
  
  // Otherwise use individual settings
  const isCloudSQL = process.env.DB_HOST && 
                     (process.env.DB_HOST.includes('cloudsql') ||
                      process.env.DB_HOST.includes('googleapis.com') ||
                      (process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'));
  
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'petroleum_db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // Google Cloud SQL requires SSL
    ssl: isCloudSQL ? {
      rejectUnauthorized: false // Disable certificate verification for Google Cloud SQL
    } : false,
    // Connection pool settings - tuned for high concurrency (PetrolData/LatestPetrol fire 20+ parallel requests)
    max: 40,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
  };
};

// Create connection pool
const pool = new Pool(getConnectionConfig());

// Test database connection and optional search_path (so "transactions" resolves to the right schema)
pool.on('connect', (client) => {
  const searchPath = process.env.DB_SEARCH_PATH;
  if (searchPath && typeof searchPath === 'string') {
    const pathValue = searchPath.split(',').map((s) => s.trim()).filter(Boolean).join(', ');
    if (pathValue) {
      client.query(`SET search_path TO ${pathValue}`).catch((err) => {
        console.warn('⚠️ [Database] SET search_path failed:', err.message);
      });
    }
  }
  console.log('✅ [Database] Client connected to database:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    ...(searchPath && { search_path: searchPath }),
    timestamp: new Date().toISOString()
  });
});

pool.on('acquire', (client) => {
  console.log('🔌 [Database] Client acquired from pool:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('remove', (client) => {
  console.log('🔌 [Database] Client removed from pool:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('error', (err) => {
  console.error('❌ [Database] Unexpected error on idle client:', {
    error: err.message,
    code: err.code,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  process.exit(-1);
});

// Helper function to execute queries
export const query = async (text, params) => {
  const start = Date.now();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  try {
    // Only log query details in development mode
    if (isDevelopment) {
      console.log('🗄️ [Database] Executing query:', {
        query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        paramCount: params?.length || 0,
        timestamp: new Date().toISOString()
      });
    }
    
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Only log detailed results in development mode
    if (isDevelopment) {
      console.log('✅ [Database] Query executed successfully:', {
        duration: `${duration}ms`,
        rowCount: res.rowCount,
        hasData: res.rows.length > 0,
        timestamp: new Date().toISOString()
      });
    }
    
    return res;
  } catch (error) {
    // Always log errors, but sanitize sensitive information
    console.error('❌ [Database] Query error:', {
      error: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      query: isDevelopment ? (text.substring(0, 200) + (text.length > 200 ? '...' : '')) : '[Query hidden in production]',
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Get database connection pool
export const getPool = () => pool;

// Close database connection
export const closePool = async () => {
  await pool.end();
  console.log('Database pool closed');
};

export default pool;

