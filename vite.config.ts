import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose to network/container
  },
  // @ts-ignore - Vitest types are detected automatically in test runner
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    css: false,
  },
});