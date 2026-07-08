import { useState, useEffect } from 'react';
import { StyleSheet, Button, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { supabase } from '@/lib/supabaseClient';

/**
 * صفحة اختبار Supabase
 * يمكن الوصول إليها من خلال التنقل في التطبيق
 */
export default function SupabaseTestScreen() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const testConnection = async () => {
    setLoading(true);
    setStatus('جارٍ الاتصال بـ Supabase...');
    setError('');
    setData(null);

    try {
      const { data: result, error: err, status: statusCode } = await supabase
        .from('sync_event')
        .select('*')
        .limit(5);

      if (err) {
        setError(`خطأ: ${err.message}`);
        setStatus('فشل الاتصال');
      } else {
        setStatus(`✅ نجح الاتصال! (Status: ${statusCode})`);
        setData(result);
      }
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
      setStatus('فشل الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const insertTestData = async () => {
    setLoading(true);
    setStatus('جارٍ إدراج بيانات تجريبية...');
    setError('');

    try {
      const { data: result, error: err } = await supabase
        .from('sync_event')
        .insert([
          {
            client_id: 'mobile-test-' + Date.now(),
            entity: 'test',
            operation: 'create',
            payload: { 
              message: 'مرحباً من تطبيق الهاتف!',
              timestamp: new Date().toISOString()
            }
          }
        ])
        .select();

      if (err) {
        setError(`خطأ: ${err.message}`);
        setStatus('فشل الإدراج');
      } else {
        setStatus('✅ تم إدراج البيانات بنجاح!');
        setData(result);
      }
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
      setStatus('فشل الإدراج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        اختبار Supabase
      </ThemedText>

      <ThemedView style={styles.buttonContainer}>
        <Button
          title="اختبار الاتصال"
          onPress={testConnection}
          disabled={loading}
        />
      </ThemedView>

      <ThemedView style={styles.buttonContainer}>
        <Button
          title="إدراج بيانات تجريبية"
          onPress={insertTestData}
          disabled={loading}
        />
      </ThemedView>

      {loading && (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.statusText}>{status}</ThemedText>
        </ThemedView>
      )}

      {!loading && status && (
        <ThemedView style={styles.resultContainer}>
          <ThemedText type="subtitle" style={styles.statusText}>
            {status}
          </ThemedText>
        </ThemedView>
      )}

      {error && (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      )}

      {data && (
        <ThemedView style={styles.dataContainer}>
          <ThemedText type="subtitle">البيانات:</ThemedText>
          <ThemedText style={styles.dataText}>
            {JSON.stringify(data, null, 2)}
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.infoContainer}>
        <ThemedText type="defaultSemiBold">ملاحظة:</ThemedText>
        <ThemedText style={styles.infoText}>
          تأكد من وجود ملف .env في مجلد mobile مع متغيرات Supabase
        </ThemedText>
        <ThemedText style={styles.infoText}>
          EXPO_PUBLIC_SUPABASE_URL
        </ThemedText>
        <ThemedText style={styles.infoText}>
          EXPO_PUBLIC_SUPABASE_ANON_KEY
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginVertical: 10,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
  },
  errorContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  dataContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  infoContainer: {
    marginTop: 30,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  statusText: {
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#c62828',
  },
  dataText: {
    marginTop: 10,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  infoText: {
    marginTop: 5,
    fontSize: 12,
  },
});

