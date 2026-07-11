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
            const json = JSON.stringify(data);
            const id = crypto.randomUUID(); // Use a polyfill or custom generator if needed on older RN

            db.runSync(
                `INSERT INTO sync_queue (id, table_name, row_id, operation, data, status) VALUES (?, ?, ?, ?, ?, 'PENDING')`,
                [id, tableName, rowId, operation, json]
            );
            console.log(`[Sync] Queued ${operation} for ${tableName}:${rowId}`);

            // Attempt immediate sync if online (optional)
            // this.syncInfo(); 
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
            console.log('[Sync] Offline. Skipping sync.');
            return;
        }

        console.log('[Sync] Starting synchronization...');
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
            // Get pending changes
            const pending = db.getAllSync('SELECT * FROM sync_queue WHERE status = "PENDING" ORDER BY created_at ASC');

            if (pending.length === 0) {
                console.log('[Sync] No pending changes to push.');
                return;
            }

            console.log(`[Sync] Found ${pending.length} pending changes.`);

            // Prepare batch for backend
            const events = pending.map((item: any) => ({
                id: item.id,
                table: item.table_name,
                rowId: item.row_id,
                operation: item.operation,
                data: JSON.parse(item.data),
                clientTimestamp: item.created_at
            }));

            // Send to central API
            const response = await api.post('/sync/push', { events });

            if (response.ok) {
                const { results } = await response.json();

                // Mark successful items as SYNCED
                for (const res of results) {
                    if (res.status === 'SUCCESS') {
                        db.runSync('UPDATE sync_queue SET status = "SYNCED" WHERE id = ?', [res.id]);
                        // Also update the source record remote sync flag if needed
                    } else {
                        db.runSync('UPDATE sync_queue SET status = "FAILED", error_message = ? WHERE id = ?', [res.error, res.id]);
                    }
                }
                console.log('[Sync] Push cycle completed.');
            } else {
                console.error('[Sync] Push failed with status:', response.status);
            }

        } catch (error) {
            console.error('[Sync] Error pushing changes:', error);
        }
    }

    private static readonly ALLOWED_TABLES = new Set(['connectors', 'platforms', 'local_settings']);

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

            const response = await api.get(url);
            if (!response.ok) {
                console.error('[Sync] Pull failed with status:', response.status);
                return 0;
            }

            const changes = await response.json();
            if (!Array.isArray(changes) || changes.length === 0) {
                console.log('[Sync] No changes to pull.');
                return 0;
            }

            console.log(`[Sync] Pulling ${changes.length} change(s) from server.`);
            const appliedIds: string[] = [];

            for (const change of changes) {
                try {
                    const { id, table_name, row_id, operation, data } = change;

                    if (!SyncService.ALLOWED_TABLES.has(table_name)) {
                        console.warn(`[Sync] Skipping disallowed table: ${table_name}`);
                        continue;
                    }

                    const payload = data ? JSON.parse(data) : null;

                    switch (operation) {
                        case 'INSERT':
                        case 'UPDATE':
                            if (payload && typeof payload === 'object') {
                                const keys = Object.keys(payload);
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
                            continue;
                    }

                    appliedIds.push(id);
                } catch (err) {
                    console.error(`[Sync] Error applying pull change ${change.id}:`, err);
                }
            }

            if (appliedIds.length > 0) {
                const confirmRes = await api.post('/sync/pull/confirm', { ids: appliedIds });
                if (confirmRes.ok) {
                    console.log(`[Sync] Confirmed ${appliedIds.length} pull(s) with server.`);
                }
            }

            const now = new Date().toISOString();
            db.runSync("INSERT OR REPLACE INTO local_settings (key, value) VALUES ('last_pull_at', ?)", [now]);

            console.log(`[Sync] Pull cycle completed: ${appliedIds.length} changes applied.`);
            return appliedIds.length;
        } catch (error) {
            console.error('[Sync] Error pulling changes:', error);
            return 0;
        }
    }
}
