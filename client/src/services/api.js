import axios from 'axios';

export const getCleanUrl = (url) => {
  if (!url) return '';
  return url.toString().trim().replace(/^["']|["']$/g, '').replace(/\/$/, '');
};

const rawEnv = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL;
export const BACKEND_URL = getCleanUrl(rawEnv) || 'https://yenz-mviu.onrender.com';
export const API_BASE_URL = `${BACKEND_URL}/api`;

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT auth token
API.interceptors.request.use((config) => {
  if (!config.baseURL) {
    config.baseURL = API_BASE_URL;
  }
  const token = localStorage.getItem('yenz_token') || localStorage.getItem('milega_token') || localStorage.getItem('krawing_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
