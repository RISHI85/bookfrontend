// Replace with your machine's local IP address
// e.g., 'http://192.168.1.5:8000'
// For iOS Simulator, 'http://127.0.0.1:8000' works.
// For Android Emulator, use 'http://10.0.2.2:8000'.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.6:8000'; // Fallback for Local Dev

export default API_URL;
