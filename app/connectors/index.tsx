import { StyleSheet, FlatList, TouchableOpacity, View, Alert, TextInput, Modal, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SwipeableRow } from '@/components/SwipeableRow';
import { connectorManager } from '@/lib/connectors/manager';
import { ConnectorConfig } from '@/lib/connectors/types';

export default function ConnectorsScreen() {
  const router = useRouter();
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  const loadConnectors = useCallback(async () => {
    try {
      setError(null);
      const dbReady = connectorManager.isDatabaseReady();
      if (!dbReady) {
        setError('قاعدة البيانات غير جاهزة. يرجى إعادة تشغيل التطبيق.');
        setConnectors([]);
        return;
      }
      const result = await connectorManager.getAll();
      setConnectors(result);
    } catch (e: any) {
      console.error('[ConnectorsScreen] Error loading connectors:', e);
      setError(`خطأ في تحميل الاتصالات: ${e.message || 'خطأ غير معروف'}`);
      setConnectors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConnectors();
    }, [loadConnectors])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConnectors();
    setRefreshing(false);
  }, [loadConnectors]);

  const filtered = useMemo(() => {
    if (!search.trim()) return connectors;
    const q = search.toLowerCase();
    return connectors.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.platformType.toLowerCase().includes(q) ||
      c.endpointUrl.toLowerCase().includes(q)
    );
  }, [connectors, search]);

  const handleToggle = async (id: string) => {
    try {
      await connectorManager.toggleActive(id);
      loadConnectors();
    } catch (error) {
      console.error('Failed to toggle connector:', error);
      Alert.alert('خطأ', 'فشل تبديل حالة الاتصال');
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await connectorManager.testConnection(id);
      Alert.alert(
        result.success ? '✅ اتصال ناجح' : '❌ فشل الاتصال',
        result.success ? `زمن الاستجابة: ${result.latency}ms` : result.error || 'خطأ غير معروف'
      );
      loadConnectors();
    } catch (error) {
      console.error('Failed to test connection:', error);
      Alert.alert('خطأ', 'فشل اختبار الاتصال');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('حذف الاتصال', `هل أنت متأكد من حذف "${name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await connectorManager.delete(id);
            loadConnectors();
          } catch (error) {
            console.error('Failed to delete connector:', error);
            Alert.alert('خطأ', 'فشل حذف الاتصال');
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return '#9E9E9E';
    switch (status) {
      case 'ONLINE': return '#4CAF50';
      case 'OFFLINE': return '#F44336';
      case 'ERROR': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string, isActive: boolean) => {
    if (!isActive) return 'متوقف';
    switch (status) {
      case 'ONLINE': return 'متصل';
      case 'OFFLINE': return 'منفصل';
      case 'ERROR': return 'خطأ';
      default: return 'غير معروف';
    }
  };

  return (
    <ThemedView style={styles.container}>
      {loading ? (
        <ThemedView style={styles.centerState}>
          <ActivityIndicator size="large" color="#E6A23C" />
          <ThemedText style={styles.stateText}>جارٍ تحميل الاتصالات...</ThemedText>
        </ThemedView>
      ) : error ? (
        <ThemedView style={styles.centerState}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#F44336" />
          <ThemedText style={[styles.stateText, { color: '#F44336' }]}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadConnectors(); }}>
            <ThemedText style={styles.retryBtnText}>إعادة المحاولة</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={() => (
          <ThemedView style={styles.headerSection}>
            <ThemedView style={styles.headerRow}>
              <ThemedText type="title">الاتصالات</ThemedText>
              <TouchableOpacity style={styles.importBtn} onPress={() => setShowImport(true)} accessibilityLabel="استيراد اتصال" accessibilityRole="button">
                <IconSymbol name="square.and.arrow.down.fill" size={16} color="#E6A23C" />
                <ThemedText style={styles.importBtnText}>استيراد</ThemedText>
              </TouchableOpacity>
            </ThemedView>
            <View style={styles.searchBar}>
              <IconSymbol name="magnifyingglass" size={16} color="#999" />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="بحث..."
                placeholderTextColor="#999"
                autoCapitalize="none"
                accessibilityLabel="بحث في الاتصالات"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <IconSymbol name="xmark.circle.fill" size={16} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>
          </ThemedView>
        )}
        renderItem={({ item }) => (
          <SwipeableRow onDelete={() => handleDelete(item.id, item.name)}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/connectors/${item.id}`)}
            onLongPress={() => handleDelete(item.id, item.name)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status, item.isActive) }]} />
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              </View>
              <ThemedText style={styles.statusText}>
                {getStatusText(item.status, item.isActive)}
              </ThemedText>
            </View>
            <ThemedText style={styles.cardDetail}>
              {item.platformType} • {item.protocol}
            </ThemedText>
            <ThemedText style={styles.cardUrl} numberOfLines={1}>
              {item.endpointUrl}
            </ThemedText>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#E6A23C' }]}
                onPress={() => router.push(`/connectors/add?id=${item.id}`)}
                accessibilityLabel="تعديل"
                accessibilityRole="button"
              >
                <ThemedText style={styles.actionBtnText}>تعديل</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: item.isActive ? '#FF9800' : '#4CAF50' }]}
                onPress={() => handleToggle(item.id)}
                accessibilityLabel={item.isActive ? 'إيقاف' : 'تشغيل'}
                accessibilityRole="button"
              >
                <ThemedText style={styles.actionBtnText}>
                  {item.isActive ? 'إيقاف' : 'تشغيل'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2196F3' }]}
                onPress={() => handleTest(item.id)}
                accessibilityLabel="اختبار الاتصال"
                accessibilityRole="button"
              >
                <ThemedText style={styles.actionBtnText}>اختبار</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          </SwipeableRow>
        )}
        ListEmptyComponent={() => (
          <ThemedView style={styles.emptyContainer}>
            <IconSymbol name="antenna.radiowaves.left.and.right" size={48} color="#ccc" />
            <ThemedText style={styles.emptyText}>لا توجد اتصالات</ThemedText>
            <ThemedText style={styles.emptySubtext}>اضغط + لإضافة اتصال جديد</ThemedText>
          </ThemedView>
        )}
      />
      )}
      <Modal visible={showImport} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>استيراد اتصال</ThemedText>
            <ThemedText style={{ fontSize: 12, opacity: 0.6, marginBottom: 12 }}>
              الصق JSON التصدير لاستيراد إعدادات اتصال
            </ThemedText>
            <TextInput
              style={styles.modalInput}
              value={importJson}
              onChangeText={setImportJson}
              multiline
              numberOfLines={8}
              placeholder='{"name": "...", "protocol": "REST", ...}'
              placeholderTextColor="#999"
              autoCapitalize="none"
              accessibilityLabel="بيانات JSON للاستيراد"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowImport(false); setImportJson(''); }} accessibilityLabel="إلغاء" accessibilityRole="button">
                <ThemedText style={{ color: '#666' }}>إلغاء</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalImportBtn} onPress={async () => {
                try {
                  await connectorManager.importConfig(importJson);
                  setShowImport(false);
                  setImportJson('');
                  loadConnectors();
                  Alert.alert('✅ تم الاستيراد', 'تم استيراد إعدادات الاتصال بنجاح');
                } catch (e: any) {
                  Alert.alert('خطأ', e.message);
                }
              }} accessibilityLabel="استيراد" accessibilityRole="button">
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>استيراد</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Alert.alert('إضافة اتصال', 'اختر طريقة الإضافة', [
            {
              text: 'مسح QR للربط السريع',
              onPress: () => router.push('/connectors/scan'),
            },
            {
              text: 'إضافة يدوياً',
              onPress: () => router.push('/connectors/add'),
            },
            {
              text: 'إلغاء',
              style: 'cancel',
            },
          ]);
        }}
        accessibilityLabel="إضافة اتصال جديد"
        accessibilityRole="button"
      >
        <IconSymbol name="plus" size={30} color="#fff" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  stateText: { fontSize: 14, opacity: 0.7, textAlign: 'center' },
  retryBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, backgroundColor: '#E6A23C',
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  list: { paddingBottom: 80 },
  headerSection: { padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E6A23C' },
  importBtnText: { fontSize: 13, color: '#E6A23C', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 4 },
  modalInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12,
    fontSize: 13, backgroundColor: '#fafafa', minHeight: 150, textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalCancelBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  modalImportBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: '#E6A23C' },
  header: { padding: 16 },
  card: {
    padding: 16, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, borderWidth: 1, borderColor: '#eee', gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 12, opacity: 0.7 },
  cardDetail: { fontSize: 12, opacity: 0.6 },
  cardUrl: { fontSize: 11, opacity: 0.4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontSize: 12 },
  emptyContainer: { padding: 48, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, opacity: 0.7 },
  emptySubtext: { fontSize: 13, opacity: 0.5 },
  fab: {
    position: 'absolute', bottom: 24, left: 24,
    backgroundColor: '#E6A23C', width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
});
