import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      // 메아리(발명 공장) + 교차점(발견 공장) 두 제품을 한 사이트로 배포
      input: { main: resolve(import.meta.dirname, 'web/index.html'), fusion: resolve(import.meta.dirname, 'web/fusion.html') },
    },
  },
  test: { root: '.', include: ['tests/**/*.test.ts'], testTimeout: 60_000 },
} as any);
