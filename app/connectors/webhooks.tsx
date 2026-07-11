import { StyleSheet, ScrollView, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { gatewayService } from '@/lib/services/gateway.service';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    try {
      const res = await gatewayService.fetch(`/webhook/events/${user.id}`);
      if (res.ok) setEvents(await res.json());
    } catch {}
  }, [user]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <ThemedText type="title" style={{ marginBottom: 4 }}>أحداث Webhook</ThemedText>
      <ThemedText style={styles.subtitle}>البيانات الواردة من المنصات الخارجية</ThemedText>

      {events.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <IconSymbol name="antenna.radiowaves.left.and.right" size={48} color="#ccc" />
          <ThemedText style={{ opacity: 0.5, marginTop: 12 }}>لا توجد أحداث بعد</ThemedText>
          <ThemedText style={{ opacity: 0.3, fontSize: 12 }}>عند إرسال منصة خارجية بيانات إلى رابط Webhook، ستظهر هنا</ThemedText>
        </ThemedView>
      ) : (
        events.map((event, i) => (
          <TouchableOpacity
            key={event.id || i}
            style={styles.eventCard}
            onPress={() => setSelected(selected === event.id ? null : event.id)}
          >
            <View style={styles.eventHeader}>
              <View style={[styles.methodBadge, { backgroundColor: event.method === 'POST' ? '#E8F5E9' : '#E3F2FD' }]}>
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: event.method === 'POST' ? '#4CAF50' : '#2196F3' }}>
                  {event.method}
                </ThemedText>
              </View>
              {event.connector_name && (
                <ThemedText style={{ fontSize: 12, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                  {event.connector_name}
                </ThemedText>
              )}
              <ThemedText style={{ fontSize: 11, opacity: 0.4 }}>
                {new Date(event.created_at).toLocaleString('ar-SA')}
              </ThemedText>
            </View>
            <ThemedText style={{ fontSize: 11, opacity: 0.4 }}>IP: {event.source_ip}</ThemedText>

            {selected === event.id && (
              <ThemedView style={styles.expandedSection}>
                <ThemedText style={styles.expandedLabel}>البيانات:</ThemedText>
                <ScrollView horizontal>
                  <ThemedText style={styles.payloadText}>
                    {event.body ? JSON.stringify(JSON.parse(event.body), null, 2) : '(فارغ)'}
                  </ThemedText>
                </ScrollView>
              </ThemedView>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
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
