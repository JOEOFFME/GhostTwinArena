import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the Vite dev-server proxies every /api/* (and all backend routes)
// to the FastAPI backend running on port 8000, so there are zero CORS issues.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All backend API routes — proxy to FastAPI
      '/legends': { target: 'http://localhost:8000', changeOrigin: true },
      '/match': { target: 'http://localhost:8000', changeOrigin: true },
      '/match-state': { target: 'http://localhost:8000', changeOrigin: true },
      '/simulate': { target: 'http://localhost:8000', changeOrigin: true },
      '/react': { target: 'http://localhost:8000', changeOrigin: true },
      '/chat': { target: 'http://localhost:8000', changeOrigin: true },
      '/prediction': { target: 'http://localhost:8000', changeOrigin: true },
      '/leaderboard': { target: 'http://localhost:8000', changeOrigin: true },
      '/quiz': { target: 'http://localhost:8000', changeOrigin: true },
      '/what-he-said': { target: 'http://localhost:8000', changeOrigin: true },
      '/wallet': { target: 'http://localhost:8000', changeOrigin: true },
      '/twin-pass': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/static': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});