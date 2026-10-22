import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // The Motoko compiler (motoko npm package) takes a few seconds to load.
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/lib/risk.ts', 'src/lib/fusion.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
