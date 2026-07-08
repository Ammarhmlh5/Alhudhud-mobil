import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type FrameData = {
    id: number;
    type: 'EMPTY' | 'HONEY' | 'BROOD' | 'POLLEN' | 'FOUNDATION' | 'MIXED';
    percentages: {
        honey: number;
        brood: number;
        pollen: number;
    };
};

type InspectionFrameProps = {
    number: number;
    data: FrameData;
    onPress: () => void;
};

export function InspectionFrame({ number, data, onPress }: InspectionFrameProps) {
    // Color coding based on primary content
    const getBackgroundColor = () => {
        if (data.type === 'HONEY') return '#F2C94C'; // Yellow
        if (data.type === 'BROOD') return '#D35400'; // Dark Orange
        if (data.type === 'POLLEN') return '#27AE60'; // Green
        if (data.type === 'FOUNDATION') return '#BDC3C7'; // Grey
        if (data.type === 'MIXED') return '#E67E22'; // Orange
        return '#E0E0E0'; // Empty
    };

    return (
        <TouchableOpacity style={[styles.frame, { backgroundColor: getBackgroundColor() }]} onPress={onPress}>
            <View style={styles.tab} />
            <View style={styles.content}>
                <ThemedText style={{ fontWeight: 'bold', color: '#333' }}>{number}</ThemedText>
                {data.type !== 'EMPTY' && (
                    <ThemedText style={{ fontSize: 10, color: '#333' }}>{data.type}</ThemedText>
                )}
            </View>
            <View style={styles.tab} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    frame: {
        width: 60,
        height: 120,
        margin: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#999',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    tab: {
        width: 40,
        height: 6,
        backgroundColor: '#8d6e63', // Wood color
        borderRadius: 2,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
