import { defineConfig } from 'vitest/config';

// Pure vesting/schema tests do not need the React transform plugin.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
