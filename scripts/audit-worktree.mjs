#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

const status = git(['status', '--short', '--untracked-files=all'])
const rows = status ? status.split('\n') : []
const buckets = new Map()

for (const row of rows) {
  const state = row.slice(0, 2).trim() || '??'
  buckets.set(state, (buckets.get(state) || 0) + 1)
}

const generatedPatterns = [
  '.DS_Store',
  '.cursor/debug-',
  'test-results/',
  'audit-artifacts/',
]

const generated = rows.filter((row) =>
  generatedPatterns.some((pattern) => row.includes(pattern))
)

console.log('Worktree audit')
console.log('==============')
console.log(`Dirty entries: ${rows.length}`)

if (buckets.size) {
  console.log('\nBy state:')
  for (const [state, count] of [...buckets.entries()].sort()) {
    console.log(`  ${state}: ${count}`)
  }
}

if (generated.length) {
  console.log('\nGenerated/local artifact candidates:')
  for (const row of generated) console.log(`  ${row}`)
} else {
  console.log('\nGenerated/local artifact candidates: none')
}

const untracked = rows.filter((row) => row.startsWith('?? '))
if (untracked.length) {
  console.log('\nUntracked files:')
  for (const row of untracked) console.log(`  ${row.slice(3)}`)
}
