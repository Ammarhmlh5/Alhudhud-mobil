import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';

type HiveDetails = {
    id: string;
    hive_number: string;
    type: string;
    frame_count: number;
    queen_details: string; // JSON string
};

export default function HiveDashboard() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [hive, setHive] = useState<HiveDetails | null>(null);

    useEffect(() => {
        const db = getDB();
        if (!db || !id) return;
        try {
            const result = db.getAllSync('SELECT * FROM hives WHERE id = ?', [id as string]);
            if (result.length > 0) {
                setHive(result[0] as HiveDetails);
            }
        } catch (e) {
            console.error(e);
        }
    }, [id]);

    if (!hive) return <ThemedView style={styles.container}><ThemedText>جاري التحميل...</ThemedText></ThemedView>;

    const queen = hive.queen_details ? JSON.parse(hive.queen_details) : {};

    const actions = [
        { label: 'فحص شامل', icon: 'stethoscope', route: `/hive/${id}/inspect`, color: '#27AE60' },
        { label: 'تغذية', icon: 'drop.fill', route: `/hive/${id}/feed`, color: '#E67E22' },
        { label: 'دعم (إطارات)', icon: 'plus.square.fill.on.square.fill', route: `/hive/${id}/support`, color: '#3498DB' },
        { label: 'دمج', icon: 'arrow.triangle.merge', route: `/hive/${id}/merge`, color: '#8E44AD' },
        { label: 'تربية ملكات', icon: 'crown.fill', route: `/hive/${id}/queen`, color: '#F1C40F' },
        { label: 'إبلاغ عن إصابة', icon: 'exclamationmark.triangle.fill', route: `/hive/${id}/disease`, color: '#E74C3C' },
        { label: 'تاريخ العمليات', icon: 'clock.fill', route: `/hive/${id}/history`, color: '#95A5A6' },
    ];

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: `خلية رقم ${hive.hive_number}` }} />

            <View style={styles.headerCard}>
                <View style={styles.infoRow}>
                    <IconSymbol name="archivebox" size={32} color="#E6A23C" />
                    <View>
                        <ThemedText type="subtitle">{hive.type}</ThemedText>
                        <ThemedText>{hive.frame_count} إطارات</ThemedText>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                    <IconSymbol name="crown.fill" size={32} color="#F1C40F" />
                    <View>
                        <ThemedText type="subtitle">الملكة: {queen.breed || 'غير محدد'}</ThemedText>
                        <ThemedText>العمر: {queen.age ? `${queen.age} شهر` : 'غير معروف'}</ThemedText>
                    </View>
                </View>
            </View>

            <ThemedText type="subtitle" style={styles.sectionTitle}>العمليات السريعة</ThemedText>

            <View style={styles.grid}>
                {actions.map((action, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.actionCard}
                        onPress={() => action.route ? router.push(action.route as any) : Alert.alert('قريباً', 'هذه الميزة قيد التطوير')}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: action.color + '20' }]}>
                            <IconSymbol name={action.icon as any} size={28} color={action.color} />
                        </View>
                        <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
                    </TouchableOpacity>
                ))}
            </View>

        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    headerCard: {
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#eee'
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
    sectionTitle: { marginBottom: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    actionCard: {
        width: '48%', backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, alignItems: 'center', gap: 12, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
    },
    iconCircle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    actionLabel: { fontSize: 14, fontWeight: '600', color: '#333' }
});
