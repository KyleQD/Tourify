#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const roots = ['app', 'components', 'hooks', 'lib']
const ignoredDirs = new Set(['.next', 'node_modules', '.git', 'coverage'])
const extensions = new Set(['.ts', '.tsx'])

const signals = [
  { label: 'fetch()', pattern: /\bfetch\s*\(/g },
  { label: "cache: 'no-store'", pattern: /cache\s*:\s*['"]no-store['"]/g },
  { label: "dynamic = 'force-dynamic'", pattern: /dynamic\s*=\s*['"]force-dynamic['"]/g },
  { label: 'Supabase .from()', pattern: /\.from\s*\(/g },
  { label: 'useEffect fetch/load', pattern: /useEffect\s*\([\s\S]{0,600}(fetch|load[A-Z]\w*)/g },
]

function walk(dir, files = []) {
  let entries = []
  try {
    entries = readdirSync(dir)
  } catch {
    return files
  }

  for (const entry of entries) {
    if (ignoredDirs.has(entry)) continue
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      walk(path, files)
    } else if (extensions.has(path.slice(path.lastIndexOf('.')))) {
      files.push(path)
    }
  }

  return files
}

const files = roots.flatMap((root) => walk(root))
const totals = new Map(signals.map((signal) => [signal.label, 0]))
const hotspots = []

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  let score = 0

  for (const signal of signals) {
    const count = source.match(signal.pattern)?.length || 0
    totals.set(signal.label, totals.get(signal.label) + count)
    score += count
  }

  if (score > 0) hotspots.push({ file, score })
}

console.log('Data loading audit')
console.log('==================')
console.log(`Files scanned: ${files.length}`)

console.log('\nSignals:')
for (const [label, count] of totals.entries()) {
  console.log(`  ${label}: ${count}`)
}

console.log('\nTop hotspots:')
for (const hotspot of hotspots.sort((a, b) => b.score - a.score).slice(0, 20)) {
  console.log(`  ${hotspot.score.toString().padStart(3, ' ')}  ${hotspot.file}`)
}
