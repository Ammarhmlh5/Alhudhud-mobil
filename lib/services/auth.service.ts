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
        const response = await api.get('/auth/profile');
        if (!response.ok) return null;
        return await response.json();
    }
}
