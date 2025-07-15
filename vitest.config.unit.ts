/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.unit.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'tests/e2e/**',
      'tests/integration/**',
      'tests/performance/**',
      'tests/accessibility/**',
      'node_modules/**',
      'dist/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/node_modules/**',
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
})
