import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { initDb } from './db';
import authRoutes from './routes/auth.routes';
import webhookRoutes from './routes/webhook.routes';
import adminRoutes from './routes/admin.routes';
import syncRoutes from './routes/sync.routes';
import connectorRoutes from './routes/connector.routes';
import { initWebSocket } from './services/ws.service';
import { startSyncScheduler } from './services/sync-scheduler.service';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/connectors', connectorRoutes);

app.get('/api/setup/status', (_req, res) => {
  res.json({
    database: 'SQLite (local)',
    supabase: process.env.SUPABASE_URL ? 'configured' : 'not configured',
    message: 'Gateway is running on SQLite. To migrate to Supabase, visit /dashboard for instructions.',
  });
});

// Serve developer dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../web')));
app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '../web/index.html'));
});

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
    console.log(`  🔗 WebSocket: ws://localhost:${PORT}/ws?token=YOUR_TOKEN`);
    console.log(`  ❤️  Health:    http://localhost:${PORT}/health\n`);
  });
});
