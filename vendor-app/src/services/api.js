import axios from 'axios';

const cleanUrl = (url) => {
  if (!url) return '';
  return url.toString().trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
};

// Smart backend resolution for Android Capacitor native APK and Web Browser
export const getBackendBaseUrl = () => {
  // 1. In-app manual override (configurable via Vendor Settings / Profile)
  const custom =
    localStorage.getItem('milega_vendor_custom_backend_url') ||
    localStorage.getItem('krawing_custom_backend_url');
  if (custom && custom.trim()) {
    return cleanUrl(custom);
  }

  // 2. Vite environment variable from .env
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return cleanUrl(envUrl);
  }

  // 3. Fallback to production Render backend (strictly per user request: no localhost testing)
  return 'https://yenz-mviu.onrender.com';
};

export const setCustomBackendBaseUrl = (url) => {
  if (!url || !url.trim()) {
    localStorage.removeItem('milega_vendor_custom_backend_url');
    localStorage.removeItem('krawing_custom_backend_url');
  } else {
    const formatted = cleanUrl(url);
    localStorage.setItem('milega_vendor_custom_backend_url', formatted);
    localStorage.setItem('krawing_custom_backend_url', formatted);
  }
};

export const getApiUrl = () => {
  const base = getBackendBaseUrl();
  return base ? `${base}/api` : 'https://yenz-mviu.onrender.com/api';
};

const API = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
});

// Dynamic baseURL interceptor so URL updates immediately if changed in settings
API.interceptors.request.use((config) => {
  if (!config.baseURL || config.baseURL === '/api' || config.baseURL === '') {
    config.baseURL = getApiUrl();
  }
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
