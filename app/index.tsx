import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import API_URL from '../constants/Config';

const { width, height } = Dimensions.get('window');

export default function LandingScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            console.log("Checking session...");
            const token = await SecureStore.getItemAsync('access_token');
            console.log("Token found:", !!token);
            if (token) {
                const res = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("User role:", res.data.role);
                if (res.data.role === 'admin' || res.data.role === 'merchant' || res.data.role === 'user') {
                    router.replace('/(tabs)');
                }
            }
        } catch (error) {
            console.log("Session check failed", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF0' }}>
                <ActivityIndicator size="large" color="#2D3250" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Background Shapes */}
            <View style={styles.backgroundContainer}>
                {/* Top Left Blob (Approximated) */}
                {/* Top Left Blob */}
                <View style={styles.blobTopLeft} />

                {/* White Background Blob for Text */}
                <View style={styles.blobTextBackground} />

                {/* Top Center Orange Circle */}
                <View style={styles.circleTopCenter} />

                {/* Right Blob */}
                <View style={styles.blobRight} />

                {/* Bottom Left Orange Circle */}
                <View style={styles.circleBottomLeft} />
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
                <View style={styles.textContainer}>
                    <Text style={styles.titleText}>All your</Text>
                    <Text style={styles.titleText}>books in one</Text>
                    <Text style={styles.titleText}>place on</Text>
                    <Text style={styles.titleText}>BookWorm.</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => router.push('/signup')}
                    >
                        <Text style={styles.startButtonText}>Start</Text>
                    </TouchableOpacity>

                    <View style={styles.loginRow}>
                        <Text style={styles.loginLabel}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={styles.loginLink}>Log in</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF0', // Cream background
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    blobTopLeft: {
        position: 'absolute',
        top: -50,
        left: -50,
        width: 250,
        height: 250,
        backgroundColor: '#2D3250', // Navy
        borderBottomRightRadius: 100,
        borderBottomLeftRadius: 100,
        borderTopRightRadius: 50,
        transform: [{ rotate: '-20deg' }], // Adjusted rotation
    },
    blobTextBackground: {
        position: 'absolute',
        top: height * 0.25,
        left: -20,
        width: width * 0.8,
        height: width * 0.8,
        backgroundColor: '#FFFFFF',
        borderTopRightRadius: 200,
        borderBottomRightRadius: 150,
        borderTopLeftRadius: 50,
        borderBottomLeftRadius: 50,
        transform: [{ rotate: '10deg' }],
    },
    circleTopCenter: {
        position: 'absolute',
        top: 60,
        right: 50,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#F5A623', // Orange
    },
    blobRight: {
        position: 'absolute',
        top: height * 0.35,
        right: -80, // Moved further right to clear text
        width: 250,
        height: 350,
        backgroundColor: '#2D3250', // Navy
        borderTopLeftRadius: 150,
        borderBottomLeftRadius: 150,
        borderTopRightRadius: 50,
        transform: [{ rotate: '10deg' }],
    },
    circleBottomLeft: {
        position: 'absolute',
        bottom: 50, // Moved up slightly
        left: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#F5A623', // Orange
    },
    contentContainer: {
        flex: 1,
        zIndex: 1,
        paddingHorizontal: 30,
        paddingBottom: 50,
        justifyContent: 'space-between',
    },
    textContainer: {
        marginTop: height * 0.32,
        width: '70%', // Limit width to avoid hitting right blob
    },
    titleText: {
        fontSize: 38,
        fontWeight: '900',
        color: '#2D3250',
        lineHeight: 46,
        fontFamily: 'serif', // Try serif if available, otherwise fallback
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
    },
    startButton: {
        backgroundColor: '#2D3250',
        paddingVertical: 18,
        width: '100%',
        borderRadius: 30,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loginRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loginLabel: {
        color: '#666',
        fontSize: 14,
    },
    loginLink: {
        color: '#2D3250',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
