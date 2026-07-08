import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { HiveSetupWizard, HiveData } from '@/components/HiveSetupWizard';
import { getDB } from '@/lib/db/init';
import { SyncService } from '@/lib/services/sync.service';

export default function AddHiveScreen() {
    const router = useRouter();
    const { apiaryId } = useLocalSearchParams();

    const handleComplete = async (data: HiveData) => {
        if (!apiaryId) {
            Alert.alert('خطأ', 'رقم المنحل مفقود');
            return;
        }

        try {
            const db = getDB();
            if (!db) return;

            const id = crypto.randomUUID();
            const newHive = {
                id,
                apiaryId,
                hiveNumber: 'AUTO_' + Date.now().toString().slice(-4), // Should ask user or auto-increment properly
                type: data.type,
                dimensions: data.dimensions,
                frameCount: parseInt(data.frameCount),
                frameOrientation: data.frameOrientation,
                queenDetails: data.queen,
                updated_at: new Date().toISOString()
            };

            // 1. Insert into local DB
            await db.runSync(
                `INSERT INTO hives (
           id, apiary_id, hive_number, type, dimensions, frame_count, 
           frame_orientation, queen_details
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    apiaryId as string,
                    newHive.hiveNumber,
                    data.type,
                    JSON.stringify(data.dimensions),
                    newHive.frameCount,
                    data.frameOrientation,
                    JSON.stringify(data.queen)
                ]
            );

            // 2. Queue for sync
            await SyncService.queueChange('hives', id, 'INSERT', newHive);

            Alert.alert('تم بنجاح', 'تمت إضافة الخلية', [
                { text: 'حسناً', onPress: () => router.back() }
            ]);

        } catch (error) {
            console.error(error);
            Alert.alert('خطأ', 'فشل إضافة الخلية');
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'إعداد خلية جديدة' }} />
            <HiveSetupWizard onComplete={handleComplete} />
        </>
    );
}
