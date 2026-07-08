import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Collapsible } from '@/components/ui/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRouter } from 'expo-router';

export default function TabTwoScreen() {
  const router = useRouter();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="leaf.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title">
          استكشف
        </ThemedText>
      </ThemedView>

      <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/flora')}>
        <IconSymbol name="leaf.fill" size={32} color="#27AE60" />
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">المراعي والنباتات</ThemedText>
          <ThemedText>سجل النباتات ومواسم الإزهار في منطقتك</ThemedText>
        </View>
        <IconSymbol name="chevron.left" size={24} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/advisor/chat')}>
        <IconSymbol name="sparkles" size={32} color="#8E44AD" />
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">المستشار الذكي</ThemedText>
          <ThemedText>إرشادات فورية مدعومة بالذكاء الاصطناعي</ThemedText>
        </View>
        <IconSymbol name="chevron.left" size={24} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.toolCard, { borderColor: 'red' }]} onPress={() => router.push('/verify')}>
        <IconSymbol name="hammer.fill" size={32} color="red" />
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">أدوات المطورين (Debug)</ThemedText>
          <ThemedText>اختبار النظام والتحقق من العمليات</ThemedText>
        </View>
        <IconSymbol name="chevron.left" size={24} color="#999" />
      </TouchableOpacity>

      <ThemedText>المزيد من الأدوات قريباً...</ThemedText>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    gap: 16,
    marginBottom: 16
  }
});
