import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/contact-form': 'https://photo-backend-5gnqa1tvp-ayos-projects-9c5c5522.vercel.app',
      '/newsletter': 'https://photo-backend-5gnqa1tvp-ayos-projects-9c5c5522.vercel.app',
      '/upload-photos': 'https://photo-backend-5gnqa1tvp-ayos-projects-9c5c5522.vercel.app',
      '/gallery': 'https://photo-backend-5gnqa1tvp-ayos-projects-9c5c5522.vercel.app'
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  define: {
    'process.env': {} // Prevents Vite from crashing on process.env in frontend
  }
});