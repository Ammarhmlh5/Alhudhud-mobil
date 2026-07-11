import { StyleSheet, ScrollView, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { connectorManager } from '@/lib/connectors/manager';

export default function LogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  const loadLogs = useCallback(async () => {
    const all = await connectorManager.getMessageLogs(undefined, 100);
    setLogs(all);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  }, [loadLogs]);

  const filtered = filter === 'ALL' ? logs : logs.filter(l => l.status === filter);

  const getLogColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '#4CAF50';
      case 'FAILED': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getLogBg = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '#E8F5E9';
      case 'FAILED': return '#FFEBEE';
      default: return '#FFF8E1';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ThemedText type="title" style={{ marginBottom: 4 }}>سجل الرسائل</ThemedText>
      <ThemedText style={styles.subtitle}>جميع عمليات الإرسال والاستقبال</ThemedText>

      <View style={styles.filterRow}>
        {(['ALL', 'SUCCESS', 'FAILED'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <ThemedText style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'الكل' : f === 'SUCCESS' ? 'ناجح' : 'فاشل'}
            </ThemedText>
          </TouchableOpacity>
        ))}
        <ThemedText style={styles.count}>{filtered.length}</ThemedText>
      </View>

      {filtered.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <IconSymbol name="tray.fill" size={48} color="#ccc" />
          <ThemedText style={{ opacity: 0.5, marginTop: 12 }}>لا توجد رسائل</ThemedText>
        </ThemedView>
      ) : (
        filtered.map((log, i) => (
          <ThemedView key={log.id || i} style={[styles.logCard, { borderLeftColor: getLogColor(log.status), borderLeftWidth: 3 }]}>
            <View style={styles.logHeader}>
              <View style={[styles.logBadge, { backgroundColor: getLogBg(log.status) }]}>
                <ThemedText style={{ fontSize: 11, fontWeight: '600', color: getLogColor(log.status) }}>
                  {log.status}
                </ThemedText>
              </View>
              <View style={[styles.logBadge, { backgroundColor: '#E3F2FD' }]}>
                <ThemedText style={{ fontSize: 11, color: '#2196F3' }}>
                  {log.direction === 'SENT' ? 'إرسال' : 'استقبال'}
                </ThemedText>
              </View>
              <ThemedText style={{ fontSize: 11, opacity: 0.4, marginLeft: 'auto' }}>
                {log.payload ? `${log.payload.length} B` : '0 B'}
              </ThemedText>
            </View>
            <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
              {new Date(log.created_at).toLocaleString('ar-SA')}
            </ThemedText>
            {log.error_message && (
              <ThemedText style={{ fontSize: 12, color: '#F44336', marginTop: 4 }}>
                {log.error_message}
              </ThemedText>
            )}
          </ThemedView>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  subtitle: { fontSize: 13, opacity: 0.5, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  filterActive: { borderColor: '#E6A23C', backgroundColor: '#FFF8E1' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#E6A23C', fontWeight: '600' },
  count: { fontSize: 13, opacity: 0.4, marginLeft: 'auto' },
  emptyState: { alignItems: 'center', padding: 48, gap: 4 },
  logCard: {
    backgroundColor: '#fafafa', borderRadius: 12, padding: 14, gap: 4,
    borderWidth: 1, borderColor: '#eee',
  },
  logHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  logBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
