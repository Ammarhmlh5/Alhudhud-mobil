import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Hive = {
    id: string;
    hive_number: string;
    type: string;
    frame_count: number;
};

export default function HiveListScreen() {
    const { id } = useLocalSearchParams(); // apiaryId
    const router = useRouter();
    const navigation = useNavigation();
    const colorScheme = useColorScheme();
    const [hives, setHives] = useState<Hive[]>([]);

    const loadHives = useCallback(() => {
        const db = getDB();
        if (!db || !id) return;

        try {
            const result = db.getAllSync(
                'SELECT * FROM hives WHERE apiary_id = ? ORDER BY hive_number ASC',
                [id as string]
            );
            setHives(result as Hive[]);
        } catch (e) {
            console.error(e);
        }
    }, [id]);

    useEffect(() => {
        loadHives();
    }, [loadHives]);

    // Reload when coming back from add screen
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadHives();
        });
        return unsubscribe;
    }, [navigation, loadHives]);

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'خلايا المنحل' }} />

            <FlatList
                data={hives}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={() => (
                    <View style={styles.empty}>
                        <ThemedText>لا توجد خلايا في هذا المنحل.</ThemedText>
                    </View>
                )}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push(`/hive/${item.id}`)}
                    >
                        <View style={styles.iconBox}>
                            <IconSymbol name="archivebox" size={24} color="#E6A23C" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText type="defaultSemiBold">خلية رقم {item.hive_number}</ThemedText>
                            <ThemedText style={styles.subText}>{item.type} | {item.frame_count} إطار</ThemedText>
                        </View>
                        <IconSymbol name="chevron.left" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push(`/hive/add?apiaryId=${id}`)}
            >
                <IconSymbol name="plus" size={30} color="#fff" />
            </TouchableOpacity>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    empty: { alignItems: 'center', marginTop: 40 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        marginBottom: 12,
        gap: 12
    },
    iconBox: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(230, 162, 60, 0.2)',
        alignItems: 'center', justifyContent: 'center'
    },
    subText: { fontSize: 12, opacity: 0.7 },
    fab: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        backgroundColor: '#E6A23C',
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
});
