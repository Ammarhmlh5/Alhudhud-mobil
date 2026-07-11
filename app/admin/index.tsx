import { StyleSheet, ScrollView, TouchableOpacity, Alert, View, ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/hooks/useAuth';
import { adminService, AdminStats, AdminUser, AdminLog, AdminWebhook } from '@/lib/services/admin.service';

type Tab = 'stats' | 'accounts' | 'logs' | 'webhooks';

export default function AdminScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('stats');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [webhooks, setWebhooks] = useState<AdminWebhook[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'stats') {
        setStats(await adminService.getStats());
      } else if (tab === 'accounts') {
        setUsers(await adminService.getUsers());
      } else if (tab === 'logs') {
        setLogs(await adminService.getLogs());
      } else if (tab === 'webhooks') {
        setWebhooks(await adminService.getWebhooks());
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { loadData(); }, [loadData]);

  if (user?.role !== 'admin') {
    return (
      <ThemedView style={styles.center}>
        <IconSymbol name="lock.fill" size={48} color="#F44336" />
        <ThemedText style={{ fontSize: 16, marginTop: 12, opacity: 0.6 }}>دخول ممنوع</ThemedText>
        <ThemedText style={{ fontSize: 13, opacity: 0.4, marginTop: 4 }}>فقط المشرفون يمكنهم الوصول</ThemedText>
      </ThemedView>
    );
  }

  const StatCard = ({ label, value, icon, color = '#E6A23C' }: { label: string; value: number; icon: string; color?: string }) => (
    <ThemedView style={[styles.statCard, { borderLeftColor: color }]}>
      <IconSymbol name={icon as any} size={24} color={color} />
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </ThemedView>
  );

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'stats', label: 'الإحصائيات', icon: 'chart.bar.fill' },
    { key: 'accounts', label: 'الحسابات', icon: 'person.2.fill' },
    { key: 'logs', label: 'السجلات', icon: 'doc.text.fill' },
    { key: 'webhooks', label: 'Webhooks', icon: 'antenna.radiowaves.left.and.right' },
  ];

  const renderAccount = ({ item }: { item: AdminUser }) => (
    <ThemedView style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <ThemedText style={styles.listItemName}>{item.name}</ThemedText>
        <View style={[styles.badge, { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }]}>
          <ThemedText style={{ fontSize: 11, color: item.is_active ? '#4CAF50' : '#F44336' }}>
            {item.is_active ? 'نشط' : 'موقوف'}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={{ fontSize: 13, opacity: 0.6 }}>{item.email}</ThemedText>
      <View style={styles.listItemFooter}>
        <ThemedText style={{ fontSize: 12, opacity: 0.4 }}>الخطة: {item.plan}</ThemedText>
        <ThemedText style={{ fontSize: 12, opacity: 0.4 }}>الدور: {item.role}</ThemedText>
      </View>
      <TouchableOpacity
        style={[styles.toggleBtn, { backgroundColor: item.is_active ? '#FFEBEE' : '#E8F5E9' }]}
        onPress={async () => {
          try {
            await adminService.toggleUserStatus(item.id, !item.is_active);
            loadData();
          } catch (err: any) {
            Alert.alert('خطأ', err.message);
          }
        }}
      >
        <ThemedText style={{ fontSize: 13, color: item.is_active ? '#F44336' : '#4CAF50' }}>
          {item.is_active ? 'إيقاف' : 'تفعيل'}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  const renderLog = ({ item }: { item: AdminLog }) => (
    <ThemedView style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <ThemedText style={styles.listItemName}>{item.email}</ThemedText>
        <View style={[styles.badge, {
          backgroundColor: item.status === 'SUCCESS' ? '#E8F5E9' : item.status === 'FAILED' ? '#FFEBEE' : '#FFF8E1',
        }]}>
          <ThemedText style={{ fontSize: 11, color: item.status === 'SUCCESS' ? '#4CAF50' : item.status === 'FAILED' ? '#F44336' : '#E6A23C' }}>
            {item.status}
          </ThemedText>
        </View>
      </View>
      {item.connector_name && (
        <ThemedText style={{ fontSize: 12, opacity: 0.5 }}>الموصل: {item.connector_name}</ThemedText>
      )}
      <ThemedText style={{ fontSize: 12, opacity: 0.5 }}>{item.direction} · {new Date(item.created_at).toLocaleString('ar-SA')}</ThemedText>
    </ThemedView>
  );

  const renderWebhook = ({ item }: { item: AdminWebhook }) => (
    <ThemedView style={styles.listItem}>
      <View style={styles.listItemHeader}>
        <ThemedText style={styles.listItemName}>{item.connector_name || 'بدون موصل'}</ThemedText>
        <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
          <ThemedText style={{ fontSize: 11, color: '#2196F3' }}>{item.method}</ThemedText>
        </View>
      </View>
      <ThemedText style={{ fontSize: 12, opacity: 0.5 }}>المستخدم: {item.email}</ThemedText>
      <ThemedText style={{ fontSize: 12, opacity: 0.5 }}>IP: {item.source_ip} · {new Date(item.created_at).toLocaleString('ar-SA')}</ThemedText>
    </ThemedView>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={{ marginBottom: 16 }}>لوحة الأدمن</ThemedText>

      <View style={styles.tabsRow}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <IconSymbol name={t.icon as any} size={16} color={tab === t.key ? '#E6A23C' : '#999'} />
            <ThemedText style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#E6A23C" style={{ marginTop: 40 }} />
      ) : tab === 'stats' && stats ? (
        <View style={styles.statsGrid}>
          <StatCard label="المستخدمين" value={stats.totalUsers} icon="person.fill" />
          <StatCard label="النشطين" value={stats.activeUsers} icon="person.badge.fill" color="#4CAF50" />
          <StatCard label="الرسائل" value={stats.totalMessages} icon="envelope.fill" color="#2196F3" />
          <StatCard label="Webhooks" value={stats.totalWebhooks} icon="antenna.radiowaves.left.and.right" color="#9C27B0" />
          <StatCard label="الاتصالات" value={stats.totalConnectors} icon="cable.connector" color="#FF9800" />
        </View>
      ) : tab === 'accounts' ? (
        <View style={styles.listSection}>
          <ThemedText style={styles.sectionTitle}>جميع الحسابات ({users.length})</ThemedText>
          {users.map(u => <View key={u.id}>{renderAccount({ item: u })}</View>)}
        </View>
      ) : tab === 'logs' ? (
        <View style={styles.listSection}>
          <ThemedText style={styles.sectionTitle}>سجل الرسائل ({logs.length})</ThemedText>
          {logs.map(l => <View key={l.id}>{renderLog({ item: l })}</View>)}
        </View>
      ) : tab === 'webhooks' ? (
        <View style={styles.listSection}>
          <ThemedText style={styles.sectionTitle}>أحداث Webhook ({webhooks.length})</ThemedText>
          {webhooks.map(w => <View key={w.id}>{renderWebhook({ item: w })}</View>)}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa',
  },
  tabActive: { borderColor: '#E6A23C', backgroundColor: '#FFF8E1' },
  tabText: { fontSize: 13, color: '#666' },
  tabTextActive: { color: '#E6A23C', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '46%', backgroundColor: '#fafafa', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#eee', borderLeftWidth: 4, gap: 6,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, opacity: 0.5 },
  listSection: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  listItem: {
    backgroundColor: '#fafafa', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#eee', gap: 4, marginBottom: 8,
  },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItemName: { fontSize: 14, fontWeight: '600' },
  listItemFooter: { flexDirection: 'row', gap: 16, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  toggleBtn: {
    alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, marginTop: 8,
  },
});
