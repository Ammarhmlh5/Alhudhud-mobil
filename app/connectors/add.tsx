import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { connectorManager } from '@/lib/connectors/manager';
import { ProtocolType, AuthType } from '@/lib/connectors/types';
import { CONNECTOR_PRESETS, ConnectorPreset } from '@/lib/connectors/presets';

const PROTOCOLS: { label: string; value: ProtocolType }[] = [
  { label: 'REST API', value: 'REST' },
  { label: 'Webhook', value: 'Webhook' },
  { label: 'WebSocket', value: 'WebSocket' },
];

const AUTH_TYPES: { label: string; value: AuthType }[] = [
  { label: 'بدون مصادقة', value: 'NONE' },
  { label: 'API Key', value: 'API_KEY' },
  { label: 'Basic Auth', value: 'BASIC' },
  { label: 'Bearer Token', value: 'BEARER' },
  { label: 'OAuth2', value: 'OAUTH2' },
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export default function AddConnectorScreen() {
  const router = useRouter();
  const { preset: presetId, id: editId } = useLocalSearchParams<{ preset?: string; id?: string }>();
  const [step, setStep] = useState<'presets' | 'form'>('presets');
  const [preset, setPreset] = useState<ConnectorPreset | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  const [name, setName] = useState('');
  const [platformType, setPlatformType] = useState('');
  const [protocol, setProtocol] = useState<ProtocolType>('REST');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('POST');
  const [authType, setAuthType] = useState<AuthType>('NONE');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [headers, setHeaders] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEdit = useCallback(async () => {
    if (!editId) return;
    setIsEdit(true);
    setStep('form');
    try {
      const c = await connectorManager.getById(editId);
      if (!c) return;
      setName(c.name);
      setPlatformType(c.platformType);
      setProtocol(c.protocol);
      setEndpointUrl(c.endpointUrl);
      setHttpMethod((c as any).httpMethod || 'POST');
      setAuthType(c.auth.type);
      setApiKey((c.auth as any).apiKey || '');
      setApiKeyHeader((c.auth as any).apiKeyHeader || '');
      setUsername((c.auth as any).username || '');
      setPassword((c.auth as any).password || '');
      setToken(c.auth.type === 'OAUTH2' ? ((c.auth as any).tokenUrl || '') : ((c.auth as any).token || ''));
      setHeaders((c as any).rawHeaders || '');
    } catch { /* ignore */ }
  }, [editId]);

  useEffect(() => { loadEdit(); }, [loadEdit]);

  useEffect(() => {
    if (presetId && !editId) {
      const found = CONNECTOR_PRESETS.find(p => p.id === presetId);
      if (found) selectPreset(found);
    }
  }, [presetId, editId]);

  const selectPreset = (p: ConnectorPreset) => {
    setPreset(p);
    setName(p.name + (p.name.endsWith('عام') ? '' : ` - ${Date.now()}`));
    setPlatformType(p.platformType);
    setProtocol(p.protocol);
    setEndpointUrl(p.endpointUrl);
    setHttpMethod(p.httpMethod);
    setAuthType(p.authType);
    if (p.headers) {
      setHeaders(Object.entries(p.headers).map(([k, v]) => `${k}: ${v}`).join('\n'));
    } else {
      setHeaders('');
    }
    setApiKey('');
    setApiKeyHeader('');
    setUsername('');
    setPassword('');
    setToken('');
    setStep('form');
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('خطأ', 'الرجاء إدخال اسم الاتصال'); return; }
    if (!endpointUrl.trim()) { Alert.alert('خطأ', 'الرجاء إدخال عنوان URL'); return; }

    setSaving(true);
    try {
      const url = endpointUrl.trim();
      const payload: any = {
        name: name.trim(),
        platformType: platformType.trim() || 'Custom',
        protocol,
        endpointUrl: preset && url === preset.endpointUrl ? url : url,
        httpMethod,
        authType,
        headers: headers.trim(),
      };

      if (authType === 'OAUTH2') {
        payload.tokenUrl = token.trim();
        payload.clientId = username.trim();
        payload.clientSecret = password.trim();
        payload.scope = apiKey.trim();
      } else {
        payload.apiKey = apiKey.trim();
        payload.apiKeyHeader = apiKeyHeader.trim();
        payload.username = username.trim();
        payload.password = password.trim();
        payload.token = token.trim();
      }

      if (isEdit && editId) {
        await connectorManager.update(editId, payload);
      } else {
        await connectorManager.create(payload);
      }
      router.back();
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في حفظ الاتصال');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'presets') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.screenTitle}>إضافة اتصال جديد</ThemedText>
        <ThemedText style={styles.hint}>اختر منصة جاهزة أو أعد الإعداد يدوياً</ThemedText>

        <View style={styles.presetsGrid}>
          {CONNECTOR_PRESETS.map(p => (
            <TouchableOpacity key={p.id} style={styles.presetCard} onPress={() => selectPreset(p)}>
              <IconSymbol name={p.icon as any} size={28} color="#E6A23C" />
              <ThemedText style={styles.presetName}>{p.name}</ThemedText>
              <ThemedText style={styles.presetDesc}>{p.description}</ThemedText>
              <View style={styles.presetBadge}>
                <ThemedText style={styles.presetBadgeText}>{p.protocol}</ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.customBtn} onPress={() => { setPreset(null); setStep('form'); }}>
          <IconSymbol name="gearshape.fill" size={18} color="#666" />
          <ThemedText style={styles.customBtnText}>إعداد يدوي كامل</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const ProtocolSelector = ({ options, selected, onSelect, label }: any) => (
    <ThemedView style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.optionsRow}>
        {options.map((opt: any) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionBtn, selected === opt.value && styles.optionActive]}
            onPress={() => onSelect(opt.value)}
          >
            <ThemedText style={[styles.optionText, selected === opt.value && styles.optionTextActive]}>
              {opt.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </ThemedView>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!isEdit && (
        <TouchableOpacity style={styles.backToPresets} onPress={() => setStep('presets')}>
          <IconSymbol name="chevron.left" size={16} color="#E6A23C" />
          <ThemedText style={styles.backToPresetsText}>العودة للقوالب</ThemedText>
        </TouchableOpacity>
      )}

      <ThemedText type="title" style={styles.screenTitle}>
        {isEdit ? 'تعديل الاتصال' : preset ? preset.name : 'إعداد يدوي'}
      </ThemedText>

      <ThemedView style={styles.field}>
        <ThemedText style={styles.label}>اسم الاتصال</ThemedText>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="مثال: منصة الرسائل" placeholderTextColor="#999" />
      </ThemedView>

      <ThemedView style={styles.field}>
        <ThemedText style={styles.label}>نوع المنصة</ThemedText>
        <TextInput style={styles.input} value={platformType} onChangeText={setPlatformType} placeholder="مثال: Messaging, Accounting" placeholderTextColor="#999" />
      </ThemedView>

      <ProtocolSelector options={PROTOCOLS} selected={protocol} onSelect={setProtocol} label="بروتوكول الاتصال" />

      <ThemedView style={styles.field}>
        <ThemedText style={styles.label}>عنوان URL</ThemedText>
        <TextInput style={styles.input} value={endpointUrl} onChangeText={setEndpointUrl} placeholder="https://api.example.com/endpoint" placeholderTextColor="#999" autoCapitalize="none" />
      </ThemedView>

      {protocol === 'REST' && (
        <>
          <ProtocolSelector options={HTTP_METHODS.map(m => ({ label: m, value: m }))} selected={httpMethod} onPress={undefined} onSelect={setHttpMethod} label="طريقة HTTP" />

          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>هيدرات إضافية (اختياري)</ThemedText>
            <TextInput style={[styles.input, styles.multiline]} value={headers} onChangeText={setHeaders} placeholder="Content-Type: application/json&#10;X-Custom: value" placeholderTextColor="#999" multiline numberOfLines={3} />
          </ThemedView>
        </>
      )}

      <ProtocolSelector options={AUTH_TYPES} selected={authType} onPress={undefined} onSelect={setAuthType} label="نوع المصادقة" />

      {preset?.authHint && authType !== 'NONE' && (
        <ThemedView style={styles.hintBox}>
          <ThemedText style={styles.hintBoxText}>{preset.authHint}</ThemedText>
        </ThemedView>
      )}

      {authType === 'API_KEY' && (
        <>
          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>API Key</ThemedText>
            <TextInput style={styles.input} value={apiKey} onChangeText={setApiKey} placeholder="your-api-key" placeholderTextColor="#999" />
          </ThemedView>
          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>اسم Header (اختياري)</ThemedText>
            <TextInput style={styles.input} value={apiKeyHeader} onChangeText={setApiKeyHeader} placeholder="X-API-Key" placeholderTextColor="#999" />
          </ThemedView>
        </>
      )}

      {authType === 'BASIC' && (
        <>
          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>اسم المستخدم</ThemedText>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="username" placeholderTextColor="#999" />
          </ThemedView>
          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>كلمة المرور</ThemedText>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="password" placeholderTextColor="#999" secureTextEntry />
          </ThemedView>
        </>
      )}

      {authType === 'BEARER' && (
        <ThemedView style={styles.field}>
          <ThemedText style={styles.label}>Token</ThemedText>
          <TextInput style={styles.input} value={token} onChangeText={setToken} placeholder="Bearer token" placeholderTextColor="#999" />
        </ThemedView>
      )}

      {authType === 'OAUTH2' && (
        <>
          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>Token URL</ThemedText>
            <TextInput style={styles.input} value={token || ''} onChangeText={v => setToken(v)} placeholder="https://provider.com/oauth/token" placeholderTextColor="#999" autoCapitalize="none" />
          </ThemedView>
          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>Client ID</ThemedText>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="your-client-id" placeholderTextColor="#999" autoCapitalize="none" />
          </ThemedView>
          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>Client Secret</ThemedText>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="your-client-secret" placeholderTextColor="#999" secureTextEntry />
          </ThemedView>
          <ThemedView style={styles.field}>
            <ThemedText style={styles.label}>Scope (اختياري)</ThemedText>
            <TextInput style={styles.input} value={apiKey} onChangeText={setApiKey} placeholder="read,write" placeholderTextColor="#999" autoCapitalize="none" />
          </ThemedView>
        </>
      )}

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <ThemedText style={styles.saveBtnText}>{saving ? 'جارٍ الحفظ...' : isEdit ? 'تحديث الاتصال' : 'حفظ الاتصال'}</ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  screenTitle: { marginBottom: 8 },
  hint: { fontSize: 14, opacity: 0.6, marginBottom: 8 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  presetCard: {
    width: '47%', backgroundColor: '#fafafa', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#eee', gap: 6,
  },
  presetName: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  presetDesc: { fontSize: 11, opacity: 0.6, lineHeight: 15 },
  presetBadge: {
    alignSelf: 'flex-start', backgroundColor: '#E6A23C20', paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 6, marginTop: 4,
  },
  presetBadgeText: { fontSize: 10, color: '#E6A23C', fontWeight: '600' },
  customBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', marginTop: 8,
  },
  customBtnText: { color: '#666', fontSize: 14, fontWeight: '500' },
  backToPresets: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backToPresetsText: { color: '#E6A23C', fontSize: 14 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 14, backgroundColor: '#fafafa',
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  optionActive: { borderColor: '#E6A23C', backgroundColor: '#FFF8E1' },
  optionText: { fontSize: 13, color: '#666' },
  optionTextActive: { color: '#E6A23C', fontWeight: '600' },
  hintBox: { backgroundColor: '#FFF8E1', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E6A23C40' },
  hintBoxText: { fontSize: 12, color: '#B8860B', lineHeight: 18 },
  formActions: { marginTop: 8, gap: 8 },
  saveBtn: {
    backgroundColor: '#E6A23C', padding: 16, borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
