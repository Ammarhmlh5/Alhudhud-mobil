import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { FrameData } from './InspectionFrame';

type FrameEditorModalProps = {
    visible: boolean;
    frame: FrameData;
    onClose: () => void;
    onSave: (updated: FrameData) => void;
};

export function FrameEditorModal({ visible, frame, onClose, onSave }: FrameEditorModalProps) {
    const [data, setData] = useState<FrameData>(frame);

    useEffect(() => setData(frame), [frame]);

    const setType = (type: any) => setData(prev => ({ ...prev, type }));

    const increment = (key: keyof typeof data.percentages) => {
        setData(prev => ({
            ...prev,
            percentages: { ...prev.percentages, [key]: Math.min(100, prev.percentages[key] + 10) }
        }));
    };

    const decrement = (key: keyof typeof data.percentages) => {
        setData(prev => ({
            ...prev,
            percentages: { ...prev.percentages, [key]: Math.max(0, prev.percentages[key] - 10) }
        }));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ThemedText type="subtitle" style={{ marginBottom: 16 }}>تحرير الإطار {data.id}</ThemedText>

                    <ThemedText>المحتوى الأساسي:</ThemedText>
                    <View style={styles.typesGrid}>
                        {['EMPTY', 'HONEY', 'BROOD', 'POLLEN', 'FOUNDATION'].map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.typeBtn, data.type === t && styles.selectedTypeBtn]}
                                onPress={() => setType(t)}
                            >
                                <ThemedText style={{ fontSize: 12, color: data.type === t ? '#fff' : '#000' }}>{t}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.sliders}>
                        {(['honey', 'brood', 'pollen'] as const).map(key => (
                            <View key={key} style={styles.sliderRow}>
                                <ThemedText style={{ width: 60 }}>{key === 'honey' ? 'عسل' : key === 'brood' ? 'حضنة' : 'حبوب'}</ThemedText>
                                <TouchableOpacity onPress={() => decrement(key)} style={styles.stepperBtn}><ThemedText>-</ThemedText></TouchableOpacity>
                                <ThemedText style={{ width: 40, textAlign: 'center' }}>{data.percentages[key]}%</ThemedText>
                                <TouchableOpacity onPress={() => increment(key)} style={styles.stepperBtn}><ThemedText>+</ThemedText></TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.saveModalBtn} onPress={() => onSave(data)}>
                        <ThemedText style={{ color: '#fff' }}>تم</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
                        <ThemedText>إلغاء</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12 },
    typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
    typeBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
    selectedTypeBtn: { backgroundColor: '#E6A23C', borderColor: '#E6A23C' },
    sliders: { gap: 12, marginBottom: 20 },
    sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepperBtn: { width: 30, height: 30, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
    saveModalBtn: { backgroundColor: '#E6A23C', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
    closeModalBtn: { padding: 12, alignItems: 'center' }
});
