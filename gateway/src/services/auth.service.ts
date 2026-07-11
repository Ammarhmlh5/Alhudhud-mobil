import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { queryOne, queryAll, execute } from '../db';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}
const JWT_EXPIRES = '30d';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const BCRYPT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

export const authService = {
  async register(email: string, password: string, name: string) {
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) throw new Error('البريد الإلكتروني مسجل مسبقاً');

    const id = crypto.randomUUID();
    const hashed = await hashPassword(password);

    await execute('INSERT INTO users (id, email, name, password) VALUES (?, ?, ?, ?)', [id, email, name, hashed]);
    await execute('INSERT INTO subscriptions (user_id) VALUES (?)', [id]);

    return { id, email, name };
  },

  async login(email: string, password: string) {
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) throw new Error('البريد الإلكتروني غير صحيح');

    if (!user.is_active) throw new Error('الحساب موقوف');

    const valid = await comparePassword(password, user.password);
    if (!valid) throw new Error('كلمة المرور غير صحيحة');

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },

  async googleLogin(idToken: string) {
    if (!googleClient) throw new Error('Google authentication is not configured');

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Invalid Google token');
    }

    const { sub: googleId, email, name } = payload;

    let user = await queryOne('SELECT * FROM users WHERE google_id = ?', [googleId]);

    if (!user) {
      user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
      if (user) {
        await execute('UPDATE users SET google_id = ?, auth_provider = ?, updated_at = NOW() WHERE id = ?', [googleId, 'google', user.id]);
        user.google_id = googleId;
        user.auth_provider = 'google';
      } else {
        const id = crypto.randomUUID();
        const displayName = name || email.split('@')[0];
        await execute(
          'INSERT INTO users (id, email, name, password, auth_provider, google_id) VALUES (?, ?, ?, NULL, ?, ?)',
          [id, email, displayName, 'google', googleId]
        );
        await execute('INSERT INTO subscriptions (user_id) VALUES (?)', [id]);
        user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
      }
    }

    if (!user || !user.is_active) throw new Error('الحساب موقوف');

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },

  async getProfile(userId: string) {
    const user = await queryOne('SELECT id, email, name, role, is_active, auth_provider, google_id, created_at FROM users WHERE id = ?', [userId]);
    if (!user) return null;

    const sub = await queryOne('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
    return { ...user, subscription: sub || { plan: 'free', status: 'active' } };
  },

  verifyToken(token: string): { id: string; email: string; role: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as any;
    } catch {
      return null;
    }
  },

  async toggleUserStatus(userId: string, isActive: boolean) {
    await execute('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [isActive, userId]);
  },

  async getAllUsers() {
    return queryAll(`
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at, s.plan, s.status as sub_status
      FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id ORDER BY u.created_at DESC
    `);
  },

  async getStats() {
    const users = await queryOne('SELECT COUNT(*) as total FROM users');
    const active = await queryOne('SELECT COUNT(*) as total FROM users WHERE is_active = true');
    const messages = await queryOne('SELECT COUNT(*) as total FROM message_logs');
    const webhooks = await queryOne('SELECT COUNT(*) as total FROM webhook_events');
    const connectors = await queryOne('SELECT COUNT(*) as total FROM connectors');

    return {
      totalUsers: users?.total || 0,
      activeUsers: active?.total || 0,
      totalMessages: messages?.total || 0,
      totalWebhooks: webhooks?.total || 0,
      totalConnectors: connectors?.total || 0,
    };
  },
};
