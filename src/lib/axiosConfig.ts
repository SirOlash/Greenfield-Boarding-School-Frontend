import axios from 'axios';

// /api uses Vite's existing local proxy. Set VITE_API_BASE_URL for a separate host.
// VITE_* values are public browser configuration, never credentials.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Preserve bearer authentication on every authorized API request.
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('greenfield_token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('greenfield_token');
      localStorage.removeItem('greenfield_user');
      window.dispatchEvent(new Event('greenfield:unauthorized'));
      // Keep invalid-login feedback visible instead of repeatedly reloading login.
      if (window.location.pathname !== '/login' && error.config?.url !== '/auth/login') {
        const returnTo = window.location.pathname === '/register' ? '?returnTo=%2Fregister' : '';
        window.location.href = '/login' + returnTo;
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
