import { Router, Request, Response } from 'express';
import { requireAuth, asyncHandler } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { authService } = await import('../services/auth.service');
  const devices = await authService.getDevicesByUser(req.user!.id);
  res.json(devices);
}));

router.get('/:id/key', asyncHandler(async (req: Request, res: Response) => {
  const { authService } = await import('../services/auth.service');
  const deviceId = String(req.params.id);
  const apiKey = await authService.getDeviceApiKey(req.user!.id, deviceId);
  if (!apiKey) return res.status(404).json({ message: 'Device not found' });
  res.json({ apiKey });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { authService } = await import('../services/auth.service');
  const deviceId = String(req.params.id);
  await authService.revokeDevice(deviceId, req.user!.id);
  res.json({ success: true });
}));

export default router;
