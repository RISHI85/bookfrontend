import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import API_URL from '../../../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReadBookScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [book, setBook] = useState<any>(null);
    const [pageText, setPageText] = useState('');
    const [currentPage, setCurrentPage] = useState(0); // 0 means not yet known
    const [totalPages, setTotalPages] = useState(0);
    const [hasFullAccess, setHasFullAccess] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isBookmarked, setIsBookmarked] = useState(false);

    const timeoutRef = useRef<any>(null);

    useEffect(() => {
        fetchBook();
    }, [id]);

    useEffect(() => {
        if (book) {
            fetchPage(0); // Fetch resume page (or page 1 if none saved)
        }
    }, [book]);

    const fetchBook = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/books/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBook(res.data);
            setIsBookmarked(res.data.is_bookmarked);
        } catch (e) {
            console.log('Error fetching book:', e);
        }
    };

    const fetchPage = async (page: number) => {
        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/books/${id}/pages`, {
                params: { page },
                headers: { Authorization: `Bearer ${token}` }
            });
            setPageText(res.data.text);
            setTotalPages(res.data.total_pages);
            setHasFullAccess(res.data.has_full_access);
            
            const fetchedPage = res.data.page;
            setCurrentPage(fetchedPage);

            // Update progress
            const pct = (fetchedPage / res.data.total_pages) * 100;
            setProgress(pct);
            
            // Debounce save only if user actually navigated, but saving on load is fine too
            if (page > 0) {
                debouncedUpdateProgress(pct);
            }

            // Mark reading started
            if (fetchedPage === 1 || page === 0) {
                axios.post(`${API_URL}/books/${id}/start-reading`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => { });
            }
        } catch (e: any) {
            if (e.response?.status === 403) {
                setPageText('[Sample limit reached — Purchase or rent to continue reading]');
            } else {
                console.log('Error fetching page:', e);
                setPageText('[Could not load page content]');
            }
        } finally {
            setLoading(false);
        }
    };

    const debouncedUpdateProgress = (val: number) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
            try {
                const token = await SecureStore.getItemAsync('access_token');
                await axios.post(`${API_URL}/books/${id}/progress`, { progress: val }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (e) { }
        }, 1000);
    };

    const toggleBookmark = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.post(`${API_URL}/books/${id}/bookmark`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsBookmarked(res.data.bookmarked);
        } catch (e) { }
    };

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const applyPageTurnAnim = (direction: 'next' | 'prev', newPage: number) => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            setCurrentPage(newPage);
            fetchPage(newPage);
            
            slideAnim.setValue(direction === 'next' ? SCREEN_WIDTH : -SCREEN_WIDTH);
            
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();
        });
    };

    const goNext = () => {
        if (currentPage < totalPages && !loading) {
            applyPageTurnAnim('next', currentPage + 1);
        }
    };
    const goPrev = () => {
        if (currentPage > 1 && !loading) {
            applyPageTurnAnim('prev', currentPage - 1);
        }
    };

    let touchStartX = useRef(0);
    let touchStartY = useRef(0);

    const handleTouchStart = (e: any) => {
        touchStartX.current = e.nativeEvent.pageX;
        touchStartY.current = e.nativeEvent.pageY;
    };

    const handleTouchEnd = (e: any) => {
        const dx = e.nativeEvent.pageX - touchStartX.current;
        const dy = e.nativeEvent.pageY - touchStartY.current;

        // If swipe horizontal distance is significant and greater than vertical
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) {
                goNext(); // Swiped left -> Next page
            } else {
                goPrev(); // Swiped right -> Previous page
            }
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <SafeAreaView style={{ flex: 1 }}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="chevron-back" size={24} color="#2D3250" />
                    </TouchableOpacity>
                    <Text style={styles.chapterTitle}>PAGE {currentPage}</Text>
                    <TouchableOpacity onPress={toggleBookmark} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color="#2D3250" />
                    </TouchableOpacity>
                </View>

                {/* Content wrapped in animated slide */}
                <Animated.View 
                    style={[{ flex: 1, transform: [{ translateX: slideAnim }], opacity: fadeAnim }]}
                >
                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#2D3250" />
                        </View>
                    ) : (
                        <ScrollView
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                            contentContainerStyle={[
                                styles.content,
                                pageText === '[Sample limit reached — Purchase or rent to continue reading]' && { flexGrow: 1, justifyContent: 'center' }
                            ]}
                            showsVerticalScrollIndicator={false}
                        >
                            {book && currentPage === 1 && (
                                <Text style={styles.bookTitle}>{book.title}</Text>
                            )}

                            {pageText === '[Sample limit reached — Purchase or rent to continue reading]' ? (
                                <Text style={styles.sampleLimitText}>{pageText}</Text>
                            ) : (
                                <Text style={styles.bodyText}>{pageText || 'No content available for this page.'}</Text>
                            )}
                        </ScrollView>
                    )}
                </Animated.View>

                {/* Bottom Navigation */}
                <View style={styles.bottomBar}>
                    <View style={styles.progressSection}>
                        <Text style={styles.progressText}>
                            {Math.round(progress)}
                            <Text style={{ fontSize: 9 }}>%</Text>
                        </Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressFillGreen, { width: `${Math.min(progress, 60)}%` }]} />
                            <View style={[styles.progressFillRed, { width: `${Math.max(0, Math.min(progress - 60, 40))}%`, left: '60%' }]} />
                        </View>
                        <Text style={styles.pagesLeft}>Page {currentPage} of {totalPages}</Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF0',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Top Bar
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0EDE8',
    },
    chapterTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#888',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },

    // Content
    content: {
        paddingHorizontal: 28,
        paddingTop: 30,
        paddingBottom: 30,
    },
    bookTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#2D3250',
        fontFamily: 'serif',
        lineHeight: 36,
        marginBottom: 24,
    },
    bodyText: {
        fontSize: 17,
        lineHeight: 30,
        color: '#444',
        fontFamily: 'serif',
        letterSpacing: 0.3,
    },
    sampleLimitText: {
        fontSize: 18,
        lineHeight: 32,
        color: '#444',
        fontFamily: 'serif',
        fontStyle: 'italic',
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    // Bottom Bar
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#F0EDE8',
    },
    progressSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2D3250',
        width: 32,
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#E8E4DF',
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
    },
    progressFillGreen: {
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        backgroundColor: '#F5A623',
        borderRadius: 3,
    },
    progressFillRed: {
        position: 'absolute',
        top: 0, bottom: 0,
        backgroundColor: '#E76F51',
        borderRadius: 3,
    },
    pagesLeft: {
        fontSize: 11,
        color: '#666',
        fontWeight: 'bold',
        minWidth: 85,
        textAlign: 'right',
    },
});
