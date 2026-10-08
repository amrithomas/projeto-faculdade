import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite acesso de fora do container Docker
    port: 5173,
    strictPort: true,
    // Bind mount do Windows não dispara eventos de arquivo dentro do container.
    watch: { usePolling: true },
  },
})
