import { io } from 'socket.io-client';

// In development: connect to Vite dev server origin (proxy handles /socket.io → backend:5000)
// In production (Render): connect directly to the backend service URL via VITE_API_URL
const isDev = import.meta.env.DEV;
const SOCKET_URL = isDev
  ? window.location.origin          // Uses Vite proxy → http://localhost:5000
  : (import.meta.env.VITE_API_URL || window.location.origin);

const getToken = () =>
  localStorage.getItem('yenz_token') ||
  localStorage.getItem('milega_token') ||
  localStorage.getItem('krawing_token') ||
  null;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  // polling first → upgrades to WS once connected (avoids proxy ECONNRESET on pure WS)
  transports: ['polling', 'websocket'],
  auth: (cb) => cb({ token: getToken() })
});

export function reconnectSocketWithAuth() {
  socket.auth = { token: getToken() };
  if (socket.connected) {
    socket.disconnect().connect();
  } else {
    socket.connect();
  }
}

