import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';

const slides = [
  {
    icon: 'antenna.radiowaves.left.and.right',
    title: 'مرحباً بك في AlHudhud Connect',
    desc: 'منصة التكامل العالمية التي تربط تطبيقك بأي نظام خارجي بدون برمجة.',
    color: '#E6A23C',
  },
  {
    icon: 'cable.connector',
    title: 'أضف اتصالاتك',
    desc: 'اختر منصة جاهزة من القوالب أو أضف إعداداً يدوياً. ادعم REST API، WebSocket، Webhook، والمزيد.',
    color: '#4CAF50',
  },
  {
    icon: 'arrow.triangle.swap',
    title: 'حول بياناتك تلقائياً',
    desc: 'استخدم تعيين البيانات (Data Mapping) لتحويل الحقول بين المصدر والهدف بدون كتابة كود.',
    color: '#9C27B0',
  },
  {
    icon: 'clock.fill',
    title: 'مزامنة دورية',
    desc: 'اضبط جدول زمني للمزامنة التلقائية. التطبيق يعمل في الخلفية ويضمن تحديث بياناتك.',
    color: '#2196F3',
  },
  {
    icon: 'bell.fill',
    title: 'إشعارات فورية',
    desc: 'استقبل إشعارات عند وصول بيانات جديدة عبر Webhook أو عند اكتمال المزامنة.',
    color: '#FF9800',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);

  const complete = () => {
    const db = getDB();
    if (db) {
      db.runSync("INSERT OR REPLACE INTO local_settings (key, value) VALUES ('onboarding_done', '1')");
    }
    router.replace('/(tabs)');
  };

  const next = () => {
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      complete();
    }
  };

  const s = slides[slide];

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={complete}>
        <ThemedText style={styles.skipText}>تخطي</ThemedText>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: s.color + '20' }]}>
          <IconSymbol name={s.icon as any} size={72} color={s.color} />
        </View>
        <ThemedText style={styles.title}>{s.title}</ThemedText>
        <ThemedText style={styles.desc}>{s.desc}</ThemedText>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === slide && { backgroundColor: s.color, width: 24 }]} />
          ))}
        </View>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: s.color }]} onPress={next}>
          <IconSymbol name="arrow.left" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  skip: { alignSelf: 'flex-end', padding: 8 },
  skipText: { fontSize: 14, opacity: 0.5 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  iconContainer: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  desc: { fontSize: 15, opacity: 0.7, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  nextBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
