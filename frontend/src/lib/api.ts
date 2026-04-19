import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { setupDemoInterceptor } from './demoMode';

const BASE_URL = (import.meta.env.VITE_API_URL || '') + '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Install demo interceptor first (short-circuits all requests in demo mode)
setupDemoInterceptor(api);

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 — attempt refresh, retry once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.__demoResponse) return Promise.reject(error);
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
