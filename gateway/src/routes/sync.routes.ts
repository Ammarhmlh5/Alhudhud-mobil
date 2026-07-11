import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { execute, executeBatch, queryAll } from '../db';
import { authService } from '../services/auth.service';
import { broadcastToUser } from '../services/ws.service';

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const decoded = authService.verifyToken(token);
  if (!decoded) return res.status(401).json({ message: 'Invalid token' });

  (req as any).user = decoded;
  next();
}

router.use(requireAuth);

router.post('/push', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { events } = req.body;

  const results: any[] = [];
  const batch: Array<{ sql: string; params: any[] }> = [];

  for (const event of events || []) {
    try {
      const syncId = crypto.randomUUID();
      const logId = crypto.randomUUID();

      batch.push({
        sql: 'INSERT INTO sync_queue (id, user_id, table_name, row_id, operation, data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [syncId, user.id, event.table, event.rowId, event.operation, JSON.stringify(event.data), 'SYNCED'],
      });
      batch.push({
        sql: 'INSERT INTO message_logs (id, user_id, connector_id, direction, status, payload) VALUES (?, ?, ?, ?, ?, ?)',
        params: [logId, user.id, null, 'SENT', 'SUCCESS', JSON.stringify(event.data)],
      });

      results.push({ id: event.id, status: 'SUCCESS' });
    } catch (error: any) {
      results.push({ id: event.id, status: 'FAILED', error: error.message });
    }
  }

  if (batch.length > 0) {
    await executeBatch(batch);
  }

  res.json({ results });
});

router.get('/pull', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const since = req.query.since as string;

  let query = "SELECT * FROM sync_queue WHERE user_id = ? AND status = 'PENDING' ORDER BY created_at ASC";
  const params: any[] = [user.id];

  if (since) {
    query = 'SELECT * FROM sync_queue WHERE user_id = ? AND created_at > ? ORDER BY created_at ASC';
    params.push(since);
  }

  const items = await queryAll(query, params);
  res.json(items);
});

router.post('/pull/confirm', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids must be a non-empty array' });
  }

  for (const id of ids) {
    await execute("UPDATE sync_queue SET status = 'SYNCED' WHERE id = ? AND user_id = ?", [id, user.id]);
  }

  res.json({ success: true, confirmed: ids.length });
});

router.post('/connectors/sync', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const connectors = await queryAll('SELECT * FROM connectors WHERE user_id = ?', [user.id]);

  broadcastToUser(user.id, {
    type: 'SYNC_REQUEST',
    connectors: connectors.map((c: any) => ({ id: c.id, name: c.name })),
  });

  res.json({ success: true, message: 'Sync requested' });
});

export default router;
