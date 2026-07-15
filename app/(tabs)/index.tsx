import { StyleSheet, FlatList, TouchableOpacity, RefreshControl, View, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { connectorManager } from '@/lib/connectors/manager';
import { connectorSyncService } from '@/lib/services/connector-sync.service';
import { getDB } from '@/lib/db/init';
import { useThemeMode } from '@/lib/context/theme-context';
import { useAuth } from '@/hooks/useAuth';
import { useGateway } from '@/hooks/useGateway';
import * as Haptics from 'expo-haptics';
import { ConnectorConfig, ConnectorStats } from '@/lib/connectors/types';
import { supabaseIntegrationService } from '@/lib/services/supabase-integration.service';

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { themeMode, setThemeMode } = useThemeMode();
  const { connected: gatewayConnected } = useGateway();
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [stats, setStats] = useState<ConnectorStats>({
    total: 0, online: 0, offline: 0,
    totalMessages: 0, successMessages: 0, failedMessages: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      const db = getDB();
      if (db) {
        const row = db.getFirstSync("SELECT value FROM local_settings WHERE key = 'onboarding_done'") as any;
        if (!row) {
          router.replace('/onboarding');
        }
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && gatewayConnected) {
      connectorSyncService.fullSync().catch(() => {});
    }
  }, [user, gatewayConnected]);

  useEffect(() => {
    if (!user) return;

    const registerSupabaseDevice = async () => {
      try {
        await supabaseIntegrationService.registerDevice();
      } catch {}
    };

    registerSupabaseDevice();
  }, [user]);

  const loadData = useCallback(async () => {
    try {
      const [allConnectors, currentStats] = await Promise.all([
        connectorManager.getAll(),
        connectorManager.getStats(),
      ]);
      setConnectors(allConnectors);
      setStats(currentStats);
    } catch (e) {
      console.error('[HomeScreen] Error loading data:', e);
    }
  }, []);

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await connectorSyncService.fullSync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('تمت المزامنة', `تم إرسال ${result.pushed} واستيراد ${result.pulled} اتصال`);
    } catch {
      Alert.alert('خطأ', 'فشلت المزامنة');
    } finally {
      setSyncing(false);
      loadData();
    }
  }, [loadData]);

  useEffect(() => {
    if (user) loadData();
  }, [loadData, user]);

  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const checkSync = async () => {
      const due = await connectorManager.getDueSyncs();
      for (const c of due) {
        await connectorManager.sendData(c.id, { auto_sync: true, timestamp: new Date().toISOString() });
        await connectorManager.markSynced(c.id);
      }
      if (due.length > 0) loadData();
    };
    const syncTimer = setInterval(checkSync, 60000);
    return () => clearInterval(syncTimer);
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleQuickTest = async (id: string) => {
    try {
      const result = await connectorManager.testConnection(id);
      Haptics.notificationAsync(result.success ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        result.success ? 'متصل' : 'منفصل',
        result.success ? `زمن الاستجابة: ${result.latency}ms` : result.error || 'فشل الاتصال'
      );
      loadData();
    } catch {
      Alert.alert('خطأ', 'فشل اختبار الاتصال');
    }
  };

  if (authLoading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E6A23C" />
      </ThemedView>
    );
  }

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return '#9E9E9E';
    switch (status) {
      case 'ONLINE': return '#4CAF50';
      case 'OFFLINE': return '#F44336';
      default: return '#FF9800';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={connectors}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={() => (
          <ThemedView style={styles.header}>
            <ThemedView style={styles.headerTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedText type="title">لوحة التحكم</ThemedText>
                <View style={[styles.gatewayDot, { backgroundColor: gatewayConnected ? '#4CAF50' : '#F44336' }]} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.push('/subscription')}>
                  <IconSymbol name="creditcard.fill" size={22} color="#E6A23C" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  const modes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
                  const next = modes[(modes.indexOf(themeMode) + 1) % modes.length];
                  setThemeMode(next);
                }}>
                  <IconSymbol name={themeMode === 'dark' ? 'moon.fill' : themeMode === 'light' ? 'sun.max.fill' : 'circle.lefthalf.fill'} size={22} color="#888" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/connectors/index')}>
                  <IconSymbol name="antenna.radiowaves.left.and.right" size={22} color="#E6A23C" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/connectors/logs')}>
                  <IconSymbol name="doc.text.fill" size={22} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/connectors/webhooks')}>
                  <IconSymbol name="antenna.radiowaves.left.and.right" size={22} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSyncNow} disabled={syncing}>
                  <IconSymbol name="arrow.triangle.2.circlepath" size={22} color={syncing ? '#ccc' : '#607D8B'} />
                </TouchableOpacity>
                {user?.role === 'admin' && (
                  <TouchableOpacity onPress={() => router.push('/admin')}>
                    <IconSymbol name="shield.fill" size={22} color="#9C27B0" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => {
                  Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'خروج', style: 'destructive', onPress: () => {
                      logout().then(() => router.replace('/auth/login')).catch(() => router.replace('/auth/login'));
                    }},
                  ]);
                }}>
                  <IconSymbol name="rectangle.portrait.and.arrow.right" size={22} color="#FF4D4F" />
                </TouchableOpacity>
              </View>
            </ThemedView>

            <ThemedView style={styles.statsRow}>
              <ThemedView style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                <ThemedText style={styles.statNumber}>{stats.online}/{stats.total}</ThemedText>
                <ThemedText style={styles.statLabel}>متصل</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                <ThemedText style={styles.statNumber}>{stats.successMessages}</ThemedText>
                <ThemedText style={styles.statLabel}>رسائل ناجحة</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
                <ThemedText style={styles.statNumber}>{stats.failedMessages}</ThemedText>
                <ThemedText style={styles.statLabel}>رسائل فاشلة</ThemedText>
              </ThemedView>
            </ThemedView>

            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => router.push('/connectors/index')}
            >
              <IconSymbol name="antenna.radiowaves.left.and.right" size={18} color="#E6A23C" />
              <ThemedText style={styles.manageText}>إدارة الاتصالات</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.connectorCard}
            onPress={() => router.push(`/connectors/${item.id}`)}
          >
            <View style={styles.connectorRow}>
              <View style={styles.connectorInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.connectorDot, { backgroundColor: getStatusColor(item.status, item.isActive) }]} />
                  <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                </View>
                <ThemedText style={styles.connectorMeta}>
                  {item.platformType} • {item.protocol}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={() => handleQuickTest(item.id)}
              >
                <IconSymbol name="arrow.triangle.2.circlepath" size={18} color="#2196F3" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={() => (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/connectors/add')}
          >
            <IconSymbol name="plus" size={20} color="#E6A23C" />
            <ThemedText style={styles.addText}>إضافة اتصال جديد</ThemedText>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <ThemedView style={styles.emptyContainer}>
            <IconSymbol name="antenna.radiowaves.left.and.right" size={48} color="#ccc" />
            <ThemedText style={styles.emptyText}>لا توجد اتصالات بعد</ThemedText>
            <ThemedText style={styles.emptySubtext}>أضف اتصالاً جديداً للبدء</ThemedText>
          </ThemedView>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, gap: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', gap: 2 },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11, opacity: 0.7 },
  gatewayDot: { width: 8, height: 8, borderRadius: 4 },
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 10, gap: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E6A23C',
  },
  manageText: { color: '#E6A23C', fontSize: 13, fontWeight: '600' },
  connectorCard: {
    marginHorizontal: 16, marginBottom: 8, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    borderWidth: 1, borderColor: '#eee',
  },
  connectorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  connectorInfo: { gap: 4, flex: 1 },
  connectorDot: { width: 8, height: 8, borderRadius: 4 },
  connectorMeta: { fontSize: 12, opacity: 0.5, marginLeft: 16 },
  testBtn: { padding: 8 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    margin: 16, padding: 14, gap: 6, borderRadius: 10,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#E6A23C',
  },
  addText: { color: '#E6A23C', fontSize: 14, fontWeight: '600' },
  emptyContainer: { padding: 48, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, opacity: 0.7 },
  emptySubtext: { fontSize: 13, opacity: 0.5 },
});
