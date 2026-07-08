import { FrameData } from '@/components/InspectionFrame';

type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

export type Advice = {
    id: string;
    type: 'ALERT' | 'WARNING' | 'TIP';
    message: string;
    action?: string;
};

export const AdvisorService = {
    analyze: (frames: FrameData[], season: Season = 'SPRING'): Advice[] => {
        const advice: Advice[] = [];
        const frameCount = frames.length;

        // Calculate totals
        const broodCount = frames.filter(f => f.type === 'BROOD').length;
        const honeyCount = frames.filter(f => f.type === 'HONEY').length;
        const pollenCount = frames.filter(f => f.type === 'POLLEN').length;
        const emptyCount = frames.filter(f => f.type === 'EMPTY').length;

        // RULE 1: Weak Colony Warning
        if (broodCount < 3 && frameCount > 5) {
            advice.push({
                id: 'weak_colony',
                type: 'WARNING',
                message: 'الخلية ضعيفة جداً من حيث الحضنة.',
                action: 'تأكد من سلامة الملكة أو قم بدمج الخلية.'
            });
        }

        // RULE 2: Starvation Risk
        if (honeyCount < 2) {
            advice.push({
                id: 'starvation',
                type: 'ALERT',
                message: 'مخزون العسل منخفض جداً! الخلية مهددة بالجوع.',
                action: 'قم بالتغذية السكرية فوراً.'
            });
        }

        // RULE 3: Space Constraint (Swarming Risk in Spring)
        if (season === 'SPRING' && emptyCount < 2 && frameCount >= 8) {
            advice.push({
                id: 'swarming_risk',
                type: 'WARNING',
                message: 'الخلية مزدحمة وقد تميل للتطريد.',
                action: 'قم بإضافة عاسلة أو تقسيم الخلية.'
            });
        }

        // RULE 4: Pollen Shortage (Spring/Autumn)
        if ((season === 'SPRING' || season === 'AUTUMN') && pollenCount < 1 && broodCount > 3) {
            advice.push({
                id: 'pollen_shortage',
                type: 'TIP',
                message: 'نشاط حضنة جيد لكن مخزون حبوب اللقاح قليل.',
                action: 'قدم بدائل حبوب اللقاح لدعم الحضنة.'
            });
        }

        return advice;
    }
};
