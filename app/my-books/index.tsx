import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, TouchableOpacity, Image, StyleSheet } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import API_URL from '../../constants/Config';

export default function MyBooksScreen() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ bought: any[], rented: any[] }>({ bought: [], rented: [] });
    const router = useRouter();

    useEffect(() => {
        fetchMyBooks();
    }, []);

    const fetchMyBooks = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/books/mine`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (error: any) {
            Alert.alert("Error", "Failed to fetch my books");
        } finally {
            setLoading(false);
        }
    };

    const renderBookItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/book/${item.id}`)}>
            <Text style={styles.bookTitle}>{item.title}</Text>
            <Text>by {item.author}</Text>
            <Text style={{ color: 'green', marginTop: 5 }}>Purchased</Text>
        </TouchableOpacity>
    );

    const renderRentedItem = ({ item }: { item: any }) => {
        const book = item.book;
        const expired = item.is_expired;

        return (
            <TouchableOpacity
                style={[styles.card, expired && { backgroundColor: '#f0f0f0' }]}
                onPress={() => router.push(`/book/${book.id}`)}
            >
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text>by {book.author}</Text>
                <Text style={{ marginTop: 5, color: expired ? 'red' : 'orange' }}>
                    {expired ? `Expired on ${new Date(item.expires_at).toLocaleDateString()}`
                        : `Expires on ${new Date(item.expires_at).toLocaleDateString()}`}
                </Text>
            </TouchableOpacity>
        );
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>My Library</Text>

            <Text style={styles.sectionTitle}>Bought Books ({data.bought.length})</Text>
            <FlatList
                data={data.bought}
                renderItem={renderBookItem}
                keyExtractor={(item) => `bought-${item.id}`}
                ListEmptyComponent={<Text style={{ marginLeft: 20, color: 'gray' }}>No bought books.</Text>}
            />

            <View style={{ height: 20 }} />

            <Text style={styles.sectionTitle}>Rented Books ({data.rented.length})</Text>
            <FlatList
                data={data.rented}
                renderItem={renderRentedItem}
                keyExtractor={(item) => `rented-${item.book.id}`}
                ListEmptyComponent={<Text style={{ marginLeft: 20, color: 'gray' }}>No rented books.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 10 },
    card: { padding: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 10 },
    bookTitle: { fontSize: 16, fontWeight: 'bold' }
});
