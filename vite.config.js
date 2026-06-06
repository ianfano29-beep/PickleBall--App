import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Disable source maps to prevent people from reading the original code
    sourcemap: false,
    // Ensure the code is minified/obfuscated
    minify: 'esbuild',
    // Remove console logs in production
    esbuild: {
      drop: ['console', 'debugger'],
    }
  }
})