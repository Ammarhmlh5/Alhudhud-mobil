import * as Network from 'expo-network';
import { getDB } from '../db/init';
import { api } from '../apiClient';

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export class SyncService {

    /**
     * Check if the device is currently online
     */
    static async isOnline(): Promise<boolean> {
        const state = await Network.getNetworkStateAsync();
        return !!state.isConnected && !!state.isInternetReachable;
    }

    /**
     * Add a change to the local sync queue
     */
    static async queueChange(
        tableName: string,
        rowId: string,
        operation: SyncOperation,
        data: any
    ) {
        const db = getDB();
        if (!db) return;

        try {
            const existing = db.getFirstSync(
                'SELECT id FROM sync_queue WHERE table_name = ? AND row_id = ? AND operation = ? AND status = "PENDING"',
                [tableName, rowId, operation]
            );
            if (existing) return;

            const json = JSON.stringify(data);
            const id = crypto.randomUUID();

            db.runSync(
                `INSERT INTO sync_queue (id, table_name, row_id, operation, data, status) VALUES (?, ?, ?, ?, ?, 'PENDING')`,
                [id, tableName, rowId, operation, json]
            );
            console.debug(`[Sync] Queued ${operation} for ${tableName}:${rowId}`);
        } catch (error) {
            console.error('[Sync] Error queuing change:', error);
        }
    }

    /**
     * Main sync function: Pushes local changes and pulls remote updates
     */
    static async sync() {
        const online = await this.isOnline();
        if (!online) {
            console.debug('[Sync] Offline. Skipping sync.');
            return;
        }

        console.debug('[Sync] Starting synchronization...');
        await this.pushChanges();
        await this.pullChanges();
    }

    /**
     * Push pending changes to the server
     */
    private static async pushChanges() {
        const db = getDB();
        if (!db) return;

        try {
            db.runSync(`DELETE FROM sync_queue WHERE status = 'FAILED' AND created_at < datetime('now', '-7 days')`);

            // Get pending changes
            const pending = db.getAllSync('SELECT * FROM sync_queue WHERE status = "PENDING" ORDER BY created_at ASC');

            if (pending.length === 0) {
                console.debug('[Sync] No pending changes to push.');
                return;
            }

            console.debug(`[Sync] Found ${pending.length} pending changes.`);

            // Prepare batch for backend
            const events = pending.map((item: any) => ({
                id: item.id,
                table: item.table_name,
                rowId: item.row_id,
                operation: item.operation,
                data: JSON.parse(item.data),
                clientTimestamp: item.created_at
            }));

            // Send to central API (use postRaw to get Response object for status checking)
            const response = await api.postRaw('/sync/push', { events });

            if (response.ok) {
                const data = await response.json();
                const results = data?.results || [];

                // Mark successful items as SYNCED
                for (const res of results) {
                    if (res.status === 'SUCCESS') {
                        db.runSync('UPDATE sync_queue SET status = "SYNCED" WHERE id = ?', [res.id]);
                    } else {
                        db.runSync('UPDATE sync_queue SET status = "FAILED", error_message = ? WHERE id = ?', [res.error || 'Unknown error', res.id]);
                    }
                }
                console.debug('[Sync] Push cycle completed.');
            } else {
                console.error('[Sync] Push failed with status:', response.status);
            }

        } catch (error) {
            console.error('[Sync] Error pushing changes:', error);
        }
    }

    private static readonly ALLOWED_TABLES = new Set(['connectors', 'platforms', 'local_settings']);

    private static readonly ALLOWED_COLUMNS: Record<string, Set<string>> = {
        connectors: new Set(['id', 'name', 'platform_type', 'protocol', 'endpoint_url', 'http_method', 'headers', 'auth_type', 'auth_config', 'data_mapping', 'is_active', 'last_status', 'last_connected_at', 'sync_interval', 'last_synced_at', 'created_at', 'updated_at']),
        platforms: new Set(['id', 'name', 'description', 'icon', 'is_system', 'created_at']),
        local_settings: new Set(['key', 'value']),
    };

    private static async pullChanges(): Promise<number> {
        const db = getDB();
        if (!db) return 0;

        try {
            const lastPullRow = db.getFirstSync("SELECT value FROM local_settings WHERE key = 'last_pull_at'") as any;
            const lastPull = lastPullRow?.value || null;

            let url = '/sync/pull';
            if (lastPull) {
                url += `?since=${encodeURIComponent(lastPull)}`;
            }

            const response = await api.getRaw(url);
            if (!response.ok) {
                console.error('[Sync] Pull failed with status:', response.status);
                return 0;
            }

            const changes = await response.json();
            if (!Array.isArray(changes) || changes.length === 0) {
                console.debug('[Sync] No changes to pull.');
                return 0;
            }

            console.debug(`[Sync] Pulling ${changes.length} change(s) from server.`);
            const appliedIds: string[] = [];

            let hasErrors = false;
            for (const change of changes) {
                try {
                    const { id, table_name, row_id, operation, data } = change;

                    if (!SyncService.ALLOWED_TABLES.has(table_name)) {
                        console.warn(`[Sync] Skipping disallowed table: ${table_name}`);
                        hasErrors = true;
                        continue;
                    }

                    const payload = data ? JSON.parse(data) : null;

                    switch (operation) {
                        case 'INSERT':
                            if (payload && typeof payload === 'object') {
                                const allowedCols = SyncService.ALLOWED_COLUMNS[table_name];
                                if (!allowedCols) { hasErrors = true; continue; }
                                const keys = Object.keys(payload).filter(k => allowedCols.has(k));
                                if (keys.length === 0) { hasErrors = true; continue; }
                                const placeholders = keys.map(() => '?').join(', ');
                                const values = keys.map(k => payload[k]);
                                db.runSync(
                                    `INSERT OR IGNORE INTO ${table_name} (${keys.join(', ')}) VALUES (${placeholders})`,
                                    values
                                );
                            }
                            break;
                        case 'UPDATE':
                            if (payload && typeof payload === 'object') {
                                const allowedCols = SyncService.ALLOWED_COLUMNS[table_name];
                                if (!allowedCols) { hasErrors = true; continue; }

                                if (payload.updated_at && table_name !== 'local_settings') {
                                    const local: any = db.getFirstSync(
                                        `SELECT updated_at FROM ${table_name} WHERE id = ?`,
                                        [row_id]
                                    );
                                    if (local?.updated_at && local.updated_at >= payload.updated_at) {
                                        continue;
                                    }
                                }

                                const keys = Object.keys(payload).filter(k => allowedCols.has(k));
                                if (keys.length === 0) { hasErrors = true; continue; }
                                const placeholders = keys.map(() => '?').join(', ');
                                const values = keys.map(k => payload[k]);
                                db.runSync(
                                    `INSERT OR REPLACE INTO ${table_name} (${keys.join(', ')}) VALUES (${placeholders})`,
                                    values
                                );
                            }
                            break;
                        case 'DELETE':
                            db.runSync(`DELETE FROM ${table_name} WHERE id = ?`, [row_id]);
                            break;
                        default:
                            console.warn(`[Sync] Unknown operation: ${operation}`);
                            hasErrors = true;
                            continue;
                    }

                    appliedIds.push(id);
                } catch (err) {
                    console.error(`[Sync] Error applying pull change ${change.id}:`, err);
                    hasErrors = true;
                }
            }

            if (appliedIds.length > 0) {
                const confirmRes = await api.postRaw('/sync/pull/confirm', { ids: appliedIds });
                if (confirmRes.ok) {
                    console.debug(`[Sync] Confirmed ${appliedIds.length} pull(s) with server.`);
                }
            }

            if (!hasErrors) {
                const now = new Date().toISOString();
                db.runSync("INSERT OR REPLACE INTO local_settings (key, value) VALUES ('last_pull_at', ?)", [now]);
            }

            console.debug(`[Sync] Pull cycle completed: ${appliedIds.length} changes applied.`);
            return appliedIds.length;
        } catch (error) {
            console.error('[Sync] Error pulling changes:', error);
            return 0;
        }
    }
}
