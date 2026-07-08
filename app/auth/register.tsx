import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterScreen() {
    const router = useRouter();
    const { register } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('خطأ', 'يرجى تعبئة جميع الحقول');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('خطأ', 'كلمتا المرور غير متطابقتين');
            return;
        }
        if (password.length < 6) {
            Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        setLoading(true);
        try {
            await register(name, email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('فشل إنشاء الحساب', error.message);
        } finally {
            setLoading(false);
        }
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
                    <ThemedText style={styles.subtitle}>انضم إلى مملكة النحل</ThemedText>
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
                    />

                    <ThemedText style={styles.label}>كلمة المرور</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="6 أحرف على الأقل"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        textAlign="right"
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
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
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
                    <TouchableOpacity onPress={() => router.back()}>
                        <ThemedText style={styles.footerLink}>تسجيل الدخول</ThemedText>
                    </TouchableOpacity>
                </ThemedView>
            </ScrollView>
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
