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
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
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
