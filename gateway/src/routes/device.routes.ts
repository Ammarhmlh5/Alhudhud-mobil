import { Router, Request, Response } from 'express';
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

router.get('/', async (_req: Request, res: Response) => {
  const user = (_req as any).user;
  const devices = await authService.getDevicesByUser(user.id);
  res.json(devices);
});

router.get('/:id/key', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const deviceId = String(req.params.id);
  const apiKey = await authService.getDeviceApiKey(user.id, deviceId);
  if (!apiKey) return res.status(404).json({ message: 'Device not found' });
  res.json({ apiKey });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const deviceId = String(req.params.id);
  await authService.revokeDevice(deviceId, user.id);
  res.json({ success: true });
});

export default router;
