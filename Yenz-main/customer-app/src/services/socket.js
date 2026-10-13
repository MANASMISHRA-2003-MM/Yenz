import { io } from 'socket.io-client';
import { getBackendBaseUrl } from './api';

const getSocketUrl = () => {
  const base = getBackendBaseUrl();
  if (base) return base;
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
};

const getToken = () =>
  (typeof localStorage !== 'undefined' && (
    localStorage.getItem('yenz_token') ||
    localStorage.getItem('milega_token') ||
    localStorage.getItem('krawing_token')
  )) || null;

export const socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['polling', 'websocket'],
  auth: (cb) => cb({ token: getToken() })
});

export function reconnectSocketWithAuth() {
  const targetUrl = getSocketUrl();
  if (socket.io.uri !== targetUrl) {
    socket.io.uri = targetUrl;
  }
  socket.auth = { token: getToken() };
  if (socket.connected) {
    socket.disconnect().connect();
  } else {
    socket.connect();
  }
}
