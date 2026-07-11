import { StyleSheet, ScrollView, TouchableOpacity, Alert, View, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { connectorManager } from '@/lib/connectors/manager';
import { ConnectorConfig } from '@/lib/connectors/types';
import { gatewayService } from '@/lib/services/gateway.service';

export default function ConnectorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [connector, setConnector] = useState<ConnectorConfig | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const result = await connectorManager.getById(id);
    setConnector(result);
    const messageLogs = await connectorManager.getMessageLogs(id, 20);
    setLogs(messageLogs);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTest = async () => {
    if (!id) return;
    setTesting(true);
    const result = await connectorManager.testConnection(id);
    Alert.alert(
      result.success ? '✅ اتصال ناجح' : '❌ فشل الاتصال',
      result.success ? `زمن الاستجابة: ${result.latency}ms` : result.error || 'خطأ غير معروف'
    );
    setTesting(false);
    load();
  };

  const handleToggle = async () => {
    if (!id) return;
    await connectorManager.toggleActive(id);
    load();
  };

  const handleDelete = () => {
    if (!id || !connector) return;
    Alert.alert('حذف الاتصال', `هل أنت متأكد من حذف "${connector.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          await connectorManager.delete(id);
          router.back();
        },
      },
    ]);
  };

  if (!connector) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>جارٍ التحميل...</ThemedText>
      </ThemedView>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <ThemedView style={styles.infoRow}>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value}</ThemedText>
    </ThemedView>
  );

  const getLogColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '#4CAF50';
      case 'FAILED': return '#F44336';
      default: return '#FF9800';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">{connector.name}</ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: connector.isActive ? '#E8F5E9' : '#FFEBEE' }]}>
          <View style={[styles.statusDot, { backgroundColor: connector.isActive ? '#4CAF50' : '#9E9E9E' }]} />
          <ThemedText style={{ color: connector.isActive ? '#2E7D32' : '#9E9E9E', fontSize: 12 }}>
            {connector.isActive ? 'نشط' : 'متوقف'}
          </ThemedText>
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>معلومات الاتصال</ThemedText>
        <InfoRow label="نوع المنصة" value={connector.platformType} />
        <InfoRow label="البروتوكول" value={connector.protocol} />
        <InfoRow label="URL" value={connector.endpointUrl} />
        <InfoRow label="المصادقة" value={connector.auth.type} />
        <InfoRow label="الحالة" value={connector.status} />
        {connector.lastConnectedAt && (
          <InfoRow label="آخر اتصال" value={new Date(connector.lastConnectedAt).toLocaleString('ar-SA')} />
        )}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Webhook URL</ThemedText>
        <TouchableOpacity onPress={async () => {
          const url = await gatewayService.getWebhookUrl(connector.id);
          await Share.share({ message: url });
        }}>
          <ThemedText style={styles.webhookUrl} numberOfLines={1}>
            {gatewayService.apiUrl}/api/webhook/{connector.id}
          </ThemedText>
          <ThemedText style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>اضغط لمشاركة رابط Webhook</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E6A23C' }]} onPress={() => router.push(`/connectors/add?id=${id}`)}>
          <ThemedText style={styles.actionText}>تعديل</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={handleTest} disabled={testing}>
          <ThemedText style={styles.actionText}>{testing ? 'جارٍ...' : 'اختبار الاتصال'}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF9800' }]} onPress={handleToggle}>
          <ThemedText style={styles.actionText}>{connector.isActive ? 'إيقاف' : 'تشغيل'}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]} onPress={() => router.push(`/connectors/send?id=${id}`)}>
          <ThemedText style={styles.actionText}>إرسال بيانات</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#9C27B0' }]} onPress={() => router.push(`/connectors/mapping?id=${id}`)}>
          <ThemedText style={styles.actionText}>تعيين بيانات</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#607D8B' }]} onPress={async () => {
          const json = await connectorManager.exportConfig(connector.id);
          if (json) {
            await Share.share({ message: json, title: `تصدير ${connector.name}` });
          }
        }}>
          <ThemedText style={styles.actionText}>تصدير</ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>المزامنة الدورية</ThemedText>
        <View style={styles.syncRow}>
          {[0, 1, 5, 15, 30, 60, 360, 1440].map(min => (
            <TouchableOpacity
              key={min}
              style={[styles.syncBtn, connector.scheduleInterval === min && styles.syncBtnActive]}
              onPress={async () => {
                await connectorManager.updateSchedule(connector.id, min === 0 ? null : min);
                load();
              }}
            >
              <ThemedText style={[styles.syncBtnText, connector.scheduleInterval === min && styles.syncBtnTextActive]}>
                {min === 0 ? 'إيقاف' : min < 60 ? `${min} د` : min < 1440 ? `${min / 60} س` : 'يوم'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        {connector.scheduleInterval ? (
          <ThemedText style={{ fontSize: 12, opacity: 0.5 }}>
            التزامن كل {connector.scheduleInterval < 60 ? `${connector.scheduleInterval} دقيقة` : connector.scheduleInterval < 1440 ? `${connector.scheduleInterval / 60} ساعات` : 'يوم'} 
            {connector.lastSyncedAt ? ` · آخر مزامنة: ${new Date(connector.lastSyncedAt).toLocaleString('ar-SA')}` : ''}
          </ThemedText>
        ) : (
          <ThemedText style={{ fontSize: 12, opacity: 0.4 }}>المزامنة متوقفة</ThemedText>
        )}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>سجل العمليات</ThemedText>
        {logs.length === 0 ? (
          <ThemedText style={styles.emptyLogs}>لا توجد عمليات مسجلة</ThemedText>
        ) : (
          logs.map((log: any) => (
            <ThemedView key={log.id} style={styles.logItem}>
              <View style={[styles.logDot, { backgroundColor: getLogColor(log.status) }]} />
              <ThemedView style={styles.logInfo}>
                <ThemedText style={styles.logDirection}>{log.direction === 'SENT' ? 'إرسال' : 'استقبال'}</ThemedText>
                <ThemedText style={styles.logDate}>{new Date(log.created_at).toLocaleString('ar-SA')}</ThemedText>
              </ThemedView>
              <ThemedText style={styles.logSize}>{log.payload ? `${log.payload.length} B` : '0 B'}</ThemedText>
            </ThemedView>
          ))
        )}
      </ThemedView>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <ThemedText style={styles.deleteText}>حذف الاتصال</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  section: { gap: 8 },
  sectionTitle: { marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { fontSize: 13, opacity: 0.6 },
  infoValue: { fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyLogs: { opacity: 0.5, textAlign: 'center', padding: 16 },
  logItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logInfo: { flex: 1 },
  logDirection: { fontSize: 13 },
  logDate: { fontSize: 11, opacity: 0.5 },
  logSize: { fontSize: 11, opacity: 0.5 },
  webhookUrl: { fontSize: 12, color: '#2196F3', textDecorationLine: 'underline', marginTop: 4 },
  syncRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  syncBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  syncBtnActive: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  syncBtnText: { fontSize: 12, color: '#666' },
  syncBtnTextActive: { color: '#4CAF50', fontWeight: '600' },
  deleteBtn: { backgroundColor: '#FFEBEE', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  deleteText: { color: '#F44336', fontWeight: '600' },
});
