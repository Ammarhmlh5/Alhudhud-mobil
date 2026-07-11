import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { queryOne, execute } from '../db';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }
    const user = await authService.register(email, password, name);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
});

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token مطلوب' });
    }
    const result = await authService.googleLogin(idToken);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

router.get('/profile', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const decoded = authService.verifyToken(token);
  if (!decoded) return res.status(401).json({ message: 'Invalid token' });

  const profile = await authService.getProfile(decoded.id);
  if (!profile) return res.status(404).json({ message: 'User not found' });

  res.json(profile);
});

router.get('/subscription', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const decoded = authService.verifyToken(token);
  if (!decoded) return res.status(401).json({ message: 'Invalid token' });

  const sub = await queryOne('SELECT * FROM subscriptions WHERE user_id = ?', [decoded.id]);
  res.json(sub || { plan: 'free', status: 'active' });
});

router.put('/subscription', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const decoded = authService.verifyToken(token);
  if (!decoded) return res.status(401).json({ message: 'Invalid token' });

  const { plan } = req.body;
  if (!plan) return res.status(400).json({ message: 'plan is required' });

  const validPlans = ['free', 'starter', 'business'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ message: `Invalid plan. Must be one of: ${validPlans.join(', ')}` });
  }

  await execute('UPDATE subscriptions SET plan = ?, status = ? WHERE user_id = ?', [plan, 'active', decoded.id]);
  const updated = await queryOne('SELECT * FROM subscriptions WHERE user_id = ?', [decoded.id]);
  res.json(updated);
});

export default router;
