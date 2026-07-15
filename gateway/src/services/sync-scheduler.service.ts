import { queryAll, execute, executeBatch } from '../db';
import { broadcastToUser } from './ws.service';

interface ConnectorRow {
  id: string;
  user_id: string;
  name: string;
  sync_interval: number | null;
  last_synced_at: string | null;
}

let schedulerTimer: any = null;
let isRunning = false;

export function startSyncScheduler() {
  if (schedulerTimer) return;
  console.log('  ⏰ Sync scheduler started (checking every 60s)');

  schedulerTimer = setInterval(async () => {
    if (isRunning) {
      console.log('  ⏰ Sync scheduler: skipping — previous run still active');
      return;
    }
    isRunning = true;

    try {
      const connectors = await queryAll(`
        SELECT id, user_id, name, sync_interval, last_synced_at
        FROM connectors WHERE sync_interval IS NOT NULL AND sync_interval > 0
      `) as ConnectorRow[];

      const now = Date.now();
      const due: ConnectorRow[] = [];

      for (const c of connectors) {
        if (!c.last_synced_at) {
          due.push(c);
        } else {
          const lastSync = new Date(c.last_synced_at).getTime();
          if (c.sync_interval && (now - lastSync) > c.sync_interval * 60 * 1000) {
            due.push(c);
          }
        }
      }

      for (const c of due) {
        broadcastToUser(c.user_id, {
          type: 'SCHEDULED_SYNC',
          connectorId: c.id,
          connectorName: c.name,
          timestamp: new Date().toISOString(),
        });
      }

      if (due.length > 0) {
        const now = new Date().toISOString();
        const statements = due.map(c => ({
          sql: 'UPDATE connectors SET last_synced_at = ? WHERE id = ?',
          params: [now, c.id],
        }));
        await executeBatch(statements);
        console.log(`  ⏰ Triggered sync for ${due.length} connector(s)`);
      }

      await execute(
        "DELETE FROM pairing_tokens WHERE expires_at < datetime('now') AND is_used = 0",
        []
      );
    } catch (err) {
      console.error('  ⏰ Sync scheduler error:', err);
    } finally {
      isRunning = false;
    }
  }, 60000);
}

export function stopSyncScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
