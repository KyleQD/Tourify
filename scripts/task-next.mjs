#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const directory = path.join(process.cwd(), 'docs/work-packets')
if (!fs.existsSync(directory)) process.exit(0)
for (const file of fs.readdirSync(directory).filter((item) => item.endsWith('.md') && item !== 'TEMPLATE.md').sort()) {
  const text = fs.readFileSync(path.join(directory, file), 'utf8')
  const status = text.match(/Owner\/status:\s*`([^`]+)`/)?.[1] ?? 'unknown'
  if (!['done', 'completed'].includes(status.toLowerCase())) console.log(`${file.replace(/\.md$/, '')}\t${status}`)
}
