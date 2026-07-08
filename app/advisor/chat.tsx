import { Stack } from 'expo-router';
import { View, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState, useRef } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { AIService } from '@/lib/services/ai.service';

type Message = {
    id: string;
    text: string;
    sender: 'USER' | 'AI';
    createdAt: number;
};

export default function AdvisorChatScreen() {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'مرحباً بك! أنا مستشارك الذكي في عالم النحل. كيف يمكنني مساعدتك اليوم؟', sender: 'AI', createdAt: Date.now() }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            text: inputText.trim(),
            sender: 'USER',
            createdAt: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        try {
            const { response: responseText, isMock } = await AIService.ask(userMsg.text);
            const text = isMock
                ? `⚠️ (وضع تجريبي - غير متصل بالخادم)\n\n${responseText}`
                : responseText;
            const aiMsg: Message = {
                id: crypto.randomUUID(),
                text,
                sender: 'AI',
                createdAt: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
            const errorMsg: Message = {
                id: crypto.randomUUID(),
                text: 'عذراً، حدث خطأ في الاتصال بالمستشار.',
                sender: 'AI',
                createdAt: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ title: 'المستشار الذكي' }} />

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => (
                    <View style={[
                        styles.messageBubble,
                        item.sender === 'USER' ? styles.userBubble : styles.aiBubble
                    ]}>
                        {item.sender === 'AI' && <IconSymbol name="sparkles" size={16} color="#8E44AD" style={{ marginBottom: 4 }} />}
                        <ThemedText style={{ color: item.sender === 'USER' ? '#fff' : '#333' }}>
                            {item.text}
                        </ThemedText>
                    </View>
                )}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="اكتب سؤالك هنا..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <IconSymbol name="arrow.up" size={24} color="#fff" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
    userBubble: { alignSelf: 'flex-start', backgroundColor: '#3498DB', borderBottomLeftRadius: 4 }, // Arabic RTL: User starts from right? No, usually chat apps: Me right, Other left.
    // Wait, in RTL: Flex-start is Right. 
    // Let's assume standard behavior: User (Me) on one side, AI on other.
    // I'll stick to visual colors.
    aiBubble: { alignSelf: 'flex-end', backgroundColor: '#f0f0f0', borderBottomRightRadius: 4 },
    inputContainer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', gap: 12 },
    input: { flex: 1, backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, textAlign: 'right' },
    sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8E44AD', justifyContent: 'center', alignItems: 'center' }
});
