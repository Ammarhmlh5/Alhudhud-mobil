import { View, ScrollView, StyleSheet, Button, Text } from 'react-native';
import { useState } from 'react';
import { getDB } from '@/lib/db/init';
import { AdvisorService } from '@/lib/logic/advisor';
import { SyncService } from '@/lib/services/sync.service';

export default function VerificationScreen() {
    const [logs, setLogs] = useState<string[]>([]);

    const log = (msg: string) => setLogs(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const runOfflineTest = async () => {
        log('--- بدء اختبار Offline Mode ---');
        try {
            const db = getDB();
            if (!db) throw new Error('DB not init');

            // 1. Create Apiary
            const apiaryId = 'TEST_APIARY_' + Math.floor(Math.random() * 1000);
            db.runSync('INSERT INTO apiaries (id, name, type) VALUES (?, ?, ?)', [apiaryId, 'منحل التجربة', 'FIXED']);
            log(`1. تم إنشاء منحل محلي: ${apiaryId}`);

            // 2. Queue Sync
            await SyncService.queueChange('apiaries', apiaryId, 'INSERT', { id: apiaryId, name: 'منحل التجربة' });
            log('2. تم إضافة العملية لطابور المزامنة');

            // 3. Verify Queue
            const queue = db.getAllSync('SELECT * FROM sync_queue WHERE record_id = ?', [apiaryId]);
            if (queue.length > 0) {
                log(`3. نجاح: وجدنا ${queue.length} سجل في الطابور.`);
            } else {
                log('3. فشل: لم يتم العثور على السجل في الطابور!');
            }

        } catch (e: any) {
            log('خطأ: ' + e.message);
        }
    };

    const runAdvisorTest = () => {
        log('--- بدء اختبار المستشار ---');
        // Test Case: Starvation
        const framesStarved: any[] = [
            { type: 'BROOD' }, { type: 'BROOD' }, { type: 'EMPTY' }, { type: 'EMPTY' }
        ];
        const advice1 = AdvisorService.analyze(framesStarved, 'SPRING');
        if (advice1.find(a => a.id === 'starvation')) {
            log('1. نجاح: تم اكتشاف خطر الجوع.');
        } else {
            log('1. فشل: لم يتم اكتشاف الجوع!');
        }

        // Test Case: Weak Colony
        const framesWeak: any[] = [
            { type: 'HONEY' }, { type: 'HONEY' }, { type: 'EMPTY' }, { type: 'EMPTY' }, { type: 'EMPTY' }, { type: 'EMPTY' }
        ];
        const advice2 = AdvisorService.analyze(framesWeak, 'SPRING');
        if (advice2.find(a => a.id === 'weak_colony')) {
            log('2. نجاح: تم اكتشاف ضعف الخلية.');
        } else {
            log('2. فشل: لم يتم اكتشاف الضعف!');
        }
    };

    return (
        <ScrollView style={{ flex: 1, padding: 20, marginTop: 40 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>شاشة التحقق (Debug)</Text>

            <View style={{ gap: 10, marginBottom: 20 }}>
                <Button title="1. اختبار وضع عدم الاتصال (Offline)" onPress={runOfflineTest} />
                <Button title="2. اختبار المستشار (Advisor Logic)" onPress={runAdvisorTest} />
            </View>

            <View style={{ backgroundColor: '#f0f0f0', padding: 10, borderRadius: 5 }}>
                <Text style={{ fontWeight: 'bold' }}>السجلات:</Text>
                {logs.map((l, i) => <Text key={i} style={{ fontSize: 12, marginVertical: 2 }}>{l}</Text>)}
            </View>
        </ScrollView>
    );
}
