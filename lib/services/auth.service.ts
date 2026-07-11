import { api } from '../apiClient';

export class AuthService {
    static async login(email: string, password: string) {
        const response = await api.post('/auth/login', { email, password });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل تسجيل الدخول');
        }

        const data = await response.json();
        if (data.token) {
            await api.setToken(data.token);
        }
        return data;
    }

    static async googleLogin(idToken: string) {
        const response = await api.post('/auth/google', { idToken });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'فشل تسجيل الدخول بحساب Google');
        }

        const data = await response.json();
        if (data.token) {
            await api.setToken(data.token);
        }
        return data;
    }

    static async register(userData: any) {
        const response = await api.post('/auth/register', userData);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل إنشاء الحساب');
        }

        return await response.json();
    }

    static async logout() {
        await api.setToken(null);
    }

    static async getProfile() {
        try {
            const response = await api.get('/auth/profile');
            if (response.status === 401) {
                // Token is invalid or expired - clear it
                await api.setToken(null);
                return null;
            }
            if (!response.ok) {
                // Server error (500, 503, etc.) - keep token, return null
                return null;
            }
            return await response.json();
        } catch {
            // Network error - keep token, return null
            return null;
        }
    }
}
