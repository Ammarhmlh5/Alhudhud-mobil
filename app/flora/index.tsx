import { Stack, useRouter } from 'expo-router';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';

type Plant = {
    id: string;
    name: string;
    scientificName?: string;
    startMonth: number; // 1-12
    endMonth: number; // 1-12
    pollenValue: number; // 1-5
    nectarValue: number; // 1-5
};

export default function FloraScreen() {
    const router = useRouter();
    const [plants, setPlants] = useState<Plant[]>([]);
    const [modalVisible, setModalVisible] = useState(false);

    // New Plant Form
    const [newName, setNewName] = useState('');
    const [startM, setStartM] = useState('3');
    const [endM, setEndM] = useState('5');

    useEffect(() => {
        loadPlants();
    }, []);

    const loadPlants = () => {
        const db = getDB();
        if (!db) return;
        try {
            db.execSync(`
        CREATE TABLE IF NOT EXISTS plants (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          start_month INTEGER,
          end_month INTEGER,
          pollen_value INTEGER,
          nectar_value INTEGER
        );
      `);

            const result = db.getAllSync('SELECT * FROM plants ORDER BY name ASC');
            setPlants(result.map((r: any) => ({
                id: r.id,
                name: r.name,
                startMonth: r.start_month,
                endMonth: r.end_month,
                pollenValue: r.pollen_value,
                nectarValue: r.nectar_value
            })));
        } catch (e) {
            console.error(e);
        }
    };

    const addPlant = () => {
        if (!newName) return;
        const db = getDB();
        if (!db) return;
        try {
            const id = crypto.randomUUID();
            db.runSync(
                `INSERT INTO plants (id, name, start_month, end_month, pollen_value, nectar_value) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, newName, parseInt(startM), parseInt(endM), 3, 3] // Default values 3 for MVP
            );
            setNewName('');
            setModalVisible(false);
            loadPlants();
            Alert.alert('تم', 'تم إضافة النبات للمكتبة المحلية');
        } catch (e) {
            console.error(e);
        }
    };

    const currentMonth = new Date().getMonth() + 1;

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'المراعي والنباتات' }} />

            <View style={styles.header}>
                <ThemedText>الشهر الحالي: {currentMonth}</ThemedText>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <IconSymbol name="plus" size={20} color="#fff" />
                    <ThemedText style={{ color: '#fff' }}>إضافة نبات</ThemedText>
                </TouchableOpacity>
            </View>

            <FlatList
                data={plants}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                    const isBlooming = currentMonth >= item.startMonth && currentMonth <= item.endMonth;
                    return (
                        <View style={[styles.card, isBlooming && styles.bloomingCard]}>
                            <View style={{ flex: 1 }}>
                                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                                <ThemedText style={{ fontSize: 12 }}>الإزهار: شهر {item.startMonth} - {item.endMonth}</ThemedText>
                            </View>
                            {isBlooming && (
                                <View style={styles.bloomingBadge}>
                                    <IconSymbol name="sun.max.fill" size={16} color="#E67E22" />
                                    <ThemedText style={{ fontSize: 10, color: '#E67E22' }}>مزهر الآن</ThemedText>
                                </View>
                            )}
                        </View>
                    );
                }}
                ListEmptyComponent={<ThemedText style={{ textAlign: 'center', marginTop: 40, opacity: 0.5 }}>أضف نباتات منطقتك لتتبع مواسم الإزهار</ThemedText>}
            />

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>نبات جديد</ThemedText>
                        <TextInput style={styles.input} placeholder="اسم النبات (مثال: سدر)" value={newName} onChangeText={setNewName} />
                        <View style={styles.row}>
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="بداية (شهر)" keyboardType="numeric" value={startM} onChangeText={setStartM} />
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="نهاية (شهر)" keyboardType="numeric" value={endM} onChangeText={setEndM} />
                        </View>
                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.btn, { backgroundColor: '#27AE60', flex: 1 }]} onPress={addPlant}>
                                <ThemedText style={{ color: '#fff' }}>حفظ</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, { backgroundColor: '#ccc', flex: 1 }]} onPress={() => setModalVisible(false)}>
                                <ThemedText>إلغاء</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
    addBtn: { backgroundColor: '#27AE60', flexDirection: 'row', padding: 8, borderRadius: 8, gap: 4, alignItems: 'center' },
    card: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
    bloomingCard: { backgroundColor: 'rgba(230, 126, 34, 0.1)' },
    bloomingBadge: { alignItems: 'center', backgroundColor: '#fff', padding: 4, borderRadius: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12 },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 8, marginBottom: 12, textAlign: 'right' },
    row: { flexDirection: 'row', gap: 12 },
    btn: { padding: 12, borderRadius: 8, alignItems: 'center' }
});
