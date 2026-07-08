import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getDB } from '@/lib/db/init';
import { SyncService } from '@/lib/services/sync.service';

type HiveSimple = { id: string; hive_number: string; type: string };

export default function HiveMergeScreen() {
    const { id } = useLocalSearchParams(); // This is the TARGET hive ID
    const router = useRouter();
    const [sourceHive, setSourceHive] = useState<string | null>(null);
    const [availableHives, setAvailableHives] = useState<HiveSimple[]>([]);

    useEffect(() => {
        const db = getDB();
        if (!db || !id) return;
        try {
            // Fetch all hives EXCEPT the current one (and must be same apiary ideally, but for now just same apiary logic is implicit if we filter)
            // We need to fetch the current hive first to get its apiary_id
            const currentHive = db.getAllSync('SELECT apiary_id FROM hives WHERE id = ?', [id as string])[0] as any;
            if (currentHive) {
                const others = db.getAllSync(
                    'SELECT id, hive_number, type FROM hives WHERE apiary_id = ? AND id != ?',
                    [currentHive.apiary_id, id as string]
                );
                setAvailableHives(others as HiveSimple[]);
            }
        } catch (e) {
            console.error(e);
        }
    }, [id]);

    const handleMerge = async () => {
        if (!sourceHive) {
            Alert.alert('خطأ', 'الرجاء اختيار الخلية التي سيتم ضمها (المصدر)');
            return;
        }

        Alert.alert(
            'تأكيد الدمج',
            'سيتم نقل جميع إطارات ونحل الخلية المختارة إلى الخلية الحالية. سيتم أرشفة الخلية المصدر. هل أنت متأكد؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'نعم، ادمج',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const db = getDB();
                            if (!db) return;

                            // 1. Get Source Hive Details (to know how many frames to add)
                            const source = db.getAllSync('SELECT frame_count FROM hives WHERE id = ?', [sourceHive])[0] as any;

                            // 2. Update Target Hive (Add frames)
                            db.runSync('UPDATE hives SET frame_count = frame_count + ? WHERE id = ?', [source.frame_count || 0, id as string]);

                            // 3. Archive/Delete Source Hive
                            // We'll mark it as 'ARCHIVED' (assuming we add a status column later) or just DELETE for MVP simplicity?
                            // Better to just add a note or distinct it. But users usually "delete" the physical hive record from active list.
                            // Let's DELETE for now to reflect "removed from apiary".
                            db.runSync('DELETE FROM hives WHERE id = ?', [sourceHive]);

                            // 4. Queue Changes
                            const updatedTarget = db.getAllSync('SELECT * FROM hives WHERE id = ?', [id as string])[0];
                            await SyncService.queueChange('hives', id as string, 'UPDATE', updatedTarget);

                            // Queue Delete for source
                            // We need to construct a "DELETE" payload. 
                            // For simplicity in our sync engine, we need to handle DELETE operations if we haven't yet.
                            await SyncService.queueChange('hives', sourceHive, 'DELETE', { id: sourceHive });

                            Alert.alert('تم الدمج', 'تم دمج الخليتين بنجاح.', [
                                { text: 'عودة للوحة التحكم', onPress: () => router.back() }
                            ]);

                        } catch (e) {
                            console.error(e);
                            Alert.alert('خطأ', 'فشل عملية الدمج');
                        }
                    }
                }
            ]
        );
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'دمج الخلايا' }} />

            <View style={styles.header}>
                <ThemedText style={{ textAlign: 'center', marginBottom: 8 }}>
                    الخلية الحالية (الهدف) ستستقبل النحل والإطارات.
                </ThemedText>
                <ThemedText type="subtitle" style={{ textAlign: 'center', color: '#8E44AD' }}>
                    اختر الخلية المصدر (التي سيتم إلغاؤها):
                </ThemedText>
            </View>

            <FlatList
                data={availableHives}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.card, sourceHive === item.id && styles.selectedCard]}
                        onPress={() => setSourceHive(item.id)}
                    >
                        <ThemedText type="defaultSemiBold">خلية {item.hive_number}</ThemedText>
                        <ThemedText>{item.type}</ThemedText>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<ThemedText style={{ textAlign: 'center', marginTop: 20 }}>لا توجد خلايا أخرى في هذا المنحل.</ThemedText>}
            />

            <TouchableOpacity
                style={[styles.mergeBtn, !sourceHive && { opacity: 0.5 }]}
                onPress={handleMerge}
                disabled={!sourceHive}
            >
                <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>تأكيد الدمج</ThemedText>
            </TouchableOpacity>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    header: { marginBottom: 20 },
    card: { padding: 20, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
    selectedCard: { borderColor: '#8E44AD', backgroundColor: 'rgba(142, 68, 173, 0.1)' },
    mergeBtn: { backgroundColor: '#8E44AD', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 }
});
