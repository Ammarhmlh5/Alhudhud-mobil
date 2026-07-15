import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { connectorManager } from '@/lib/connectors/manager';
import { ConnectorConfig } from '@/lib/connectors/types';
import { CONNECTOR_PRESETS, getPresetById } from '@/lib/connectors/presets';

export default function SendDataScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [connector, setConnector] = useState<ConnectorConfig | null>(null);
  const [payload, setPayload] = useState('{}');
  const [response, setResponse] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);

  const preset = connector ? getPresetById(
    CONNECTOR_PRESETS.find(p =>
      connector?.endpointUrl.includes(p.endpointUrl.split('/')[2] || '') &&
      p.name === connector?.name.split(' - ')[0]
    )?.id || ''
  ) : null;

  useEffect(() => {
    if (id) {
      connectorManager.getById(id).then(c => {
        setConnector(c);
        const matched = CONNECTOR_PRESETS.find(p =>
          c?.endpointUrl.includes(p.endpointUrl.split('/')[2] || '')
        );
        if (matched) {
          setPayload(matched.samplePayload);
        }
      });
    }
  }, [id]);

  const validateJson = (text: string): any => {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('JSON غير صالح. تأكد من التنسيق');
    }
  };

  const handleSend = async () => {
    if (!id) return;
    setSending(true);
    setResponse(null);

    try {
      const data = validateJson(payload);
      const result = await connectorManager.sendWithMapping(id, data);

      if (result.success) {
        setResponse(JSON.stringify(result.data, null, 2));
        Alert.alert('✅ تم الإرسال', 'تم إرسال البيانات بنجاح');
      } else {
        setResponse(result.error || 'فشل الإرسال');
        Alert.alert('❌ فشل الإرسال', result.error || 'خطأ غير معروف');
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSending(false);
    }
  };

  if (!connector) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>جارٍ التحميل...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">إرسال بيانات</ThemedText>
        <ThemedText style={styles.subtitle}>إلى: {connector.name}</ThemedText>
        <ThemedText style={styles.subtitle}>{connector.endpointUrl}</ThemedText>

        {preset && (
          <ThemedView style={styles.presetBanner}>
            <IconSymbol name="info.circle.fill" size={16} color="#E6A23C" />
            <ThemedText style={styles.presetBannerText}>
              قالب {preset.name} - استخدم النموذج المتوافق مع API المنصة
            </ThemedText>
          </ThemedView>
        )}

        <ThemedView style={styles.samples}>
          <TouchableOpacity
            style={styles.samplesHeader}
            onPress={() => setShowTemplates(!showTemplates)}
          >
            <ThemedText style={styles.samplesLabel}>نماذج جاهزة</ThemedText>
            <IconSymbol name={showTemplates ? 'chevron.up' : 'chevron.down'} size={14} color="#666" />
          </TouchableOpacity>
          {showTemplates && (
            <View style={styles.sampleBtns}>
              {preset ? (
                <TouchableOpacity style={styles.sampleBtn} onPress={() => setPayload(preset.samplePayload)}>
                  <IconSymbol name="doc.text.fill" size={14} color="#E6A23C" />
                  <ThemedText style={styles.sampleBtnText}>{preset.name}</ThemedText>
                </TouchableOpacity>
              ) : (
                CONNECTOR_PRESETS.filter(p => p.protocol === connector.protocol).map(p => (
                  <TouchableOpacity key={p.id} style={styles.sampleBtn} onPress={() => setPayload(p.samplePayload)}>
                    <IconSymbol name="doc.text.fill" size={14} color="#E6A23C" />
                    <ThemedText style={styles.sampleBtnText}>{p.name}</ThemedText>
                  </TouchableOpacity>
                ))
              )}
              <TouchableOpacity style={styles.sampleBtn} onPress={() => setPayload(JSON.stringify({ message: 'Hello', timestamp: new Date().toISOString() }, null, 2))}>
                <ThemedText style={styles.sampleBtnText}>رسالة</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sampleBtn} onPress={() => setPayload(JSON.stringify({ event: 'test', data: { id: 1 }, source: 'alhudhud' }, null, 2))}>
                <ThemedText style={styles.sampleBtnText}>حدث</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sampleBtn} onPress={() => setPayload(JSON.stringify({ action: 'sync', records: [{ id: 1, status: 'pending' }] }, null, 2))}>
                <ThemedText style={styles.sampleBtnText}>مزامنة</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>

        <ThemedView style={styles.field}>
          <View style={styles.fieldHeader}>
            <ThemedText style={styles.label}>JSON Payload</ThemedText>
            <TouchableOpacity onPress={() => setPayload('')}>
              <ThemedText style={{ fontSize: 12, color: '#999' }}>مسح</ThemedText>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.jsonInput}
            value={payload}
            onChangeText={setPayload}
            multiline
            numberOfLines={10}
            placeholder='{"key": "value"}'
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ThemedView>

        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          <IconSymbol name="paperplane.fill" size={18} color="#fff" />
          <ThemedText style={styles.sendBtnText}>
            {sending ? 'جارٍ الإرسال...' : 'إرسال البيانات'}
          </ThemedText>
        </TouchableOpacity>

        {response && (
          <ThemedView style={styles.responseSection}>
            <ThemedText type="defaultSemiBold">الرد:</ThemedText>
            <TextInput
              style={styles.responseInput}
              value={response}
              editable={false}
              multiline
            />
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => setResponse(null)}
            >
              <ThemedText style={styles.copyBtnText}>مسح الرد</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  subtitle: { fontSize: 13, opacity: 0.6 },
  presetBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E1', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#E6A23C40',
  },
  presetBannerText: { fontSize: 12, color: '#B8860B', flex: 1, lineHeight: 17 },
  samples: { gap: 8 },
  samplesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  samplesLabel: { fontSize: 13, fontWeight: '600' },
  sampleBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sampleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#E6A23C', backgroundColor: '#FFF8E1',
  },
  sampleBtnText: { fontSize: 12, color: '#E6A23C' },
  field: { gap: 6 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
  jsonInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 13, backgroundColor: '#fafafa',
    minHeight: 200, textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sendBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#E6A23C', padding: 16, borderRadius: 12,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  responseSection: { gap: 8, marginTop: 8 },
  responseInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 13, backgroundColor: '#f5f5f5',
    minHeight: 100, textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyBtn: { alignSelf: 'flex-end' },
  copyBtnText: { fontSize: 13, color: '#999' },
});
