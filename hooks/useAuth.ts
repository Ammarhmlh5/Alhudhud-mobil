import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../lib/services/auth.service';

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const profile = await AuthService.getProfile();
            setUser(profile);
        } catch (e) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = async (email: string, password: string) => {
        const data = await AuthService.login(email, password);
        await checkAuth();
        return data;
    };

    const register = async (name: string, email: string, password: string) => {
        await AuthService.register({ fullName: name, email, password });
        const data = await AuthService.login(email, password);
        await checkAuth();
        return data;
    };

    const logout = async () => {
        await AuthService.logout();
        setUser(null);
    };

    return { user, loading, login, logout, register, checkAuth };
}
