import axios from 'axios';

// Smart backend resolution for Android Capacitor native APK and Web Browser
export const getBackendBaseUrl = () => {
  // 1. In-app manual override (configurable via Delivery Settings)
  const custom =
    localStorage.getItem('milega_delivery_custom_backend_url') ||
    localStorage.getItem('krawing_custom_backend_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/$/, '');
  }

  // 2. Vite environment variable from .env
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 3. If running inside Capacitor Native Android WebView
  const isCapacitorNative =
    typeof window !== 'undefined' &&
    (window?.Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && window.location.port === ''));

  if (isCapacitorNative) {
    // Default to production Render backend requested by user
    return 'https://yenz-mviu.onrender.com';
  }

  // 4. In development web browser, empty string means relative /api (uses Vite proxy)
  return '';
};

export const setCustomBackendBaseUrl = (url) => {
  if (!url || !url.trim()) {
    localStorage.removeItem('milega_delivery_custom_backend_url');
    localStorage.removeItem('krawing_custom_backend_url');
  } else {
    const formatted = url.trim().replace(/\/$/, '');
    localStorage.setItem('milega_delivery_custom_backend_url', formatted);
    localStorage.setItem('krawing_custom_backend_url', formatted);
  }
};

export const getApiUrl = () => {
  const base = getBackendBaseUrl();
  return base ? `${base}/api` : '/api';
};

const API = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
});

// Dynamic baseURL interceptor so URL updates immediately if changed in settings
API.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  const token =
    localStorage.getItem('yenz_token') ||
    localStorage.getItem('milega_token') ||
    localStorage.getItem('krawing_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
