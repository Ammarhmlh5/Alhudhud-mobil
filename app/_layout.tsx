import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Linking from 'expo-linking';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { useEffect, useState } from 'react';
import { ActivityIndicator, View, AppState } from 'react-native';
import { initDatabase, getDB } from '../lib/db/init';
import { notificationService } from '../lib/services/notification.service';
import { gatewayService } from '../lib/services/gateway.service';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeContext, ThemeMode } from '../lib/context/theme-context';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { MarsalProvider } from '../lib/context/marsal-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, checkAuth } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inAdminGroup = segments[0] === 'admin';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (user && inAdminGroup && user.role !== 'admin') {
      router.replace('/(tabs)');
    }

    if (user || inAuthGroup) {
      setReady(true);
    }
  }, [user, loading, segments, router]);

  useEffect(() => {
    if (!user || !ready) return;

    const handleDeepLink = ({ url }: { url: string }) => {
      if (url.includes('alhudhud://pair')) {
        router.push('/connectors/scan');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url && url.includes('alhudhud://pair')) {
        router.push('/connectors/scan');
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [user, ready, router]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && user) {
        checkAuth();
      }
    });
    return () => subscription?.remove();
  }, [user, checkAuth]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    initDatabase();
    notificationService.init().catch(() => {});
    gatewayService.connect().catch(() => {});
    const db = getDB();
    if (db) {
      const row = db.getFirstSync("SELECT value FROM local_settings WHERE key = 'theme_mode'") as any;
      if (row?.value === 'light' || row?.value === 'dark') {
        setThemeMode(row.value);
      }
    }
  }, []);

  const resolvedTheme: 'light' | 'dark' = themeMode === 'system' ? (systemScheme || 'light') : themeMode;

  const updateTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    const db = getDB();
    if (db) {
      db.runSync("INSERT OR REPLACE INTO local_settings (key, value) VALUES ('theme_mode', ?)", [mode]);
    }
  };

  return (
    <AuthProvider>
      <MarsalProvider>
        <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode: updateTheme }}>
          <ThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
            <ErrorBoundary>
              <AuthGuard>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth/login" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="auth/register" options={{ headerShown: false }} />
                  <Stack.Screen name="connectors/index" options={{ title: 'الاتصالات' }} />
                  <Stack.Screen name="connectors/add" options={{ title: 'إضافة اتصال', presentation: 'modal' }} />
                  <Stack.Screen name="connectors/[id]/index" options={{ title: 'تفاصيل الاتصال' }} />
                  <Stack.Screen name="connectors/send" options={{ title: 'إرسال بيانات', presentation: 'modal' }} />
                  <Stack.Screen name="connectors/mapping" options={{ title: 'تعيين البيانات', presentation: 'modal' }} />
                  <Stack.Screen name="connectors/logs" options={{ title: 'سجل الرسائل' }} />
                  <Stack.Screen name="connectors/webhooks" options={{ title: 'أحداث Webhook' }} />
                  <Stack.Screen name="connectors/scan" options={{ title: 'مسح QR للربط', presentation: 'modal' }} />
                  <Stack.Screen name="subscription/index" options={{ title: 'الاشتراكات' }} />
                  <Stack.Screen name="admin/index" options={{ title: 'لوحة الأدمن' }} />
                  <Stack.Screen name="onboarding/index" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="platform/index" options={{ title: 'مرسل الهدهد', presentation: 'modal' }} />
                </Stack>
              </AuthGuard>
              <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
            </ErrorBoundary>
          </ThemeProvider>
        </ThemeContext.Provider>
      </MarsalProvider>
    </AuthProvider>
  );
}
