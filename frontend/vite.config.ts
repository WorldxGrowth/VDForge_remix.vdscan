import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['solc']
  },
  server: {
    port: 4011,
    host: true,
    allowedHosts: 'all',
    hmr: false,
  }
})
