import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import API_URL from '../../../constants/Config';
import * as SecureStore from 'expo-secure-store';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../../components/CustomAlert';

import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

const { width, height } = Dimensions.get('window');

const EditProfileScreen = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [image, setImage] = useState(null); // Local URI for preview
    const [loading, setLoading] = useState(false);

    // Custom Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        onOk: undefined
    });

    const showAlert = (title, message, type = 'info', onOk = undefined) => {
        setAlertConfig({ title, message, type, onOk });
        setAlertVisible(true);
    };

    const handleAlertClose = () => {
        setAlertVisible(false);
        if (alertConfig.onOk) {
            alertConfig.onOk();
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const response = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { name, phone, address, profile_picture } = response.data;
            setName(name || '');
            setPhone(phone || '');
            setAddress(address || '');
            if (profile_picture) {
                // Construct full URL if it's a relative path from backend
                const fullUrl = profile_picture.startsWith('http') || profile_picture.startsWith('https')
                    ? profile_picture
                    : `${API_URL}/${profile_picture}`;
                setImage(fullUrl);
            }
        } catch (error) {
            console.log('Error fetching profile', error);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // Re-enabled as per user request
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            const localUri = result.assets[0].uri;
            setImage(localUri);
            uploadImage(localUri);
        }
    };

    const uploadImage = async (uri) => {
        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const formData = new FormData();

            // Infer type
            const match = /\.(\w+)$/.exec(uri.split('/').pop());
            const type = match ? `image/${match[1]}` : `image`;
            const filename = uri.split('/').pop();

            formData.append('file', { uri, name: filename, type });

            await axios.post(`${API_URL}/auth/profile/upload-photo`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });
            showAlert("Success", "Profile photo updated!", "success");
        } catch (error) {
            console.log("Upload error:", error);
            showAlert("Error", "Failed to upload image", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim() || !phone.trim() || !address.trim()) {
            showAlert("Error", "All fields are mandatory.", "error");
            return;
        }

        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('access_token');
            await axios.put(
                `${API_URL}/auth/profile`,
                { name, phone, address },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showAlert("Success", "Profile updated successfully", "success", () => router.back());
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to update profile";
            showAlert("Error", typeof msg === 'object' ? JSON.stringify(msg) : msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

            {/* Background Shapes */}
            <View style={styles.backgroundContainer}>
                <View style={styles.blobTopLeft} />
                <View style={styles.circleTopCenter} />
                <View style={styles.blobRight} />
                <View style={styles.circleBottomLeft} />
                <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    <View style={styles.titleSection}>
                        <Text style={styles.subtitle}>You must complete your profile to continue.</Text>
                    </View>

                    {/* Avatar Upload */}
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                            {image ? (
                                <Image source={{ uri: image }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>
                                        {name ? name[0].toUpperCase() : 'U'}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.editIconContainer}>
                                <Ionicons name="camera" size={20} color="#FFF" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Mario"
                            placeholderTextColor="#999"
                        />

                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+91 12345"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.label}>Address</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Divisible"
                            placeholderTextColor="#999"
                            multiline
                        />
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                            <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save Profile"}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <CustomAlert
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={handleAlertClose}
            />
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFBF0' }, // Beige background matching Profile
    keyboardView: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    headerTitle: {
        fontSize: 18,
        marginLeft: 20,
        color: '#555',
        fontWeight: '500'
    },
    container: {
        paddingHorizontal: 25,
        paddingTop: 10,
        paddingBottom: 80,
    },
    card: {
        flex: 1,
        width: '100%',
    },
    titleSection: {
        marginBottom: 30,
        alignItems: 'center'
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#2D3250',
        marginBottom: 8,
        textAlign: 'center',
        fontFamily: 'serif'
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center'
    },
    form: {
        width: '100%'
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold', // Bold labels like in screenshot
        color: '#444',
        marginBottom: 8,
        marginTop: 12
    },
    input: {
        borderWidth: 1,
        borderColor: '#EAEAEA',
        backgroundColor: '#FAFAFA', // Very light gray background for input
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        marginBottom: 5
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 12
    },
    saveButton: {
        backgroundColor: '#2D3250', // Match navy theme
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
    },

    circleTopCenter: {
        position: 'absolute',
        top: -20,
        left: -80,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#F5A623', // Orange
    },
    blobRight: {
        position: 'absolute',
        bottom: -100,
        right: -80,
        width: 250,
        height: 350,
        backgroundColor: '#2D3250', // Navy
        borderTopLeftRadius: 150,
        borderBottomLeftRadius: 150,
        borderTopRightRadius: 50,
        transform: [{ rotate: '-15deg' }],
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 25,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 10,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EAE0D5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF'
    },
    avatarInitials: {
        fontSize: 40,
        color: '#7f8c8d',
        fontWeight: 'bold'
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2D3250',
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF'
    },
    changePhotoText: {
        color: '#6A9CFD',
        fontSize: 14,
        fontWeight: '600'
    },
});

export default EditProfileScreen;
