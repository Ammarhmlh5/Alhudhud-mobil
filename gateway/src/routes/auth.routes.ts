import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { requireAuth, asyncHandler } from '../middleware/auth';
import { queryOne, execute } from '../db';

const router = Router();

// ─── Validation Schemas ─────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'كلمة المرور يجب أن تحتوي حرف كبير واحد على الأقل')
    .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي رقم واحد على الأقل'),
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100),
  deviceInfo: z.object({
    serialNumber: z.string().optional(),
    ipAddress: z.string().optional(),
    deviceName: z.string().optional(),
    deviceModel: z.string().optional(),
    osName: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }).optional(),
});

const loginSchema = z.object({
  email: z.string().email('صيغة البريد الإلكتروني غير صحيحة'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  deviceInfo: z.object({
    serialNumber: z.string().optional(),
    ipAddress: z.string().optional(),
    deviceName: z.string().optional(),
    deviceModel: z.string().optional(),
    osName: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }).optional(),
});

const googleSchema = z.object({
  idToken: z.string().min(1, 'Google ID token مطلوب'),
  deviceInfo: z.object({
    serialNumber: z.string().optional(),
    ipAddress: z.string().optional(),
    deviceName: z.string().optional(),
    deviceModel: z.string().optional(),
    osName: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
  }).optional(),
});

// ─── Routes ─────────────────────────────────────────────────

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten().fieldErrors });
  }

  const { email, password, name, deviceInfo } = parsed.data;
  const user = await authService.register(email, password, name);

  let device = null;
  if (deviceInfo) {
    device = await authService.registerDevice(user.id, deviceInfo);
  }

  res.status(201).json({ ...user, apiKey: device?.apiKey || null });
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten().fieldErrors });
  }

  const { email, password, deviceInfo } = parsed.data;
  const result = await authService.login(email, password);

  let device = null;
  if (deviceInfo) {
    device = await authService.findOrCreateDevice(result.user.id, deviceInfo);
  }

  res.json({ ...result, apiKey: device?.apiKey || null, isNewDevice: device?.isNew || false });
}));

router.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten().fieldErrors });
  }

  const { idToken, deviceInfo } = parsed.data;
  const result = await authService.googleLogin(idToken);

  let device = null;
  if (deviceInfo) {
    device = await authService.findOrCreateDevice(result.user.id, deviceInfo);
  }

  res.json({ ...result, apiKey: device?.apiKey || null, isNewDevice: device?.isNew || false });
}));

router.post('/logout', requireAuth, (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    authService.revokeToken(token);
  }
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

router.get('/profile', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const profile = await authService.getProfile(req.user!.id);
  if (!profile) return res.status(404).json({ message: 'User not found' });
  res.json(profile);
}));

router.get('/subscription', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const sub = await queryOne('SELECT * FROM subscriptions WHERE user_id = ?', [req.user!.id]);
  res.json(sub || { plan: 'free', status: 'active' });
}));

router.put('/subscription', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { plan } = req.body;
  if (!plan) return res.status(400).json({ message: 'plan is required' });

  const validPlans = ['free', 'starter', 'business'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ message: `Invalid plan. Must be one of: ${validPlans.join(', ')}` });
  }

  // In production: business plan should require payment verification
  // For now, only allow free plan changes without payment
  if (plan === 'business') {
    return res.status(402).json({
      message: 'يرجى الدفع أولاً لتفعيل الخطة المميزة',
      code: 'PAYMENT_REQUIRED',
    });
  }

  await execute('UPDATE subscriptions SET plan = ?, status = ? WHERE user_id = ?', [plan, 'active', req.user!.id]);
  const updated = await queryOne('SELECT * FROM subscriptions WHERE user_id = ?', [req.user!.id]);
  res.json(updated);
}));

router.get('/api-key', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const apiKey = await authService.getApiKeyByUser(req.user!.id);
  res.json({ apiKey });
}));

router.post('/request-api-key', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  let apiKey = await authService.getApiKeyByUser(req.user!.id);
  if (!apiKey) {
    const device = await authService.registerDevice(req.user!.id, {});
    apiKey = device.apiKey;
  }

  try {
    const { sendApiKeyEmail } = await import('../services/email.service');
    const sent = await sendApiKeyEmail(req.user!.email, apiKey);
    if (sent) {
      return res.json({ success: true, message: 'تم إرسال المفتاح إلى بريدك الإلكتروني' });
    }
  } catch (error) {
    console.error('Failed to send API key email:', error);
  }

  res.json({ success: true, apiKey, message: 'تم إنشاء المفتاح (البريد غير مكوّن، المفتاح معروض هنا)' });
}));

export default router;
