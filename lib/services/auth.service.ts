import { api } from '../apiClient';
import { collectDeviceInfo, storeApiKey, clearApiKey } from '../utils/device-info';

export class AuthService {
    static async login(email: string, password: string) {
        let deviceInfo = null;
        try { deviceInfo = await collectDeviceInfo(); } catch {}

        const response = await api.post('/auth/login', { email, password, deviceInfo });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل تسجيل الدخول');
        }

        const data = await response.json();
        if (data.token) {
            await api.setToken(data.token);
        }
        if (data.apiKey) {
            await storeApiKey(data.apiKey);
        }
        return data;
    }

    static async googleLogin(idToken: string) {
        let deviceInfo = null;
        try { deviceInfo = await collectDeviceInfo(); } catch {}

        const response = await api.post('/auth/google', { idToken, deviceInfo });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'فشل تسجيل الدخول بحساب Google');
        }

        const data = await response.json();
        if (data.token) {
            await api.setToken(data.token);
        }
        if (data.apiKey) {
            await storeApiKey(data.apiKey);
        }
        return data;
    }

    static async register(userData: any) {
        let deviceInfo = null;
        try { deviceInfo = await collectDeviceInfo(); } catch {}

        const response = await api.post('/auth/register', { ...userData, deviceInfo });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل إنشاء الحساب');
        }

        const data = await response.json();
        if (data.apiKey) {
            await storeApiKey(data.apiKey);
        }
        return data;
    }

    static async logout() {
        await api.setToken(null);
        await clearApiKey();
    }

    static async getProfile() {
        try {
            const response = await api.get('/auth/profile');
            if (response.status === 401) {
                await api.setToken(null);
                return null;
            }
            if (!response.ok) {
                return null;
            }
            return await response.json();
        } catch {
            return null;
        }
    }

    static async requestApiKey() {
        const response = await api.post('/auth/request-api-key', {});
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'فشل طلب المفتاح');
        }
        return response.json();
    }

    static async getApiKey() {
        const response = await api.get('/auth/api-key');
        if (!response.ok) return null;
        const data = await response.json();
        return data.apiKey || null;
    }
}
