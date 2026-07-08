import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';

export type ApiaryContextSelectorProps = {
    apiaries: any[];
    selectedApiaryId: string | null;
    onSelectApiary: (id: string | null) => void;
};

export function ApiaryContextSelector({ apiaries, selectedApiaryId, onSelectApiary }: ApiaryContextSelectorProps) {
    const colorScheme = useColorScheme();
    const tintColor = Colors[colorScheme ?? 'light'].tint;

    const handleSelect = (id: string | null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelectApiary(id);
    };

    return (
        <ThemedView style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { flexDirection: 'row-reverse' }]}
            >
                <TouchableOpacity
                    onPress={() => handleSelect(null)}
                    style={[
                        styles.chip,
                        !selectedApiaryId && { backgroundColor: tintColor, borderColor: tintColor }
                    ]}
                >
                    <ThemedText style={[styles.chipText, !selectedApiaryId && styles.activeChipText]}>
                        الكل
                    </ThemedText>
                </TouchableOpacity>

                {apiaries.map((apiary) => (
                    <TouchableOpacity
                        key={apiary.id}
                        onPress={() => handleSelect(apiary.id)}
                        style={[
                            styles.chip,
                            selectedApiaryId === apiary.id && { backgroundColor: tintColor, borderColor: tintColor }
                        ]}
                    >
                        <ThemedText style={[styles.chipText, selectedApiaryId === apiary.id && styles.activeChipText]}>
                            {apiary.name}
                        </ThemedText>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    chipText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
    },
    activeChipText: {
        color: '#fff',
    }
});
