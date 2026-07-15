import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AuthService } from '../lib/services/auth.service';
import { api } from '../lib/apiClient';
import { gatewayService } from '../lib/services/gateway.service';

interface AuthContextValue {
  user: any;
  apiKey: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  googleLogin: (idToken: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  requestApiKey: () => Promise<any>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  apiKey: null,
  loading: true,
  login: async () => {},
  googleLogin: async () => {},
  register: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  requestApiKey: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const profile = await AuthService.getProfile();
      setUser(profile);
      const key = await api.getApiKey();
      setApiKey(key);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setApiKey(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.onUnauthorized(() => {
      setUser(null);
      setApiKey(null);
    });
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await AuthService.login(email, password);
    if (data.apiKey) setApiKey(data.apiKey);
    if (data.user) {
      setUser(data.user);
    } else {
      await checkAuth();
    }
    return data;
  }, [checkAuth]);

  const googleLogin = useCallback(async (idToken: string) => {
    const data = await AuthService.googleLogin(idToken);
    if (data.apiKey) setApiKey(data.apiKey);
    if (data.user) {
      setUser(data.user);
    } else {
      await checkAuth();
    }
    return data;
  }, [checkAuth]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await AuthService.register({ name, email, password });
    if (data.apiKey) setApiKey(data.apiKey);

    // If register returned a token, use it directly (no separate login needed)
    if (data.token) {
      await api.setToken(data.token);
      if (data.user) {
        setUser(data.user);
      } else {
        await checkAuth();
      }
      return data;
    }

    // Fallback: try separate login
    try {
      const loginData = await AuthService.login(email, password);
      if (loginData.apiKey) setApiKey(loginData.apiKey);
      if (loginData.user) {
        setUser(loginData.user);
      } else {
        await checkAuth();
      }
      return { ...loginData, apiKey: data.apiKey || loginData.apiKey };
    } catch (error) {
      console.error('Auto-login after registration failed:', error);
      await checkAuth();
      return data;
    }
  }, [checkAuth]);

  const logout = useCallback(async () => {
    gatewayService.disconnect();
    gatewayService.removeAllHandlers();
    try {
      const { notificationService } = await import('@/lib/services/notification.service');
      notificationService.destroy();
    } catch {}
    try {
      const { supabaseIntegrationService } = await import('@/lib/services/supabase-integration.service');
      await supabaseIntegrationService.destroy();
    } catch {}
    try {
      const { marsalSupabase } = await import('@/lib/supabase/client');
      await marsalSupabase.auth.signOut();
    } catch {}
    await AuthService.logout();
    setUser(null);
    setApiKey(null);
  }, []);

  const requestApiKey = useCallback(async () => {
    const result = await AuthService.requestApiKey();
    if (result.apiKey) setApiKey(result.apiKey);
    return result;
  }, []);

  const value = useMemo(() => ({
    user,
    apiKey,
    loading,
    login,
    googleLogin,
    logout,
    register,
    checkAuth,
    requestApiKey,
  }), [user, apiKey, loading, login, googleLogin, logout, register, checkAuth, requestApiKey]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
