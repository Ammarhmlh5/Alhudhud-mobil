import { getDB } from './db/init';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiClient {
    private async getToken(): Promise<string | null> {
        const db = getDB();
        if (!db) return null;

        try {
            const result: any = db.getFirstSync('SELECT value FROM local_settings WHERE key = "auth_token"');
            return result ? result.value : null;
        } catch {
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

    async put(path: string, data: any) {
        return this.request(path, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async delete(path: string) {
        return this.request(path, { method: 'DELETE' });
    }
}

export const api = new ApiClient();
export default api;
