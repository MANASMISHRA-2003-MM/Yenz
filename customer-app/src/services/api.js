import axios from 'axios';

const cleanUrl = (url) => {
  if (!url) return '';
  return url.toString().trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
};

// Smart backend resolution for Web and Android Capacitor native
export const getBackendBaseUrl = () => {
  // 1. In-app manual override (configurable via Profile / Settings)
  const custom = localStorage.getItem('milega_custom_backend_url') || localStorage.getItem('krawing_custom_backend_url');
  if (custom && custom.trim()) {
    return cleanUrl(custom);
  }

  // 2. Vite environment variable from .env
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return cleanUrl(envUrl);
  }

  // 3. Live Render backend (strictly per user request: no localhost testing)
  return 'https://yenz-mviu.onrender.com';
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
