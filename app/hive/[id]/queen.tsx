import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';
import { SyncService } from '@/lib/services/sync.service';

type QueenBatch = {
    id: string;
    hiveId: string;
    name: string;
    graftingDate: string;
    count: number;
    status: 'GRAFTED' | 'CLOSED' | 'HATCHED' | 'FAILED';
};

export default function QueenRearingScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [batches, setBatches] = useState<QueenBatch[]>([]);
    const [showAdd, setShowAdd] = useState(false);

    // New Batch Form State
    const [newName, setNewName] = useState('');
    const [newCount, setNewCount] = useState('10');

    useEffect(() => {
        loadBatches();
    }, [id]);

    const loadBatches = () => {
        const db = getDB();
        if (!db || !id) return;
        try {
            // Check if table exists, if not create it (dynamic lazy init for MVP)
            db.execSync(`
         CREATE TABLE IF NOT EXISTS queen_batches (
           id TEXT PRIMARY KEY NOT NULL,
           hive_id TEXT NOT NULL,
           name TEXT NOT NULL,
           grafting_date TEXT NOT NULL,
           count INTEGER NOT NULL,
           status TEXT NOT NULL
         );
       `);

            const result = db.getAllSync(
                'SELECT * FROM queen_batches WHERE hive_id = ? ORDER BY grafting_date DESC',
                [id as string]
            );

            setBatches(result.map((r: any) => ({
                id: r.id,
                hiveId: r.hive_id,
                name: r.name,
                graftingDate: r.grafting_date,
                count: r.count,
                status: r.status
            })));
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddBatch = async () => {
        if (!newName) {
            Alert.alert('خطأ', 'الرجاء إدخال اسم للدفعة');
            return;
        }
        const db = getDB();
        if (!db) return;

        try {
            const batchId = crypto.randomUUID();
            const newBatch: QueenBatch = {
                id: batchId,
                hiveId: id as string,
                name: newName,
                graftingDate: new Date().toISOString(),
                count: parseInt(newCount),
                status: 'GRAFTED'
            };

            db.runSync(
                `INSERT INTO queen_batches (id, hive_id, name, grafting_date, count, status) VALUES (?, ?, ?, ?, ?, ?)`,
                [newBatch.id, newBatch.hiveId, newBatch.name, newBatch.graftingDate, newBatch.count, newBatch.status]
            );

            // Queue Sync (As custom operation or table sync)
            // For now, let's treat it as a generic operation payload since backend might not have this table yet
            await SyncService.queueChange('queen_batches', batchId, 'INSERT', newBatch);

            setNewName('');
            setNewCount('10');
            setShowAdd(false);
            loadBatches();
            Alert.alert('تم', 'تم بدء الدفعة بنجاح');
        } catch (e) {
            console.error(e);
            Alert.alert('خطأ', 'فشل حفظ الدفعة');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'GRAFTED': return '#3498DB';
            case 'CLOSED': return '#F1C40F';
            case 'HATCHED': return '#27AE60';
            case 'FAILED': return '#E74C3C';
            default: return '#999';
        }
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'تربية الملكات' }} />

            {!showAdd ? (
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
                    <IconSymbol name="plus" size={20} color="#fff" />
                    <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>بدء دفعة جديدة</ThemedText>
                </TouchableOpacity>
            ) : (
                <View style={styles.formCard}>
                    <ThemedText type="subtitle" style={{ marginBottom: 12 }}>بيانات الدفعة الجديدة</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="اسم الدفعة (مثال: الدفعة الأولى - ربيع)"
                        value={newName}
                        onChangeText={setNewName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="عدد الكؤوس المطعمة"
                        keyboardType="numeric"
                        value={newCount}
                        onChangeText={setNewCount}
                    />
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: '#27AE60', flex: 1 }]} onPress={handleAddBatch}>
                            <ThemedText style={{ color: '#fff' }}>حفظ</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: '#ccc', flex: 1 }]} onPress={() => setShowAdd(false)}>
                            <ThemedText>إلغاء</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <FlatList
                data={batches}
                keyExtractor={item => item.id}
                refreshing={false}
                onRefresh={loadBatches}
                ListHeaderComponent={<ThemedText style={{ marginTop: 20, marginBottom: 10, paddingHorizontal: 16 }}>الدفعات الحالية:</ThemedText>}
                renderItem={({ item }) => (
                    <View style={styles.batchCard}>
                        <View style={styles.cardHeader}>
                            <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                                <ThemedText style={{ color: '#fff', fontSize: 10 }}>{item.status}</ThemedText>
                            </View>
                        </View>
                        <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>تاريخ التطعيم: {new Date(item.graftingDate).toLocaleDateString()}</ThemedText>
                        <ThemedText style={{ fontSize: 12 }}>العدد: {item.count}</ThemedText>

                        {/* Actions for Batch Lifecycle */}
                        <View style={styles.batchActions}>
                            {item.status === 'GRAFTED' && (
                                <TouchableOpacity style={styles.actionLink} onPress={() => {/* Close Batch Logic */ }}>
                                    <ThemedText style={{ color: '#F1C40F' }}>إغلاق الكؤوس</ThemedText>
                                </TouchableOpacity>
                            )}
                            {item.status === 'CLOSED' && (
                                <TouchableOpacity style={styles.actionLink} onPress={() => {/* Hatch Logic */ }}>
                                    <ThemedText style={{ color: '#27AE60' }}>تفقيس</ThemedText>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                ListEmptyComponent={<ThemedText style={{ textAlign: 'center', marginTop: 40, opacity: 0.5 }}>لا توجد دفعات مسجلة</ThemedText>}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    addBtn: { backgroundColor: '#E6A23C', margin: 16, padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    formCard: { margin: 16, padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
    input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, textAlign: 'right' },
    btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
    batchCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    batchActions: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, flexDirection: 'row', justifyContent: 'flex-end' },
    actionLink: { padding: 4 }
});
