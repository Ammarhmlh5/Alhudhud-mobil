import { Image, StyleSheet, Platform, FlatList, TouchableOpacity, RefreshControl, ScrollView, View, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ApiaryCard } from '@/components/ApiaryCard';
import { ApiaryContextSelector } from '@/components/ApiaryContextSelector';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';
import { SyncService } from '@/lib/services/sync.service';
import { useAuth } from '@/hooks/useAuth';
import * as Haptics from 'expo-haptics';

// Placeholder type
type Apiary = {
  id: string;
  name: string;
  type: string;
  location?: string;
  hiveCount?: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [selectedApiaryId, setSelectedApiaryId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({ hiveCount: 0, inspectionCount: 0 });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login' as any);
    }
  }, [user, authLoading]);

  // Load apiaries from local DB
  const loadApiaries = useCallback(() => {
    const db = getDB();
    if (!db) return;

    try {
      const result = db.getAllSync('SELECT * FROM apiaries ORDER BY name ASC');
      setApiaries(result as Apiary[]);

      if (selectedApiaryId) {
        const hives = db.getAllSync('SELECT count(*) as count FROM hives WHERE apiary_id = ?', [selectedApiaryId]);
        const inspections = db.getAllSync('SELECT count(*) as count FROM inspections WHERE hive_id IN (SELECT id FROM hives WHERE apiary_id = ?)', [selectedApiaryId]);
        setStats({
          hiveCount: (hives[0] as any)?.count || 0,
          inspectionCount: (inspections[0] as any)?.count || 0
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedApiaryId]);

  useEffect(() => {
    if (user) loadApiaries();
  }, [loadApiaries, user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await SyncService.sync(); // Trigger sync on pull-to-refresh
    loadApiaries();
    setRefreshing(false);
  }, [loadApiaries]);

  const handleManualSync = async () => {
    setSyncing(true);
    await SyncService.sync();
    loadApiaries();
    setSyncing(false);
    Alert.alert('تمت المزامنة', 'تم تحديث البيانات مع السيرفر بنجاح');
  };

  if (authLoading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E6A23C" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ApiaryContextSelector
        apiaries={apiaries}
        selectedApiaryId={selectedApiaryId}
        onSelectApiary={setSelectedApiaryId}
      />

      {!selectedApiaryId ? (
        /* NO SELECTION: Show List of Apiaries */
        <FlatList
          data={apiaries}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={() => (
            <ThemedView style={styles.titleContainer}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText type="title">مرحباً بك! 👋</ThemedText>
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 10, opacity: 0.5 }}>
                    آخر مزامنة: {new Date().toLocaleTimeString('ar-SA')}
                  </ThemedText>
                  <TouchableOpacity onPress={handleManualSync} disabled={syncing}>
                    {syncing ? <ActivityIndicator size="small" color="#E6A23C" /> : <IconSymbol name="arrow.triangle.2.circlepath" size={24} color="#E6A23C" />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'خروج', style: 'destructive', onPress: () => {
                          const { AuthService } = require('@/lib/services/auth.service');
                          AuthService.logout().then(() => router.replace('/auth/login' as any));
                        }
                      }
                    ]);
                  }}>
                    <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#FF4D4F" />
                  </TouchableOpacity>
                </View>
              </View>
              <ThemedText>اختر منحلاً للبدء في العمليات</ThemedText>
            </ThemedView>
          )}
          renderItem={({ item }) => (
            <ApiaryCard
              apiary={item}
              onPress={() => setSelectedApiaryId(item.id)}
            />
          )}
          ListEmptyComponent={() => (
            <ThemedView style={styles.emptyContainer}>
              <ThemedText>لا توجد مناحل مسجلة.</ThemedText>
              <ThemedText>اضغط على + لإضافة منحل جديد.</ThemedText>
            </ThemedView>
          )}
        />
      ) : (
        /* SELECTION MADE: Show Context-Based Dashboard */
        <ScrollView contentContainerStyle={styles.dashboardContent}>
          <ThemedView style={styles.dashboardHeader}>
            <ThemedText type="subtitle">لوحة التحكم: {apiaries.find(a => a.id === selectedApiaryId)?.name}</ThemedText>
            <TouchableOpacity onPress={() => setSelectedApiaryId(null)}>
              <ThemedText style={{ color: '#E6A23C' }}>تغيير المنحل</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* MOCK ROLE CHECK: For demo, odd IDs are OWNER, even IDs are WORKER */}
          {Number(selectedApiaryId) % 2 !== 0 ? (
            <ThemedView style={styles.financialCard}>
              <ThemedText type="subtitle" style={{ color: '#fff' }}>💰 التقارير المالية (المالك)</ThemedText>
              <ThemedText style={{ color: '#fff' }}>مبيعات العسل: 5000 ر.س</ThemedText>
              <ThemedText style={{ color: '#fff' }}>المصروفات: 1200 ر.س</ThemedText>
            </ThemedView>
          ) : null}

          <ThemedView style={styles.operationalCard}>
            <ThemedText type="subtitle">📊 إحصائيات المنحل (الجميع)</ThemedText>
            <ThemedText>• إجمالي الخلايا: {stats.hiveCount}</ThemedText>
            <ThemedText>• سجلات الفحص: {stats.inspectionCount}</ThemedText>
          </ThemedView>

          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/apiary/${selectedApiaryId}/hives`)}>
              <IconSymbol name="square.grid.2x2" size={24} color="#333" />
              <ThemedText>الخلايا</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <IconSymbol name="doc.text.magnifyingglass" size={24} color="#333" />
              <ThemedText>فحص</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <IconSymbol name="drop.fill" size={24} color="#333" />
              <ThemedText>تغذية</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <IconSymbol name="cross.case.fill" size={24} color="#333" />
              <ThemedText>علاج</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {!selectedApiaryId && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/apiary/add')}
        >
          <IconSymbol name="plus" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    padding: 16,
    gap: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 24, // RTL layout
    backgroundColor: '#E6A23C', // Honey color
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dashboardContent: {
    padding: 16,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  financialCard: {
    backgroundColor: '#2ecc71',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  operationalCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  }
});
