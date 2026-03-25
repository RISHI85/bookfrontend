import axios from 'axios';
import API_URL from '../../constants/Config';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loops if refresh fails
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Skip refresh logic for auth endpoints
      if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/verify-otp') || originalRequest.url.includes('/auth/refresh')) {
         return Promise.reject(error);
      }

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
          
          if (res.data && res.data.access_token) {
            const newAccessToken = res.data.access_token;
            await SecureStore.setItemAsync('access_token', newAccessToken);
            
            // Retry the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.log("Token refresh failed:", refreshError);
        // Refresh token might be expired, clear storage and login
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        router.replace('/login');
        return Promise.reject(refreshError);
      }

      // No refresh token existed
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      router.replace('/login');
    }

    return Promise.reject(error);
  }
);

export default api;