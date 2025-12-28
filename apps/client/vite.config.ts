import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@imposter/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react'],
          'vendor-utils': ['zustand', 'socket.io-client', 'i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-supabase': ['@supabase/supabase-js'],
        }
      }
    },
    // Increase limit slightly since we've already split the vendors
    chunkSizeWarningLimit: 550,
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
})
