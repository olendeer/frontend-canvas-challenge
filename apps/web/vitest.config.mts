import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const src = (folder: string) => resolve(import.meta.dirname, 'src', folder);

export default defineConfig({
  resolve: {
    alias: {
      core: src('core'),
      data: src('data'),
      domain: src('domain'),
      features: src('features'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
  },
});
