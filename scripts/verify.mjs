#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const tier = args[0] ?? 'fast'
const changedOnly = args.includes('--changed')

const run = (command, commandArgs = []) => {
  console.log(`\n[verify:${tier}] ${command} ${commandArgs.join(' ')}`)
  execFileSync(command, commandArgs, { stdio: 'inherit', env: process.env })
}

const changed = changedOnly
  ? (() => {
      const diff = execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' }).split('\n').filter(Boolean)
      const status = execFileSync('git', ['status', '--short'], { encoding: 'utf8' })
      const untracked = status.split('\n').filter((line) => line.startsWith('?? ')).map((line) => line.slice(3))
      return [...new Set([...diff, ...untracked])]
    })()
  : []
const has = (pattern) => changed.some((file) => pattern.test(file))
const sourceFiles = changed.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))

if (tier === 'fast') {
  if (sourceFiles.length) run('npx', ['eslint', ...sourceFiles])
  if (has(/(__tests__|\.test\.|\.spec\.)/)) run('npm', ['run', 'test:unit', '--', ...changed.filter((file) => /(__tests__|\.test\.|\.spec\.)/.test(file))])
  if (has(/^supabase\/migrations\//)) run('npm', ['run', 'check:migration-validation'])
  if (has(/(^|\/)(admin|components\/admin|app\/admin)\//)) run('npm', ['run', 'check:admin-route-registry'])
  console.log('\nFast verification complete. Full typecheck/build is intentionally deferred.')
  process.exit(0)
}

if (tier === 'feature') {
  if (changedOnly && sourceFiles.length) run('npx', ['eslint', ...sourceFiles])
  run('npm', ['run', 'typecheck'])
  if (has(/supabase\/migrations\//)) {
    run('npm', ['run', 'check:migration-validation'])
    run('npm', ['run', 'check:supabase-target'])
  }
  if (has(/(^|\/)(admin|components\/admin|app\/admin)\//)) {
    run('npm', ['run', 'check:admin-route-registry'])
    run('npm', ['run', 'check:admin-audit'])
    run('npx', ['vitest', 'run', '__tests__/admin'])
  }
  if (has(/^apps\/mobile\//)) run('npm', ['run', 'mobile:verify'])
  console.log('\nFeature verification complete.')
  process.exit(0)
}

if (tier === 'release') {
  run('npm', ['run', 'check:toolchain'])
  run('npm', ['run', 'check:peer-deps'])
  run('npm', ['run', 'lint'])
  run('npm', ['run', 'typecheck'])
  run('npm', ['run', 'test:unit'])
  run('npm', ['run', 'check:migration-validation'])
  run('npm', ['run', 'check:admin-route-registry'])
  run('npm', ['run', 'check:service-role-allowlist'])
  run('npm', ['run', 'check:admin-audit'])
  run('npm', ['run', 'check:production-debug'])
  run('npm', ['run', 'build:vercel'])
  console.log('\nRelease verification complete.')
  process.exit(0)
}

console.error(`Unknown verification tier: ${tier}. Use fast, feature, or release.`)
process.exit(1)
