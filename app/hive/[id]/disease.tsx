import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';
import { SyncService } from '@/lib/services/sync.service';

export default function ReportDiseaseScreen() {
    const { id } = useLocalSearchParams(); // hiveId
    const router = useRouter();
    const [diseases, setDiseases] = useState<any[]>([]);
    const [selectedDisease, setSelectedDisease] = useState<any | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const db = getDB();
        if (!db) return;

        try {
            // Load diseases from local library
            const res = db.getAllSync('SELECT * FROM disease_library');
            setDiseases(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleReport = async () => {
        if (!selectedDisease) {
            Alert.alert('تنبيه', 'يرجى اختيار المرض من القائمة');
            return;
        }

        try {
            const db = getDB();
            if (!db || !id) return;

            const recordId = crypto.randomUUID();
            const payload = {
                id: recordId,
                hiveId: id as string,
                diseaseId: selectedDisease.id,
                detectedDate: new Date().toISOString(),
                treatmentNotes: notes,
                status: 'ACTIVE'
            };

            // Save locally
            db.runSync(
                `INSERT INTO disease_records (id, hive_id, disease_id, detected_date, treatment_notes, status) 
                 VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
                [recordId, id as string, selectedDisease.id, payload.detectedDate, notes]
            );

            // Queue for sync
            await SyncService.queueChange('disease_records', recordId, 'INSERT', payload);

            Alert.alert(
                'تم البلاغ',
                'تم تسجيل الإصابة بنجاح. سيتم إرسال تنبيهات فورية للمناحل المجاورة عبر المنصة.',
                [{ text: 'حسناً', onPress: () => router.back() }]
            );
        } catch (e) {
            console.error(e);
            Alert.alert('خطأ', 'فشل إرسال البلاغ');
        }
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'إبلاغ عن إصابة' }} />

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#E67E22" />
                    <ThemedText type="title" style={{ marginTop: 12 }}>بلاغ إصابة مرضية</ThemedText>
                    <ThemedText style={{ opacity: 0.6, textAlign: 'center', marginTop: 8 }}>
                        يرجى اختيار المرض بدقة لضمان دقة التنبيهات الجغرافية وإرشادات العلاج.
                    </ThemedText>
                </View>

                <View style={styles.section}>
                    <ThemedText type="defaultSemiBold" style={{ marginBottom: 12 }}>اختر نوع المرض:</ThemedText>
                    <View style={styles.list}>
                        {diseases.length === 0 ? (
                            <View style={styles.empty}>
                                <ThemedText>لا توجد أمراض مزامنة حالياً. يرج Rectify sync.</ThemedText>
                            </View>
                        ) : (
                            diseases.map((d) => (
                                <TouchableOpacity
                                    key={d.id}
                                    style={[styles.item, selectedDisease?.id === d.id && styles.selectedItem]}
                                    onPress={() => setSelectedDisease(d)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <ThemedText style={[styles.itemName, selectedDisease?.id === d.id && { color: '#fff' }]}>{d.name_ar}</ThemedText>
                                        <ThemedText style={{ fontSize: 10, opacity: 0.6, color: selectedDisease?.id === d.id ? '#fff' : '#000' }}>{d.name_en}</ThemedText>
                                    </View>
                                    {selectedDisease?.id === d.id && <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />}
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </View>

                {selectedDisease && (
                    <View style={styles.adviceCard}>
                        <IconSymbol name="info.circle.fill" size={20} color="#3498DB" />
                        <View style={{ flex: 1 }}>
                            <ThemedText type="defaultSemiBold" style={{ color: '#2980B9' }}>الأعراض الشائعة:</ThemedText>
                            <ThemedText style={{ fontSize: 13, marginTop: 4 }}>{selectedDisease.symptoms}</ThemedText>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.submitBtn, !selectedDisease && { opacity: 0.5 }]}
                    onPress={handleReport}
                    disabled={!selectedDisease}
                >
                    <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>تأكيد وإرسال البلاغ</ThemedText>
                </TouchableOpacity>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 20 },
    header: { alignItems: 'center', marginBottom: 30 },
    section: { marginBottom: 20 },
    list: { gap: 10 },
    item: {
        padding: 16, borderRadius: 12, backgroundColor: '#f9f9f9',
        borderWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center'
    },
    selectedItem: { backgroundColor: '#E67E22', borderColor: '#E67E22' },
    itemName: { fontWeight: 'bold' },
    submitBtn: {
        backgroundColor: '#E74C3C', padding: 20, borderRadius: 12,
        alignItems: 'center', marginTop: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
    },
    adviceCard: {
        padding: 16, backgroundColor: '#EBF5FB', borderRadius: 12,
        marginTop: 10, flexDirection: 'row', gap: 12, borderLeftWidth: 4, borderLeftColor: '#3498DB'
    },
    empty: { padding: 40, alignItems: 'center' }
});
