import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { queryOne, execute, queryAll } from '../db';
import { broadcastToUser } from '../services/ws.service';

const router = Router();

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

    const body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body?.toString() || '';
    const headers = JSON.stringify(req.headers);

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
    res.status(500).json({ error: error.message });
  }
});

router.get('/events/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const limit = Number(req.query.limit) || 50;

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
