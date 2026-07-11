import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { queryOne, queryAll, execute } from '../db';
import { authService } from '../services/auth.service';

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

router.get('/', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const connectors = await queryAll('SELECT * FROM connectors WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  res.json(connectors);
});

router.get('/:id', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const connector = await queryOne('SELECT * FROM connectors WHERE id = ? AND user_id = ?', [req.params.id, user.id]);
  if (!connector) return res.status(404).json({ message: 'Connector not found' });
  res.json(connector);
});

router.put('/:id', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const existing = await queryOne('SELECT id FROM connectors WHERE id = ? AND user_id = ?', [id, user.id]);
  if (!existing) return res.status(404).json({ message: 'Connector not found' });

  const c = req.body;
  await execute(`
    UPDATE connectors SET
      name = ?, platform_type = ?, protocol = ?, endpoint_url = ?,
      http_method = ?, headers = ?, auth_type = ?, auth_config = ?,
      data_mapping = ?, sync_interval = ?, is_active = ?, last_status = ?,
      updated_at = NOW()
    WHERE id = ? AND user_id = ?
  `, [
    c.name, c.platform_type, c.protocol, c.endpoint_url,
    c.http_method || 'POST', c.headers || '{}', c.auth_type || 'NONE',
    c.auth_config || '{}', c.data_mapping || null, c.sync_interval || null,
    c.is_active !== undefined ? c.is_active : true,
    c.last_status || 'UNKNOWN',
    id, user.id,
  ]);

  const updated = await queryOne('SELECT * FROM connectors WHERE id = ? AND user_id = ?', [id, user.id]);
  res.json(updated);
});

router.post('/sync', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { connectors } = req.body;

  if (!Array.isArray(connectors)) {
    return res.status(400).json({ message: 'connectors must be an array' });
  }

  const results: any[] = [];

  for (const c of connectors) {
    try {
      const existing = await queryOne('SELECT id FROM connectors WHERE id = ? AND user_id = ?', [c.id, user.id]);

      if (existing) {
        await execute(`
          UPDATE connectors SET
            name = ?, platform_type = ?, protocol = ?, endpoint_url = ?,
            http_method = ?, headers = ?, auth_config = ?, data_mapping = ?,
            sync_interval = ?, is_active = ?, last_status = ?,
            updated_at = NOW()
          WHERE id = ? AND user_id = ?
        `, [
          c.name, c.platform_type, c.protocol, c.endpoint_url,
          c.http_method || 'POST', c.headers || '{}', c.auth_config || '{}',
          c.data_mapping || null, c.sync_interval || null,
          c.is_active !== undefined ? c.is_active : true,
          c.last_status || 'UNKNOWN',
          c.id, user.id,
        ]);
        results.push({ id: c.id, status: 'UPDATED' });
      } else {
        await execute(`
          INSERT INTO connectors (id, user_id, name, platform_type, protocol, endpoint_url,
            http_method, headers, auth_config, data_mapping, sync_interval,
            is_active, last_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          c.id || crypto.randomUUID(), user.id, c.name, c.platform_type, c.protocol,
          c.endpoint_url, c.http_method || 'POST', c.headers || '{}',
          c.auth_config || '{}', c.data_mapping || null, c.sync_interval || null,
          c.is_active !== undefined ? c.is_active : true,
          c.last_status || 'UNKNOWN',
        ]);
        results.push({ id: c.id, status: 'CREATED' });
      }
    } catch (error: any) {
      results.push({ id: c.id, status: 'FAILED', error: error.message });
    }
  }

  res.json({ results });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  await execute('DELETE FROM connectors WHERE id = ? AND user_id = ?', [id, user.id]);
  res.json({ success: true });
});

export default router;
