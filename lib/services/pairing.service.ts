import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { getDB } from '@/lib/db/init';
import { connectorSyncService } from './connector-sync.service';
import { gatewayService } from './gateway.service';

// ─── SSRF Protection ───────────────────────────────────────

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^ff[0-9a-f]{2}:/i,
];

function isPrivateOrReservedIP(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname));
}

function validateGatewayUrl(urlStr: string): URL {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error('صيغة رابط البوابة غير صحيحة');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('يجب أن يبدأ رابط البوابة بـ http:// أو https://');
  }

  if (isPrivateOrReservedIP(url.hostname)) {
    throw new Error('روابط الشبكة الداخلية غير مسموحة');
  }

  return url;
}

// ─── Pairing Service ───────────────────────────────────────

export interface PairingQRData {
  type: string;
  gateway: string;
  code: string;
  name: string;
  email: string;
}

export interface PairingResult {
  success: boolean;
  apiKey: string;
  deviceId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  connectors: any[];
}

class PairingService {
  parseQRData(raw: string): PairingQRData | null {
    try {
      const data = JSON.parse(raw);
      if (data.type !== 'alhudhud_pair') return null;
      if (!data.gateway || typeof data.gateway !== 'string') return null;
      if (!data.code || typeof data.code !== 'string') return null;

      const codeRegex = /^[A-Z0-9]{6}$/;
      if (!codeRegex.test(data.code.toUpperCase())) return null;

      try {
        validateGatewayUrl(data.gateway);
      } catch {
        return null;
      }

      return {
        type: data.type,
        gateway: data.gateway,
        code: data.code.toUpperCase(),
        name: data.name || '',
        email: data.email || '',
      };
    } catch {
      return null;
    }
  }

