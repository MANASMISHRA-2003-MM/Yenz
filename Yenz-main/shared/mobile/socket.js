import { io } from 'socket.io-client';
import { CONFIG } from './config.js';
import { getAuthToken } from './api.js';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    const token = getAuthToken();
    socketInstance = io(CONFIG.SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketInstance.on('connect', () => {
      console.log('[Mobile Socket] Connected to backend:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Mobile Socket] Disconnected:', reason);
    });
  }
  return socketInstance;
};

export const closeSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
