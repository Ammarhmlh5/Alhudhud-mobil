import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { useEffect, useState } from 'react';
import { initDatabase, getDB } from '../lib/db/init';
import { notificationService } from '../lib/services/notification.service';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeContext, ThemeMode } from '../lib/context/theme-context';
import { AuthProvider, useAuth } from '../hooks/useAuth';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }

    setReady(true);
  }, [user, loading, segments, router]);

  if (loading) {
    return null;
  }

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    initDatabase();
    notificationService.init().catch(() => {});
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
                <Stack.Screen name="subscription/index" options={{ title: 'الاشتراكات' }} />
                <Stack.Screen name="admin/index" options={{ title: 'لوحة الأدمن' }} />
                <Stack.Screen name="onboarding/index" options={{ headerShown: false, gestureEnabled: false }} />
              </Stack>
            </AuthGuard>
            <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
          </ErrorBoundary>
        </ThemeProvider>
      </ThemeContext.Provider>
    </AuthProvider>
  );
}
