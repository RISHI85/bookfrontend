import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useFocusEffect } from 'expo-router';
import API_URL from '../../constants/Config';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useFocusEffect(
        React.useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
        } catch (error: any) {
            console.log("Profile fetch error", error);
            if (error.response?.status === 401) {
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
                router.replace('/');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        router.replace('/login');
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#2D3250" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Avatar Section */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarCircle}>
                        {user?.profile_picture ? (
                            <Image
                                source={{
                                    uri: user.profile_picture.startsWith('http') || user.profile_picture.startsWith('https')
                                        ? user.profile_picture
                                        : `${API_URL}/${user.profile_picture}`
                                }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || 'U'}</Text>
                        )}
                    </View>
                </View>

                <Text style={styles.emailText}>{user?.name || "User"}</Text>

                {/* Info Card - Email now here */}
                <View style={styles.card}>
                    <InfoRow label="Email" value={user?.email || "Not set"} />
                    <View style={styles.divider} />
                    <InfoRow label="Phone" value={user?.phone || "Not set"} />
                    <View style={styles.divider} />
                    <InfoRow label="Address" value={user?.address || "Not set"} />
                </View>

                {/* Buttons */}
                {(user?.role === 'admin' || user?.role === 'merchant') && (
                    <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin/dashboard')}>
                        <Text style={styles.adminButtonText}>Admin Dashboard</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.editButton} onPress={() => router.push('/profile/edit')}>
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.collectionButton} onPress={() => router.push('/(tabs)/library')}>
                    <Ionicons name="bookmark" size={18} color="#F5A623" style={{ marginRight: 8 }} />
                    <Text style={styles.collectionButtonText}>My Collection</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>

                {/* Footer Quote */}
                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>
                        <Text style={{ color: '#4b4b4bff', fontSize: 28 }}>Do anything, </Text>
                        <Text style={{ color: '#4b4b4bff', fontSize: 26 }}>with nothing.</Text>
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueContainer}>
            <Text style={styles.value} numberOfLines={1}>{value}</Text>
            <Ionicons name="chevron-forward" size={16} color="#C0C0C0" />
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF0' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF0' },
    content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 11, alignItems: 'center' },

    avatarContainer: {
        marginTop: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EAE0D5', // Light beige/grey
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '500',
        color: '#7f8c8d',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    emailText: { // Displaying Name
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2D3250',
        marginBottom: 30,
        opacity: 1,
    },
    card: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: 15,
        paddingVertical: 5,
        paddingHorizontal: 15,
        marginBottom: 20,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F2F2F2'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 10,
    },
    label: {
        fontSize: 15,
        color: '#AAB7B8',
        fontWeight: '500',
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 1,
        justifyContent: 'flex-end',
        paddingLeft: 20,
    },
    value: {
        fontSize: 15,
        color: '#2D3250',
        fontWeight: '500',
        textAlign: 'right',
    },
    editButton: {
        width: '100%',
        backgroundColor: '#FFF',
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#EAE0D5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    editButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#5D6D7E',
    },
    collectionButton: {
        width: '100%',
        backgroundColor: '#FFF',
        paddingVertical: 15,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#F5A623',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    collectionButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3250',
    },
    adminButton: {
        width: '100%',
        backgroundColor: '#2D3250', // Navy
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: '#2D3250',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    adminButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    logoutButton: {
        width: '100%',
        backgroundColor: '#CD5C5C', // IndianRed
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#CD5C5C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    footerContainer: {
        width: '100%',
        marginTop: 30,
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    footerText: {
        fontSize: 18,
        fontWeight: 'bold',
    }
});
