#!/usr/bin/env npx tsx

import assert from 'node:assert/strict'
import chalk from 'chalk'
import {
  appendQueryParamsToUri,
  buildSafeMobileRedirect,
  getSafeMobileRedirectBase
} from '@/lib/auth/mobile-redirect'

function runTest(name: string, testFn: () => void) {
  try {
    testFn()
    console.log(chalk.green('✓'), name)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(chalk.red('✗'), name)
    console.log(chalk.red(`  ${message}`))
    process.exitCode = 1
  }
}

function run() {
  console.log(chalk.cyan('Testing mobile redirect safety helpers'))

  runTest('allows custom app scheme redirect base', () => {
    assert.equal(getSafeMobileRedirectBase('tourify://discover'), 'tourify://discover')
    assert.equal(getSafeMobileRedirectBase('tourify://(tabs)/discover'), 'tourify://(tabs)/discover')
    assert.equal(getSafeMobileRedirectBase('TOURIFY://discover'), 'TOURIFY://discover')
    assert.equal(getSafeMobileRedirectBase('  tourify://discover  '), 'tourify://discover')
  })

  runTest('allows exact https tourify app host', () => {
    assert.equal(getSafeMobileRedirectBase('https://tourify.app/auth/callback'), 'https://tourify.app/auth/callback')
  })

  runTest('rejects lookalike https hosts and falls back', () => {
    assert.equal(getSafeMobileRedirectBase('https://tourify.app.evil.com/cb'), 'tourify://discover')
    assert.equal(getSafeMobileRedirectBase('https://evil.com/tourify.app'), 'tourify://discover')
  })

  runTest('rejects malformed URIs and falls back', () => {
    assert.equal(getSafeMobileRedirectBase('not a uri'), 'tourify://discover')
    assert.equal(getSafeMobileRedirectBase('javascript:alert(1)'), 'tourify://discover')
  })

  runTest('buildSafeMobileRedirect appends query params safely', () => {
    const redirect = buildSafeMobileRedirect('tourify://auth/callback?existing=1#step', {
      success: 'true',
      source: 'test'
    })
    assert.equal(redirect, 'tourify://auth/callback?existing=1&success=true&source=test#step')
  })

  runTest('appendQueryParamsToUri preserves existing hash/query', () => {
    const updated = appendQueryParamsToUri('tourify://discover?foo=bar#frag', {
      foo: 'baz',
      x: '1'
    })
    assert.equal(updated, 'tourify://discover?foo=baz&x=1#frag')
  })

  if (process.exitCode && process.exitCode !== 0) {
    console.log(chalk.red('\nMobile redirect helper tests failed'))
    return
  }

  console.log(chalk.green('\nAll mobile redirect helper tests passed'))
}

run()
