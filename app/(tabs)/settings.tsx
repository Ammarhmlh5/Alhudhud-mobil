import { StyleSheet, ScrollView, TouchableOpacity, Alert, View, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/hooks/useAuth';
import { useThemeMode } from '@/lib/context/theme-context';
import { connectorManager } from '@/lib/connectors/manager';
import { ConnectorConfig } from '@/lib/connectors/types';
import { ApiKeyModal } from '@/components/ApiKeyModal';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, requestApiKey } = useAuth();
  const { themeMode, setThemeMode } = useThemeMode();
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState('');

  const loadConnectors = useCallback(async () => {
    const result = await connectorManager.getAll();
    setConnectors(result);
  }, []);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConnectors();
    setRefreshing(false);
  }, [loadConnectors]);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleRequestApiKey = async () => {
    Alert.alert('طلب مفتاح API', 'سيتم إرسال مفتاح API إلى بريدك الإلكتروني', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إرسال',
        onPress: async () => {
          try {
            const result = await requestApiKey();
            Alert.alert('تم الإرسال', 'تم إرسال المفتاح إلى بريدك الإلكتروني');
          } catch (error: any) {
            Alert.alert('خطأ', error.message || 'فشل إرسال المفتاح');
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

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <ThemedView style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </ThemedView>
  );

  const SettingRow = ({ icon, label, value, onPress, color }: {
    icon: string; label: string; value?: string; onPress?: () => void; color?: string;
  }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress}>
      <IconSymbol name={icon as any} size={20} color={color || '#666'} />
      <ThemedText style={styles.settingLabel}>{label}</ThemedText>
      <View style={styles.settingRight}>
        {value && <ThemedText style={styles.settingValue}>{value}</ThemedText>}
        {onPress && <IconSymbol name="chevron.left" size={14} color="#ccc" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ThemedText type="title" style={{ marginBottom: 16 }}>الإعدادات</ThemedText>

      {user && (
        <Section title="الحساب">
          <ThemedView style={styles.profileCard}>
            <View style={styles.avatar}>
              <IconSymbol name="person.fill" size={28} color="#E6A23C" />
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="defaultSemiBold">{user.name}</ThemedText>
              <ThemedText style={{ fontSize: 13, opacity: 0.6 }}>{user.email}</ThemedText>
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleText}>
                  {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        </Section>
      )}

      <Section title="الربط بالبوابات (الاتصالات)">
        <TouchableOpacity style={styles.connectorHeader} onPress={() => router.push('/connectors/index')}>
          <View style={styles.connectorHeaderRow}>
            <IconSymbol name="antenna.radiowaves.left.and.right" size={20} color="#E6A23C" />
            <ThemedText style={styles.connectorHeaderText}>إدارة الاتصالات</ThemedText>
          </View>
          <View style={styles.connectorHeaderRight}>
            <View style={styles.connectorStats}>
              <View style={[styles.miniDot, { backgroundColor: '#4CAF50' }]} />
              <ThemedText style={styles.miniText}>
                {connectors.filter(c => c.status === 'ONLINE').length}/{connectors.length} متصل
              </ThemedText>
            </View>
            <IconSymbol name="chevron.left" size={14} color="#ccc" />
          </View>
        </TouchableOpacity>

        {connectors.length > 0 && (
          <ThemedView style={styles.connectorList}>
            {connectors.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.connectorItem}
                onPress={() => router.push(`/connectors/${item.id}`)}
              >
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status, item.isActive) }]} />
                <View style={styles.connectorItemInfo}>
                  <ThemedText style={styles.connectorItemName}>{item.name}</ThemedText>
                  <ThemedText style={styles.connectorItemMeta}>
                    {item.platformType} · {item.protocol}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.left" size={12} color="#ccc" />
              </TouchableOpacity>
            ))}
            {connectors.length > 5 && (
              <TouchableOpacity onPress={() => router.push('/connectors/index')}>
                <ThemedText style={styles.seeAllText}>عرض الكل ({connectors.length})</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        )}

        <TouchableOpacity
          style={styles.addConnectorBtn}
          onPress={() => router.push('/connectors/add')}
        >
          <IconSymbol name="plus" size={18} color="#E6A23C" />
          <ThemedText style={styles.addConnectorText}>إضافة اتصال جديد</ThemedText>
        </TouchableOpacity>
      </Section>

      <Section title="المظهر">
        <SettingRow
          icon={themeMode === 'dark' ? 'moon.fill' : themeMode === 'light' ? 'sun.max.fill' : 'circle.lefthalf.fill'}
          label="وضع العرض"
          value={themeMode === 'dark' ? 'داكن' : themeMode === 'light' ? 'فاتح' : 'تلقائي'}
          onPress={() => {
            const modes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
            const next = modes[(modes.indexOf(themeMode) + 1) % modes.length];
            setThemeMode(next);
          }}
        />
      </Section>

      <Section title="الاشتراكات">
        <SettingRow
          icon="creditcard.fill"
          label="إدارة الاشتراك"
          onPress={() => router.push('/subscription')}
        />
      </Section>

      <Section title="الأمان">
        <SettingRow
          icon="key.fill"
          label="طلب مفتاح API"
          value="يُرسل للبريد"
          onPress={handleRequestApiKey}
        />
      </Section>

      {user?.role === 'admin' && (
        <Section title="الإدارة">
          <SettingRow
            icon="shield.fill"
            label="لوحة الأدمن"
            color="#9C27B0"
            onPress={() => router.push('/admin')}
          />
        </Section>
      )}

      <Section title="التطبيق">
        <SettingRow icon="info.circle" label="الإصدار" value="1.0.0" />
        <SettingRow icon="doc.text" label="الشروط والأحكام" onPress={() => {}} />
        <SettingRow icon="lock.shield" label="سياسة الخصوصية" onPress={() => {}} />
      </Section>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#FF4D4F" />
        <ThemedText style={styles.logoutText}>تسجيل الخروج</ThemedText>
      </TouchableOpacity>

      <ApiKeyModal
        visible={showApiKeyModal}
        apiKey={currentApiKey}
        onClose={() => setShowApiKeyModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  section: { gap: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '600', opacity: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, borderWidth: 1, borderColor: '#eee',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { gap: 4, flex: 1 },
  roleBadge: {
    alignSelf: 'flex-start', backgroundColor: '#E6A23C20',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2,
  },
  roleText: { fontSize: 11, color: '#E6A23C', fontWeight: '600' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, borderWidth: 1, borderColor: '#eee',
  },
  settingLabel: { flex: 1, fontSize: 14 },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontSize: 13, opacity: 0.5 },
  connectorHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, borderWidth: 1, borderColor: '#E6A23C',
  },
  connectorHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connectorHeaderText: { fontSize: 14, fontWeight: '600', color: '#E6A23C' },
  connectorHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectorStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  miniText: { fontSize: 12, opacity: 0.6 },
  connectorList: {
    gap: 4,
  },
  connectorItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, borderWidth: 1, borderColor: '#eee',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  connectorItemInfo: { flex: 1, gap: 2 },
  connectorItemName: { fontSize: 13, fontWeight: '500' },
  connectorItemMeta: { fontSize: 11, opacity: 0.5 },
  seeAllText: { textAlign: 'center', color: '#E6A23C', fontSize: 13, fontWeight: '500', paddingVertical: 8 },
  addConnectorBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 10,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#E6A23C',
  },
  addConnectorText: { color: '#E6A23C', fontSize: 13, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, marginTop: 8,
    backgroundColor: '#FFEBEE', borderRadius: 12, borderWidth: 1, borderColor: '#FFCDD2',
  },
  logoutText: { color: '#FF4D4F', fontSize: 16, fontWeight: '600' },
});
