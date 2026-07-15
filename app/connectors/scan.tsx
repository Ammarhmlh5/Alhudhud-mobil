import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, Dimensions, Animated, Easing, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { pairingService } from '@/lib/services/pairing.service';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Network from 'expo-network';

const { width } = Dimensions.get('window');
const SCAN_SIZE = width * 0.7;

let CameraView: any = null;
let useCameraPermissions: any = null;

try {
  const cameraModule = require('expo-camera');
  CameraView = cameraModule.CameraView;
  useCameraPermissions = cameraModule.useCameraPermissions;
} catch {}

function ScanLine() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_SIZE - 2],
  });

  return (
    <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
  );
}

function CameraScanView() {
  const router = useRouter();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'scanning' | 'connecting' | 'success' | 'error'>('scanning');
  const [permissionState, requestPermission] = useCameraPermissions();

  const hasPermission = permissionState?.granted ?? false;

  useEffect(() => {
    if (permissionState && !permissionState.granted && !permissionState.canAskAgain) {
      Alert.alert(
        'إذن الكاميرا مطلوب',
        'يرجى منح إذن الكاميرا من إعدادات الجهاز',
        [
          { text: 'فتح الإعدادات', onPress: () => Linking.openSettings() },
          { text: 'العودة', style: 'cancel', onPress: () => router.back() },
        ]
      );
    }
  }, [permissionState, router]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);
    setStatus('connecting');

    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        throw new Error('لا يوجد اتصال بالإنترنت. تحقق من الشبكة وأعد المحاولة.');
      }

      const qrData = pairingService.parseQRData(data);
      if (!qrData) {
        throw new Error('الـ QR code غير صالح. تأكد من أنه كود ربط AlHudhud.');
      }

      const isPaired = await pairingService.isPaired();
      if (isPaired) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'جهاز مرتبط مسبقاً',
            'هذا الجهاز مرتبط ببوابة أخرى. سيتم إلغاء الربط الحالي أولاً.',
            [
              { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
              { text: 'متابعة', onPress: () => resolve(true) },
            ]
          );
        });
        if (!proceed) {
          setScanned(false);
          setProcessing(false);
          setStatus('scanning');
          return;
        }
        await pairingService.unpair();
      }

      const result = await pairingService.exchangeCode(qrData.gateway, qrData.code);
      await pairingService.savePairingData(qrData.gateway, result);

      setStatus('success');

      Alert.alert(
        'تم الربط بنجاح',
        `تم ربط التطبيق بحساب "${result.user.name}"\nعدد الاتصالات المنقولة: ${result.connectors.length}`,
        [{ text: 'حسناً', onPress: () => router.back() }]
      );
    } catch (error: any) {
      setStatus('error');
      Alert.alert('فشل الربط', error.message || 'حدث خطأ أثناء محاولة الربط', [
        {
          text: 'إعادة المحاولة',
          onPress: () => {
            setScanned(false);
            setProcessing(false);
            setStatus('scanning');
          },
        },
        { text: 'إلغاء', style: 'cancel', onPress: () => router.back() },
      ]);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="no-photography" size={64} color="#ccc" />
        <ThemedText type="title" style={styles.errorTitle}>إذن الكاميرا مطلوب</ThemedText>
        <ThemedText style={styles.errorDesc}>
          يرجى منح إذن الكاميرا من إعدادات الجهاز لمسح QR code
        </ThemedText>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (permissionState && !permissionState.canAskAgain) {
            Linking.openSettings();
          } else {
            requestPermission?.();
          }
        }}>
          <ThemedText style={styles.backBtnText}>منح الإذن</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.backBtn, { marginTop: 8 }]} onPress={() => router.back()}>
          <ThemedText style={[styles.backBtnText, { opacity: 0.6 }]}>العودة</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <View style={styles.overlay}>
        <View style={styles.topOverlay}>
          <View style={styles.instructionBox}>
            <MaterialIcons name="qr-code-scanner" size={22} color="#E6A23C" />
            <ThemedText style={styles.instructionText}>وجّه الكاميرا نحو رمز QR</ThemedText>
          </View>
        </View>

        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            {!processing && <ScanLine />}
            {status === 'connecting' && (
              <View style={styles.processingOverlay}>
                <ThemedText style={styles.processingText}>جاري الربط...</ThemedText>
              </View>
            )}
          </View>
          <View style={styles.sideOverlay} />
        </View>

        <View style={styles.bottomOverlay}>
          <ThemedText style={styles.hintText}>
            افتح لوحة التحكم على الموقع واضغط &quot;ربط هاتف&quot;
          </ThemedText>

          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={[styles.stepDot, { backgroundColor: '#E6A23C' }]}>
                <ThemedText style={styles.stepNum}>1</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>افتح الموقع</ThemedText>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <View style={[styles.stepDot, { backgroundColor: '#E6A23C' }]}>
                <ThemedText style={styles.stepNum}>2</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>اضغط ربط هاتف</ThemedText>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <View style={[styles.stepDot, { backgroundColor: '#E6A23C' }]}>
                <ThemedText style={styles.stepNum}>3</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>اسحب الكود</ThemedText>
            </View>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <MaterialIcons name="close" size={20} color="#fff" />
            <ThemedText style={styles.cancelBtnText}>إلغاء</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function NoCameraFallback() {
  const router = useRouter();

  return (
    <View style={styles.centerContainer}>
      <MaterialIcons name="camera-alt" size={64} color="#ccc" />
      <ThemedText type="title" style={styles.errorTitle}>الكاميرا غير متوفرة</ThemedText>
      <ThemedText style={styles.errorDesc}>
        مكتبة الكاميرا غير مثبتة. يرجى تثبيت expo-camera.
      </ThemedText>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <ThemedText style={styles.backBtnText}>العودة</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

export default function ScanScreen() {
  if (!CameraView || !useCameraPermissions) {
    return <NoCameraFallback />;
  }

  return <CameraScanView />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: '#f5f5f5', gap: 12,
  },
  overlay: { flex: 1 },
  topOverlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 24 },
  instructionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20,
  },
  instructionText: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  middleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sideOverlay: { width: (width - SCAN_SIZE) / 2, height: SCAN_SIZE, backgroundColor: 'rgba(0,0,0,0.5)' },
  scanFrame: { width: SCAN_SIZE, height: SCAN_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#E6A23C' },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanLine: {
    position: 'absolute', left: 4, right: 4, height: 2,
    backgroundColor: '#E6A23C', shadowColor: '#E6A23C',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', borderRadius: 8, gap: 12,
  },
  processingText: { color: '#E6A23C', fontSize: 15, fontWeight: '600' },
  bottomOverlay: {
    flex: 1, justifyContent: 'flex-start', alignItems: 'center',
    paddingTop: 24, paddingHorizontal: 32, gap: 16,
  },
  hintText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  stepsContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, marginTop: 4,
  },
  step: { alignItems: 'center', gap: 6 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center' },
  stepLine: { width: 30, height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 18 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 24, marginTop: 8,
  },
  cancelBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  errorDesc: { fontSize: 14, opacity: 0.6, textAlign: 'center', lineHeight: 22 },
  backBtn: { marginTop: 16, backgroundColor: '#E6A23C', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
