import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://yenz-mviu.onrender.com',
        changeOrigin: true,
        secure: false
      },
      // Proxy Socket.IO polling (HTTP) AND websocket upgrade
      '/socket.io': {
        target: 'https://yenz-mviu.onrender.com',
        changeOrigin: true,
        secure: false,
        ws: true,
        // Suppress ECONNREFUSED & ECONNRESET when backend server is starting or offline
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code !== 'ECONNRESET' && err.code !== 'ECONNREFUSED') {
              console.error('[socket.io proxy error]', err.message);
            }
          });
        }
      }
    }
  }
});

