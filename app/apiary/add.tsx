import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDB } from '@/lib/db/init';
import { SyncService } from '@/lib/services/sync.service';

export default function AddApiaryScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const [name, setName] = useState('');
    const [type, setType] = useState<'FIXED' | 'MOBILE'>('FIXED');
    const [location, setLocation] = useState('');

    const handleCreate = async () => {
        if (!name) {
            Alert.alert('خطأ', 'يرجى إدخال اسم المنحل');
            return;
        }

        try {
            const db = getDB();
            if (!db) return;

            const id = crypto.randomUUID();
            const newApiary = {
                id,
                name,
                type,
                location,
                hiveCount: 0,
                updated_at: new Date().toISOString()
            };

            // 1. Insert into local DB
            db.runSync(
                'INSERT INTO apiaries (id, name, type, location) VALUES (?, ?, ?, ?)',
                [id, name, type, location]
            );

            // 2. Queue for sync
            await SyncService.queueChange('apiaries', id, 'INSERT', newApiary);

            Alert.alert('تم بنجاح', 'تم إنشاء المنحل', [
                { text: 'حسناً', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('خطأ', 'فشل إنشاء المنحل');
        }
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'إضافة منحل جديد' }} />
            <ScrollView contentContainerStyle={styles.content}>

                <ThemedText type="subtitle" style={styles.label}>اسم المنحل</ThemedText>
                <TextInput
                    style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].icon }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="مثال: منحل الوادي"
                    placeholderTextColor="#999"
                />

                <ThemedText type="subtitle" style={styles.label}>نوع المنحل</ThemedText>
                <View style={styles.typeContainer}>
                    <TouchableOpacity
                        style={[styles.typeButton, type === 'FIXED' && styles.selectedType]}
                        onPress={() => setType('FIXED')}
                    >
                        <ThemedText style={[styles.typeText, type === 'FIXED' && styles.selectedTypeText]}>ثابت</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeButton, type === 'MOBILE' && styles.selectedType]}
                        onPress={() => setType('MOBILE')}
                    >
                        <ThemedText style={[styles.typeText, type === 'MOBILE' && styles.selectedTypeText]}>متنقل</ThemedText>
                    </TouchableOpacity>
                </View>

                <ThemedText type="subtitle" style={styles.label}>الموقع</ThemedText>
                <TextInput
                    style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].icon }]}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="أدخل وصف الموقع أو الإحداثيات"
                    placeholderTextColor="#999"
                />

                <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                    <ThemedText style={styles.createButtonText}>إنشاء المنحل</ThemedText>
                </TouchableOpacity>

            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    label: {
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        textAlign: 'right' // RTL
    },
    typeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    typeButton: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        alignItems: 'center',
    },
    selectedType: {
        backgroundColor: '#E6A23C',
        borderColor: '#E6A23C',
    },
    typeText: {
        fontSize: 16,
    },
    selectedTypeText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    createButton: {
        backgroundColor: '#E6A23C',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 32,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
