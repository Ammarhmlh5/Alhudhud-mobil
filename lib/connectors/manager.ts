import { getDB } from '@/lib/db/init';
import { restEngine } from './engines/rest.engine';
import { connectorSyncService } from '../services/connector-sync.service';
import { gatewayService } from '../services/gateway.service';
import {
  ConnectorConfig,
  ConnectorFormData,
  ConnectorStats,
  ProtocolType,
  AuthType,
  MappingRule,
} from './types';

class ConnectorManager {
  isDatabaseReady(): boolean {
    const db = getDB();
    if (!db) return false;
    try {
      db.getFirstSync('SELECT 1 FROM connectors LIMIT 0');
      return true;
    } catch {
      return false;
    }
  }

  async getAll(): Promise<ConnectorConfig[]> {
    const db = getDB();
    if (!db) {
      console.error('[ConnectorManager] Database not initialized - getDB() returned null');
      return [];
    }

    try {
      const rows = db.getAllSync('SELECT * FROM connectors ORDER BY name ASC');
      const configs: ConnectorConfig[] = [];
      for (const row of rows as any[]) {
        try {
          configs.push(this.rowToConfig(row));
        } catch (e) {
          console.error(`[ConnectorManager] Error parsing connector "${row?.id}":`, e);
        }
      }
      return configs;
    } catch (e) {
      console.error('[ConnectorManager] Error loading connectors:', e);
      return [];
    }
  }

  async getById(id: string): Promise<ConnectorConfig | null> {
    const db = getDB();
    if (!db) return null;

    try {
      const row = db.getFirstSync('SELECT * FROM connectors WHERE id = ?', [id]) as any;
      return row ? this.rowToConfig(row) : null;
    } catch (e) {
      console.error('[ConnectorManager] Error loading connector:', e);
      return null;
    }
  }

  async create(data: ConnectorFormData): Promise<ConnectorConfig> {
    const db = getDB();
    if (!db) throw new Error('Database not initialized');

    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    const authConfig = JSON.stringify({
      type: data.authType,
      apiKey: data.apiKey || '',
      apiKeyHeader: data.apiKeyHeader || '',
      username: data.username || '',
      password: data.password || '',
      token: data.token || '',
      tokenUrl: data.tokenUrl || '',
      clientId: data.clientId || '',
      clientSecret: data.clientSecret || '',
      scope: data.scope || '',
    });

    const headers = data.headers ? JSON.stringify(this.parseHeaders(data.headers)) : '{}';
    const dataMapping = data.dataMapping || null;

    db.runSync(
      `INSERT INTO connectors (id, name, platform_type, protocol, endpoint_url, http_method, headers, auth_type, auth_config, data_mapping, is_active, last_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'UNKNOWN', ?, ?)`,
      [id, data.name, data.platformType, data.protocol, data.endpointUrl, data.httpMethod, headers, data.authType, authConfig, dataMapping, now, now]
    );

    this.syncToGateway();
    const created = await this.getById(id);
    if (!created) throw new Error('Failed to create connector');
    return created;
  }

  private syncToGateway(): void {
    connectorSyncService.pushConnectors().catch(() => {});
  }

  async update(id: string, data: Partial<ConnectorFormData>): Promise<void> {
    const db = getDB();
    if (!db) return;

    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.platformType !== undefined) { sets.push('platform_type = ?'); params.push(data.platformType); }
    if (data.endpointUrl !== undefined) { sets.push('endpoint_url = ?'); params.push(data.endpointUrl); }
    if (data.protocol !== undefined) { sets.push('protocol = ?'); params.push(data.protocol); }
    if (data.httpMethod !== undefined) { sets.push('http_method = ?'); params.push(data.httpMethod); }
    if (data.headers !== undefined) { sets.push('headers = ?'); params.push(JSON.stringify(this.parseHeaders(data.headers))); }
    if (data.authType !== undefined) {
      const authConfig = JSON.stringify({
        type: data.authType,
        apiKey: data.apiKey || '',
        apiKeyHeader: data.apiKeyHeader || '',
        username: data.username || '',
        password: data.password || '',
        token: data.token || '',
        tokenUrl: data.tokenUrl || '',
        clientId: data.clientId || '',
        clientSecret: data.clientSecret || '',
        scope: data.scope || '',
      });
      sets.push('auth_type = ?'); params.push(data.authType);
      sets.push('auth_config = ?'); params.push(authConfig);
    }
    if (data.dataMapping !== undefined) { sets.push('data_mapping = ?'); params.push(data.dataMapping); }
    if (data.scheduleInterval !== undefined) { sets.push('sync_interval = ?'); params.push(data.scheduleInterval); }

