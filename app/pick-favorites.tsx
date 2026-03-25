import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import API_URL from '../constants/Config';

const { width } = Dimensions.get('window');

import * as SecureStore from 'expo-secure-store';

const GENRES = [
    { id: 'fantasy', name: 'Fantasy', color: '#EAE0D5', value: ['Fantasy'] },
    { id: 'romance', name: 'Romance', color: '#EAE0D5', value: ['Romance'] },
    { id: 'mystery', name: 'Mystery', color: '#EAE0D5', value: ['Mystery'] },
    { id: 'science_fiction', name: 'Science\nFiction', color: '#EAE0D5', value: ['Science Fiction'] },
    { id: 'historical_fiction', name: 'Historical\nFiction', color: '#EAE0D5', value: ['Historical Fiction'] },
];

export default function PickFavoritesScreen() {
    const router = useRouter();
    const [selectedGenres, setSelectedGenres] = useState<string[]>(['fantasy', 'romance']);
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const token = await SecureStore.getItemAsync('access_token');
                const res = await axios.get(`${API_URL}/books/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBooks(res.data || []);
            } catch (e) {
                console.log("Error fetching books:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchBooks();
    }, []);

    const toggleGenre = (id: string) => {
        setSelectedGenres(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const handleContinue = async () => {
        const flatCategories = GENRES.filter(g => selectedGenres.includes(g.id))
            .map(g => g.value)
            .flat();
        
        try {
            await SecureStore.setItemAsync('favorite_categories', JSON.stringify(flatCategories));
        } catch(e) {
            console.log("Error saving favorites", e);
        }
        router.replace('/(tabs)');
    };

    const handleSkip = async () => {
        try {
            await SecureStore.deleteItemAsync('favorite_categories');
        } catch(e) {}
        router.replace('/(tabs)');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>BookWorm</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Pick your favorites</Text>

                {GENRES.map((genre, index) => {
                    // Extract covers for this genre
                    const genreBooks = books.filter(b => 
                        genre.value.some(v => v.toLowerCase() === (b.category || '').toLowerCase())
                    );
                    
                    // We only care about the first 3 to display
                    const displayBooks = genreBooks.slice(0, 3);
                    const defaultColors = ['#F4A261', '#E76F51', '#264653'];

                    const renderCoverItem = (book: any, idx: number, total: number) => {
                        let transform: any[] = [];
                        let zIndex = 1;

                        if (total === 3) {
                            if (idx === 0) transform = [{ rotate: '-10deg' }, { translateY: 10 }];
                            else if (idx === 1) zIndex = 2;
                            else if (idx === 2) transform = [{ rotate: '10deg' }, { translateY: 10 }];
                        } else if (total === 2) {
                            if (idx === 0) transform = [{ rotate: '-6deg' }, { translateY: 6 }];
                            else if (idx === 1) { zIndex = 2; transform = [{ rotate: '6deg' }, { translateY: 6 }]; }
                        } else {
                            zIndex = 2;
                        }

                        const bgColor = defaultColors[idx % 3];
                        
                        // If we have a real cover image
                        if (book?.cover_image) {
                            return <Image key={`cov-${idx}`} source={{ uri: `${API_URL}${book.cover_image}` }} style={[styles.bookCover, { transform, zIndex }]} />;
                        } else {
                            // Render colored block fallback for this book
                            return <View key={`cov-${idx}`} style={[styles.bookCover, { backgroundColor: bgColor, transform, zIndex, justifyContent: 'center', alignItems: 'center' }]}>
                                {book?.title && <Text style={{color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'center', fontWeight: 'bold', padding: 4}} numberOfLines={3}>{book.title}</Text>}
                            </View>;
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={genre.id}
                            style={styles.card}
                            onPress={() => toggleGenre(genre.id)}
                            activeOpacity={0.9}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.textColumn}>
                                    <Text style={styles.genreName} adjustsFontSizeToFit numberOfLines={3}>{genre.name}</Text>
                                </View>

                                {/* dynamic book covers for UI visual */}
                                <View style={styles.coversContainer}>
                                    {displayBooks.length === 0 ? (
                                        <>
                                            <View style={[styles.bookCover, { backgroundColor: '#F4A261', transform: [{ rotate: '-10deg' }, { translateY: 10 }] }]} />
                                            <View style={[styles.bookCover, { backgroundColor: '#E76F51', zIndex: 2 }]} />
                                            <View style={[styles.bookCover, { backgroundColor: '#264653', transform: [{ rotate: '10deg' }, { translateY: 10 }] }]} />
                                        </>
                                    ) : (
                                        displayBooks.map((b, i) => renderCoverItem(b, i, displayBooks.length))
                                    )}
                                </View>

                                <View style={styles.checkboxContainer}>
                                    <View style={[styles.checkbox, selectedGenres.includes(genre.id) && styles.checkboxSelected]}>
                                        {selectedGenres.includes(genre.id) && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                    <Text style={styles.continueText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF0',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3250',
        fontFamily: 'serif',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#2D3250',
        marginBottom: 30,
        fontFamily: 'serif',
    },
    card: {
        backgroundColor: '#EAE0D5', // Beige/Sand color
        borderRadius: 20,
        marginBottom: 20,
        height: 160,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    textColumn: {
        width: '32%',
        marginRight: 10,
    },
    genreName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3250',
        fontFamily: 'serif',
        flexShrink: 1,
    },
    coversContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    bookCover: {
        width: 70,
        height: 100,
        borderRadius: 5,
        marginHorizontal: -20, // Overlap
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    checkboxContainer: {
        width: '10%',
        alignItems: 'flex-end',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#2D3250',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#2D3250',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: 40,
        paddingTop: 20,
    },
    skipText: {
        color: '#2D3250',
        fontSize: 16,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    continueButton: {
        backgroundColor: '#2D3250', // Navy button
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
    },
    continueText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
