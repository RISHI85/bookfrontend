import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import API_URL from '../../constants/Config';

export default function UsersScreen() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (error) {
            console.log("Error fetching users", error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <Text style={styles.name}>{item.name || "No Name"}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <View style={styles.row}>
                <Text style={styles.meta}>Role: {item.role}</Text>
                <Text style={styles.meta}>Joined: {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
        </View>
    );

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#FFFBF0' },
    card: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    name: { fontWeight: 'bold', fontSize: 18, color: '#2D3250', marginBottom: 4 },
    email: { color: '#555', marginBottom: 10, fontSize: 14 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    meta: { color: '#888', fontSize: 12 }
});
