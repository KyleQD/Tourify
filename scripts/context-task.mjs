#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const args = process.argv.slice(2)
const value = (name, fallback = '') => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] ?? fallback : fallback
}
const has = (name) => args.includes(name)
const task = value('--task', 'unnamed-task')
const explicitPaths = []
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--paths') explicitPaths.push(...args.slice(i + 1).filter((item) => !item.startsWith('--')))
}

let files = explicitPaths
if (has('--changed')) {
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' })
  const status = execFileSync('git', ['status', '--short'], { encoding: 'utf8' })
  const untracked = status.split('\n').filter((line) => line.startsWith('?? ')).map((line) => line.slice(3))
  files = [...new Set([...files, ...changed.split('\n').filter(Boolean), ...untracked])]
}
if (files.length === 0) files = ['docs/DEVELOPMENT_WORKFLOW.md', 'package.json', 'tsconfig.json']

const packetPath = path.join(root, 'docs/work-packets', `${task}.md`)
const packet = fs.existsSync(packetPath)
  ? fs.readFileSync(packetPath, 'utf8')
  : 'No task packet exists yet. Create one from docs/work-packets/TEMPLATE.md.\n'

console.log(`# Context packet: ${task}`)
console.log(`\n## Task packet\n\n${packet.trim()}`)
console.log('\n## Repository instructions\n')
console.log(fs.readFileSync(path.join(root, 'docs/DEVELOPMENT_WORKFLOW.md'), 'utf8').trim())
console.log('\n## Requested files\n')
for (const relative of files.slice(0, 40)) {
  const full = path.resolve(root, relative)
  if (!full.startsWith(`${root}${path.sep}`) || !fs.existsSync(full) || !fs.statSync(full).isFile()) continue
  const text = fs.readFileSync(full, 'utf8')
  console.log(`\n### ${relative}\n\n${text.slice(0, 12000)}`)
}
if (files.length > 40) console.log(`\n[context capped at 40 files; ${files.length - 40} omitted]`)
