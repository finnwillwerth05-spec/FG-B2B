import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // e2e specs are Playwright, not Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'e2e/**'],
  },
});
