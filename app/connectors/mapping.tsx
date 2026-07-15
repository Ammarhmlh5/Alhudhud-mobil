import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { connectorManager } from '@/lib/connectors/manager';
import { ConnectorConfig, MappingRule } from '@/lib/connectors/types';

const TRANSFORMS = [
  { label: 'بدون تحويل', value: 'none' },
  { label: 'أحرف كبيرة', value: 'uppercase' },
  { label: 'أحرف صغيرة', value: 'lowercase' },
  { label: 'نص', value: 'to_string' },
  { label: 'رقم', value: 'to_number' },
  { label: 'طابع زمني', value: 'timestamp' },
  { label: 'دمج', value: 'concat' },
] as const;

export default function MappingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [connector, setConnector] = useState<ConnectorConfig | null>(null);
  const [rules, setRules] = useState<MappingRule[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      connectorManager.getById(id).then(c => {
        setConnector(c);
        if (c?.dataMapping?.rules) {
          setRules(c.dataMapping.rules);
        }
      });
    }
  }, [id]);

  const addRule = () => {
    setRules([...rules, { sourceField: '', targetField: '', transform: 'none' }]);
  };

  const updateRule = (index: number, field: keyof MappingRule, value: any) => {
    const updated = [...rules];
    (updated[index] as any)[field] = value;
    if (field === 'transform' && value !== 'concat') {
      delete updated[index].concatFields;
    }
    setRules(updated);
  };

  const removeRule = (index: number) => {
    if (rules.length <= 1) { setRules([]); return; }
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!id) return;
    const validRules = rules.filter(r => r.sourceField.trim() && r.targetField.trim());
    if (validRules.length === 0 && rules.length > 0) {
      Alert.alert('خطأ', 'يرجى تعبئة الحقول المصدر والهدف لكل قاعدة');
      return;
    }

    setSaving(true);
    try {
      await connectorManager.updateMapping(id, { rules: validRules });
      Alert.alert('✅ تم الحفظ', 'تم حفظ تعيين البيانات بنجاح');
      router.back();
    } catch (error: any) {
      Alert.alert('خطأ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const loadSampleMapping = () => {
    setRules([
      { sourceField: 'user.name', targetField: 'full_name', transform: 'uppercase' },
      { sourceField: 'user.email', targetField: 'email_address', transform: 'lowercase' },
      { sourceField: 'created_at', targetField: 'timestamp', transform: 'timestamp' },
      { sourceField: '', targetField: 'display_name', transform: 'concat', concatFields: ['user.name', 'user.email'] },
    ]);
  };

  if (!connector) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>جارٍ التحميل...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title">تعيين البيانات</ThemedText>
      <ThemedText style={styles.subtitle}>{connector.name}</ThemedText>

      <ThemedText style={styles.desc}>
        حدد كيف يتم تعيين الحقول من مصدر البيانات إلى حقول وجهة المنصة.
        هذا يتيح تحويل البيانات تلقائياً بدون كتابة كود.
      </ThemedText>

      <View style={styles.headerRow}>
        <ThemedText style={styles.sectionTitle}>قواعد التعيين ({rules.length})</ThemedText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.sampleBtn} onPress={loadSampleMapping}>
            <IconSymbol name="doc.text.fill" size={14} color="#2196F3" />
            <ThemedText style={styles.sampleBtnText}>نموذج</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={addRule}>
            <IconSymbol name="plus" size={16} color="#E6A23C" />
            <ThemedText style={styles.addBtnText}>إضافة قاعدة</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {rules.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <IconSymbol name="arrow.triangle.swap" size={40} color="#ccc" />
          <ThemedText style={{ opacity: 0.5, marginTop: 8 }}>لا توجد قواعد تعيين</ThemedText>
          <ThemedText style={{ opacity: 0.3, fontSize: 12 }}>أضف قاعدة لتحديد كيفية تحويل البيانات</ThemedText>
        </ThemedView>
      ) : (
        rules.map((rule, index) => (
          <ThemedView key={`${rule.sourceField}-${rule.targetField}-${index}`} style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <ThemedText style={styles.ruleNum}>القاعدة {index + 1}</ThemedText>
              <TouchableOpacity onPress={() => removeRule(index)}>
                <IconSymbol name="trash.fill" size={16} color="#F44336" />
              </TouchableOpacity>
            </View>

            <View style={styles.ruleRow}>
              <View style={styles.ruleField}>
                <ThemedText style={styles.fieldLabel}>حقل المصدر</ThemedText>
                <TextInput
                  style={styles.input}
                  value={rule.sourceField}
                  onChangeText={v => updateRule(index, 'sourceField', v)}
                  placeholder="user.name"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>
              <IconSymbol name="arrow.right" size={16} color="#E6A23C" style={{ marginTop: 24 }} />
              <View style={styles.ruleField}>
                <ThemedText style={styles.fieldLabel}>حقل الهدف</ThemedText>
                <TextInput
                  style={styles.input}
                  value={rule.targetField}
                  onChangeText={v => updateRule(index, 'targetField', v)}
                  placeholder="full_name"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.ruleRow}>
              <View style={styles.ruleField}>
                <ThemedText style={styles.fieldLabel}>تحويل</ThemedText>
                <View style={styles.transformRow}>
                  {TRANSFORMS.map(t => (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.transformBtn, rule.transform === t.value && styles.transformActive]}
                      onPress={() => updateRule(index, 'transform', t.value)}
                    >
                      <ThemedText style={[styles.transformText, rule.transform === t.value && styles.transformTextActive]}>
                        {t.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {rule.transform === 'concat' && (
              <View style={styles.ruleRow}>
                <View style={styles.ruleField}>
                  <ThemedText style={styles.fieldLabel}>حقول الدمج (مفصولة بفواصل)</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={(rule.concatFields || []).join(', ')}
                    onChangeText={v => updateRule(index, 'concatFields', v.split(',').map(s => s.trim()))}
                    placeholder="user.name, user.email"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            <View style={styles.ruleRow}>
              <View style={styles.ruleField}>
                <ThemedText style={styles.fieldLabel}>القيمة الافتراضية (اختياري)</ThemedText>
                <TextInput
                  style={styles.input}
                  value={rule.defaultValue || ''}
                  onChangeText={v => updateRule(index, 'defaultValue', v)}
                  placeholder="قيمة افتراضية عند عدم وجود الحقل"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </ThemedView>
        ))
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <ThemedText style={styles.saveBtnText}>
            {saving ? 'جارٍ الحفظ...' : rules.length > 0 ? 'حفظ التعيين' : 'مسح التعيين وحفظ'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  subtitle: { fontSize: 13, opacity: 0.6 },
  desc: { fontSize: 13, opacity: 0.7, lineHeight: 20, backgroundColor: '#f0f7ff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d0e3f7' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  sampleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  sampleBtnText: { fontSize: 11, color: '#2196F3', fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E6A23C', backgroundColor: '#FFF8E1' },
  addBtnText: { fontSize: 11, color: '#E6A23C', fontWeight: '600' },
  addRuleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E6A23C' },
  emptyState: { alignItems: 'center', padding: 32, gap: 4 },
  ruleCard: {
    backgroundColor: '#fafafa', borderRadius: 14, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#eee',
  },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ruleNum: { fontSize: 12, fontWeight: '600', color: '#E6A23C' },
  ruleRow: { gap: 6 },
  ruleField: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '500', opacity: 0.6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 13, backgroundColor: '#fff',
  },
  transformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  transformBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff',
  },
  transformActive: { borderColor: '#E6A23C', backgroundColor: '#FFF8E1' },
  transformText: { fontSize: 11, color: '#666' },
  transformTextActive: { color: '#E6A23C', fontWeight: '600' },
  actions: { marginTop: 8 },
  saveBtn: {
    backgroundColor: '#E6A23C', padding: 16, borderRadius: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
