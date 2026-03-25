import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Dimensions, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from "react-native";
import api from "../../api/api";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width, height } = Dimensions.get('window');

export default function SignUpScreen() {
    const { isForgotPassword } = useLocalSearchParams();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const sendOtp = async () => {
        try {
            if (!email.trim()) {
                Alert.alert("Error", "Please enter your email");
                return;
            }
            setLoading(true);
            await api.post("/auth/send-otp", { email });
            setLoading(false);
            router.push({ pathname: "/verify-otp", params: { email, isForgotPassword } });
        } catch (err) {
            setLoading(false);
            console.log("SEND OTP ERROR:", err);
            const msg = err.response?.data?.detail || err.message || "Failed to send OTP";
            Alert.alert("Error", typeof msg === 'object' ? JSON.stringify(msg) : msg);
        }
    };

    return (
        <View style={styles.container}>
            {/* Background Shapes */}
            <View style={styles.backgroundContainer}>
                <View style={styles.blobTopLeft} />
                <View style={styles.circleTopRight} />
                <View style={styles.circleCenterLeft} />
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1, zIndex: 1 }} 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView 
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.title}>{isForgotPassword === 'true' ? "Reset your" : "Create your"}</Text>
                <Text style={styles.title}>{isForgotPassword === 'true' ? "password" : "account"}</Text>
                <Text style={styles.subtitle}>{isForgotPassword === 'true' ? "Enter your email to reset your password" : "Enter your email to get started"}</Text>

                <View style={styles.formContainer}>
                    <TextInput
                        placeholder="Email"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                    />

                    <TouchableOpacity onPress={sendOtp} style={styles.button} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Get OTP</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.dividerContainer}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>or</Text>
                        <View style={styles.line} />
                    </View>

                    <View style={styles.socialContainer}>
                        <TouchableOpacity style={styles.socialButton}>
                            <Text style={styles.socialText}>Google</Text>
                        </TouchableOpacity>
                        <View style={{ width: 20 }} />
                        <TouchableOpacity style={styles.socialButton}>
                            <Text style={styles.socialText}>Facebook</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.loginRow}>
                        <Text style={styles.loginLabel}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
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
        zIndex: 0,
    },
    blobTopLeft: {
        position: 'absolute',
        top: -60,
        left: -50,
        width: 180,
        height: 220,
        backgroundColor: '#F5A623',
        borderBottomRightRadius: 150,
        borderBottomLeftRadius: 80,
        borderTopRightRadius: 0,
    },
    circleTopRight: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#2D3250',
    },
    circleCenterLeft: {
        position: 'absolute',
        top: height * 0.35,
        left: -50,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#2D3250',
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: 30,
        justifyContent: 'center',
        paddingTop: 140,
        paddingBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#2D3250',
        fontFamily: 'serif',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 10,
    },
    formContainer: {
        marginTop: 40,
    },
    input: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 25,
        paddingVertical: 15,
        paddingHorizontal: 20,
        fontSize: 16,
        marginBottom: 15,
        color: '#333',
    },
    button: {
        backgroundColor: '#2D3250',
        paddingVertical: 15,
        borderRadius: 25,
        alignItems: 'center',
        marginBottom: 30,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#ccc',
    },
    orText: {
        marginHorizontal: 10,
        color: '#666',
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
    },
    socialButton: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 25,
    },
    socialText: {
        color: '#2D3250',
        fontWeight: 'bold',
    },
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
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
