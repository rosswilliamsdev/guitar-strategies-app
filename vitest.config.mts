import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // Only include unit tests from __tests__ directory
    // Explicitly exclude Playwright E2E tests in tests/ directory
    include: ['__tests__/**/*.test.ts'],

    // Exclude common non-test directories
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/tests/**', // Playwright E2E tests
      '**/playwright/**', // Playwright config/setup
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
