import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('فشل تسجيل الدخول', error.message);
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
                    <ThemedText type="title" style={styles.title}>مملكة النحل</ThemedText>
                    <ThemedText style={styles.subtitle}>سجل دخولك لإدارة مناحلك</ThemedText>
                </ThemedView>

                <ThemedView style={styles.form}>
                    <ThemedText style={styles.label}>البريد الإلكتروني</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="example@mail.com"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <ThemedText style={styles.label}>كلمة المرور</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="********"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={styles.buttonText}>تسجيل الدخول</ThemedText>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkButton}>
                        <ThemedText style={styles.linkText}>نسيت كلمة المرور؟</ThemedText>
                    </TouchableOpacity>
                </ThemedView>

                <ThemedView style={styles.footer}>
                    <ThemedText>ليس لديك حساب؟ </ThemedText>
                    <TouchableOpacity onPress={() => router.push('/auth/register')}>
                        <ThemedText style={styles.footerLink}>إنشاء حساب جديد</ThemedText>
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
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 16,
        borderRadius: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#E6A23C',
    },
    subtitle: {
        marginTop: 8,
        color: '#666',
    },
    form: {
        gap: 16,
    },
    label: {
        fontWeight: 'bold',
        marginBottom: -8,
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
    linkButton: {
        alignItems: 'center',
        marginTop: 8,
    },
    linkText: {
        color: '#666',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        marginTop: 40,
    },
    footerLink: {
        color: '#E6A23C',
        fontWeight: 'bold',
    }
});
