import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface ApiKeyModalProps {
  visible: boolean;
  apiKey: string;
  onClose: () => void;
}

export function ApiKeyModal({ visible, apiKey, onClose }: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('خطأ', 'فشل نسخ المفتاح');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>مفتاح API الخاص بك</Text>
          <Text style={styles.subtitle}>احفظ هذا المفتاح في مكان آمن. لا تشاركه مع أحد.</Text>

          <TouchableOpacity style={styles.keyBox} onPress={handleCopy} activeOpacity={0.7}>
            <Text style={styles.keyText} selectable>{apiKey}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Text style={styles.copyBtnText}>{copied ? 'تم النسخ ✓' : 'نسخ المفتاح'}</Text>
          </TouchableOpacity>

          <Text style={styles.note}>تم إرسال المفتاح أيضاً إلى بريدك الإلكتروني</Text>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  keyBox: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  keyText: {
    color: '#3b82f6',
    fontSize: 13,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 20,
  },
  copyBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
