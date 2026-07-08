import { getDB } from './db/init';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.101:3001/api';

class ApiClient {
    private async getToken(): Promise<string | null> {
        const db = getDB();
        if (!db) return null;

        try {
            const result: any = db.getFirstSync('SELECT value FROM local_settings WHERE key = "auth_token"');
            return result ? result.value : null;
        } catch (e) {
            return null;
        }
    }

    async setToken(token: string | null) {
        const db = getDB();
        if (!db) return;

        if (token) {
            db.runSync('INSERT OR REPLACE INTO local_settings (key, value) VALUES ("auth_token", ?)', [token]);
        } else {
            db.runSync('DELETE FROM local_settings WHERE key = "auth_token"');
        }
    }

    async request(path: string, options: RequestInit = {}) {
        const token = await this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            // Handle unauthorized (logout)
            await this.setToken(null);
        }

        return response;
    }

    async get(path: string) {
        return this.request(path, { method: 'GET' });
    }

    async post(path: string, data: any) {
        return this.request(path, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

export const api = new ApiClient();
export default api;
