import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'delivery-react': ['react', 'react-dom', 'react-router-dom'],
          'delivery-maps': ['leaflet', 'react-leaflet'],
          'delivery-icons': ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 5176,
    host: true, // Listen on all network addresses
    proxy: {
      '/api': {
        target: 'https://yenz-mviu.onrender.com',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'https://yenz-mviu.onrender.com',
        changeOrigin: true,
        secure: false,
        ws: true,
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
