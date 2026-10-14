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
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true, // Listen on all network addresses (0.0.0.0) so phone can access dev server
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
