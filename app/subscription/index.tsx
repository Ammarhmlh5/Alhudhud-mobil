import { StyleSheet, ScrollView, TouchableOpacity, Alert, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getDB } from '@/lib/db/init';
import { api } from '@/lib/apiClient';

interface Plan {
  id: string;
  name: string;
  price: string;
  interval: string;
  features: string[];
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'مجاني',
    price: '0',
    interval: 'شهرياً',
    features: ['اتصال واحد', '100 رسالة/شهر', 'سجل 7 أيام'],
  },
  {
    id: 'starter',
    name: 'ابدأ',
    price: '29',
    interval: 'شهرياً',
    features: ['3 اتصالات', '10,000 رسالة/شهر', 'سجل 30 يوماً', 'دعم فني'],
    recommended: true,
  },
  {
    id: 'business',
    name: 'أعمال',
    price: '99',
    interval: 'شهرياً',
    features: ['اتصالات غير محدودة', '100,000 رسالة/شهر', 'سجل غير محدود', 'دعم فني优先', 'API مفتوح'],
  },
];

export default function SubscriptionScreen() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSubscription();
    }, [])
  );

  const loadSubscription = async () => {
    try {
      const res = await api.get('/auth/subscription');
      if (res.ok) {
        const sub = await res.json();
        setCurrentPlan(sub.plan || 'free');
        const db = getDB();
        if (db) {
          db.runSync("INSERT OR REPLACE INTO subscription_info (key, value) VALUES ('current_plan', ?)", [sub.plan || 'free']);
        }
        return;
      }
    } catch {}

    const db = getDB();
    if (!db) return;
    try {
      const row = db.getFirstSync("SELECT value FROM subscription_info WHERE key = 'current_plan'") as any;
      setCurrentPlan(row?.value || 'free');
    } catch {}
  };

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlan) return;

    try {
      const res = await api.put('/auth/subscription', { plan: planId });
      if (res.ok) {
        setCurrentPlan(planId);
        const db = getDB();
        db?.runSync("INSERT OR REPLACE INTO subscription_info (key, value) VALUES ('current_plan', ?)", [planId]);
        Alert.alert('✅ تم', `تم التبديل إلى خطة "${PLANS.find(p => p.id === planId)?.name}"`);
        return;
      }
    } catch {}

    if (planId === 'free') {
      const db = getDB();
      db?.runSync("INSERT OR REPLACE INTO subscription_info (key, value) VALUES ('current_plan', 'free')");
      setCurrentPlan('free');
      Alert.alert('✅ تم', 'تم التبديل إلى الخطة المجانية');
      return;
    }
    Alert.alert('اشتراك', `سيتم توجيهك إلى بوابة الدفع لتفعيل خطة "${PLANS.find(p => p.id === planId)?.name}"`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">الاشتراكات</ThemedText>
        <ThemedText style={styles.subtitle}>اختر الخطة المناسبة لك</ThemedText>
      </ThemedView>

      {currentPlan && (
        <ThemedView style={styles.currentPlanBanner}>
          <ThemedText style={styles.currentPlanText}>
            خطتك الحالية: {PLANS.find(p => p.id === currentPlan)?.name || 'مجاني'}
          </ThemedText>
        </ThemedView>
      )}

      <View style={styles.plansContainer}>
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                plan.recommended && styles.planRecommended,
                isCurrent && styles.planCurrent,
              ]}
              onPress={() => handleSelectPlan(plan.id)}
              disabled={isCurrent}
            >
              {plan.recommended && (
                <ThemedView style={styles.recommendedBadge}>
                  <ThemedText style={styles.recommendedText}>الأكثر طلباً</ThemedText>
                </ThemedView>
              )}
              {isCurrent && (
                <ThemedView style={[styles.recommendedBadge, { backgroundColor: '#E8F5E9' }]}>
                  <ThemedText style={[styles.recommendedText, { color: '#2E7D32' }]}>حالياً</ThemedText>
                </ThemedView>
              )}
              <ThemedText style={styles.planName}>{plan.name}</ThemedText>
              <View style={styles.priceRow}>
                <ThemedText style={styles.price}>{plan.price === '0' ? 'مجاني' : `${plan.price} ر.س`}</ThemedText>
                {plan.price !== '0' && <ThemedText style={styles.interval}>/{plan.interval}</ThemedText>}
              </View>
              <View style={styles.features}>
                {plan.features.map((feature, i) => (
                  <View key={i} style={styles.featureRow}>
                    <ThemedText style={styles.featureCheck}>✓</ThemedText>
                    <ThemedText style={styles.featureText}>{feature}</ThemedText>
                  </View>
                ))}
              </View>
              {!isCurrent && (
                <TouchableOpacity
                  style={[styles.selectBtn, plan.recommended && styles.selectBtnRecommended]}
                  onPress={() => handleSelectPlan(plan.id)}
                >
                  <ThemedText style={styles.selectBtnText}>
                    {plan.price === '0' ? 'اختيار مجاني' : 'اشتراك'}
                  </ThemedText>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  header: { gap: 4 },
  subtitle: { fontSize: 14, opacity: 0.6 },
  currentPlanBanner: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10 },
  currentPlanText: { color: '#2E7D32', textAlign: 'center', fontWeight: '600' },
  plansContainer: { gap: 16 },
  planCard: {
    padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#eee',
    backgroundColor: 'rgba(255,255,255,0.1)', gap: 12,
  },
  planRecommended: {
    borderColor: '#E6A23C', borderWidth: 2,
    backgroundColor: 'rgba(230, 162, 60, 0.05)',
  },
  planCurrent: {
    borderColor: '#4CAF50', borderWidth: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  recommendedBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FFF8E1',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  recommendedText: { fontSize: 11, color: '#E6A23C', fontWeight: '600' },
  planName: { fontSize: 20, fontWeight: 'bold' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#E6A23C' },
  interval: { fontSize: 14, opacity: 0.5 },
  features: { gap: 8 },
  featureRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  featureCheck: { color: '#4CAF50', fontSize: 14 },
  featureText: { fontSize: 14, opacity: 0.8 },
  selectBtn: {
    padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd',
  },
  selectBtnRecommended: {
    backgroundColor: '#E6A23C', borderColor: '#E6A23C',
  },
  selectBtnText: {
    fontWeight: '600', fontSize: 15,
  },
});
