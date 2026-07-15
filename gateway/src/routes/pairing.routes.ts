import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { queryOne, queryAll, execute } from '../db';
import { requireAuth, asyncHandler } from '../middleware/auth';
import { broadcastToUser } from '../services/ws.service';
import { authService } from '../services/auth.service';

const router = Router();

const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many pairing attempts' },
});

function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

router.post('/generate', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const pendingTokens = await queryAll(
    'SELECT id FROM pairing_tokens WHERE user_id = ? AND is_used = 0 AND expires_at > datetime(\'now\')',
    [req.user!.id]
  );
  for (const pt of pendingTokens) {
    await execute('DELETE FROM pairing_tokens WHERE id = ?', [pt.id]);
  }

  const id = crypto.randomUUID();
  const code = generatePairingCode();
  const gatewayUrl = `${req.protocol}://${req.get('host')}`;

  const userProfile = await queryOne('SELECT name, email FROM users WHERE id = ?', [req.user!.id]);
  const userName = userProfile?.name || 'مستخدم';
  const userEmail = userProfile?.email || '';

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await execute(
    `INSERT INTO pairing_tokens (id, user_id, code, gateway_url, user_name, user_email, is_used, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, req.user!.id, code, gatewayUrl, userName, userEmail, expiresAt]
  );

  res.json({
    code,
    gatewayUrl,
    userName,
    userEmail,
    expiresIn: 300,
  });
}));

router.get('/status/:code', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;

  if (!code || typeof code !== 'string' || code.length < 4 || code.length > 10) {
    return res.status(400).json({ message: 'Invalid code format' });
  }

  const token = await queryOne(
    'SELECT * FROM pairing_tokens WHERE code = ? AND user_id = ?',
    [code, req.user!.id]
  );

  if (!token) {
    return res.json({ status: 'not_found' });
  }

  const expiresAt = new Date(token.expires_at);
  if (expiresAt < new Date()) {
    return res.json({ status: 'expired' });
  }

  if (token.is_used) {
    return res.json({ status: 'paired' });
  }

  res.json({ status: 'waiting' });
}));

router.post('/scan', scanLimiter, requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'كود الربط مطلوب' });
  }

  // Validate code format
  if (!/^[A-Z0-9]{4,10}$/i.test(code.trim())) {
    return res.status(400).json({ message: 'صيغة كود الربط غير صحيحة' });
  }

  const pairingToken = await queryOne(
    'SELECT * FROM pairing_tokens WHERE code = ? AND is_used = 0',
    [code.trim().toUpperCase()]
  );

  if (!pairingToken) {
    return res.status(404).json({ message: 'كود الربط غير صالح أو غير موجود' });
  }

  const expiresAt = new Date(pairingToken.expires_at);
  if (expiresAt < new Date()) {
    return res.status(410).json({ message: 'انتهت صلاحية كود الربط' });
  }

  if (pairingToken.user_id !== req.user!.id) {
    return res.status(403).json({ message: 'هذا الكود مخصص لحساب آخر' });
  }

  await execute('UPDATE pairing_tokens SET is_used = 1 WHERE id = ?', [pairingToken.id]);

  const deviceInfo = {
    deviceName: req.body.deviceName || 'Mobile Device',
    deviceModel: req.body.deviceModel || 'Unknown',
    osName: req.body.osName || 'Unknown',
    osVersion: req.body.osVersion || '',
    appVersion: req.body.appVersion || '1.0.0',
    serialNumber: req.body.serialNumber || `qr_${Date.now()}`,
    ipAddress: req.ip || req.socket?.remoteAddress || '',
  };

  const device = await authService.findOrCreateDevice(req.user!.id, deviceInfo);

  const connectors = (await queryAll(
    'SELECT * FROM connectors WHERE user_id = ? ORDER BY created_at DESC',
    [req.user!.id]
  ) as any[]).map(c => {
    const { auth_config, ...safe } = c;
    return safe;
  });

  const userProfile = await queryOne(
    'SELECT id, email, name, role FROM users WHERE id = ?',
    [req.user!.id]
  );

  broadcastToUser(req.user!.id, {
    type: 'DEVICE_PAIRED',
    deviceId: device.id,
    deviceName: deviceInfo.deviceName,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    apiKey: device.apiKey,
    deviceId: device.id,
    user: userProfile,
    connectors,
  });
}));

router.post('/revoke', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required' });
  }

  await execute(
    'DELETE FROM pairing_tokens WHERE code = ? AND user_id = ?',
    [code.trim().toUpperCase(), req.user!.id]
  );

  res.json({ success: true });
}));

router.post('/unpair', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.body;

  if (deviceId) {
    await execute('DELETE FROM devices WHERE id = ? AND user_id = ?', [deviceId, req.user!.id]);
  }

  await execute(
    'DELETE FROM pairing_tokens WHERE user_id = ?',
    [req.user!.id]
  );

  broadcastToUser(req.user!.id, {
    type: 'DEVICE_UNPAIRED',
    deviceId,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true });
}));

export default router;
