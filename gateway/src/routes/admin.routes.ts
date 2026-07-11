import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { queryAll } from '../db';

const router = Router();

function requireAdmin(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const decoded = authService.verifyToken(token);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  (req as any).user = decoded;
  next();
}

router.use(requireAdmin);

router.get('/stats', async (_req: Request, res: Response) => {
  res.json(await authService.getStats());
});

router.get('/accounts', async (_req: Request, res: Response) => {
  const users = await authService.getAllUsers();
  res.json(users);
});

router.patch('/accounts/:id/status', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive يجب أن يكون boolean' });
  }

  await authService.toggleUserStatus(id, isActive);
  res.json({ success: true });
});

router.get('/logs', async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 50;
  const logs = await queryAll(`
    SELECT ml.*, u.email, c.name as connector_name
    FROM message_logs ml
    LEFT JOIN users u ON ml.user_id = u.id
    LEFT JOIN connectors c ON ml.connector_id = c.id
    ORDER BY ml.created_at DESC LIMIT ?
  `, [limit]);

  res.json(logs);
});

router.get('/webhooks', async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 50;
  const events = await queryAll(`
    SELECT we.*, u.email, c.name as connector_name
    FROM webhook_events we
    LEFT JOIN users u ON we.user_id = u.id
    LEFT JOIN connectors c ON we.connector_id = c.id
    ORDER BY we.created_at DESC LIMIT ?
  `, [limit]);

  res.json(events);
});

router.get('/connectors', async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 100;
  const connectors = await queryAll(`
    SELECT c.*, u.email as user_email
    FROM connectors c
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC LIMIT ?
  `, [limit]);

  res.json(connectors);
});

export default router;
