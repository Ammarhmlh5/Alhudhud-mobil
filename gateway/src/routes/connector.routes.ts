import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { queryOne, queryAll, execute, executeBatch } from '../db';
import { requireAuth, asyncHandler } from '../middleware/auth';

const router = Router();
const MAX_SYNC_ARRAY = 50;

function sanitizeConnectorInput(c: any): Record<string, any> {
  return {
    name: String(c.name || '').slice(0, 200),
    platform_type: String(c.platform_type || 'custom').slice(0, 50),
    protocol: String(c.protocol || 'REST').slice(0, 20),
    endpoint_url: String(c.endpoint_url || '').slice(0, 2000),
    http_method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(c.http_method) ? c.http_method : 'POST',
    headers: typeof c.headers === 'string' ? c.headers.slice(0, 10000) : '{}',
    auth_type: String(c.auth_type || 'NONE').slice(0, 20),
    auth_config: typeof c.auth_config === 'string' ? c.auth_config.slice(0, 10000) : '{}',
    data_mapping: c.data_mapping ? String(c.data_mapping).slice(0, 10000) : null,
    sync_interval: typeof c.sync_interval === 'number' && c.sync_interval > 0 ? Math.min(c.sync_interval, 10080) : null,
    is_active: c.is_active !== undefined ? Boolean(c.is_active) : true,
    last_status: String(c.last_status || 'UNKNOWN').slice(0, 20),
  };
}

router.use(requireAuth);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const connectors = await queryAll(
    'SELECT * FROM connectors WHERE user_id = ? ORDER BY created_at DESC',
    [req.user!.id]
  );
  res.json(connectors);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const connector = await queryOne(
    'SELECT * FROM connectors WHERE id = ? AND user_id = ?',
    [req.params.id, req.user!.id]
  );
  if (!connector) return res.status(404).json({ message: 'Connector not found' });
  res.json(connector);
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await queryOne(
    'SELECT id FROM connectors WHERE id = ? AND user_id = ?',
    [id, req.user!.id]
  );
  if (!existing) return res.status(404).json({ message: 'Connector not found' });

  const c = sanitizeConnectorInput(req.body);
  await execute(`
    UPDATE connectors SET
      name = ?, platform_type = ?, protocol = ?, endpoint_url = ?,
      http_method = ?, headers = ?, auth_type = ?, auth_config = ?,
      data_mapping = ?, sync_interval = ?, is_active = ?, last_status = ?,
      updated_at = NOW()
    WHERE id = ? AND user_id = ?
  `, [
    c.name, c.platform_type, c.protocol, c.endpoint_url,
    c.http_method, c.headers, c.auth_type,
    c.auth_config, c.data_mapping,
    c.sync_interval,
    c.is_active,
    c.last_status,
    id, req.user!.id,
  ]);

  const updated = await queryOne(
    'SELECT * FROM connectors WHERE id = ? AND user_id = ?',
    [id, req.user!.id]
  );
  res.json(updated);
}));

router.post('/sync', asyncHandler(async (req: Request, res: Response) => {
  const { connectors } = req.body;

  if (!Array.isArray(connectors)) {
    return res.status(400).json({ message: 'connectors must be an array' });
  }

  if (connectors.length > MAX_SYNC_ARRAY) {
    return res.status(400).json({ message: `Max ${MAX_SYNC_ARRAY} connectors per sync` });
  }

  const existingRows = await queryAll(
    'SELECT id FROM connectors WHERE user_id = ?',
    [req.user!.id]
  );
  const existingIds = new Set(existingRows.map((r: any) => r.id));

  const statements: Array<{ sql: string; params: any[] }> = [];
  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const raw of connectors) {
    try {
      const c = sanitizeConnectorInput(raw);
      const id = raw.id || crypto.randomUUID();

      if (existingIds.has(raw.id)) {
        statements.push({
          sql: `UPDATE connectors SET
            name = ?, platform_type = ?, protocol = ?, endpoint_url = ?,
            http_method = ?, headers = ?, auth_type = ?, auth_config = ?,
            data_mapping = ?, sync_interval = ?, is_active = ?, last_status = ?,
            updated_at = NOW()
          WHERE id = ? AND user_id = ?`,
          params: [
            c.name, c.platform_type, c.protocol, c.endpoint_url,
            c.http_method, c.headers, c.auth_type,
            c.auth_config, c.data_mapping,
            c.sync_interval,
            c.is_active,
            c.last_status,
            raw.id, req.user!.id,
          ],
        });
        results.push({ id: raw.id, status: 'UPDATED' });
      } else {
        statements.push({
          sql: `INSERT INTO connectors (id, user_id, name, platform_type, protocol, endpoint_url,
            http_method, headers, auth_type, auth_config, data_mapping, sync_interval,
            is_active, last_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          params: [
            id, req.user!.id, c.name, c.platform_type, c.protocol,
            c.endpoint_url, c.http_method, c.headers,
            c.auth_type, c.auth_config, c.data_mapping,
            c.sync_interval,
            c.is_active,
            c.last_status,
          ],
        });
        results.push({ id, status: 'CREATED' });
      }
    } catch (error: any) {
      results.push({ id: raw.id || 'unknown', status: 'FAILED', error: error.message });
    }
  }

  if (statements.length > 0) {
    await executeBatch(statements);
  }

  res.json({ results });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const existing = await queryOne(
    'SELECT id FROM connectors WHERE id = ? AND user_id = ?',
    [req.params.id, req.user!.id]
  );
  if (!existing) {
    return res.status(404).json({ error: 'Connector not found' });
  }
  await execute(
    'DELETE FROM connectors WHERE id = ? AND user_id = ?',
    [req.params.id, req.user!.id]
  );
  res.json({ success: true });
}));

export default router;
