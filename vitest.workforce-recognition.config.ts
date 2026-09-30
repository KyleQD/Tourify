import { defineConfig } from 'vitest/config'
import path from 'node:path'
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: { environment: 'node', include: ['__tests__/achievements/workforce-recognition*.test.ts', '__tests__/hiring/live-event-role-catalog.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
