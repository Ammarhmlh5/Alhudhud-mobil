import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';
import { SyncService } from '@/lib/services/sync.service';

export default function HiveSupportScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [frameType, setFrameType] = useState<'FOUNDATION' | 'READY' | 'BROOD' | 'HONEY'>('FOUNDATION');
    const [count, setCount] = useState('1');
    const [notes, setNotes] = useState('');

    const handleSave = async () => {
        try {
            const db = getDB();
            if (!db || !id) return;

            const numCount = parseInt(count);
            if (isNaN(numCount) || numCount <= 0) {
                Alert.alert('تنبيه', 'الرجاء إدخال عدد صحيح للإطارات');
                return;
            }

            // 1. Log the operation
            const opId = crypto.randomUUID();
            const payload = {
                id: opId,
                hiveId: id,
                type: 'SUPPORT',
                date: new Date().toISOString(),
                details: { frameType, count: numCount, notes }
            };

            // TODO: We technically need an 'operations' table, but for now we can maybe reuse a generic structure or create one.
            // Since we didn't define an 'operations' table in init.ts yet, let's create it or just update the hive directly + sync queue.
            // For this MVP step, I'll update the hive frame count and log a generic sync event.

            // Update Hive Frame Count
            db.runSync(
                'UPDATE hives SET frame_count = frame_count + ?, updated_at = ? WHERE id = ?',
                [numCount, new Date().toISOString(), id as string]
            );

            // Queue Sync (Operation)
            // Ideally we should have an 'operations' table. I'll stick to updating the hive state for now to keep it simple 
            // and ensure the update propagates. 
            // ALSO: In a real app we want to track *history*.
            // Let's assume we maintain history via 'sync_queue' on server side, or we should add a 'hive_logs' table locally later.

            // Queue Hive Update
            // We need to fetch the updated hive to queue it as an UPDATE
            const updatedHive = db.getAllSync('SELECT * FROM hives WHERE id = ?', [id as string])[0];
            await SyncService.queueChange('hives', id as string, 'UPDATE', updatedHive);

            Alert.alert('تمت العملية', `تم إضافة ${numCount} إطارات (${frameType}) بنجاح.`, [
                { text: 'حسناً', onPress: () => router.back() }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert('خطأ', 'فشل تنفيذ عملية الدعم');
        }
    };

    const types = [
        { id: 'FOUNDATION', label: 'أساس شمعي', icon: 'square' },
        { id: 'READY', label: 'إطار ممطوط (جاهز)', icon: 'square.fill' },
        { id: 'BROOD', label: 'دعم حضنة', icon: 'person.2.fill' },
        { id: 'HONEY', label: 'دعم غذاء (عسل)', icon: 'drop.fill' },
    ];

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'دعم الخلية' }} />

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <ThemedText type="subtitle" style={{ marginBottom: 16 }}>نوع الدعم:</ThemedText>
                <View style={styles.grid}>
                    {types.map((t) => (
                        <TouchableOpacity
                            key={t.id}
                            style={[styles.typeCard, frameType === t.id && styles.selectedCard]}
                            onPress={() => setFrameType(t.id as any)}
                        >
                            <IconSymbol name={t.icon as any} size={24} color={frameType === t.id ? '#fff' : '#333'} />
                            <ThemedText style={{ color: frameType === t.id ? '#fff' : '#333' }}>{t.label}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>

                <ThemedText type="subtitle" style={{ marginTop: 24, marginBottom: 8 }}>العدد:</ThemedText>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={count}
                    onChangeText={setCount}
                />

                <ThemedText type="subtitle" style={{ marginTop: 24, marginBottom: 8 }}>ملاحظات:</ThemedText>
                <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="اختياري..."
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <ThemedText style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>حفظ</ThemedText>
                </TouchableOpacity>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    typeCard: {
        width: '48%', padding: 16, borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
        alignItems: 'center', gap: 8, backgroundColor: '#f9f9f9'
    },
    selectedCard: { backgroundColor: '#3498DB', borderColor: '#3498DB' },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff', textAlign: 'right' },
    saveBtn: { backgroundColor: '#3498DB', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 40 }
});
