import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { execute, executeBatch, queryAll } from '../db';
import { requireAuth, requireDeviceKey, asyncHandler } from '../middleware/auth';
import { broadcastToUser } from '../services/ws.service';

const router = Router();

router.use(requireAuth);
router.use(requireDeviceKey);

router.post('/push', asyncHandler(async (req: Request, res: Response) => {
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ message: 'events must be a non-empty array' });
  }

  const results: Array<{ id: string; status: string; error?: string }> = [];
  const batch: Array<{ sql: string; params: any[] }> = [];

  for (const event of events) {
    try {
      if (!event.table || !event.rowId || !event.operation) {
        results.push({ id: event.id, status: 'FAILED', error: 'Missing required fields: table, rowId, operation' });
        continue;
      }

      const syncId = crypto.randomUUID();
      const logId = crypto.randomUUID();

      batch.push({
        sql: 'INSERT INTO sync_queue (id, user_id, table_name, row_id, operation, data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [syncId, req.user!.id, event.table, event.rowId, event.operation, JSON.stringify(event.data), 'SYNCED'],
      });
      batch.push({
        sql: 'INSERT INTO message_logs (id, user_id, connector_id, direction, status, payload) VALUES (?, ?, ?, ?, ?, ?)',
        params: [logId, req.user!.id, null, 'SENT', 'SUCCESS', JSON.stringify(event.data)],
      });

      results.push({ id: event.id || syncId, status: 'SUCCESS' });
    } catch (error: any) {
      results.push({ id: event.id, status: 'FAILED', error: error.message });
    }
  }

  if (batch.length > 0) {
    await executeBatch(batch);
  }

  res.json({ results });
}));

router.get('/pull', asyncHandler(async (req: Request, res: Response) => {
  const since = req.query.since as string;

  let query = "SELECT * FROM sync_queue WHERE user_id = ? AND status = 'PENDING' ORDER BY created_at ASC";
  const params: any[] = [req.user!.id];

  if (since) {
    query = 'SELECT * FROM sync_queue WHERE user_id = ? AND created_at > ? AND status = \'PENDING\' ORDER BY created_at ASC';
    params.push(since);
  }

  const items = await queryAll(query, params);
  res.json(items);
}));

router.post('/pull/confirm', asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids must be a non-empty array' });
  }

  const statements = ids.map((id: string) => ({
    sql: "UPDATE sync_queue SET status = 'SYNCED' WHERE id = ? AND user_id = ?",
    params: [id, req.user!.id],
  }));

  await executeBatch(statements);

  res.json({ success: true, confirmed: ids.length });
}));

router.post('/connectors/sync', asyncHandler(async (req: Request, res: Response) => {
  const connectors = await queryAll('SELECT * FROM connectors WHERE user_id = ?', [req.user!.id]);

  broadcastToUser(req.user!.id, {
    type: 'SYNC_REQUEST',
    connectors: connectors.map((c: any) => ({ id: c.id, name: c.name })),
  });

  res.json({ success: true, message: 'Sync requested' });
}));

export default router;
