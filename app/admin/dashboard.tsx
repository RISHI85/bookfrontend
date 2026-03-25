import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import API_URL from '../../constants/Config';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchStats();
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
        } catch (error) {
            console.log("Error fetching profile", error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (error: any) {
            console.log("Admin Stats Error", error);
            Alert.alert("Error", "Failed to fetch admin stats");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFBF0' }}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <Text style={styles.header}>Overview</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Users</Text>
                        <Text style={styles.statValue}>{stats?.total_users || 0}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#E8F0FE' }]}>
                        <Text style={styles.statLabel}>Total Revenue</Text>
                        <Text style={[styles.statValue, { color: '#4A90E2' }]}>₹{stats?.total_revenue || 0}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Books</Text>
                        <Text style={styles.statValue}>{stats?.total_books || 0}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Active Rentals</Text>
                        <Text style={styles.statValue}>{stats?.total_rentals || 0}</Text>
                    </View>
                </View>

                <Text style={styles.sectionHeader}>Quick Actions</Text>

                <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/admin/books/add' as any)}>
                    <Text style={styles.actionText}>+ Upload New Book</Text>
                </TouchableOpacity>

                {user?.role === 'admin' && (
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F2EAE1' }]} onPress={() => router.push('/admin/users' as any)}>
                        <Text style={[styles.actionText, { color: '#555' }]}>View All Users</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#539b49ff' }]} onPress={() => router.push('/admin/books' as any)}>
                    <Text style={styles.actionText}>Manage Books</Text>
                </TouchableOpacity>



            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: '#FFFBF0' },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#2D3250' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
    statCard: {
        width: '48%',
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
    statLabel: { fontSize: 14, color: '#888', marginBottom: 5 },
    statValue: { fontSize: 28, fontWeight: 'bold', color: '#2D3250' },
    sectionHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#2D3250' },
    actionButton: {
        backgroundColor: '#5088f8ff',
        paddingVertical: 18,
        borderRadius: 25,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    actionText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
