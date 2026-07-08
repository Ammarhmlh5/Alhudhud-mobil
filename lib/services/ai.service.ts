import { api } from '../apiClient';

export const AIService = {
    ask: async (question: string, context?: any): Promise<{ response: string; isMock: boolean }> => {
        try {
            const response = await api.post('/ai/chat', {
                message: question,
                context: context
            });

            if (!response.ok) {
                const mockResponse = AIService.getMockResponse(question);
                return { response: mockResponse, isMock: true };
            }

            const data = await response.json();
            return { response: data.response || data.message, isMock: false };
        } catch (error) {
            console.error('AI Service Error:', error);
            const mockResponse = AIService.getMockResponse(question);
            return { response: mockResponse, isMock: true };
        }
    },

    getMockResponse: (question: string): string => {
        if (question.includes('تغذية')) {
            return 'في هذا الوقت من السنة (الربيع)، يُنصح بالتغذية التحفيزية (1:1) لتنشيط الملكة على وضع البيض، خاصة إذا كان المرعى ضعيفاً.';
        }
        if (question.includes('فاروا') || question.includes('علاج')) {
            return 'لمكافحة الفاروا، يمكنك استخدام شرائط الأبيفار أو الستريبس إذا لم تكن في موسم جمع العسل. تأكد من تبديل المواد الفعالة لتجنب مقاومة الطفيل.';
        }
        if (question.includes('ملكة') || question.includes('تطريد')) {
            return 'إذا كانت الخلية تميل للتطريد، قم بفحصها بحثاً عن بيوت ملكية. إذا وجدتها، يمكنك تقسيم الخلية أو هدم البيوت وتوسيع الحيز بإضافة عاسلة.';
        }
        return 'أنا مستشارك الذكي. حالياً أعمل في الوضع التجريبي للإجابة على أسئلتك حول تربية النحل. يرجى صياغة سؤالك بوضوح حول التغذية، الأمراض، أو العمليات النحلية.';
    }
};
