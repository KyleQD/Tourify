#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const args = process.argv.slice(2)
const index = args.indexOf('--task')
const task = index >= 0 ? args[index + 1] : undefined
const directory = path.join(root, 'docs/work-packets')
const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter((file) => file.endsWith('.md') && file !== 'TEMPLATE.md').sort() : []

if (task) {
  const file = path.join(directory, `${task}.md`)
  if (!fs.existsSync(file)) {
    console.error(`No work packet found for ${task}`)
    process.exitCode = 1
  } else {
    console.log(fs.readFileSync(file, 'utf8'))
  }
} else if (files.length === 0) {
  console.log('No work packets found. Create one from docs/work-packets/TEMPLATE.md.')
} else {
  for (const file of files) {
    const text = fs.readFileSync(path.join(directory, file), 'utf8')
    const status = text.match(/Owner\/status:\s*`([^`]+)`/)?.[1] ?? 'unknown'
    console.log(`${file.replace(/\.md$/, '')}\t${status}`)
  }
}
