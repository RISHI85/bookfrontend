import React, { useState, useCallback } from 'react';
import { View, Text, SectionList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import API_URL from '../../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LibraryScreen() {
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState<any[]>([]);
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            fetchMyBooks();
        }, [])
    );

    const fetchMyBooks = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [myRes, bmRes] = await Promise.all([
                axios.get(`${API_URL}/books/mine`, { headers }),
                axios.get(`${API_URL}/books/bookmarks`, { headers }).catch(() => ({ data: [] })),
            ]);

            const bought = myRes.data.bought.map((item: any) => ({ ...item, type: 'bought' }));
            const rented = myRes.data.rented.map((item: any) => ({ ...item, type: 'rented' }));
            const bookmarked = (bmRes.data || []).map((item: any) => ({ ...item, type: 'bookmarked' }));

            bought.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            rented.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            bookmarked.sort((a: any, b: any) => new Date(b.bookmarked_at).getTime() - new Date(a.bookmarked_at).getTime());

            const newSections = [];
            if (bookmarked.length > 0) newSections.push({ title: "Collections", data: bookmarked });
            if (bought.length > 0) newSections.push({ title: "Bought Books", data: bought });
            if (rented.length > 0) newSections.push({ title: "Rented Books", data: rented });

            setSections(newSections);
        } catch (error: any) {
            console.log("Library Error", error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isBookmarked = item.type === 'bookmarked';
        const isBought = item.type === 'bought';
        const book = isBookmarked ? item : (isBought ? item : item.book);
        const expiry = (!isBought && !isBookmarked) ? new Date(item.expires_at) : null;
        const daysLeft = expiry ? Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;
        const isExpired = daysLeft < 0;

        let dateLabel = null;
        if (!isBookmarked && item.created_at) {
            const created = new Date(item.created_at);
            const now = new Date();
            
            const createdStart = new Date(created.getFullYear(), created.getMonth(), created.getDate());
            const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            const diffTime = Math.abs(nowStart.getTime() - createdStart.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                dateLabel = isBought ? "Bought Today" : "Rented Today";
            } else if (diffDays === 1) {
                dateLabel = isBought ? "Bought Yesterday" : "Rented Yesterday";
            }
        }

        return (
            <TouchableOpacity
                style={[styles.card, isExpired && { opacity: 0.6 }]}
                onPress={() => router.push(`/book/${book.id}`)}
                activeOpacity={0.8}
            >
                <View style={styles.cardContent}>
                    {/* Cover Image */}
                    {book.cover_image ? (
                        <Image
                            source={{ uri: `${API_URL}${book.cover_image}` }}
                            style={styles.coverImage}
                            contentFit="cover"
                            transition={200}
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View style={styles.coverPlaceholder}>
                            <Text style={styles.coverText}>{book.title[0]}</Text>
                        </View>
                    )}

                    <View style={styles.info}>
                        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                        <Text style={styles.bookAuthor}>{book.author}</Text>

                        <View style={styles.statusRow}>
                            {isBookmarked ? (
                                <View style={[styles.badge, { backgroundColor: '#F5A623' }]}>
                                    <Ionicons name="bookmark" size={14} color="white" />
                                    <Text style={styles.badgeText}>Saved</Text>
                                </View>
                            ) : isBought ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={[styles.badge, { backgroundColor: '#27AE60' }]}>
                                        <Ionicons name="checkmark-circle" size={14} color="white" />
                                        <Text style={styles.badgeText}>Owned</Text>
                                    </View>
                                    {dateLabel && <Text style={styles.dateLabel}>{dateLabel}</Text>}
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={[styles.badge, { backgroundColor: isExpired ? '#C0392B' : '#F39C12' }]}>
                                        <Ionicons name="time" size={14} color="white" />
                                        <Text style={styles.badgeText}>
                                            {isExpired ? "Expired" : `${daysLeft} days left`}
                                        </Text>
                                    </View>
                                    {dateLabel && <Text style={styles.dateLabel}>{dateLabel}</Text>}
                                </View>
                            )}
                        </View>
                    </View>

                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#2D3250" /></View>;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>My Library</Text>
                <Text style={styles.subHeader}>Your personal collection</Text>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item, index) => item.type + '-' + (item.id || item.book.id) + '-' + index}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionTitle}>{title}</Text>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="library-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>Your library is empty.</Text>
                        <Text style={styles.emptySubText}>Books you buy or rent will appear here.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF0' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF0' },

    headerContainer: { marginTop: 10, marginBottom: 15, paddingHorizontal: 20 },
    header: { fontSize: 32, fontWeight: '900', color: '#2D3250', fontFamily: 'serif' },
    subHeader: { fontSize: 16, color: '#888', marginTop: 5 },

    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3250',
        marginTop: 25,
        marginBottom: 15,
        paddingHorizontal: 20,
        fontFamily: 'serif'
    },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        marginHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F2F2F2'
    },
    cardContent: { flexDirection: 'row', alignItems: 'center' },

    coverPlaceholder: {
        width: 60,
        height: 90,
        backgroundColor: '#2D3250',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    coverImage: {
        width: 60,
        height: 90,
        borderRadius: 8,
        marginRight: 15,
        backgroundColor: '#eee'
    },
    coverText: { color: 'white', fontSize: 24, fontWeight: 'bold' },

    info: { flex: 1, justifyContent: 'center' },
    bookTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3250', marginBottom: 4 },
    bookAuthor: { fontSize: 14, color: '#888', marginBottom: 8 },

    statusRow: { flexDirection: 'row' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4
    },
    badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 18, color: '#555', fontWeight: 'bold', marginTop: 20 },
    emptySubText: { fontSize: 14, color: '#999', marginTop: 10 },
    
    dateLabel: { fontSize: 11, color: '#6d6d6d', fontWeight: '600' }
});
