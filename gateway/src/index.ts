import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { initDb } from './db';
import authRoutes from './routes/auth.routes';
import webhookRoutes from './routes/webhook.routes';
import adminRoutes from './routes/admin.routes';
import syncRoutes from './routes/sync.routes';
import connectorRoutes from './routes/connector.routes';
import deviceRoutes from './routes/device.routes';
import pairingRoutes from './routes/pairing.routes';
import { initWebSocket } from './services/ws.service';
import { startSyncScheduler } from './services/sync-scheduler.service';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ─── CORS ───────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [];

if (allowedOrigins.length > 0) {
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));
} else if (process.env.NODE_ENV === 'production') {
  app.use(cors({ origin: false }));
} else {
  app.use(cors());
}

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─── Rate Limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
  keyGenerator: (req) => {
    return String(req.ip || req.socket.remoteAddress || 'unknown');
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
  keyGenerator: (req) => {
    return String(req.ip || req.socket.remoteAddress || 'unknown');
  },
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Webhook rate limit exceeded' },
  keyGenerator: (req) => {
    return String(req.params.connectorId || req.ip || 'unknown');
  },
});

app.use(globalLimiter);

// ─── Security Headers ──────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ─── HTTPS Enforcement (production only, skipped behind reverse proxy) ──────
if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY !== 'true') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && req.protocol !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ─── Health Check (before rate limiting) ────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── Routes ─────────────────────────────────────────────────
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Admin rate limit exceeded' },
  keyGenerator: (req) => {
    return String(req.ip || req.socket.remoteAddress || 'unknown');
  },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/webhook', webhookLimiter, webhookRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/pairing', pairingRoutes);

// ─── Setup Status ───────────────────────────────────────────
app.get('/api/setup/status', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
  });
});

// ─── Static Files ───────────────────────────────────────────
app.use('/dashboard', express.static(path.join(__dirname, '../web')));
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

app.get('/setup', (_req, res) => {
  res.sendFile(path.join(__dirname, '../web/setup.html'));
});

// ─── Global Error Handler ───────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { details: err.message } : {}),
  });
});

// ─── Server Start ───────────────────────────────────────────
const server = http.createServer(app);

initDb().then(() => {
  initWebSocket(server);
  startSyncScheduler();
  server.listen(PORT, () => {
    console.log(`\n  🚀 AlHudhud Gateway`);
    console.log(`  ═══════════════════`);
    console.log(`  📡 REST:      http://localhost:${PORT}/api`);
    console.log(`  📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`  🔌 Webhook:   http://localhost:${PORT}/api/webhook/:connectorId`);
    console.log(`  🔗 WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`  ❤️  Health:    http://localhost:${PORT}/health`);
    if (allowedOrigins.length > 0) {
      console.log(`  🔒 CORS:      ${allowedOrigins.join(', ')}`);
    } else {
      console.log(`  ⚠️  CORS:      All origins (set CORS_ORIGINS for production)`);
    }
    console.log('');
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
