import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import API_URL from '../../../constants/Config';
import { useRouter } from 'expo-router';

export default function ManageBooksScreen() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            const tempToken = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/admin/books`, {
                headers: { Authorization: `Bearer ${tempToken}` }
            });
            setBooks(res.data);
        } catch (error) {
            console.log("Error fetching books", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        Alert.alert("Confirm Delete", "Are you sure you want to delete this book?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        const token = await SecureStore.getItemAsync('access_token');
                        await axios.delete(`${API_URL}/admin/books/${id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        Alert.alert("Success", "Book deleted");
                        fetchBooks(); // Refresh
                    } catch (error) {
                        Alert.alert("Error", "Failed to delete book");
                    }
                }
            }
        ]);

    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            {item.cover_image ? (
                <Image
                    source={{ uri: `${API_URL}${item.cover_image}` }}
                    style={styles.coverImage}
                />
            ) : (
                <View style={[styles.coverImage, { backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 10, color: 'white' }}>No Cover</Text>
                </View>
            )}
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.author}>{item.author}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <FlatList
                data={books}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity style={styles.fab} onPress={() => router.push('/admin/books/add' as any)}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF0', padding: 20 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    title: { fontWeight: 'bold', fontSize: 16, color: '#2D3250', marginBottom: 4 },
    author: { color: '#888', fontSize: 14 },
    coverImage: {
        width: 50,
        height: 75,
        borderRadius: 8,
        backgroundColor: '#f0f0f0'
    },
    deleteBtn: { backgroundColor: '#dc1907ff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    deleteText: { color: 'white', fontWeight: '600', fontSize: 14 },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#6A9CFD',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#6A9CFD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    fabText: { color: 'white', fontSize: 30, fontWeight: 'bold' }
});
