import { StyleSheet, FlatList, TouchableOpacity, View, ScrollView, RefreshControl } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { gatewayService } from '@/lib/services/gateway.service';

interface WebhookEvent {
  id: string;
  connector_id: string;
  user_id: string;
  method: string;
  headers: string;
  body: string;
  source_ip: string;
  created_at: string;
  connector_name?: string;
}

export default function WebhookEventsScreen() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const res = await gatewayService.fetch('/webhook/events/me');
      if (res.ok) setEvents(await res.json());
    } catch (err) {
      console.debug('[Webhooks] Failed to load events:', err);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const parseBody = useCallback((body: string | null) => {
    if (!body) return '(فارغ)';
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }, []);

  const renderEventItem = useCallback(({ item }: { item: WebhookEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => setSelected(selected === item.id ? null : item.id)}
      accessibilityLabel={`حدث ${item.method} ${item.connector_name || ''}`}
      accessibilityRole="button"
    >
      <View style={styles.eventHeader}>
        <View style={[styles.methodBadge, { backgroundColor: item.method === 'POST' ? '#E8F5E9' : '#E3F2FD' }]}>
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: item.method === 'POST' ? '#4CAF50' : '#2196F3' }}>
            {item.method}
          </ThemedText>
        </View>
        {item.connector_name && (
          <ThemedText style={{ fontSize: 12, fontWeight: '500', flex: 1 }} numberOfLines={1}>
            {item.connector_name}
          </ThemedText>
        )}
        <ThemedText style={{ fontSize: 11, opacity: 0.4 }}>
          {new Date(item.created_at).toLocaleString('ar-SA')}
        </ThemedText>
      </View>
      <ThemedText style={{ fontSize: 11, opacity: 0.4 }}>IP: {item.source_ip}</ThemedText>

      {selected === item.id && (
        <ThemedView style={styles.expandedSection}>
          <ThemedText style={styles.expandedLabel}>البيانات:</ThemedText>
          <ScrollView horizontal>
            <ThemedText style={styles.payloadText}>
              {parseBody(item.body)}
            </ThemedText>
          </ScrollView>
        </ThemedView>
      )}
    </TouchableOpacity>
  ), [selected, parseBody]);

  const keyExtractor = useCallback((item: WebhookEvent, index: number) => item.id || `webhook-${index}-${item.created_at || ''}`, []);

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={{ marginBottom: 4 }}>أحداث Webhook</ThemedText>
      <ThemedText style={styles.subtitle}>البيانات الواردة من المنصات الخارجية</ThemedText>

      <FlatList
        data={events}
        keyExtractor={keyExtractor}
        renderItem={renderEventItem}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="antenna.radiowaves.left.and.right" size={48} color="#ccc" />
            <ThemedText style={{ opacity: 0.5, marginTop: 12 }}>لا توجد أحداث بعد</ThemedText>
            <ThemedText style={{ opacity: 0.3, fontSize: 12 }}>عند إرسال منصة خارجية بيانات إلى رابط Webhook، ستظهر هنا</ThemedText>
          </ThemedView>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { gap: 12, paddingBottom: 40 },
  subtitle: { fontSize: 13, opacity: 0.5, marginBottom: 8 },
  emptyState: { alignItems: 'center', padding: 48, gap: 4 },
  eventCard: {
    backgroundColor: '#fafafa', borderRadius: 12, padding: 14, gap: 4,
    borderWidth: 1, borderColor: '#eee',
  },
  eventHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  expandedSection: { marginTop: 8, gap: 4 },
  expandedLabel: { fontSize: 12, fontWeight: '600', opacity: 0.6 },
  payloadText: {
    fontSize: 11, fontFamily: 'monospace', backgroundColor: '#f0f0f0',
    padding: 8, borderRadius: 6,
  },
});
