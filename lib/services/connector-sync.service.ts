import { getDB } from '@/lib/db/init';
import { gatewayService } from './gateway.service';

class ConnectorSyncService {
  private syncing = false;

  async pushConnectors(): Promise<number> {
    if (this.syncing) return 0;
    this.syncing = true;

    try {
      const db = getDB();
      if (!db) return 0;

      const rows = db.getAllSync('SELECT * FROM connectors') as any[];
      if (rows.length === 0) return 0;

      const res = await gatewayService.fetch('/connectors/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectors: rows }),
      });

      if (res.ok) {
        const result = await res.json();
        const count = result.results?.filter((r: any) => r.status !== 'FAILED').length || 0;
        return count;
      }
      return 0;
    } catch {
      return 0;
    } finally {
      this.syncing = false;
    }
  }

  async pullConnectors(): Promise<number> {
    if (this.syncing) return 0;
    this.syncing = true;

    try {
      const res = await gatewayService.fetch('/connectors');
      if (!res.ok) return 0;

      const serverConnectors = await res.json();
      if (!Array.isArray(serverConnectors) || serverConnectors.length === 0) return 0;

      const db = getDB();
      if (!db) return 0;

      let imported = 0;
      for (const sc of serverConnectors) {
        try {
          const existing = db.getFirstSync('SELECT id FROM connectors WHERE id = ?', [sc.id]) as any;
          if (existing) continue;

          db.runSync(`
            INSERT INTO connectors (id, name, platform_type, protocol, endpoint_url,
              http_method, headers, auth_config, data_mapping, sync_interval,
              is_active, last_status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            sc.id, sc.name, sc.platform_type, sc.protocol, sc.endpoint_url,
            sc.http_method || 'POST', sc.headers || '{}', sc.auth_config || '{}',
            sc.data_mapping || null, sc.sync_interval || null,
            sc.is_active !== undefined ? (sc.is_active ? 1 : 0) : 1,
            sc.last_status || 'UNKNOWN',
            sc.created_at || new Date().toISOString(),
            sc.updated_at || new Date().toISOString(),
          ]);
          imported++;
        } catch (error) { console.error('Failed to import connector:', error); }
      }

      return imported;
    } catch {
      return 0;
    } finally {
      this.syncing = false;
    }
  }

  async fullSync(): Promise<{ pushed: number; pulled: number }> {
    const pushed = await this.pushConnectors();
    const pulled = await this.pullConnectors();
    return { pushed, pulled };
  }
}

export const connectorSyncService = new ConnectorSyncService();