  async exchangeCode(gatewayUrl: string, code: string): Promise<PairingResult> {
    // Validate gateway URL (SSRF protection)
    validateGatewayUrl(gatewayUrl);

    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    const deviceName = Device.deviceName || 'Mobile Device';
    const deviceModel = Device.modelName || 'Unknown';
    const osName = Device.osName || 'Unknown';
    const osVersion = Device.osVersion || '';
    const serialNumber = `qr_${Date.now()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${gatewayUrl}/api/pairing/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          deviceName,
          deviceModel,
          osName,
          osVersion,
          appVersion: Application.nativeApplicationVersion || '1.0.0',
          serialNumber,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'فشل الربط' }));
        throw new Error(error.message || 'فشل الربط');
      }

      return response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('انتهت مهلة الاتصال بالبوابة');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async savePairingData(gatewayUrl: string, result: PairingResult): Promise<void> {
    const db = getDB();
    if (!db) throw new Error('قاعدة البيانات غير متوفرة');

    await SecureStore.setItemAsync('api_key', result.apiKey);

    try {
      db.execSync('BEGIN TRANSACTION');

      db.runSync(
        'INSERT OR REPLACE INTO local_settings (key, value) VALUES (?, ?)',
        ['gateway_url', gatewayUrl]
      );

      db.runSync(
        'INSERT OR REPLACE INTO local_settings (key, value) VALUES (?, ?)',
        ['paired_device_id', result.deviceId]
      );

      db.runSync(
        'INSERT OR REPLACE INTO local_settings (key, value) VALUES (?, ?)',
        ['paired_user_name', result.user.name]
      );

      db.runSync(
        'INSERT OR REPLACE INTO local_settings (key, value) VALUES (?, ?)',
        ['paired_user_email', result.user.email]
      );

      if (result.connectors && result.connectors.length > 0) {
        for (const sc of result.connectors) {
          const existing = db.getFirstSync(
            'SELECT id FROM connectors WHERE id = ?',
            [sc.id]
          ) as any;

          if (existing) {
            db.runSync(
              `UPDATE connectors SET
                name = ?, platform_type = ?, protocol = ?, endpoint_url = ?,
                http_method = ?, headers = ?, auth_type = ?, auth_config = ?,
                data_mapping = ?, sync_interval = ?, is_active = ?, last_status = ?,
                updated_at = ?
              WHERE id = ?`,
              [
                sc.name, sc.platform_type, sc.protocol, sc.endpoint_url,
                sc.http_method || 'POST', sc.headers || '{}', sc.auth_type || 'NONE',
                sc.auth_config || '{}', sc.data_mapping || null, sc.sync_interval || null,
                sc.is_active !== undefined ? (sc.is_active ? 1 : 0) : 1,
                sc.last_status || 'UNKNOWN', sc.updated_at || new Date().toISOString(),
                sc.id,
              ]
            );
          } else {
            db.runSync(
              `INSERT INTO connectors (id, name, platform_type, protocol, endpoint_url,
                http_method, headers, auth_type, auth_config, data_mapping, sync_interval,
                is_active, last_status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                sc.id, sc.name, sc.platform_type, sc.protocol, sc.endpoint_url,
                sc.http_method || 'POST', sc.headers || '{}', sc.auth_type || 'NONE',
                sc.auth_config || '{}', sc.data_mapping || null, sc.sync_interval || null,
                sc.is_active !== undefined ? (sc.is_active ? 1 : 0) : 1,
                sc.last_status || 'UNKNOWN',
                sc.created_at || new Date().toISOString(),
                sc.updated_at || new Date().toISOString(),
              ]
            );
          }
        }
      }

      db.execSync('COMMIT');
    } catch (error) {
      db.execSync('ROLLBACK');
      await SecureStore.deleteItemAsync('api_key');
      throw new Error('فشل حفظ بيانات الاقتران — تم التراجع عن جميع التغييرات');
    }

    try {
      await connectorSyncService.fullSync();
    } catch (error) {
      console.warn('[Pairing] Post-pair sync failed:', error);
    }
  }

  async isPaired(): Promise<boolean> {
    const db = getDB();
    if (!db) return false;
    try {
      const result: any = db.getFirstSync(
        'SELECT value FROM local_settings WHERE key = "paired_device_id"'
      );
      return !!result?.value;
    } catch {
      return false;
    }
  }

  async getPairedGateway(): Promise<string | null> {
    const db = getDB();
    if (!db) return null;
    try {
      const result: any = db.getFirstSync(
        'SELECT value FROM local_settings WHERE key = "gateway_url"'
      );
      return result?.value || null;
    } catch {
      return null;
    }
  }

  async getPairedDeviceInfo(): Promise<{ deviceId: string; userName: string; userEmail: string } | null> {
    const db = getDB();
    if (!db) return null;
    try {
      const deviceId: any = db.getFirstSync(
        'SELECT value FROM local_settings WHERE key = "paired_device_id"'
      );
      const userName: any = db.getFirstSync(
        'SELECT value FROM local_settings WHERE key = "paired_user_name"'
      );
      const userEmail: any = db.getFirstSync(
        'SELECT value FROM local_settings WHERE key = "paired_user_email"'
      );
      if (!deviceId?.value) return null;
      return {
        deviceId: deviceId.value,
        userName: userName?.value || '',
        userEmail: userEmail?.value || '',
      };
    } catch {
      return null;
    }
  }

  async unpair(): Promise<void> {
    const db = getDB();
    if (!db) return;

    const gatewayUrl = await this.getPairedGateway();
    const deviceInfo = await this.getPairedDeviceInfo();

    if (gatewayUrl && deviceInfo) {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        try {
          await fetch(`${gatewayUrl}/api/pairing/unpair`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ deviceId: deviceInfo.deviceId }),
          });
        } catch {
          // Best effort — local cleanup still happens
        }
      }
    }

    db.runSync('DELETE FROM connectors');
    db.runSync('DELETE FROM message_logs');
    db.runSync('DELETE FROM local_settings WHERE key = "paired_device_id"');
    db.runSync('DELETE FROM local_settings WHERE key = "gateway_url"');
    db.runSync('DELETE FROM local_settings WHERE key = "paired_user_name"');
    db.runSync('DELETE FROM local_settings WHERE key = "paired_user_email"');
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('api_key');
    gatewayService.disconnect();
    gatewayService.removeAllHandlers();
  }
}

export const pairingService = new PairingService();
