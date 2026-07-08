import * as Network from 'expo-network';
import { getDB } from '../db/init';
import { Platform } from 'react-native';

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
     * Main sync function: Pushes local changes and pulls emote updates
     */
    static async sync() {
        const online = await this.isOnline();
        if (!online) {
            console.log('[Sync] Offline. Skipping sync.');
            return;
        }

        console.log('[Sync] Starting synchronization...');
        await this.pushChanges();
        // await this.pullChanges();
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
            const { api } = require('../apiClient');
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
}
