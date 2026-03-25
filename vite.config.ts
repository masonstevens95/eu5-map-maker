import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      include: ['src/lib/**'],
      exclude: ['src/lib/types.ts', 'src/lib/index.ts', 'src/lib/__tests__/**'],
    },
  },
})
