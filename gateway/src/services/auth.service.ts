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
    const devices = await queryOne('SELECT COUNT(*) as total FROM devices');

    return {
      totalUsers: users?.total || 0,
      activeUsers: active?.total || 0,
      totalMessages: messages?.total || 0,
      totalWebhooks: webhooks?.total || 0,
      totalConnectors: connectors?.total || 0,
      totalDevices: devices?.total || 0,
    };
  },

  generateApiKey(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'ahh_live_';
    for (let i = 0; i < 48; i++) {
      key += chars.charAt(crypto.randomInt(chars.length));
    }
    return key;
  },

  async registerDevice(userId: string, deviceInfo: {
    serialNumber?: string;
    ipAddress?: string;
    deviceName?: string;
    deviceModel?: string;
    osName?: string;
    osVersion?: string;
    appVersion?: string;
  }) {
    const deviceId = crypto.randomUUID();
    const apiKey = this.generateApiKey();

    await execute(
      `INSERT INTO devices (id, user_id, api_key, serial_number, ip_address, device_name, device_model, os_name, os_version, app_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, userId, apiKey, deviceInfo.serialNumber || null, deviceInfo.ipAddress || null,
       deviceInfo.deviceName || null, deviceInfo.deviceModel || null,
       deviceInfo.osName || null, deviceInfo.osVersion || null, deviceInfo.appVersion || null]
    );

    return { id: deviceId, apiKey };
  },

  async findOrCreateDevice(userId: string, deviceInfo: {
    serialNumber?: string;
    ipAddress?: string;
    deviceName?: string;
    deviceModel?: string;
    osName?: string;
    osVersion?: string;
    appVersion?: string;
  }) {
    let device = deviceInfo.serialNumber
      ? await queryOne('SELECT * FROM devices WHERE user_id = ? AND serial_number = ?', [userId, deviceInfo.serialNumber])
      : null;

    if (device) {
      await execute(
        'UPDATE devices SET ip_address = ?, device_name = ?, device_model = ?, os_version = ?, app_version = ?, last_active_at = NOW() WHERE id = ?',
        [deviceInfo.ipAddress || device.ip_address, deviceInfo.deviceName || device.device_name,
         deviceInfo.deviceModel || device.device_model, deviceInfo.osVersion || device.os_version,
         deviceInfo.appVersion || device.app_version, device.id]
      );
      return { id: device.id, apiKey: device.api_key, isNew: false };
    }

    return { ...await this.registerDevice(userId, deviceInfo), isNew: true };
  },

  async getApiKeyByUser(userId: string) {
    const device = await queryOne('SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
    return device ? device.api_key : null;
  },

  async getDevicesByUser(userId: string) {
    return queryAll(
      'SELECT id, serial_number, ip_address, device_name, device_model, os_name, os_version, app_version, is_active, last_active_at, created_at FROM devices WHERE user_id = ? ORDER BY last_active_at DESC',
      [userId]
    );
  },

  async getDeviceApiKey(userId: string, deviceId: string) {
    const device = await queryOne('SELECT api_key FROM devices WHERE id = ? AND user_id = ?', [deviceId, userId]);
    return device ? device.api_key : null;
  },

  async revokeDevice(deviceId: string, userId: string) {
    await execute('DELETE FROM devices WHERE id = ? AND user_id = ?', [deviceId, userId]);
  },

  async getAllDevices() {
    return queryAll(`
      SELECT d.id, d.serial_number, d.ip_address, d.device_name, d.device_model,
             d.os_name, d.os_version, d.is_active, d.last_active_at, d.created_at,
             u.email as user_email, u.name as user_name
      FROM devices d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.last_active_at DESC
    `);
  },

  async findDeviceByApiKey(apiKey: string) {
    return queryOne('SELECT * FROM devices WHERE api_key = ? AND is_active = 1', [apiKey]);
  },

  async verifyApiKey(apiKey: string): Promise<{ userId: string; deviceId: string } | null> {
    const device = await queryOne('SELECT id, user_id FROM devices WHERE api_key = ? AND is_active = 1', [apiKey]);
    if (!device) return null;
    await execute('UPDATE devices SET last_active_at = NOW() WHERE id = ?', [device.id]);
    return { userId: device.user_id, deviceId: device.id };
  },
};
