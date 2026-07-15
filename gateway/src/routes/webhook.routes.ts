import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { queryOne, execute, queryAll } from '../db';
import { broadcastToUser } from '../services/ws.service';
import { requireAuth, asyncHandler } from '../middleware/auth';

const router = Router();

function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ─── Webhook Receiver (verified by connector ID + optional HMAC) ─

router.all('/:connectorId', async (req: Request, res: Response) => {
  const { connectorId } = req.params;
  const sourceIp = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    const connector = await queryOne('SELECT * FROM connectors WHERE id = ?', [connectorId]);
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    if (!connector.is_active) {
      return res.status(403).json({ error: 'Connector is disabled' });
    }

    // HMAC verification if connector has a webhook_secret configured
    const authConfig = JSON.parse(connector.auth_config || '{}');
    if (authConfig.webhook_secret) {
      const signature = req.headers['x-webhook-signature'] || req.headers['x-hub-signature-256'];
      if (!signature || typeof signature !== 'string') {
        return res.status(401).json({ error: 'Missing webhook signature' });
      }
      const rawBody = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body?.toString() || '';
      if (!verifyHmacSignature(rawBody, signature.replace('sha256=', ''), authConfig.webhook_secret)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body?.toString() || '';

    // Sanitize headers — remove sensitive headers
    const safeHeaders = { ...req.headers };
    delete safeHeaders.authorization;
    delete safeHeaders.cookie;
    const headers = JSON.stringify(safeHeaders);

    const eventId = crypto.randomUUID();
    await execute(`
      INSERT INTO webhook_events (id, connector_id, user_id, method, headers, body, source_ip)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [eventId, connectorId, connector.user_id, req.method, headers, body, sourceIp]);

    await execute("UPDATE connectors SET last_status = 'ONLINE' WHERE id = ?", [connectorId]);

    broadcastToUser(connector.user_id, {
      type: 'WEBHOOK_EVENT',
      connectorId,
      method: req.method,
      body,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, eventId });
  } catch (error: any) {
    console.error('[Webhook] Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Webhook Events (auth required) ────────────────────────

router.get('/events/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const events = await queryAll(`
    SELECT we.*, c.name as connector_name
    FROM webhook_events we
    LEFT JOIN connectors c ON we.connector_id = c.id
    WHERE we.user_id = ?
    ORDER BY we.created_at DESC LIMIT ?
  `, [userId, limit]);

  res.json(events);
}));

router.get('/events/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Basic auth check — verify the requesting user matches
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { authService } = await import('../services/auth.service');
  const decoded = authService.verifyToken(token);
  if (!decoded || decoded.id !== userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const events = await queryAll(`
    SELECT we.*, c.name as connector_name
    FROM webhook_events we
    LEFT JOIN connectors c ON we.connector_id = c.id
    WHERE we.user_id = ?
    ORDER BY we.created_at DESC LIMIT ?
  `, [userId, limit]);

  res.json(events);
});

export default router;
