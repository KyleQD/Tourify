import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Restricted test discovery for draft Work 2.0 foundation only.
// Does not change Tourify's default Vitest include paths or release pipeline.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'lib/work/**/__tests__/**/*.test.ts',
      'app/api/work/v1/opportunities/__tests__/**/*.test.ts',
      'app/api/admin/work/employer-reviews/__tests__/**/*.test.ts',
      'app/api/admin/work/hiring-entitlements/__tests__/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
