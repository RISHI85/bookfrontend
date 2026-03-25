import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Dimensions, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import api from "../../api/api";
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function OtpScreen() {
  const { email, isForgotPassword } = useLocalSearchParams();
  const [otp, setOtp] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Role selection modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  // Merchant details modal
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [merchantName, setMerchantName] = useState("");
  const [libraryName, setLibraryName] = useState("");
  const [numBooks, setNumBooks] = useState("");
  const [merchantLoading, setMerchantLoading] = useState(false);

  const verifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter the OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      const token = res.data.access_token;
      const refToken = res.data.refresh_token;
      await SecureStore.setItemAsync("access_token", token);
      if (refToken) await SecureStore.setItemAsync("refresh_token", refToken);
      setAccessToken(token);

      // If user already has a password (returning user), skip role selection
      if (isForgotPassword === 'true') {
        router.replace({ pathname: "/set-password", params: { email, isForgotPassword: 'true' } });
      } else if (res.data.has_password) {
        router.replace("/(tabs)");
      } else if (res.data.role === 'merchant') {
        // Existing merchant without password — skip role selection, go to set password
        router.replace({ pathname: "/set-password", params: { email } });
      } else {
        // New user — show role selection modal
        setShowRoleModal(true);
      }
    } catch (err) {
      console.log("Verify Error:", err);
      const msg = err.response?.data?.detail || err.message || "Invalid OTP";
      Alert.alert("Error", typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReader = () => {
    setShowRoleModal(false);
    router.replace({ pathname: "/set-password", params: { email } });
  };

  const handleSelectMerchant = () => {
    setShowRoleModal(false);
    setShowMerchantModal(true);
  };

  const handleMerchantSubmit = async () => {
    if (!merchantName.trim() || !libraryName.trim() || !numBooks.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    const bookCount = parseInt(numBooks);
    if (isNaN(bookCount) || bookCount < 0) {
      Alert.alert("Error", "Please enter a valid number of books");
      return;
    }

    setMerchantLoading(true);
    try {
      const res = await api.post("/auth/register-merchant", {
        merchant_name: merchantName.trim(),
        library_name: libraryName.trim(),
        num_books: bookCount,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Update stored token with new one (has merchant role)
      await SecureStore.setItemAsync("access_token", res.data.access_token);
      if (res.data.refresh_token) await SecureStore.setItemAsync("refresh_token", res.data.refresh_token);
      setShowMerchantModal(false);
      Alert.alert(
        "Welcome, Merchant! 🎉",
        `Your library "${libraryName.trim()}" has been registered successfully!`,
        [{ text: "Continue", onPress: () => router.replace({ pathname: "/set-password", params: { email } }) }]
      );
    } catch (err) {
      console.log("Merchant Register Error:", err);
      const msg = err.response?.data?.detail || err.message || "Registration failed";
      Alert.alert("Error", typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setMerchantLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Shapes */}
      <View style={styles.backgroundContainer}>
        <View style={styles.blobTopLeft} />
        <View style={styles.circleTopRight} />
        <View style={styles.blobBottomLeft} />
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
            <Text style={styles.title}>Verify OTP</Text>

            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>Enter the OTP sent to</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            <View style={styles.formContainer}>
              <TextInput
                placeholder="Enter OTP"
                placeholderTextColor="#999"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                style={styles.input}
                maxLength={6}
              />

              <TouchableOpacity onPress={verifyOtp} style={styles.button} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>VERIFY & LOGIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ===== Role Selection Modal ===== */}
      <Modal visible={showRoleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Who are you?</Text>
              <Text style={styles.modalSubtitle}>Select your role to continue</Text>
            </View>

            <TouchableOpacity style={styles.roleCard} onPress={handleSelectReader}>
              <View style={[styles.roleIcon, { backgroundColor: '#E8F4FD' }]}>
                <Ionicons name="book" size={28} color="#2D3250" />
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleName}>I'm a Reader</Text>
                <Text style={styles.roleDesc}>Browse, buy & read books</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.roleCard} onPress={handleSelectMerchant}>
              <View style={[styles.roleIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="storefront" size={28} color="#F5A623" />
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleName}>I'm a Merchant</Text>
                <Text style={styles.roleDesc}>Sell & manage your library</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== Merchant Details Modal ===== */}
      <Modal visible={showMerchantModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View style={[styles.modalContent, { marginTop: 20, marginBottom: 20 }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => { setShowMerchantModal(false); setShowRoleModal(true); }} style={styles.modalBack}>
                  <Ionicons name="arrow-back" size={22} color="#2D3250" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Merchant Details</Text>
                <Text style={styles.modalSubtitle}>Tell us about your library</Text>
              </View>

              <View style={styles.merchantForm}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Merchant Name</Text>
                  <TextInput
                    placeholder="Your business name"
                    placeholderTextColor="#999"
                    value={merchantName}
                    onChangeText={setMerchantName}
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Library Name</Text>
                  <TextInput
                    placeholder="Name of your library"
                    placeholderTextColor="#999"
                    value={libraryName}
                    onChangeText={setLibraryName}
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Number of Books</Text>
                  <TextInput
                    placeholder="How many books do you have?"
                    placeholderTextColor="#999"
                    value={numBooks}
                    onChangeText={setNumBooks}
                    keyboardType="number-pad"
                    style={styles.modalInput}
                  />
                  <Text style={styles.fieldHint}>
                    <Ionicons name="information-circle-outline" size={13} color="#999" /> Start your journey as a merchant
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, merchantLoading && { opacity: 0.7 }]}
                onPress={handleMerchantSubmit}
                disabled={merchantLoading}
              >
                {merchantLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>REGISTER AS MERCHANT</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  blobTopLeft: {
    position: 'absolute',
    top: -60,
    left: -50,
    width: 200,
    height: 220,
    backgroundColor: '#F5A623',
    borderBottomRightRadius: 150,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  circleTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#2D3250',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2D3250',
  },
  contentContainer: {
    paddingHorizontal: 40,
    paddingTop: 120,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2D3250',
    fontFamily: 'serif',
    textAlign: 'center',
    marginBottom: 20,
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
    marginBottom: 25,
    color: '#333',
  },
  button: {
    backgroundColor: '#2D3250',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
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

  // === Modals ===
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFBF0',
    borderRadius: 24,
    padding: 30,
    width: width - 40,
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalHeader: {
    marginBottom: 25,
  },
  modalBack: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2D3250',
    fontFamily: 'serif',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },

  // Role Cards
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  roleTextWrap: {
    flex: 1,
  },
  roleName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D3250',
  },
  roleDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },

  // Merchant Form
  merchantForm: {
    marginBottom: 10,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3250',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#333',
  },
  fieldHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#F5A623',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
