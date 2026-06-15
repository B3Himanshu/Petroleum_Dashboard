import './config/loadEnv.js';
import express from 'express';
import cors from 'cors';
import pool from './config/database.js';
import sitesRoutes from './routes/sites.js';
import dashboardRoutes from './routes/dashboard.js';
import petrolDataSageRoutes from './routes/petrolDataSage.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import { requireUserOrAdmin } from './middleware/auth.js';
import { bootstrapAdminIfNeeded } from './lib/bootstrapAuth.js';
import { getFrontendBaseUrl, getFrontendOriginForCors } from './lib/frontendUrl.js';

const app = express();
const PORT = process.env.PORT || 2000;

/** Same DEV_TUNNEL_HOST as backend .env (URL or hostname) → allow CORS for tunnel frontend. */
function tunnelOriginsFromEnv() {
  const raw = (process.env.DEV_TUNNEL_HOST || '').trim();
  if (!raw) return [];
  let host;
  try {
    if (/^https?:\/\//i.test(raw)) host = new URL(raw).hostname;
    else host = raw.replace(/^\/\//, '').split('/')[0].split(':')[0].trim();
  } catch {
    return [];
  }
  if (!host) return [];
  return [`https://${host}`, `http://${host}`];
}

const STATIC_ALLOWED_ORIGINS = [
  'http://localhost:9090',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:9090',
  ...tunnelOriginsFromEnv(),
];

/** Cloudflare Quick Tunnel frontends (*.trycloudflare.com) — same as Vite allowedHosts. */
function isTryCloudflareTunnelOrigin(origin) {
  try {
    const u = new URL(origin);
    return (
      (u.protocol === 'https:' || u.protocol === 'http:') &&
      u.hostname.endsWith('.trycloudflare.com')
    );
  } catch {
    return false;
  }
}

// In dev, allow any trycloudflare tunnel URL (subdomain changes each run). Production: set ALLOW_TRY_CLOUDFLARE_CORS=1 or DEV_TUNNEL_HOST.
const allowTryCloudflareCors =
  process.env.ALLOW_TRY_CLOUDFLARE_CORS === '1' ||
  process.env.NODE_ENV !== 'production';

/** Comma-separated extra allowed origins (full origins, e.g. https://dashboard.example.com). */
function extraAllowedOriginsFromEnv() {
  const raw = (process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_EXTRA_ORIGINS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => {
      const t = s.trim().replace(/\/$/, '');
      if (!t) return '';
      try {
        if (/^https?:\/\//i.test(t)) return new URL(t).origin;
      } catch {
        return '';
      }
      return t;
    })
    .filter(Boolean);
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (STATIC_ALLOWED_ORIGINS.includes(origin)) return true;
  const extras = extraAllowedOriginsFromEnv();
  if (extras.includes(origin)) return true;
  try {
    if (origin === getFrontendBaseUrl()) return true;
  } catch {
    /* ignore */
  }
  try {
    const feOrigin = getFrontendOriginForCors();
    if (feOrigin && origin === feOrigin) return true;
  } catch {
    /* ignore */
  }
  if (allowTryCloudflareCors && isTryCloudflareTunnelOrigin(origin)) return true;
  return false;
}

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  })
);
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

/** Public UI flags from env (runtime). Docker/live: set DARK_MODE_TOGGLE=false in backend/.env + env_file on container. */
app.get('/api/ui-config', (req, res) => {
  const raw = process.env.DARK_MODE_TOGGLE;
  const darkModeToggle = String(raw ?? 'true').trim().toLowerCase() !== 'false';
  res.json({ darkModeToggle });
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
        version: (result.rows?.[0]?.db_version ?? '').split(' ').slice(0, 2).join(' ') || 'unknown'
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

// Public auth
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Protected dashboard APIs (dashboard user JWT or admin JWT — admin can open /dashboard from /admin)
app.use('/api/sites', requireUserOrAdmin, sitesRoutes);
// Sage schema petrol-data (transactions-only) - mount before dashboard so it overrides petrol-data/* routes
app.use('/api/dashboard/petrol-data', requireUserOrAdmin, petrolDataSageRoutes);
app.use('/api/dashboard', requireUserOrAdmin, dashboardRoutes);

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

// Start server (bootstrap admin after DB migration if configured)
async function startServer() {
  await bootstrapAdminIfNeeded();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend URL (email links): ${getFrontendBaseUrl()}`);
    console.log(`💾 Database: ${process.env.DB_NAME || 'petroleum_db'}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
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

