import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ApiaryCardProps = {
    apiary: {
        id: string;
        name: string;
        type: string;
        location?: string;
        hiveCount?: number;
    };
    onPress: () => void;
};

export function ApiaryCard({ apiary, onPress }: ApiaryCardProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <TouchableOpacity onPress={onPress}>
            <ThemedView style={styles.card}>
                <View style={styles.header}>
                    <IconSymbol size={24} name="house.fill" color={theme.text} />
                    <ThemedText type="defaultSemiBold" style={styles.title}>{apiary.name}</ThemedText>
                    <View style={[styles.badge, { backgroundColor: apiary.type === 'MOBILE' ? '#E6A23C' : '#67C23A' }]}>
                        <ThemedText style={styles.badgeText}>{apiary.type === 'MOBILE' ? 'متنقل' : 'ثابت'}</ThemedText>
                    </View>
                </View>

                <View style={styles.details}>
                    <ThemedText style={styles.detailText}>📍 {apiary.location || 'غير محدد'}</ThemedText>
                    <ThemedText style={styles.detailText}>🐝 {apiary.hiveCount || 0} خلية</ThemedText>
                </View>
            </ThemedView>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 16,
        borderRadius: 12,
        marginVertical: 8,
        marginHorizontal: 16,
        backgroundColor: 'rgba(255,255,255,0.1)', // Glass-like effect placeholder
        borderWidth: 1,
        borderColor: '#eee',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        flex: 1,
        marginLeft: 8,
        fontSize: 18,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailText: {
        fontSize: 14,
        opacity: 0.8,
    }
});
