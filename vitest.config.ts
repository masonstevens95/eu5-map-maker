import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      include: ['src/**'],
      exclude: [
        'src/lib/types.ts',
        'src/lib/index.ts',
        'src/lib/__tests__/**',
        'src/lib/melt.ts',
        'src/lib/eu5-tokens.json',
        'src/main.tsx',
        'src/test-setup.ts',
        'src/App.tsx',
        'src/App.css',
      ],
    },
  },
})
