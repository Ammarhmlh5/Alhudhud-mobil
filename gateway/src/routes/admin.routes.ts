import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAdmin, asyncHandler } from '../middleware/auth';
import { queryOne, queryAll, execute } from '../db';
import { authService } from '../services/auth.service';

const router = Router();

router.use(requireAdmin);

// ─── Helper: validate and cap limit parameter ───────────────

function validateLimit(limit: unknown, defaultLimit = 50, maxLimit = 100): number {
  const parsed = parseInt(String(limit || defaultLimit), 10);
  if (isNaN(parsed)) return defaultLimit;
  return Math.min(Math.max(parsed, 1), maxLimit);
}

// ─── Routes ─────────────────────────────────────────────────

router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  res.json(await authService.getStats());
}));

router.get('/accounts', asyncHandler(async (req: Request, res: Response) => {
  const limit = validateLimit(req.query.limit);
  const users = await queryAll(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at, s.plan, s.status as sub_status
     FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id
     ORDER BY u.created_at DESC LIMIT ?`,
    [limit]
  );
  res.json(users);
}));

router.patch('/accounts/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive يجب أن يكون boolean' });
  }

  await authService.toggleUserStatus(String(req.params.id), isActive);
  res.json({ success: true });
}));

router.get('/logs', asyncHandler(async (req: Request, res: Response) => {
  const limit = validateLimit(req.query.limit);
  const logs = await queryAll(`
    SELECT ml.*, u.email, c.name as connector_name
    FROM message_logs ml
    LEFT JOIN users u ON ml.user_id = u.id
    LEFT JOIN connectors c ON ml.connector_id = c.id
    ORDER BY ml.created_at DESC LIMIT ?
  `, [limit]);

  res.json(logs);
}));

router.get('/webhooks', asyncHandler(async (req: Request, res: Response) => {
  const limit = validateLimit(req.query.limit);
  const events = await queryAll(`
    SELECT we.*, u.email, c.name as connector_name
    FROM webhook_events we
    LEFT JOIN users u ON we.user_id = u.id
    LEFT JOIN connectors c ON we.connector_id = c.id
    ORDER BY we.created_at DESC LIMIT ?
  `, [limit]);

  res.json(events);
}));

router.get('/connectors', asyncHandler(async (req: Request, res: Response) => {
  const limit = validateLimit(req.query.limit);
  const connectors = await queryAll(`
    SELECT c.*, u.email as user_email
    FROM connectors c
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC LIMIT ?
  `, [limit]);

  res.json(connectors);
}));

router.get('/presets', (_req: Request, res: Response) => {
  const presets = [
    { id: 'whatsapp', name: 'WhatsApp Business API', platformType: 'Messaging', protocol: 'REST', authType: 'BEARER', description: 'إرسال واستقبال رسائل WhatsApp عبر API الأعمال' },
    { id: 'telegram', name: 'Telegram Bot', platformType: 'Messaging', protocol: 'REST', authType: 'NONE', description: 'إرسال رسائل واستقبال أوامر من بوت Telegram' },
    { id: 'slack', name: 'Slack Webhook', platformType: 'Messaging', protocol: 'REST', authType: 'NONE', description: 'إرسال إشعارات إلى قنوات Slack' },
    { id: 'twilio-sms', name: 'Twilio SMS', platformType: 'Messaging', protocol: 'REST', authType: 'BASIC', description: 'إرسال رسائل SMS عبر Twilio API' },
    { id: 'discord', name: 'Discord Webhook', platformType: 'Messaging', protocol: 'REST', authType: 'NONE', description: 'إرسال رسائل إلى قنوات Discord' },
    { id: 'rest-basic', name: 'API عام (REST)', platformType: 'Custom', protocol: 'REST', authType: 'NONE', description: 'اتصال بأي REST API مخصص' },
    { id: 'websocket-basic', name: 'WebSocket عام', platformType: 'Custom', protocol: 'WebSocket', authType: 'NONE', description: 'اتصال مباشر بأي خادم WebSocket' },
    { id: 'google-sheets', name: 'Google Sheets API', platformType: 'Productivity', protocol: 'REST', authType: 'OAUTH2', description: 'قراءة وكتابة جداول Google Sheets' },
    { id: 'github', name: 'GitHub API', platformType: 'Development', protocol: 'REST', authType: 'BEARER', description: 'الوصول إلى GitHub repositories، issues، PRs' },
    { id: 'notion', name: 'Notion API', platformType: 'Productivity', protocol: 'REST', authType: 'BEARER', description: 'إدارة قواعد بيانات وصفحات Notion' },
  ];
  res.json(presets);
});

router.get('/devices', asyncHandler(async (_req: Request, res: Response) => {
  const devices = await authService.getAllDevices();
  res.json(devices);
}));

router.delete('/devices/:id', asyncHandler(async (req: Request, res: Response) => {
  const device = await queryOne('SELECT * FROM devices WHERE id = ?', [req.params.id]);
  if (!device) return res.status(404).json({ message: 'Device not found' });

  await execute('DELETE FROM devices WHERE id = ?', [req.params.id]);
  await execute(
    `INSERT INTO message_logs (id, user_id, direction, status, payload) VALUES (?, ?, 'ADMIN', 'SUCCESS', ?)`,
    [crypto.randomUUID(), req.user!.id, JSON.stringify({ action: 'delete_device', target: req.params.id, target_user: device.user_id })]
  );
  res.json({ success: true });
}));

export default router;
