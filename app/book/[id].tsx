import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert, Platform, TextInput, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import API_URL from '../../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import CustomAlert from '../../components/CustomAlert';

const { width } = Dimensions.get('window');

interface Book {
    id: number;
    title: string;
    author: string;
    description: string;
    category: string;
    price: number;
    rent_price?: number;
    is_free: boolean;
    pdf_path?: string;
    is_bought?: boolean;
    is_rented?: boolean;
    rental_expiry?: string;
    cover_image?: string;
    average_rating?: number;
    is_bookmarked?: boolean;
    buy_approval_status?: string;
    rent_approval_status?: string;
}

export default function BookDetailScreen() {
    const { id } = useLocalSearchParams();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [rentDays, setRentDays] = useState('7');
    const [reviews, setReviews] = useState<any[]>([]);
    const [showReviewInput, setShowReviewInput] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isBookmarked, setIsBookmarked] = useState(false);

    // Custom Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

    const router = useRouter();

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertType(type);
        setAlertVisible(true);
    };

    useEffect(() => {
        fetchBookDetails();
        fetchReviews();
    }, [id]);

    const fetchBookDetails = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const response = await axios.get(`${API_URL}/books/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBook(response.data);
            setIsBookmarked(response.data.is_bookmarked || false);
        } catch (error: any) {
            console.log('Error fetching book details', error);

            const msg = error.response?.data?.detail || error.message || 'Could not fetch book details';
            // Alert.alert('Error', typeof msg === 'object' ? JSON.stringify(msg) : msg); // Replace
            showAlert('Error', typeof msg === 'object' ? JSON.stringify(msg) : msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchReviews = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const response = await axios.get(`${API_URL}/books/${id}/reviews`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReviews(response.data);
        } catch (error) {
            console.log("Error fetching reviews", error);
        }
    };

    const handleSubmitReview = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            await axios.post(`${API_URL}/books/${id}/reviews`, {
                rating,
                comment
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showAlert("Success", "Review submitted!", 'success');
            setShowReviewInput(false);
            setComment('');
            fetchReviews();
        } catch (error: any) {
            showAlert("Error", error.response?.data?.detail || "Failed to submit review", 'error');
        }
    };

    const handleBuy = async () => {
        if (!book) return;
        try {
            const token = await SecureStore.getItemAsync('access_token');
            await axios.post(`${API_URL}/books/${id}/buy`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showAlert('Success', 'Approval sent to merchant, Thank You', 'success');
            fetchBookDetails(); // Refresh status
        } catch (error: any) {
            const detail = error.response?.data?.detail;
            if (detail && detail.includes("Profile incomplete")) {
                // Special case with buttons logic not easily replaced by simple alert without expanding CustomAlert features.
                // For now, I'll keep Alert.alert for this interactive choice OR update CustomAlert to handle actions.
                // The user asked for "unique design", this specific one has actions.
                // I will convert "Profile Incomplete" to an error alert for now telling them to go update profile manually, 
                // OR I can use the CustomAlert and just redirect them when they close it? 
                // Better: "Okay" -> "Go to Profile".
                setAlertTitle("Profile Incomplete");
                setAlertMessage(detail);
                setAlertType("error");
                setAlertVisible(true);
                // Note: Ideally CustomAlert would have a custom action. But for now standard close.
            } else {
                showAlert('Error', detail || error.message || 'Purchase failed', 'error');
            }
        };
    };

    const handleRent = async () => {
        // Allow rental logic
        const days = parseInt(rentDays);
        if (isNaN(days) || days < 1) {
            showAlert("Error", "Please enter a valid number of days", 'error');
            return;
        }
        try {
            const token = await SecureStore.getItemAsync('access_token');
            await axios.post(`${API_URL}/books/${id}/rent`, { days }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showAlert('Success', 'Approval sent to merchant, Thank You', 'success');
            fetchBookDetails();
        } catch (error: any) {
            showAlert('Error', error.response?.data?.detail || 'Rent failed', 'error');
        }
    };

    const handleReadExternal = async () => {
        if (!book) return;
        setDownloading(true);
        try {
            const filename = book.title.replace(/\s+/g, '_') + '.pdf';
            const fileUri = ((FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory) + filename;
            const token = await SecureStore.getItemAsync('access_token');

            const downloadRes = await FileSystem.downloadAsync(
                `${API_URL}/books/${id}/pdf`,
                fileUri,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (downloadRes.status !== 200) {
                showAlert('Error', `Failed to download: Status ${downloadRes.status}`, 'error');
                return;
            }

            // Mark as reading
            try {
                await axios.post(`${API_URL}/books/${id}/start-reading`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (e) { }

            const contentUri = await FileSystem.getContentUriAsync(fileUri);
            if (Platform.OS === 'android') {
                await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                    data: contentUri,
                    flags: 1,
                    type: 'application/pdf',
                });
            } else {
                await Sharing.shareAsync(fileUri);
            }
        } catch (error: any) {
            showAlert('Error', error.message || 'Could not open PDF', 'error');
        } finally {
            setDownloading(false);
        }
    };

    const handleReadInApp = () => {
        if (!book?.id) return;
        router.push({ pathname: '/book/[id]/read', params: { id: book.id } });
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#2D3250" /></View>;
    if (!book) return <View style={styles.center}><Text>Book not found</Text></View>;

    const hasAccess = book.is_bought || book.is_rented || book.is_free;
    const isPending = book.buy_approval_status === 'pending' || book.rent_approval_status === 'pending';

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerTitle: "Books", headerBackTitle: "", headerTintColor: '#2D3250' }} />
            <StatusBar style="dark" />
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>



                    <View style={styles.topSection}>
                        <View style={styles.infoColumn}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <Text style={[styles.title, { flex: 1 }]}>{book.title}</Text>
                                <TouchableOpacity onPress={async () => {
                                    try {
                                        const token = await SecureStore.getItemAsync('access_token');
                                        const res = await axios.post(`${API_URL}/books/${id}/bookmark`, {}, {
                                            headers: { Authorization: `Bearer ${token}` }
                                        });
                                        setIsBookmarked(res.data.bookmarked);
                                    } catch (e) { }
                                }} style={{ padding: 4, marginLeft: 8 }}>
                                    <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color="#F5A623" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.author}>{book.author}</Text>

                            {book.average_rating ? (
                                <View style={styles.ratingRow}>
                                    <Ionicons name="star" size={16} color="#F5A623" />
                                    <Text style={styles.ratingText}>{book.average_rating}/5.0</Text>
                                </View>
                            ) : null}

                            <Text style={styles.price}>
                                {book.is_free ? "Free" : `₹${book.price}`}
                            </Text>

                            <View style={styles.buttonsContainer}>
                                {hasAccess ? (
                                    <>
                                        {/* Read Now Button (Primary) - Opens In-App Reader */}
                                        <TouchableOpacity style={styles.primaryButton} onPress={handleReadInApp}>
                                            <Text style={styles.primaryButtonText}>
                                                Read Now
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                ) : isPending ? (
                                    <>
                                        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#A9A9A9' }]} disabled>
                                            <Text style={styles.primaryButtonText}>Waiting for Approval</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        {/* Purchase Button */}
                                        <TouchableOpacity style={styles.primaryButton} onPress={handleBuy}>
                                            <Text style={styles.primaryButtonText}>Purchase</Text>
                                        </TouchableOpacity>

                                        {/* Read Rental Button */}
                                        <TouchableOpacity style={styles.secondaryButton} onPress={handleRent}>
                                            <Text style={styles.secondaryButtonText}>Rent (7d)</Text>
                                        </TouchableOpacity>

                                        {/* Read Sample Button - In-App Reader */}
                                        <TouchableOpacity style={[styles.secondaryButton, { borderColor: 'green' }]} onPress={handleReadInApp}>
                                            <Text style={[styles.secondaryButtonText, { color: 'green' }]}>
                                                Read Sample
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>

                        {/* Right Column: Book Cover */}
                        <View style={styles.coverWrapper}>
                            {book.cover_image ? (
                                <View style={{ position: 'relative' }}>
                                    <Image
                                        source={{ uri: `${API_URL}${book.cover_image}` }}
                                        style={styles.coverImage}
                                        contentFit="cover"
                                        transition={200}
                                        cachePolicy="memory-disk"
                                    />
                                    {book.is_bought && (
                                        <TouchableOpacity
                                            style={styles.downloadIconBtn}
                                            onPress={handleReadExternal}
                                        >
                                            {downloading ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Ionicons name="download" size={20} color="#FFF" />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.coverImagePlaceholder}>
                                    <Text style={styles.coverTitleOnImage}>{book.title}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Description Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Description</Text>
                        <Text style={styles.descriptionText}>
                            {book.description || "An edge-of-your-seat thriller about a crime writer who moves to a charming town to research. The first murder in years rocks her idyllic world..."}
                        </Text>
                    </View>

                    {/* Reviews Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Reviews</Text>

                        {/* Write Review Toggle */}
                        <TouchableOpacity
                            style={styles.writeReviewBtn}
                            onPress={() => setShowReviewInput(!showReviewInput)}
                        >
                            <Text style={styles.writeReviewText}>
                                {showReviewInput ? "Cancel Review" : "Write a Review"}
                            </Text>
                        </TouchableOpacity>

                        {showReviewInput && (
                            <View style={styles.reviewForm}>
                                <Text style={styles.label}>Rating: {rating}/5</Text>
                                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                                    {[1, 2, 3, 4, 5].map(r => (
                                        <TouchableOpacity key={r} onPress={() => setRating(r)} style={{ marginRight: 10 }}>
                                            <Ionicons name={r <= rating ? "star" : "star-outline"} size={32} color="#F5A623" />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Optional comment..."
                                    value={comment}
                                    onChangeText={setComment}
                                    multiline
                                />
                                <TouchableOpacity style={styles.submitReviewBtn} onPress={handleSubmitReview}>
                                    <Text style={styles.submitReviewText}>Submit</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {reviews.length === 0 ? (
                            <Text style={{ color: '#888', fontStyle: 'italic' }}>No reviews yet. Be the first!</Text>
                        ) : (
                            reviews.map((review) => (
                                <View key={review.id} style={styles.reviewCard}>
                                    <View style={styles.reviewHeader}>
                                        <View style={styles.avatarPlaceholder}>
                                            <Text style={styles.avatarText}>
                                                {review.user.name ? review.user.name[0].toUpperCase() : "A"}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.reviewerName}>{review.user.name}</Text>
                                            <View style={{ flexDirection: 'row' }}>
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <Ionicons
                                                        key={i}
                                                        name={i <= review.rating ? "star" : "star-outline"}
                                                        size={12}
                                                        color="#F5A623"
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                    {/* Only show comment if it exists */}
                                    {review.comment && (
                                        <Text style={styles.reviewText}>{review.comment}</Text>
                                    )}
                                </View>
                            ))
                        )}
                    </View>

                    <View style={{ height: 50 }} />
                </ScrollView>
            </SafeAreaView>

            <CustomAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                type={alertType}
                onClose={() => setAlertVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF0', // Cream
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 20 },

    topSection: {
        flexDirection: 'row',
        marginBottom: 30,
    },
    infoColumn: {
        flex: 1,
        paddingRight: 10,
    },
    title: {
        fontSize: 26, // Increased size
        fontWeight: '900',
        color: '#2D3250', // Navy
        fontFamily: 'serif',
        marginBottom: 5,
        lineHeight: 32,
    },
    author: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    ratingText: {
        marginLeft: 5,
        fontWeight: 'bold',
        color: '#2D3250',
    },
    price: {
        fontSize: 24,
        fontWeight: '900',
        color: '#2D3250',
        marginBottom: 20,
    },
    buttonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    primaryButton: {
        backgroundColor: '#2D3250',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        minWidth: 100,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#2D3250',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        minWidth: 100,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#2D3250',
        fontWeight: 'bold',
    },
    coverWrapper: {
        width: width * 0.4,
        alignItems: 'flex-end',
    },
    coverImagePlaceholder: {
        width: width * 0.4, // Responsive width
        height: (width * 0.4) * 1.5, // Aspect ratio
        backgroundColor: 'black', // In mock it's an image, using placeholder
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    coverTitleOnImage: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 18,
        fontFamily: 'serif',
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '900',
        color: '#2D3250',
        fontFamily: 'serif',
        marginBottom: 15,
    },
    descriptionText: {
        fontSize: 16,
        color: '#555',
        lineHeight: 24,
    },
    reviewCard: {
        backgroundColor: '#EAE0D5',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15, // Added spacing between cards
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center'
    },
    reviewerName: {
        fontWeight: 'bold',
        color: '#2D3250',
        fontSize: 16,
    },
    avatarText: {
        color: '#555',
        fontWeight: 'bold',
        fontSize: 18
    },
    writeReviewBtn: {
        marginBottom: 15,
        alignSelf: 'flex-end'
    },
    writeReviewText: {
        color: '#2D3250',
        fontWeight: 'bold',
        textDecorationLine: 'underline'
    },
    reviewForm: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        marginBottom: 20
    },
    label: { fontWeight: 'bold', marginBottom: 5 },
    commentInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 10,
        height: 80,
        textAlignVertical: 'top',
        marginBottom: 10
    },
    submitReviewBtn: {
        backgroundColor: '#2D3250',
        padding: 10,
        borderRadius: 10,
        alignItems: 'center'
    },
    submitReviewText: { color: 'white', fontWeight: 'bold' },
    reviewText: {
        color: '#444',
        lineHeight: 22,
        fontSize: 15,
    },
    coverImage: {
        width: width * 0.4,
        height: (width * 0.4) * 1.5,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    downloadIconBtn: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
