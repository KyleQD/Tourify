import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const CLIENT_ROOTS = ['app', 'components', 'contexts', 'hooks', 'lib']
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
const FORBIDDEN_PATTERNS = [
  { label: 'localhost debug ingest URL', pattern: /https?:\/\/(?:127\.0\.0\.1|localhost):7556\/ingest\b/ },
  { label: '127.0.0.1:7556 debug endpoint', pattern: /127\.0\.0\.1:7556/ },
  { label: 'agent log region marker', pattern: /#region agent log/ },
]

async function walk(dir, files = []) {
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return files
    throw error
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue
      await walk(fullPath, files)
      continue
    }

    if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

const files = (
  await Promise.all(CLIENT_ROOTS.map((root) => walk(path.join(ROOT, root))))
).flat()

const failures = []

for (const file of files) {
  const source = await readFile(file, 'utf8')
  for (const forbidden of FORBIDDEN_PATTERNS) {
    if (forbidden.pattern.test(source)) {
      failures.push(`${path.relative(ROOT, file)} contains ${forbidden.label}`)
    }
  }
}

if (failures.length > 0) {
  console.error('Production client debug artifact check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Production client debug artifact check passed.')
