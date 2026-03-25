import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import API_URL from '../../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Book {
    id: number;
    title: string;
    author: string;
    cover_image?: string;
    average_rating?: number;
    is_free?: boolean;
}

export default function CategoryScreen() {
    const { name } = useLocalSearchParams();
    const router = useRouter();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategoryBooks();
    }, [name]);

    const fetchCategoryBooks = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/books/by-category/${name}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(res.data || []);
        } catch (error) {
            console.log("Category Fetch Error", error);
        } finally {
            setLoading(false);
        }
    };

    const renderBookItem = ({ item }: { item: Book }) => (
        <TouchableOpacity
            style={styles.bookCard}
            onPress={() => router.push(`/book/${item.id}`)}
            activeOpacity={0.8}
        >
            <View style={styles.imageContainer}>
                {item.cover_image ? (
                    <Image source={{ uri: `${API_URL}${item.cover_image}` }} style={styles.coverImage} />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Text style={styles.placeholderText}>{item.title[0]}</Text>
                    </View>
                )}
                {item.is_free && (
                    <View style={styles.freeBadge}>
                        <Text style={styles.freeText}>FREE</Text>
                    </View>
                )}
            </View>
            <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
                {item.average_rating && (
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color="#F5A623" />
                        <Text style={styles.ratingText}>{item.average_rating}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2D3250" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{name === 'Genres' ? 'Genres' : name}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2D3250" />
                </View>
            ) : (
                <FlatList
                    data={books}
                    renderItem={renderBookItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="book-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No books found in this category</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF0' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0E6D2',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        marginRight: 40, // Offset for the back button to center title correctly
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3250',
        textTransform: 'capitalize',
        fontFamily: 'serif',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 10 },
    bookCard: {
        width: (width - 40) / 2,
        margin: 5,
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    imageContainer: {
        width: '100%',
        height: 180,
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 10,
    },
    coverImage: { width: '100%', height: '100%' },
    placeholderImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#2D3250',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    freeBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#27AE60',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    freeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    bookInfo: { flex: 1 },
    bookTitle: { fontSize: 14, fontWeight: 'bold', color: '#2D3250', marginBottom: 2 },
    bookAuthor: { fontSize: 12, color: '#888', marginBottom: 4 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, color: '#999', marginTop: 10 },
});
