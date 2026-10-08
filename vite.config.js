import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  build: {
    // Separar dependencias pesadas en chunks propios para mejor cacheo
    // y para que no bloqueen el render inicial.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react-vendor';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('gsap')) return 'gsap';
          if (id.includes('@supabase')) return 'supabase';
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  plugins: [
    react(),
  ],
})
