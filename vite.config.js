import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        // Host를 바꾸지 않아야 POST의 Origin 검사(CORS)가 통과한다
        changeOrigin: false,
      },
    },
  },
})