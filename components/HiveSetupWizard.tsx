import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, TextInput, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './ui/IconSymbol';

export type HiveData = {
    type: 'LANGSTROTH' | 'BALADI' | 'KENYAN' | 'OTHER';
    dimensions: { width: string; length: string; height: string };
    frameCount: string;
    frameOrientation: 'LONGITUDINAL' | 'TRANSVERSE';
    queen: { age: string; breed: string; installedAt: Date | null };
};

type StepProps = {
    data: HiveData;
    updateData: (key: keyof HiveData, value: any) => void;
    updateNestedData: (parent: keyof HiveData, key: string, value: any) => void;
    onNext: () => void;
    onBack: () => void;
};

// --- A. Hive Type Selection ---
const TypeSelectionStep = ({ data, updateData, onNext }: StepProps) => {
    const types = [
        { id: 'LANGSTROTH', label: 'لانجستروث (Langstroth)', icon: 'cube.box' },
        { id: 'BALADI', label: 'بلدي / طينية', icon: 'cylinder' }, // 'cylinder' is placeholder
        { id: 'KENYAN', label: 'كينية (Top Bar)', icon: 'rectangle.split.3x1' },
    ];

    return (
        <View>
            <ThemedText type="subtitle" style={styles.stepTitle}>اختر نوع الخلية</ThemedText>
            {types.map((t) => (
                <TouchableOpacity
                    key={t.id}
                    style={[styles.optionCard, data.type === t.id && styles.selectedOption]}
                    onPress={() => updateData('type', t.id)}
                >
                    <IconSymbol name={t.icon as any} size={24} color="#333" />
                    <ThemedText style={styles.optionText}>{t.label}</ThemedText>
                    {data.type === t.id && <IconSymbol name="checkmark.circle.fill" size={24} color="#E6A23C" />}
                </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.nextButton} onPress={onNext}>
                <ThemedText style={styles.btnText}>التالي</ThemedText>
            </TouchableOpacity>
        </View>
    );
};

// --- B. Dimensions & Frames ---
const DimensionsStep = ({ data, updateData, updateNestedData, onNext, onBack }: StepProps) => {
    return (
        <View>
            <ThemedText type="subtitle" style={styles.stepTitle}>الأبعاد والإطارات</ThemedText>

            <View style={styles.inputGroup}>
                <ThemedText>عدد الإطارات:</ThemedText>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={data.frameCount}
                    onChangeText={(v) => updateData('frameCount', v)}
                    placeholder="مثال: 10"
                />
            </View>

            <View style={styles.inputGroup}>
                <ThemedText>توجيه الإطارات:</ThemedText>
                <View style={styles.row}>
                    <TouchableOpacity
                        style={[styles.chip, data.frameOrientation === 'LONGITUDINAL' && styles.selectedChip]}
                        onPress={() => updateData('frameOrientation', 'LONGITUDINAL')}
                    >
                        <ThemedText style={data.frameOrientation === 'LONGITUDINAL' ? { color: '#fff' } : {}}>طولي (بارد)</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.chip, data.frameOrientation === 'TRANSVERSE' && styles.selectedChip]}
                        onPress={() => updateData('frameOrientation', 'TRANSVERSE')}
                    >
                        <ThemedText style={data.frameOrientation === 'TRANSVERSE' ? { color: '#fff' } : {}}>عرضي (حار)</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>

            <ThemedText style={{ marginTop: 16, marginBottom: 8 }}>الأبعاد (سم):</ThemedText>
            <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="العرض" keyboardType="numeric"
                    value={data.dimensions.width} onChangeText={(v) => updateNestedData('dimensions', 'width', v)} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="الطول" keyboardType="numeric"
                    value={data.dimensions.length} onChangeText={(v) => updateNestedData('dimensions', 'length', v)} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="الارتفاع" keyboardType="numeric"
                    value={data.dimensions.height} onChangeText={(v) => updateNestedData('dimensions', 'height', v)} />
            </View>

            <View style={styles.navButtons}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}><ThemedText>السابق</ThemedText></TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={onNext}><ThemedText style={styles.btnText}>التالي</ThemedText></TouchableOpacity>
            </View>
        </View>
    );
};

