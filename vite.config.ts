import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: './',
  build: { outDir: '../dist', emptyOutDir: true },
  test: { root: '.', include: ['tests/**/*.test.ts'], testTimeout: 60_000 },
} as any);
