import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthService } from '../lib/services/auth.service';
import { getStoredApiKey } from '../lib/utils/device-info';

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
      const key = await getStoredApiKey();
      setApiKey(key);
    } catch {
      setUser(null);
      setApiKey(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const data = await AuthService.login(email, password);
    if (data.apiKey) setApiKey(data.apiKey);
    if (data.user) {
      setUser(data.user);
    } else {
      await checkAuth();
    }
    return data;
  };

  const googleLogin = async (idToken: string) => {
    const data = await AuthService.googleLogin(idToken);
    if (data.apiKey) setApiKey(data.apiKey);
    if (data.user) {
      setUser(data.user);
    } else {
      await checkAuth();
    }
    return data;
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await AuthService.register({ name, email, password });
    if (data.apiKey) setApiKey(data.apiKey);
    const loginData = await AuthService.login(email, password);
    if (loginData.apiKey) setApiKey(loginData.apiKey);
    if (loginData.user) {
      setUser(loginData.user);
    } else {
      await checkAuth();
    }
    return { ...loginData, apiKey: data.apiKey || loginData.apiKey };
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
    setApiKey(null);
  };

  const requestApiKey = async () => {
    const result = await AuthService.requestApiKey();
    return result;
  };

  return (
    <AuthContext.Provider value={{ user, apiKey, loading, login, googleLogin, logout, register, checkAuth, requestApiKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
