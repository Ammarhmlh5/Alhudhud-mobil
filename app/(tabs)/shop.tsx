import { View, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getDB } from '@/lib/db/init';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';

// Standard Catalog (Reflecting "Central Catalog" requirement)
const CATALOG = [
    { id: 'p1', name: 'عسل سدر فاخر', category: 'HONEY', icon: 'drop.fill', color: '#E67E22' },
    { id: 'p2', name: 'عسل زهور الربيع', category: 'HONEY', icon: 'sun.max.fill', color: '#F1C40F' },
    { id: 'p3', name: 'حبوب لقاح (1 كجم)', category: 'POLLEN', icon: 'circle.grid.3x3.fill', color: '#27AE60' },
    { id: 'p4', name: 'شمع أساس (بلدي)', category: 'WAX', icon: 'hexagon.fill', color: '#D35400' },
    { id: 'p5', name: 'طرد نحل (5 إطارات)', category: 'BEES', icon: 'ant.fill', color: '#2C3E50' },
];

export default function ShopScreen() {
    const colorScheme = useColorScheme();
    const tintColor = Colors[colorScheme ?? 'light'].tint;

    const [activeTab, setActiveTab] = useState<'BUY' | 'SELL'>('BUY');
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Merchant State
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

    const loadListings = useCallback(() => {
        setLoading(true);
        const db = getDB();
        if (db) {
            try {
                const res = db.getAllSync('SELECT * FROM listings');
                setListings(res);
            } catch (e) {
                console.error(e);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadListings();
    }, [loadListings, activeTab]);

    const handleBuy = (item: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('طلب شراء', `تم إرسال طلب شراء لـ ${CATALOG.find(c => c.id === item.catalog_id)?.name}. سيقوم البائع بالتواصل معك.`);
    };

    const renderBuy = () => (
        <FlatList
            data={listings}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
                const product = CATALOG.find(c => c.id === item.catalog_id);
                return (
                    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => handleBuy(item)}>
                        <View style={[styles.iconBox, { backgroundColor: product?.color + '20' }]}>
                            <IconSymbol name={product?.icon as any || 'cart.fill'} size={24} color={product?.color || '#8E44AD'} />
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                            <ThemedText type="defaultSemiBold">{product?.name || 'منتج غير معروف'}</ThemedText>
                            <ThemedText style={styles.merchantText}>البائع: {item.merchant_name || 'منحل السعادة'}</ThemedText>
                            <ThemedText style={[styles.priceText, { color: tintColor }]}>{item.price} ر.س</ThemedText>
                        </View>
                        <TouchableOpacity style={[styles.buyBtn, { backgroundColor: tintColor }]} onPress={() => handleBuy(item)}>
                            <ThemedText style={styles.buyBtnText}>شراء</ThemedText>
                        </TouchableOpacity>
                    </TouchableOpacity>
                );
            }}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    {loading ? <ActivityIndicator color={tintColor} /> : <ThemedText style={styles.emptyText}>لا توجد عروض حالياً.</ThemedText>}
                </View>
            }
        />
    );

    return (
        <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
                <ThemedText type="title" style={styles.headerTitle}>سوق النحل</ThemedText>
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('BUY'); }}
                        style={[styles.tab, activeTab === 'BUY' && { backgroundColor: tintColor }]}
                    >
                        <ThemedText style={[styles.tabText, activeTab === 'BUY' && styles.activeTabText]}>شراء</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('SELL'); }}
                        style={[styles.tab, activeTab === 'SELL' && { backgroundColor: tintColor }]}
                    >
                        <ThemedText style={[styles.tabText, activeTab === 'SELL' && styles.activeTabText]}>بيع (تاجر)</ThemedText>
                    </TouchableOpacity>
                </View>
            </ThemedView>

            <View style={{ flex: 1 }}>
                {activeTab === 'BUY' ? renderBuy() : (
                    <View style={styles.sellPlaceholder}>
                        <IconSymbol name="plus.circle.fill" size={48} color={tintColor} />
                        <ThemedText style={{ marginTop: 16, opacity: 0.6 }}>هذا القسم متاح للتجار المعتمدين</ThemedText>
                        <TouchableOpacity style={[styles.applyBtn, { borderColor: tintColor }]}>
                            <ThemedText style={{ color: tintColor }}>تقديم طلب بائع</ThemedText>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    headerTitle: { marginBottom: 16, textAlign: 'right' },
    tabsContainer: { flexDirection: 'row-reverse', backgroundColor: '#f5f5f5', borderRadius: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
    activeTabText: { color: '#fff' },
    listContent: { padding: 16, gap: 12 },
    card: {
        flexDirection: 'row-reverse',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    merchantText: { color: '#888', fontSize: 12, textAlign: 'right' },
    priceText: { fontSize: 18, fontWeight: '900', textAlign: 'right' },
    buyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    buyBtnText: { color: '#fff', fontWeight: 'bold' },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { opacity: 0.5, textAlign: 'center' },
    sellPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    applyBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1 }
});
