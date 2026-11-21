// ECONVYX AI - Master Express API Server
// Turn financial complexity into clarity.

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { CLIENT_ORIGINS } from './config.js';

// Load environment variables FIRST before any imports that read them
dotenv.config();

// Import Routes (after dotenv so env vars are available)
import authRouter from './routes/auth.js';
import workspacesRouter from './routes/workspaces.js';
import overviewRouter from './routes/overview.js';
import documentsRouter from './routes/documents.js';
import verificationRouter from './routes/verification.js';
import receivablesRouter from './routes/receivables.js';
import payablesRouter from './routes/payables.js';
import customersRouter from './routes/customers.js';
import suppliersRouter from './routes/suppliers.js';
import reconciliationRouter from './routes/reconciliation.js';
import cashflowRouter from './routes/cashflow.js';
import aiAssistantRouter from './routes/aiAssistant.js';
import remindersRouter from './routes/reminders.js';
import insightsRouter from './routes/insights.js';
import reportsRouter from './routes/reports.js';
import auditRouter from './routes/audit.js';
import settingsRouter from './routes/settings.js';
import notificationsRouter from './routes/notifications.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'))
  ? path.resolve(process.cwd(), 'dist')
  : path.resolve(__dirname, '..');

// Trust proxy when behind reverse proxy (e.g., Render, Vercel)
app.set('trust proxy', 1);

// Session store: use Supabase Postgres (via DATABASE_URL) in production,
// fall back to in-memory MemoryStore in test/dev when no DB URL is available.
function buildSessionStore() {
  const databaseUrl = process.env.DATABASE_URL;
  if (process.env.NODE_ENV !== 'test' && databaseUrl) {
    try {
      // Dynamic import so this doesn't break tests that have no DB
      const connectPgSimple = require('connect-pg-simple');
      const PgStore = connectPgSimple(session);
      return new PgStore({
        conString: databaseUrl,
        tableName: 'session',       // auto-created on first use
        createTableIfMissing: true, // creates the sessions table automatically
        ttl: 30 * 60,               // 30 minutes in seconds
        pruneSessionInterval: 60,   // cleanup expired sessions every 60s
      });
    } catch (err: any) {
      console.warn('[Session] connect-pg-simple unavailable, using MemoryStore:', err.message);
    }
  }
  return undefined; // Express falls back to MemoryStore
}

// Session configuration — 30-minute cookie, secure flags in production,
// Supabase Postgres as the persistent store when DATABASE_URL is set.
app.use(
  session({
    name: 'econvyx.sid',
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
    store: buildSessionStore(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: 'strict',
      maxAge: 30 * 60 * 1000, // 30 minutes
    },
  })
);


// Serve fingerprinted assets from dist/assets; return 404 for missing assets (never SPA fallback)
app.use('/assets', express.static(path.join(distPath, 'assets'), {
  maxAge: '1y',
  immutable: true,
}));
app.use('/assets', (_req, res) => {
  res.status(404).type('text/plain').send('Asset not found');
});

// Root static files (e.g. logo-icon.svg, favicon.ico, robots.txt)
app.use(express.static(distPath, {
  maxAge: '1h',
  setHeaders(res, filePath) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  },
}));

// 2. Restrictive API CORS: Only exact RENDER_EXTERNAL_URL, CLIENT_ORIGINS, and localhost
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (CLIENT_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // Gracefully omit CORS headers for untrusted origins without throwing a 500 error
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Ensure upload directory exists on startup
const uploadDir = path.resolve(process.env.STORAGE_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Uploaded documents are served only by authenticated, workspace-scoped routes.

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    product: 'ECONVYX AI',
    tagline: 'Turn financial complexity into clarity.',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Modular API Routes
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/overview', overviewRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/receivables', receivablesRouter);
app.use('/api/payables', payablesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/reconciliation', reconciliationRouter);
app.use('/api/cashflow', cashflowRouter);
app.use('/api/ai-assistant', aiAssistantRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/notifications', notificationsRouter);

// API 404 handler (ensures unknown API calls return JSON error rather than index.html)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: `API endpoint ${req.method} ${req.path} not found.`,
    code: 'NOT_FOUND',
  });
});

// SPA fallback: Return index.html with revalidation headers for all non-API/non-upload/non-asset GET routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/uploads') || req.path.startsWith('/assets')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(indexPath);
  } else {
    res.status(503).json({
      error: 'Frontend build not found. Please run "npm run build" before starting the server.',
      code: 'BUILD_REQUIRED',
    });
  }
});

// Centralized Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

import { db } from './db/database.js';

if (process.env.NODE_ENV !== 'test') {
  db.init().then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`=======================================================`);
      console.log(`🚀 ECONVYX AI Platform Backend is operational`);
      console.log(`⚡ Binding: ${HOST}:${PORT} | Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Tenant Isolation & Deterministic Engine: ACTIVE`);
      console.log(`=======================================================`);
    });
  }).catch((err) => {
    console.error('Failed to initialize database on startup:', err);
    process.exit(1);
  });
}

export default app;
