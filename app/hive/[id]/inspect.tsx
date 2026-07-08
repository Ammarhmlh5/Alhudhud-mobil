import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { InspectionFrame, FrameData } from '@/components/InspectionFrame';
import { FrameEditorModal } from '@/components/FrameEditorModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';
import { SyncService } from '@/lib/services/sync.service';
import { AdvisorService, Advice } from '../../../lib/logic/advisor';

export default function InspectionScreen() {
    const { id } = useLocalSearchParams(); // hiveId
    const router = useRouter();
    const [frames, setFrames] = useState<FrameData[]>([]);
    const [selectedFrame, setSelectedFrame] = useState<FrameData | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Load hive configuration
    useEffect(() => {
        const db = getDB();
        if (!db || !id) return;

        try {
            const result = db.getAllSync('SELECT * FROM hives WHERE id = ?', [id as string]);
            const hive = result.length > 0 ? (result[0] as any) : null;

            if (hive) {
                // Initialize frames based on hive.frame_count
                const count = hive.frame_count || 10;
                const initialFrames: FrameData[] = Array.from({ length: count }, (_, i) => ({
                    id: i + 1,
                    type: 'EMPTY',
                    percentages: { honey: 0, brood: 0, pollen: 0 }
                }));
                setFrames(initialFrames);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to load hive data');
        }
    }, [id]);

    const handleSaveInspection = async () => {
        try {
            const db = getDB();
            if (!db || !id) return;

            const inspectionId = crypto.randomUUID();
            const payload = {
                id: inspectionId,
                hiveId: id,
                date: new Date().toISOString(),
                frames: frames
            };

            // Save to local DB
            db.runSync(
                'INSERT INTO inspections (id, hive_id, inspection_date, details) VALUES (?, ?, ?, ?)',
                [inspectionId, id as string, payload.date, JSON.stringify(payload.frames)]
            );

            // Queue Sync
            await SyncService.queueChange('inspections', inspectionId, 'INSERT', payload);

            // --- RUN ADVISOR LOGIC ---
            const advice = AdvisorService.analyze(frames, 'SPRING'); // Hardcoded Season for now

            let alertMessage = 'تم حفظ نتيجة الفحص بنجاح.';
            if (advice.length > 0) {
                alertMessage += '\n\n💡 نصائح المستشار:\n' + advice.map(a => `- ${a.message}\n  (${a.action})`).join('\n');
            }

            Alert.alert('تم الحفظ & التحليل', alertMessage, [
                { text: 'حسناً', onPress: () => router.back() }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert('خطأ', 'فشل حفظ الفحص');
        }
    };

    const openFrameEditor = (frame: FrameData) => {
        setSelectedFrame(frame);
        setModalVisible(true);
    };

    const updateFrame = (newData: FrameData) => {
        setFrames(prev => prev.map(f => f.id === newData.id ? newData : f));
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'فحص الخلية' }} />

            <ScrollView horizontal contentContainerStyle={styles.hiveVisual}>
                {frames.map((frame) => (
                    <InspectionFrame
                        key={frame.id}
                        number={frame.id}
                        data={frame}
                        onPress={() => openFrameEditor(frame)}
                    />
                ))}
            </ScrollView>

            <View style={styles.summary}>
                <ThemedText type="subtitle">ملخص الفحص:</ThemedText>
                <ThemedText>عدد الإطارات: {frames.length}</ThemedText>
                <ThemedText>إطارات الحضنة: {frames.filter(f => f.type === 'BROOD').length}</ThemedText>
                <ThemedText>إطارات العسل: {frames.filter(f => f.type === 'HONEY').length}</ThemedText>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveInspection}>
                <IconSymbol name="checkmark.circle.fill" size={24} color="#fff" />
                <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>حفظ الفحص</ThemedText>
            </TouchableOpacity>

            {selectedFrame && (
                <FrameEditorModal
                    visible={modalVisible}
                    frame={selectedFrame}
                    onClose={() => setModalVisible(false)}
                    onSave={(updated: FrameData) => {
                        updateFrame(updated);
                        setModalVisible(false);
                    }}
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    hiveVisual: { padding: 20, height: 160 },
    summary: { padding: 20 },
    saveButton: {
        backgroundColor: '#27AE60', flexDirection: 'row', gap: 8,
        margin: 20, padding: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center'
    },
});