// --- C. Queen Details ---
const QueenStep = ({ data, updateNestedData, onNext, onBack }: StepProps) => {
    return (
        <View>
            <ThemedText type="subtitle" style={styles.stepTitle}>بيانات الملكة</ThemedText>

            <View style={styles.inputGroup}>
                <ThemedText>سلالة الملكة:</ThemedText>
                <TextInput
                    style={styles.input}
                    value={data.queen.breed}
                    onChangeText={(v) => updateNestedData('queen', 'breed', v)}
                    placeholder="مثال: كرنيولي، إيطالي..."
                />
            </View>

            <View style={styles.inputGroup}>
                <ThemedText>عمر الملكة (بالأشهر):</ThemedText>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={data.queen.age}
                    onChangeText={(v) => updateNestedData('queen', 'age', v)}
                    placeholder="مثال: 12"
                />
            </View>

            <View style={styles.navButtons}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}><ThemedText>السابق</ThemedText></TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={onNext}><ThemedText style={styles.btnText}>إنشاء الخلية</ThemedText></TouchableOpacity>
            </View>
        </View>
    );
};


export const HiveSetupWizard = ({ onComplete }: { onComplete: (data: HiveData) => void }) => {
    const [step, setStep] = useState(0);
    const [data, setData] = useState<HiveData>({
        type: 'LANGSTROTH',
        dimensions: { width: '', length: '', height: '' },
        frameCount: '10',
        frameOrientation: 'LONGITUDINAL',
        queen: { age: '', breed: '', installedAt: null },
    });

    const updateData = (key: keyof HiveData, value: any) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const updateNestedData = (parent: keyof HiveData, key: string, value: any) => {
        // @ts-ignore
        setData(prev => ({ ...prev, [parent]: { ...prev[parent], [key]: value } }));
    };

    const next = () => {
        if (step < 2) setStep(step + 1);
        else onComplete(data);
    };

    const back = () => {
        if (step > 0) setStep(step - 1);
    };

    return (
        <ThemedView style={styles.container}>
            <StepsIndicator current={step} total={3} />
            <ScrollView contentContainerStyle={styles.content}>
                {step === 0 && <TypeSelectionStep data={data} updateData={updateData} updateNestedData={updateNestedData} onNext={next} onBack={back} />}
                {step === 1 && <DimensionsStep data={data} updateData={updateData} updateNestedData={updateNestedData} onNext={next} onBack={back} />}
                {step === 2 && <QueenStep data={data} updateData={updateData} updateNestedData={updateNestedData} onNext={next} onBack={back} />}
            </ScrollView>
        </ThemedView>
    );
};

const StepsIndicator = ({ current, total }: { current: number, total: number }) => (
    <View style={styles.indicatorContainer}>
        {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[styles.dot, i <= current && styles.activeDot]} />
        ))}
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    stepTitle: { marginBottom: 20, textAlign: 'center' },
    optionCard: {
        padding: 16, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center', gap: 12
    },
    selectedOption: { borderColor: '#E6A23C', backgroundColor: 'rgba(230, 162, 60, 0.1)' },
    optionText: { fontSize: 16, flex: 1 },
    inputGroup: { marginBottom: 16 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginTop: 8, textAlign: 'right' },
    row: { flexDirection: 'row', gap: 12, marginTop: 8 },
    chip: { flex: 1, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
    selectedChip: { backgroundColor: '#E6A23C', borderColor: '#E6A23C' },
    navButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 },
    nextButton: { backgroundColor: '#E6A23C', padding: 16, borderRadius: 8, paddingHorizontal: 32, alignItems: 'center' },
    backButton: { padding: 16, borderRadius: 8, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold' },
    indicatorContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#eee' },
    activeDot: { backgroundColor: '#E6A23C' },
});
