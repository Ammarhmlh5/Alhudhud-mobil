import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthService } from '../lib/services/auth.service';

interface AuthContextValue {
  user: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  googleLogin: (idToken: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  googleLogin: async () => {},
  register: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const profile = await AuthService.getProfile();
      setUser(profile);
    } catch {
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
    // After login, fetch profile directly from the login response
    // instead of calling checkAuth (which would be redundant)
    if (data.user) {
      setUser(data.user);
    } else {
      await checkAuth();
    }
    return data;
  };

  const googleLogin = async (idToken: string) => {
    const data = await AuthService.googleLogin(idToken);
    if (data.user) {
      setUser(data.user);
    } else {
      await checkAuth();
    }
    return data;
  };

  const register = async (name: string, email: string, password: string) => {
    await AuthService.register({ name, email, password });
    const data = await AuthService.login(email, password);
    if (data.user) {
      setUser(data.user);
    } else {
      await checkAuth();
    }
    return data;
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, logout, register, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
