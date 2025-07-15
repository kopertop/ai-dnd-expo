import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@/assets': resolve(__dirname, './assets'),
      '@/components': resolve(__dirname, './components'),
      '@/constants': resolve(__dirname, './constants'),
      '@/contexts': resolve(__dirname, './contexts'),
      '@/hooks': resolve(__dirname, './hooks'),
      '@/styles': resolve(__dirname, './styles'),
      '@/types': resolve(__dirname, './types'),
      '@/utils': resolve(__dirname, './utils'),
    },
  },
})