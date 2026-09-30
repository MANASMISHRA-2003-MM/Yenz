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
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      // Proxy Socket.IO polling (HTTP) AND websocket upgrade
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
        // Don't treat ECONNRESET as fatal — browser may close mid-handshake
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code !== 'ECONNRESET') {
              console.error('[socket.io proxy error]', err.message);
            }
          });
        }
      }
    }
  }
});

