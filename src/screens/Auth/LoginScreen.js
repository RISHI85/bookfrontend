import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Dimensions, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import * as SecureStore from 'expo-secure-store';
import api from "../../api/api";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        if (res.data.role === 'admin' || res.data.role === 'merchant' || res.data.role === 'user') {
          router.replace("/(tabs)");
        }
      } catch (e) {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      }
    }
  };

  const handleLogin = async () => {
    try {
      if (!email.trim()) {
        Alert.alert("Error", "Please enter your email");
        return;
      }
      if (!password.trim()) {
        Alert.alert("Error", "Please enter your password");
        return;
      }
      const res = await api.post("/auth/login", { email, password });
      await SecureStore.setItemAsync("access_token", res.data.access_token);
      if (res.data.refresh_token) await SecureStore.setItemAsync("refresh_token", res.data.refresh_token);
      router.replace("/(tabs)");
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      const msg = err.response?.data?.detail || err.message || "Login failed";
      if (err.response?.status === 400 && typeof msg === 'string' && msg.includes("No password set")) {
        Alert.alert(
          "Password Not Set",
          "You haven't set a password yet. We'll send an OTP to verify your identity so you can set one.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Send OTP", onPress: () => router.push({ pathname: '/signup', params: { prefillEmail: email } }) }
          ]
        );
      } else {
        Alert.alert("Error", typeof msg === 'object' ? JSON.stringify(msg) : msg);
      }
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.contentContainer}>
            <Text style={styles.title}>Welcome back!</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

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

              <TextInput
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />

              <TouchableOpacity 
                onPress={() => router.push({ pathname: '/signup', params: { isForgotPassword: 'true' } })}
                style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -5 }}
              >
                <Text style={{ color: '#2D3250', fontWeight: 'bold' }}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleLogin} style={styles.button}>
                <Text style={styles.buttonText}>Sign In</Text>
              </TouchableOpacity>


              <View style={styles.signupRow}>
                <Text style={styles.signupLabel}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/signup')}>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
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
  keyboardView: {
    flex: 1,
    zIndex: 10,
    elevation: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
    width: 250,
    height: 300,
    backgroundColor: '#2D3250',
    borderBottomRightRadius: 150,
    borderBottomLeftRadius: 80,
    borderTopRightRadius: 0,
  },
  circleTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F5A623',
  },
  circleCenterLeft: {
    position: 'absolute',
    top: height * 0.35,
    left: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5A623',
  },
  contentContainer: {
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2D3250',
    fontFamily: 'serif',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  formContainer: {
    marginTop: 30,
  },
  input: {
    backgroundColor: '#FFFFFF',
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
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupLabel: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#2D3250',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
