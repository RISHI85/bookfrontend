import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, Modal, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import API_URL from '../constants/Config';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

interface Notification {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    notification_type?: string;
    reference_id?: number;
    sender_id?: number;
    sender_name?: string;
    sender_phone?: string;
    sender_address?: string;
    sender_photo?: string;
    book_title?: string;
    book_cover?: string;
    approval_status?: string;
}

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'rejected'>('all');
    const [userRole, setUserRole] = useState<string>('user');
    
    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
            fetchUserRole();
        }, [])
    );

    const fetchUserRole = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserRole(res.data?.role || 'user');
        } catch (e) {
            console.log('Fetch user role error', e);
        }
    };

    const fetchNotifications = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/notifications/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data);
        } catch (e) {
            console.log('Fetch notifications error', e);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            await axios.post(`${API_URL}/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) {
            console.log('Mark as read error', e);
        }
    };

    const clearAll = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            await axios.post(`${API_URL}/notifications/clear-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications([]);
        } catch (e) {
            console.log('Clear all error', e);
        }
    };

    const handleRespond = async (id: number, action: 'accept' | 'reject') => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            await axios.post(`${API_URL}/notifications/${id}/respond`, { action }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const notif = notifications.find(n => n.id === id);
            if (notif && !notif.is_read) markAsRead(id);

            setModalVisible(false);
            fetchNotifications(); 
        } catch (e) {
            Alert.alert("Error", "Could not process request");
        }
    };

    const openModal = (notif: Notification) => {
        setSelectedNotif(notif);
        setModalVisible(true);
        if (!notif.is_read) markAsRead(notif.id);
    };

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'all') return true;
        if (activeTab === 'approved') return n.approval_status === 'approved';
        if (activeTab === 'rejected') return n.approval_status === 'rejected';
        return true;
    });

    const isMerchantRequest = (type?: string) => type === 'buy_request' || type === 'rent_request';

    const renderItem = ({ item }: { item: Notification }) => {
        const isRequest = isMerchantRequest(item.notification_type);

        if (isRequest) {
            return (
                <TouchableOpacity
                    style={[styles.card, !item.is_read && styles.unreadCard]}
                    onPress={() => openModal(item)}
                    activeOpacity={0.9}
                >
                    <View style={styles.cardHeader}>
                        <View style={styles.avatar}>
                            {item.sender_photo ? (
                                <Image source={{ uri: item.sender_photo }} style={styles.avatarImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
                            ) : (
                                <View style={[styles.avatarImage, { backgroundColor: '#E67E22', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>{(item.sender_name || 'U').charAt(0).toUpperCase()}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.cardHeaderText}>
                            <Text style={styles.requesterName}>
                                {item.sender_name} <Text style={styles.requestAction}>wants to {item.notification_type === 'rent_request' ? 'rent' : 'buy'} </Text><Text style={styles.requestBookTitle}>{item.book_title}</Text>
                            </Text>
                            <Text style={styles.time}>{item.created_at ? new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}</Text>
                        </View>
                        {!item.is_read && <View style={styles.unreadDot} />}
                    </View>

                    {item.approval_status === 'pending' ? (
                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.acceptButtonCard} onPress={() => handleRespond(item.id, 'accept')}>
                                <Text style={styles.acceptButtonText}>Accept Request</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.declineButtonCard} onPress={() => openModal(item)}>
                                <Text style={styles.declineButtonText}>Decline</Text>
                            </TouchableOpacity>
                        </View>
                    ) : item.approval_status === 'approved' ? (
                        <View style={styles.statusRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
                            <Text style={[styles.statusText, {color: '#27AE60'}]}> Request Approved</Text>
                        </View>
                    ) : (
                        <View style={styles.statusRow}>
                            <Ionicons name="close-circle" size={18} color="#E74C3C" />
                            <Text style={[styles.statusText, {color: '#E74C3C'}]}> Request Rejected</Text>
                        </View>
                    )}
                </TouchableOpacity>
            );
        }

        // Standard Notification
        return (
            <TouchableOpacity
                style={[styles.item, !item.is_read && styles.unreadItem]}
                onPress={() => markAsRead(item.id)}
            >
                <View style={styles.iconCircle}>
                    <Ionicons name="notifications" size={20} color="#F5A623" />
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.topRow}>
                        <Text style={styles.title}>{item.title}</Text>
                        {!item.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2D3250" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tab Bar - Only for merchants */}
            {userRole === 'merchant' && (
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'all' && styles.activeTab]} 
                    onPress={() => setActiveTab('all')}
                >
                    <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'approved' && styles.activeTab]} 
                    onPress={() => setActiveTab('approved')}
                >
                    <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>Approved</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'rejected' && styles.activeTab, activeTab === 'rejected' && {borderBottomColor: '#E74C3C'}]} 
                    onPress={() => setActiveTab('rejected')}
                >
                    <Text style={[styles.tabText, activeTab === 'rejected' && {color: '#E74C3C'}]}>Rejected</Text>
                </TouchableOpacity>
            </View>
            )}

            {loading ? (
                <View style={styles.center}><ActivityIndicator color="#2D3250" /></View>
            ) : (
                <FlatList
                    data={filteredNotifications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="notifications-off-outline" size={60} color="#CCC" />
                            <Text style={styles.emptyText}>No {activeTab} notifications yet</Text>
                        </View>
                    }
                />
            )}

            {notifications.length > 0 && (
                <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, backgroundColor: '#FFFBF0' }}>
                    <TouchableOpacity style={styles.clearAllBtn} onPress={clearAll}>
                        <Text style={styles.clearAllText}>Clear All</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Merchant custom Request Modal */}
            <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                        {selectedNotif && (
                            <>
                                {/* Top Avatar */}
                                <View style={styles.modalAvatarContainer}>
                                    {selectedNotif.sender_photo ? (
                                        <Image source={{ uri: selectedNotif.sender_photo }} style={styles.modalAvatarImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
                                    ) : (
                                        <View style={[styles.modalAvatarImage, { backgroundColor: '#E67E22', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 28 }}>{(selectedNotif.sender_name || 'U').charAt(0).toUpperCase()}</Text>
                                        </View>
                                    )}
                                </View>
                                
                                <Text style={styles.modalUserName}>{selectedNotif.sender_name}</Text>
                                <Text style={styles.modalUserPhone}>{selectedNotif.sender_phone || "No phone provided"}</Text>
                                
                                <View style={styles.locationRow}>
                                    <Ionicons name="location" size={16} color="#E67E22" />
                                    <Text style={styles.locationText}>{selectedNotif.sender_address || "No address provided"}</Text>
                                </View>

                                {/* Requested Book Section */}
                                <View style={styles.bookSection}>
                                    <Text style={styles.bookSectionHeader}>REQUESTED BOOK</Text>
                                    <View style={styles.bookRow}>
                                        <View style={styles.bookCoverWrapper}>
                                            {selectedNotif.book_cover ? (
                                                <Image source={{ uri: `${API_URL}${selectedNotif.book_cover}` }} style={styles.bookCoverImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
                                            ) : (
                                                <View style={styles.bookCoverPlaceholder} />
                                            )}
                                        </View>
                                        <View style={styles.bookInfo}>
                                            <Text style={styles.bookModalTitle}>{selectedNotif.book_title}</Text>
                                            <View style={styles.hardcoverBadge}>
                                                <Text style={styles.hardcoverText}>{selectedNotif.notification_type === 'rent_request' ? 'RENTAL' : 'HARDCOVER'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Bottom Buttons */}
                                {selectedNotif.approval_status === 'pending' ? (
                                    <View style={styles.modalButtonsGroup}>
                                        <TouchableOpacity style={styles.modalRejectBtn} onPress={() => handleRespond(selectedNotif.id, 'reject')}>
                                            <Ionicons name="close" size={20} color="#2D3250" />
                                            <Text style={styles.modalRejectText}>Reject</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity style={styles.modalAcceptBtn} onPress={() => handleRespond(selectedNotif.id, 'accept')}>
                                            <Ionicons name="checkmark" size={20} color="#FFF" />
                                            <Text style={styles.modalAcceptText}>Accept</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={{ marginTop: 20, width: '100%', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                            <Ionicons 
                                                name={selectedNotif.approval_status === 'approved' ? 'checkmark-circle' : 'close-circle'} 
                                                size={22} 
                                                color={selectedNotif.approval_status === 'approved' ? '#27AE60' : '#E74C3C'} 
                                            />
                                            <Text style={{ fontSize: 16, color: selectedNotif.approval_status === 'approved' ? '#27AE60' : '#E74C3C', fontWeight: '600', marginLeft: 6 }}>
                                                Request {selectedNotif.approval_status === 'approved' ? 'Approved' : 'Rejected'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={[styles.modalRejectBtn, { width: '100%' }]} onPress={() => setModalVisible(false)}>
                                            <Text style={styles.modalRejectText}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFBF0' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: '#FFFBF0',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3250', fontFamily: 'serif' },
    
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingHorizontal: 15,
    },
    tabButton: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#F5A623',
    },
    tabText: {
        fontSize: 15,
        color: '#888',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#2D3250',
        fontWeight: 'bold',
    },

    list: { padding: 20, paddingBottom: 10 },
    
    // Standard Notification
    item: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        padding: 18,
        borderRadius: 15,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    unreadItem: { borderColor: '#F5A623', backgroundColor: '#FFFDF9' },
    iconCircle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#FFFBF0', justifyContent: 'center', alignItems: 'center',
        marginRight: 15,
    },
    textContainer: { flex: 1 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    title: { fontSize: 17, fontWeight: 'bold', color: '#2D3250' },
    message: { fontSize: 15, color: '#555', lineHeight: 22 },
    
    // Custom Merchant Request Card
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    unreadCard: {
        borderColor: '#F5A623',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#EAEAEA',
        marginRight: 12,
    },
    avatarImage: { width: '100%', height: '100%' },
    cardHeaderText: {
        flex: 1,
        justifyContent: 'center',
    },
    requesterName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1A1A1A',
        lineHeight: 22,
    },
    requestAction: {
        fontWeight: 'normal',
        color: '#666',
    },
    requestBookTitle: {
        color: '#E67E22',
        fontWeight: 'bold',
    },
    time: { fontSize: 12, color: '#999', marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F5A623', marginLeft: 8, marginTop: 6 },
    
    cardActions: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    acceptButtonCard: {
        flex: 1,
        backgroundColor: '#27AE60',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    acceptButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    
    declineButtonCard: {
        flex: 0.8,
        backgroundColor: '#ECF0F1',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    declineButtonText: { color: '#2C3E50', fontWeight: 'bold', fontSize: 14 },
    
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginLeft: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },

    clearAllBtn: {
        backgroundColor: '#FFEEEE',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    clearAllText: { color: '#E74C3C', fontWeight: 'bold', fontSize: 16 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 15, fontSize: 16, color: '#999', fontWeight: '500' },

    // Modal Specific Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFF',
        width: '100%',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    modalAvatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#E67E22',
        overflow: 'hidden',
        marginTop: -64, // Pop out of card
        backgroundColor: '#FFF',
        marginBottom: 12,
    },
    modalAvatarImage: { width: '100%', height: '100%' },
    modalUserName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#E67E22',
        marginBottom: 4,
    },
    modalUserPhone: {
        fontSize: 15,
        color: '#666',
        marginBottom: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    locationText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#555',
    },
    bookSection: {
        width: '100%',
        backgroundColor: '#FFF3E0',
        padding: 20,
        marginHorizontal: -24,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#FDEBD0',
        alignSelf: 'center',
        marginTop: 4,
    },
    bookSectionHeader: {
        fontSize: 11,
        letterSpacing: 1.5,
        fontWeight: 'bold',
        color: '#E67E22',
        marginBottom: 12,
        paddingLeft: 4,
    },
    bookRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bookCoverWrapper: {
        width: 60,
        height: 85,
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#EEE',
        marginRight: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    bookCoverImage: { width: '100%', height: '100%' },
    bookCoverPlaceholder: { width: '100%', height: '100%', backgroundColor: '#2D3250' },
    bookInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    bookModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3250',
        marginBottom: 8,
    },
    hardcoverBadge: {
        backgroundColor: '#FDEBD0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    hardcoverText: {
        color: '#E67E22',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    modalButtonsGroup: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 16,
        width: '100%',
    },
    modalRejectBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#EDF2F7',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    modalRejectText: {
        color: '#2D3250',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    modalAcceptBtn: {
        flex: 1.2,
        flexDirection: 'row',
        backgroundColor: '#E67E22',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: '#E67E22',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    modalAcceptText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
});
