import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { ApiKeyModal } from '@/components/ApiKeyModal';

export default function RegisterScreen() {
    const router = useRouter();
    const { register } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [newApiKey, setNewApiKey] = useState('');

    const validatePassword = (pwd: string): string[] => {
        const errors: string[] = [];
        if (pwd.length < 8) errors.push('8 أحرف على الأقل');
        if (!/[A-Z]/.test(pwd)) errors.push('حرف كبير واحد على الأقل');
        if (!/[0-9]/.test(pwd)) errors.push('رقم واحد على الأقل');
        return errors;
    };

    const handleRegister = async () => {
        if (!name.trim() || !email || !password || !confirmPassword) {
            Alert.alert('خطأ', 'يرجى تعبئة جميع الحقول');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('خطأ', 'يرجى إدخال بريد إلكتروني صحيح');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('خطأ', 'كلمتا المرور غير متطابقتين');
            return;
        }

        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            Alert.alert('خطأ', `كلمة المرور يجب أن تحتوي على:\n• ${passwordErrors.join('\n• ')}`);
            return;
        }

        setLoading(true);
        try {
            const result = await register(name.trim(), email, password);
            if (result.apiKey) {
                setNewApiKey(result.apiKey);
                setShowApiKeyModal(true);
            } else {
                router.replace('/(tabs)');
            }
        } catch (error: any) {
            Alert.alert('فشل إنشاء الحساب', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApiKeyModalClose = () => {
        setShowApiKeyModal(false);
        router.replace('/(tabs)');
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ThemedView style={styles.header}>
                    <Image
                        source={require('@/assets/images/icon.png')}
                        style={styles.logo}
                    />
                    <ThemedText type="title" style={styles.title}>إنشاء حساب جديد</ThemedText>
                    <ThemedText style={styles.subtitle}>انضم إلى الهدهد موبايل</ThemedText>
                </ThemedView>

                <ThemedView style={styles.form}>
                    <ThemedText style={styles.label}>الاسم الكامل</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="أدخل اسمك الكامل"
                        placeholderTextColor="#999"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        textAlign="right"
                        accessibilityLabel="الاسم الكامل"
                    />

                    <ThemedText style={styles.label}>البريد الإلكتروني</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="example@mail.com"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        textAlign="right"
                        accessibilityLabel="البريد الإلكتروني"
                    />

                    <ThemedText style={styles.label}>كلمة المرور</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="8 أحرف على الأقل"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        textAlign="right"
                        accessibilityLabel="كلمة المرور"
                    />

                    <ThemedText style={styles.label}>تأكيد كلمة المرور</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="أعد إدخال كلمة المرور"
                        placeholderTextColor="#999"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        textAlign="right"
                        accessibilityLabel="تأكيد كلمة المرور"
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                        accessibilityLabel="إنشاء الحساب"
                        accessibilityRole="button"
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={styles.buttonText}>إنشاء الحساب</ThemedText>
                        )}
                    </TouchableOpacity>
                </ThemedView>

                <ThemedView style={styles.footer}>
                    <ThemedText>لديك حساب بالفعل؟ </ThemedText>
                    <TouchableOpacity onPress={() => router.back()} accessibilityLabel="تسجيل الدخول" accessibilityRole="button">
                        <ThemedText style={styles.footerLink}>تسجيل الدخول</ThemedText>
                    </TouchableOpacity>
                </ThemedView>
            </ScrollView>

            <ApiKeyModal
                visible={showApiKeyModal}
                apiKey={newApiKey}
                onClose={handleApiKeyModalClose}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 16,
        borderRadius: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#E6A23C',
    },
    subtitle: {
        marginTop: 8,
        color: '#666',
    },
    form: {
        gap: 12,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: -4,
        textAlign: 'right',
    },
    input: {
        backgroundColor: '#f5f5f5',
        height: 56,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        textAlign: 'right',
        borderWidth: 1,
        borderColor: '#eee',
    },
    button: {
        backgroundColor: '#E6A23C',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        shadowColor: '#E6A23C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerLink: {
        color: '#E6A23C',
        fontWeight: 'bold',
    },
});
