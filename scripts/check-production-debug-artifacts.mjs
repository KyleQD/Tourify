import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = resolve(process.cwd())
const forbiddenPatterns = [
  '127.0.0.1:7556',
  'localhost:7556',
  '#region agent log',
]
const searchGlobs = [
  'app',
  'components',
  'hooks',
  'lib',
  'next.config.ts',
]

const files = execFileSync('git', ['ls-files', ...searchGlobs], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .filter(file => /\.(tsx?|jsx?|mjs|cjs)$/.test(file))

const failures = []
for (const file of files) {
  const contents = readFileSync(resolve(root, file), 'utf8')
  for (const pattern of forbiddenPatterns) {
    if (contents.includes(pattern)) {
      failures.push(`${relative(root, resolve(root, file))}: contains ${pattern}`)
    }
  }
}

if (failures.length > 0) {
  console.error('Production debug artifact check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Production client debug artifact check passed.')
