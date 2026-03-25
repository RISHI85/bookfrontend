import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Button, ScrollView, Switch, TouchableOpacity, Image, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import API_URL from '../../../constants/Config';
import { useRouter } from 'expo-router';
import CustomAlert from '../../../components/CustomAlert';

export default function AddBookScreen() {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [desc, setDesc] = useState('');
    const [category, setCategory] = useState('');
    const [price, setPrice] = useState('');
    const [rentPrice, setRentPrice] = useState('');
    const [isFree, setIsFree] = useState(false);
    const [file, setFile] = useState<any>(null);
    const [coverImage, setCoverImage] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [fetchingCats, setFetchingCats] = useState(false);
    const [isCustom, setIsCustom] = useState(false);

    const router = useRouter();

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setFetchingCats(true);
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const res = await axios.get(`${API_URL}/books/categories`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(res.data || []);
        } catch (e) {
            console.log("Error fetching categories", e);
        } finally {
            setFetchingCats(false);
        }
    };

    // Custom Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info',
        onOk: undefined as (() => void) | undefined
    });

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info', onOk?: () => void) => {
        setAlertConfig({ title, message, type, onOk });
        setAlertVisible(true);
    };

    const handleAlertClose = () => {
        setAlertVisible(false);
        if (alertConfig.onOk) {
            alertConfig.onOk();
        }
    };

    const pickDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true
        });

        if (result.assets && result.assets.length > 0) {
            setFile(result.assets[0]);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [2, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setCoverImage(result.assets[0]);
        }
    };

    const handleUpload = async () => {
        if (!title || !author || !file) {
            showAlert("Error", "Title, Author and PDF file are required", "error");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('author', author);
            formData.append('description', desc);
            formData.append('category', category);
            formData.append('price', price || '0');
            formData.append('rent_price', rentPrice || '0');
            formData.append('is_free', isFree.toString());

            formData.append('pdf', {
                uri: file.uri,
                name: file.name,
                type: 'application/pdf'
            } as any);

            if (coverImage) {
                const filename = coverImage.uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                formData.append("cover_image", {
                    uri: coverImage.uri,
                    name: filename,
                    type: type
                } as any);
            }

            const token = await SecureStore.getItemAsync('access_token');
            await axios.post(`${API_URL}/admin/books/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            showAlert("Success", "Book uploaded successfully", "success", () => router.back());

        } catch (error: any) {
            console.log("Upload error", error);
            showAlert("Error", "Failed to upload book", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} />

            <Text style={styles.label}>Author *</Text>
            <TextInput style={styles.input} value={author} onChangeText={setAuthor} />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={desc} onChangeText={setDesc} multiline />

            <Text style={styles.label}>Category *</Text>
            {isCustom ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Type new category..."
                        value={category}
                        onChangeText={setCategory}
                        autoFocus
                    />
                    <TouchableOpacity
                        onPress={() => { setIsCustom(false); setCategory(''); }}
                        style={{ marginLeft: 10, marginBottom: 10 }}
                    >
                        <Ionicons name="close-circle" size={30} color="#CD5C5C" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setShowPicker(true)}
                >
                    <Text style={[styles.pickerTriggerText, !category && { color: '#999' }]}>
                        {category || "Select Category"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
            )}

            {/* Category Picker Modal */}
            <Modal
                visible={showPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPicker(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Category</Text>
                            <TouchableOpacity onPress={() => setShowPicker(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {fetchingCats ? (
                            <ActivityIndicator size="small" color="#2D3250" style={{ margin: 20 }} />
                        ) : (
                            <FlatList
                                data={[...categories, " + Add New Category"]}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.categoryOption}
                                        onPress={() => {
                                            if (item === " + Add New Category") {
                                                setIsCustom(true);
                                                setCategory('');
                                            } else {
                                                setCategory(item);
                                                setIsCustom(false);
                                            }
                                            setShowPicker(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.categoryOptionText,
                                            item === " + Add New Category" && { color: '#4c87ffff', fontWeight: 'bold' },
                                            item === category && { color: '#F5A623' }
                                        ]}>
                                            {item}
                                        </Text>
                                        {item === category && <Ionicons name="checkmark" size={20} color="#F5A623" />}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ width: '48%' }}>
                    <Text style={styles.label}>Price (₹)</Text>
                    <TextInput
                        style={[styles.input, isFree && styles.disabledInput]}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="numeric"
                        editable={!isFree}
                    />
                </View>
                <View style={{ width: '48%' }}>
                    <Text style={styles.label}>Rent Price (₹)</Text>
                    <TextInput
                        style={[styles.input, isFree && styles.disabledInput]}
                        value={rentPrice}
                        onChangeText={setRentPrice}
                        keyboardType="numeric"
                        editable={!isFree}
                    />
                </View>
            </View>

            <View style={styles.switchRow}>
                <Text style={styles.label}>Is Free?</Text>
                <Switch
                    value={isFree}
                    onValueChange={(val) => {
                        setIsFree(val);
                        if (val) {
                            setPrice('0');
                            setRentPrice('0');
                        }
                    }}
                />
            </View>

            <TouchableOpacity onPress={pickDocument} style={styles.fileBtn}>
                <Text style={styles.fileBtnText}>{file ? `Selected: ${file.name}` : "Select PDF File *"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={pickImage} style={styles.fileBtn}>
                <Text style={styles.fileBtnText}>{coverImage ? "Change Cover Image" : "Select Cover Image"}</Text>
            </TouchableOpacity>

            {coverImage && (
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <Image source={{ uri: coverImage.uri }} style={{ width: 100, height: 150, borderRadius: 10 }} />
                </View>
            )}

            <View style={{ height: 20 }} />

            <TouchableOpacity
                style={[styles.uploadButton, loading && { opacity: 0.7 }]}
                onPress={handleUpload}
                disabled={loading}
            >
                <Text style={styles.uploadButtonText}>{loading ? "Uploading..." : "Upload Book"}</Text>
            </TouchableOpacity>

            <CustomAlert
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={handleAlertClose}
            />
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, backgroundColor: '#FFFBF0', flexGrow: 1 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#2D3250', marginTop: 10 },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        fontSize: 16,
        color: '#333'
    },
    disabledInput: {
        backgroundColor: '#F0F0F0',
        color: '#BBB'
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 10 },
    fileBtn: {
        padding: 16,
        backgroundColor: '#FFFBF0',
        borderRadius: 15,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed'
    },
    fileBtnText: { color: '#555', fontSize: 16, fontWeight: '500' },
    uploadButton: {
        backgroundColor: '#4c87ffff',
        paddingVertical: 18,
        borderRadius: 25,
        alignItems: 'center',
        shadowColor: '#4c80e8ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 30
    },
    uploadButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    // Picker Styles
    pickerTrigger: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    pickerTriggerText: {
        fontSize: 16,
        color: '#333'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContent: {
        backgroundColor: '#FFF',
        width: '100%',
        borderRadius: 20,
        maxHeight: '60%',
        overflow: 'hidden'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3250'
    },
    categoryOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F9F9F9'
    },
    categoryOptionText: {
        fontSize: 16,
        color: '#444'
    }
});