    params.push(id);
    db.runSync(`UPDATE connectors SET ${sets.join(', ')} WHERE id = ?`, params);
    this.syncToGateway();
  }

  async updateSchedule(id: string, intervalMinutes: number | null): Promise<void> {
    return this.update(id, { scheduleInterval: intervalMinutes ?? 0 });
  }

  async markSynced(id: string): Promise<void> {
    const db = getDB();
    if (!db) return;
    db.runSync('UPDATE connectors SET last_synced_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  }

  async updateMapping(id: string, mapping: { rules: MappingRule[] }): Promise<void> {
    return this.update(id, { dataMapping: JSON.stringify(mapping) });
  }

  async toggleActive(id: string): Promise<void> {
    const db = getDB();
    if (!db) return;

    const connector = await this.getById(id);
    if (!connector) return;

    db.runSync('UPDATE connectors SET is_active = ?, updated_at = ? WHERE id = ?', [
      connector.isActive ? 0 : 1,
      new Date().toISOString(),
      id,
    ]);
    this.syncToGateway();
  }

  async delete(id: string): Promise<void> {
    const db = getDB();
    if (!db) return;
    db.runSync('DELETE FROM connectors WHERE id = ?', [id]);
    db.runSync('DELETE FROM message_logs WHERE connector_id = ?', [id]);
    gatewayService.deleteConnector(id).catch(() => {});
  }

  async getDueSyncs(): Promise<ConnectorConfig[]> {
    const all = await this.getAll();
    const now = Date.now();
    return all.filter(c => {
      if (!c.isActive || !c.scheduleInterval) return false;
      if (!c.lastSyncedAt) return true;
      const lastSync = new Date(c.lastSyncedAt).getTime();
      return (now - lastSync) > c.scheduleInterval * 60 * 1000;
    });
  }

  async sendWithMapping(id: string, payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
    const connector = await this.getById(id);
    if (!connector) return { success: false, error: 'Connector not found' };

    let dataToSend = payload;
    if (connector.dataMapping?.rules && connector.dataMapping.rules.length > 0) {
      const { dataMapper } = await import('./mapper');
      dataToSend = dataMapper.applyMapping(payload, { rules: connector.dataMapping.rules });
    }

    return this.sendData(id, dataToSend);
  }

  async testConnection(id: string): Promise<{ success: boolean; latency?: number; error?: string }> {
    const connector = await this.getById(id);
    if (!connector) return { success: false, error: 'Connector not found' };

    const result = await restEngine.test(connector);
    const db = getDB();

    const newStatus = result.success ? 'ONLINE' : 'OFFLINE';
    db?.runSync('UPDATE connectors SET last_status = ?, last_connected_at = ?, updated_at = ? WHERE id = ?', [
      newStatus,
      result.success ? new Date().toISOString() : null,
      new Date().toISOString(),
      id,
    ]);

    return result;
  }

  async sendData(id: string, payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
    const connector = await this.getById(id);
    if (!connector) return { success: false, error: 'Connector not found' };
    if (!connector.isActive) return { success: false, error: 'Connector is disabled' };

    let lastResult: { success: boolean; data?: any; error?: string } = { success: false, error: '' };
    const MAX_RETRIES = 2;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      lastResult = await restEngine.send(connector, payload);
      if (lastResult.success) break;
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    const db = getDB();
    const logId = crypto.randomUUID?.() || `${Date.now()}`;
    db?.runSync(
      `INSERT INTO message_logs (id, connector_id, direction, status, payload, error_message, created_at)
       VALUES (?, ?, 'SENT', ?, ?, ?, ?)`,
      [logId, id, lastResult.success ? 'SUCCESS' : 'FAILED', JSON.stringify(payload), lastResult.error || null, new Date().toISOString()]
    );

    return lastResult;
  }

  async getStats(): Promise<ConnectorStats> {
    const db = getDB();
    if (!db) {
      console.error('[ConnectorManager] Database not initialized for stats');
      return { total: 0, online: 0, offline: 0, totalMessages: 0, successMessages: 0, failedMessages: 0 };
    }

    try {
      const connectors = db.getAllSync('SELECT last_status FROM connectors') as any[];
      const logs = db.getFirstSync(`
        SELECT COUNT(*) as total, SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success,
               SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed FROM message_logs
      `) as any;

      return {
        total: connectors.length,
        online: connectors.filter((c: any) => c.last_status === 'ONLINE').length,
        offline: connectors.filter((c: any) => c.last_status === 'OFFLINE' || c.last_status === 'ERROR').length,
        totalMessages: logs?.total || 0,
        successMessages: logs?.success || 0,
        failedMessages: logs?.failed || 0,
      };
    } catch (e) {
      console.error('[ConnectorManager] Error loading stats:', e);
      return { total: 0, online: 0, offline: 0, totalMessages: 0, successMessages: 0, failedMessages: 0 };
    }
  }

  async getMessageLogs(connectorId?: string, limit = 50): Promise<any[]> {
    const db = getDB();
    if (!db) return [];

    try {
      const query = connectorId
        ? 'SELECT * FROM message_logs WHERE connector_id = ? ORDER BY created_at DESC LIMIT ?'
        : 'SELECT * FROM message_logs ORDER BY created_at DESC LIMIT ?';
      const params = connectorId ? [connectorId, limit] : [limit];
      return db.getAllSync(query, params) as any[];
    } catch {
      return [];
    }
  }

  async exportConfig(id: string): Promise<string | null> {
    const connector = await this.getById(id);
    if (!connector) return null;

    const hasCredentials = connector.auth.type !== 'NONE';
    const exportData: Record<string, any> = {
      _warning: hasCredentials ? 'هذا الملف يحتوي على بيانات اعتماد حساسة — لا تشاركه' : undefined,
      name: connector.name,
      platformType: connector.platformType,
      protocol: connector.protocol,
      endpointUrl: connector.endpointUrl,
      httpMethod: connector.httpMethod,
      headers: connector.headers,
      auth: {
        type: connector.auth.type,
        apiKey: connector.auth.apiKey,
        apiKeyHeader: connector.auth.apiKeyHeader,
        username: connector.auth.username,
        password: connector.auth.password,
        token: connector.auth.token,
        clientId: connector.auth.clientId,
        clientSecret: connector.auth.clientSecret,
        tokenUrl: connector.auth.tokenUrl,
        scope: connector.auth.scope,
      },
      dataMapping: connector.dataMapping,
      scheduleInterval: connector.scheduleInterval,
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importConfig(jsonStr: string): Promise<ConnectorConfig> {
    // Limit input size to prevent DoS via large payloads
    if (jsonStr.length > 1024 * 1024) {
      throw new Error('الملف كبير جداً — الحد الأقصى 1MB');
    }

    const data = JSON.parse(jsonStr);
    if (!data.name || !data.protocol || !data.endpointUrl) {
      throw new Error('الملف غير صالح: يجب أن يحتوي على name, protocol, endpointUrl');
    }

    return this.create({
      name: `${data.name} (مستورد)`,
      platformType: data.platformType || 'Imported',
      protocol: data.protocol,
      endpointUrl: data.endpointUrl,
      httpMethod: data.httpMethod || 'POST',
      authType: data.auth?.type || 'NONE',
      apiKey: data.auth?.apiKey || '',
      apiKeyHeader: data.auth?.apiKeyHeader || '',
      username: data.auth?.username || '',
      password: data.auth?.password || '',
      token: data.auth?.token || '',
      clientId: data.auth?.clientId || '',
      clientSecret: data.auth?.clientSecret || '',
      tokenUrl: data.auth?.tokenUrl || '',
      scope: data.auth?.scope || '',
      dataMapping: data.dataMapping ? JSON.stringify(data.dataMapping) : undefined,
      scheduleInterval: data.scheduleInterval || undefined,
    });
  }

  private safeJsonParse(str: string | null | undefined, fallback: any): any {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('[ConnectorManager] JSON parse error:', e, 'Raw value:', str.substring(0, 100));
      return fallback;
    }
  }

  private rowToConfig(row: any): ConnectorConfig {
    return {
      id: row.id,
      name: row.name,
      platformType: row.platform_type,
      protocol: row.protocol as ProtocolType,
      endpointUrl: row.endpoint_url,
      httpMethod: row.http_method as any,
      headers: this.safeJsonParse(row.headers, undefined),
      auth: this.safeJsonParse(row.auth_config, { type: 'NONE' as AuthType }),
      dataMapping: this.safeJsonParse(row.data_mapping, null),
      scheduleInterval: row.sync_interval || null,
      lastSyncedAt: row.last_synced_at || null,
      isActive: row.is_active === 1,
      status: row.last_status as any,
      lastConnectedAt: row.last_connected_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private parseHeaders(headersStr: string): Record<string, string> {
    const result: Record<string, string> = {};
    headersStr.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (key) {
          result[key] = value;
        }
      }
    });
    return result;
  }
}

export const connectorManager = new ConnectorManager();
