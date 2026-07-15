import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

export default function LoginScreen() {
    const router = useRouter();
    const { login, googleLogin } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    const [request, , promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: GOOGLE_WEB_CLIENT_ID,
            redirectUri: AuthSession.makeRedirectUri({
                scheme: 'alhudhud',
                path: 'auth',
            }),
            scopes: ['openid', 'profile', 'email'],
            usePKCE: true,
        },
        discovery
    );

    const handleGoogleLogin = async () => {
        try {
            const result = await promptAsync();
            if (result.type === 'success') {
                setLoading(true);
                try {
                    await googleLogin(result.authentication?.idToken || result.params.id_token || '');
                    router.replace('/(tabs)');
                } catch (error: any) {
                    Alert.alert('فشل تسجيل الدخول', error.message || 'حدث خطأ أثناء تسجيل الدخول بحساب Google');
                } finally {
                    setLoading(false);
                }
            }
        } catch {
            Alert.alert('خطأ', 'تم إلغاء عملية تسجيل الدخول');
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('خطأ', 'يرجى إدخال بريد إلكتروني صحيح');
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
                    <ThemedText type="title" style={styles.title}>الهدهد موبايل</ThemedText>
                    <ThemedText style={styles.subtitle}>سجل دخولك للوصول إلى خدماتك</ThemedText>
                </ThemedView>

                <ThemedView style={styles.form}>
                    {GOOGLE_WEB_CLIENT_ID ? (
                        <>
                            <TouchableOpacity
                                style={[styles.googleButton, loading && styles.buttonDisabled]}
                                onPress={handleGoogleLogin}
                                disabled={loading || !request}
                                accessibilityLabel="تسجيل الدخول بحساب Google"
                                accessibilityRole="button"
                            >
                                {loading ? (
                                    <ActivityIndicator color="#333" />
                                ) : (
                                    <View style={styles.googleBtnContent}>
                                        <ThemedText style={styles.googleBtnText}>تسجيل الدخول بحساب Google</ThemedText>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <View style={styles.dividerRow}>
                                <View style={styles.dividerLine} />
                                <ThemedText style={styles.dividerText}>أو</ThemedText>
                                <View style={styles.dividerLine} />
                            </View>
                        </>
                    ) : null}

                    <ThemedText style={styles.label}>البريد الإلكتروني</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="example@mail.com"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        accessibilityLabel="البريد الإلكتروني"
                    />

                    <ThemedText style={styles.label}>كلمة المرور</ThemedText>
                    <TextInput
                        style={styles.input}
                        placeholder="********"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        accessibilityLabel="كلمة المرور"
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        accessibilityLabel="تسجيل الدخول"
                        accessibilityRole="button"
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={styles.buttonText}>تسجيل الدخول</ThemedText>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkButton} onPress={() => Alert.alert('نسيت كلمة المرور', 'يرجى التواصل مع الدعم الفني لإعادة تعيين كلمة المرور')} accessibilityLabel="نسيت كلمة المرور؟" accessibilityRole="button">
                        <ThemedText style={styles.linkText}>نسيت كلمة المرور؟</ThemedText>
                    </TouchableOpacity>
                </ThemedView>

                <ThemedView style={styles.footer}>
                    <ThemedText>ليس لديك حساب؟ </ThemedText>
                    <TouchableOpacity onPress={() => router.push('/auth/register')} accessibilityLabel="إنشاء حساب جديد" accessibilityRole="button">
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
    googleButton: {
        backgroundColor: '#fff',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    googleBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    googleBtnText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '600',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 4,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#ddd',
    },
    dividerText: {
        color: '#999',
        fontSize: 13,
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
