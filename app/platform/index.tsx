import { StyleSheet, ScrollView, TouchableOpacity, Alert, View, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useMarsal } from '@/lib/context/marsal-context';

export default function PlatformScreen() {
  const {
    connected,
    deviceRegistered,
    processing,
    lastResults,
    loginToMarsal,
    registerDevice,
    logoutFromMarsal,
    checkConnection,
  } = useMarsal();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const lastAttemptRef = useRef(0);
  const COOLDOWN_MS = 5000;

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('خطأ', 'أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }

    const now = Date.now();
    if (now - lastAttemptRef.current < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastAttemptRef.current)) / 1000);
      Alert.alert('خطأ', `انتظر ${remaining} ثانية قبل المحاولة مرة أخرى`);
      return;
    }

    setLoading(true);
    lastAttemptRef.current = Date.now();
    try {
      const result = await loginToMarsal(email, password);
      if (result) {
        Alert.alert('تم', 'تم الاتصال بالمنصة بنجاح');
        setShowLogin(false);
        setEmail('');
        setPassword('');
      } else {
        setEmail('');
        setPassword('');
        Alert.alert('خطأ', 'فشل تسجيل الدخول - تحقق من البيانات');
      }
    } catch (error: any) {
      setEmail('');
      setPassword('');
      Alert.alert('خطأ', error.message || 'فشل الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = async () => {
    setLoading(true);
    try {
      const result = await registerDevice();
      if (result) {
        Alert.alert('تم', 'تم تسجيل الجهاز بنجاح');
      } else {
        Alert.alert('خطأ', 'فشل تسجيل الجهاز');
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل تسجيل الجهاز');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('إلغاء الربط', 'هل تريد إلغاء الربط مع المنصة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إلغاء الربط',
        style: 'destructive',
        onPress: async () => {
          await logoutFromMarsal();
          Alert.alert('تم', 'تم إلغاء الربط');
        },
      },
    ]);
  };

  const StatusBadge = ({ active, label }: { active: boolean; label: string }) => (
    <View style={[styles.badge, { backgroundColor: active ? '#4CAF5020' : '#F4433620' }]}>
      <View style={[styles.badgeDot, { backgroundColor: active ? '#4CAF50' : '#F44336' }]} />
      <ThemedText style={[styles.badgeText, { color: active ? '#4CAF50' : '#F44336' }]}>{label}</ThemedText>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={{ marginBottom: 8 }}>مرسل الهدهد</ThemedText>
      <ThemedText style={{ opacity: 0.6, marginBottom: 20 }}>ربط تطبيق الهاتف مع منصة إرسال الرسائل</ThemedText>

      <ThemedView style={styles.statusCard}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>حالة الاتصال</ThemedText>
        <View style={styles.statusRow}>
          <StatusBadge active={connected} label={connected ? 'متصل' : 'غير متصل'} />
          <StatusBadge active={deviceRegistered} label={deviceRegistered ? 'الجهاز مسجل' : 'الجهاز غير مسجل'} />
        </View>
        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color="#E6A23C" />
            <ThemedText style={{ fontSize: 12, opacity: 0.6, marginLeft: 8 }}>جاري معالجة أوامر...</ThemedText>
          </View>
        )}
      </ThemedView>

      {!connected && !showLogin && (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowLogin(true)}>
          <IconSymbol name="link" size={18} color="#fff" />
          <ThemedText style={styles.primaryBtnText}>الاتصال بالمنصة</ThemedText>
        </TouchableOpacity>
      )}

      {showLogin && !connected && (
        <ThemedView style={styles.loginCard}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>تسجيل الدخول للمنصة</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="البريد الإلكتروني"
          />
          <TextInput
            style={styles.input}
            placeholder="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="كلمة المرور"
          />
          <View style={styles.loginBtns}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.primaryBtnText}>دخول</ThemedText>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { flex: 1 }]}
              onPress={() => { setShowLogin(false); setEmail(''); setPassword(''); }}
            >
              <ThemedText style={styles.secondaryBtnText}>إلغاء</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      )}

      {connected && !deviceRegistered && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleRegisterDevice}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <IconSymbol name="house.fill" size={18} color="#fff" />
              <ThemedText style={styles.primaryBtnText}>تسجيل هذا الجهاز</ThemedText>
            </>
          )}
        </TouchableOpacity>
      )}

      {connected && deviceRegistered && (
        <>
          <ThemedView style={styles.infoCard}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>الجهاز مسجل وجاهز</ThemedText>
            <ThemedText style={{ fontSize: 13, opacity: 0.6 }}>
              سيتم استقبال أوامر إرسال الرسائل تلقائياً من المنصة
            </ThemedText>
          </ThemedView>

          {lastResults.length > 0 && (
            <ThemedView style={styles.resultsCard}>
              <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>آخر نتائج الإرسال</ThemedText>
              {lastResults.slice(-5).reverse().map((result, index) => (
                <View key={index} style={styles.resultRow}>
                  <View style={[styles.resultDot, { backgroundColor: result.status === 'sent' ? '#4CAF50' : '#F44336' }]} />
                  <ThemedText style={{ fontSize: 12, flex: 1 }}>{result.phone}</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: result.status === 'sent' ? '#4CAF50' : '#F44336' }}>
                    {result.status === 'sent' ? 'تم الإرسال' : 'فشل'}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
          )}

          <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout}>
            <IconSymbol name="xmark.circle" size={18} color="#FF4D4F" />
            <ThemedText style={styles.dangerBtnText}>إلغاء الربط</ThemedText>
          </TouchableOpacity>
        </>
      )}

      <ThemedView style={styles.helpCard}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: 8 }}>كيف يعمل؟</ThemedText>
        <ThemedText style={{ fontSize: 13, opacity: 0.6, lineHeight: 20 }}>
          1. سجّل الدخول بحسابك في منصة مرسال الهدهد{'\n'}
          2. سجّل هذا الجهاز في المنصة{'\n'}
          3. سيتم استقبال أوامر إرسال الرسائل تلقائياً{'\n'}
          4. الهاتف يُرسل SMS من شريحته{'\n'}
          5. تُبلّغ المنصة عن حالة الإرسال
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  statusCard: {
    padding: 16, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, borderWidth: 1, borderColor: '#eee',
  },
  statusRow: { flexDirection: 'row', gap: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  processingRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
  },
  loginCard: {
    padding: 16, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, borderWidth: 1, borderColor: '#E6A23C',
    gap: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10, borderWidth: 1, borderColor: '#ddd',
    padding: 12, fontSize: 14, textAlign: 'right',
  },
  loginBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, backgroundColor: '#E6A23C',
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#ddd',
  },
  secondaryBtnText: { fontSize: 14, opacity: 0.6 },
  infoCard: {
    padding: 16, backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  resultsCard: {
    padding: 16, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, borderWidth: 1, borderColor: '#eee',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  resultDot: { width: 6, height: 6, borderRadius: 3 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, backgroundColor: '#FFEBEE',
    borderRadius: 12, borderWidth: 1, borderColor: '#FFCDD2',
  },
  dangerBtnText: { color: '#FF4D4F', fontSize: 14, fontWeight: '600' },
  helpCard: {
    padding: 16, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 1, borderColor: '#eee',
    marginTop: 8,
  },
});
