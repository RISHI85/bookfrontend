import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Dimensions, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import api from "../../api/api";
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from "expo-router";

const { width, height } = Dimensions.get('window');

export default function SetPasswordScreen() {
    const { email, isForgotPassword } = useLocalSearchParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSetPassword = async () => {
        if (!password.trim()) {
            Alert.alert("Error", "Please enter a password");
            return;
        }
        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters");
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync("access_token");
            await api.post("/auth/set-password", { password }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (isForgotPassword === 'true') {
                router.replace("/(tabs)");
                return;
            }

            // Check role to decide where to navigate
            const meRes = await api.get("/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (meRes.data.role === 'merchant') {
                router.replace("/(tabs)");
            } else {
                router.replace("/pick-favorites");
            }
        } catch (err) {
            console.log("SET PASSWORD ERROR:", err);
            const msg = err.response?.data?.detail || err.message || "Failed to set password";
            Alert.alert("Error", typeof msg === 'object' ? JSON.stringify(msg) : msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Background Shapes */}
            <View style={styles.backgroundContainer}>
                <View style={styles.blobTopLeft} />
                <View style={styles.circleTopRight} />
                <View style={styles.blobBottomRight} />
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1, zIndex: 10, elevation: 10 }} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView 
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                <Text style={styles.title}>{isForgotPassword === 'true' ? "Reset Password" : "Set Password"}</Text>

                <View style={styles.subtitleContainer}>
                    <Text style={styles.subtitle}>{isForgotPassword === 'true' ? "Create a new password for" : "Create a password for"}</Text>
                    <Text style={styles.emailText}>{email}</Text>
                </View>

                <View style={styles.formContainer}>
                    <TextInput
                        placeholder="Password"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        style={styles.input}
                    />

                    <TextInput
                        placeholder="Confirm Password"
                        placeholderTextColor="#999"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        style={styles.input}
                    />

                    <TouchableOpacity
                        onPress={handleSetPassword}
                        style={[styles.button, loading && { opacity: 0.6 }]}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? "SAVING..." : "SET PASSWORD"}
                        </Text>
                    </TouchableOpacity>
                </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFBF0',
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
        elevation: -1,
    },
    blobTopLeft: {
        position: 'absolute',
        top: -60,
        left: -50,
        width: 280,
        height: 320,
        backgroundColor: '#2D3250',
        borderBottomRightRadius: 180,
        borderBottomLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    circleTopRight: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#F5A623',
    },
    blobBottomRight: {
        position: 'absolute',
        bottom: -40,
        right: -40,
        width: 180,
        height: 250,
        backgroundColor: '#2D3250',
        borderTopLeftRadius: 120,
        borderBottomLeftRadius: 60,
        transform: [{ rotate: '10deg' }],
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: 40,
        justifyContent: 'center',
        paddingTop: 80,
        paddingBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#2D3250',
        fontFamily: 'serif',
        textAlign: 'center',
        marginBottom: 20,
        textShadowColor: 'rgba(255, 255, 255, 0.9)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitleContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 5,
    },
    emailText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3250',
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
    formContainer: {
        width: '100%',
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 30,
        paddingVertical: 18,
        paddingHorizontal: 25,
        fontSize: 16,
        marginBottom: 20,
        color: '#333',
    },
    button: {
        backgroundColor: '#2D3250',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
