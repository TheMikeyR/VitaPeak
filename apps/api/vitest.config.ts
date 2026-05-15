import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e-spec.ts', 'test/unit/**/*.spec.ts'],
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
    maxWorkers: 1,
    minWorkers: 1,
  },
});
