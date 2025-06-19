// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
 server: {
    port: 5174,
    host: '0.0.0.0', // Wichtig: Erlaubt Zugriff von anderen IPs
    strictPort: true,
    hmr: {
      port: 5174,
      host: '10.254.64.14' // or your actual IP if needed
    }

  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react']
        }
      }
    }
  },
  preview: {
    port: 4173,
    host: true
  }
})
