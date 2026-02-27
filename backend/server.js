import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import sitesRoutes from './routes/sites.js';
import dashboardRoutes from './routes/dashboard.js';
import petrolDataSageRoutes from './routes/petrolDataSage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:9090';
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  'http://localhost:9090',
  'http://localhost:8080',
];

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (curl/postman) and same-origin requests.
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  console.log('🌐 [Server] Incoming request:', {
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
    timestamp: new Date().toISOString()
  });
  
  // Log response when it's sent
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log('📤 [Server] Sending response:', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      dataSize: typeof data === 'string' ? data.length : JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    });
    return originalSend.call(this, data);
  };
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        currentTime: result.rows[0].current_time,
        version: result.rows[0].db_version.split(' ')[0] + ' ' + result.rows[0].db_version.split(' ')[1]
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// API Routes
app.use('/api/sites', sitesRoutes);
// Sage schema petrol-data (transactions-only) - mount before dashboard so it overrides petrol-data/* routes
app.use('/api/dashboard/petrol-data', petrolDataSageRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Petroleum Dashboard API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      sites: '/api/sites',
      dashboard: '/api/dashboard'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ [Server] Error handler triggered:', {
    error: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
  console.log(`💾 Database: ${process.env.DB_NAME || 'petroleum_db'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

export default app;

