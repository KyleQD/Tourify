#!/usr/bin/env npx tsx

import assert from 'node:assert/strict'
import chalk from 'chalk'
import { buildSafeMobileRedirect } from '@/lib/auth/mobile-redirect'

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

function parseQueryFromUri(uri: string) {
  const queryPart = uri.split('?', 2)[1] || ''
  const queryWithoutHash = queryPart.split('#', 1)[0]
  return new URLSearchParams(queryWithoutHash)
}

function run() {
  console.log(chalk.cyan('Testing auth/mobile callback redirect payloads'))

  runTest('social auth redirect keeps deep link and includes success+next', () => {
    const redirect = buildSafeMobileRedirect('tourify://auth/callback', {
      success: 'true',
      next: '/dashboard'
    })
    assert.ok(redirect.startsWith('tourify://auth/callback?'))
    const params = parseQueryFromUri(redirect)
    assert.equal(params.get('success'), 'true')
    assert.equal(params.get('next'), '/dashboard')
  })

  runTest('email callback redirect can include success+type', () => {
    const redirect = buildSafeMobileRedirect('tourify://auth/callback', {
      success: 'true',
      type: 'signup'
    })
    const params = parseQueryFromUri(redirect)
    assert.equal(params.get('success'), 'true')
    assert.equal(params.get('type'), 'signup')
  })

  runTest('payment callback redirect can include payment state identifiers', () => {
    const redirect = buildSafeMobileRedirect('tourify://bookings', {
      payment_success: 'true',
      booking_id: 'booking-123',
      session_id: 'sess-123'
    })
    const params = parseQueryFromUri(redirect)
    assert.equal(params.get('payment_success'), 'true')
    assert.equal(params.get('booking_id'), 'booking-123')
    assert.equal(params.get('session_id'), 'sess-123')
  })

  runTest('invalid redirect uri falls back to safe app deep link', () => {
    const redirect = buildSafeMobileRedirect('https://tourify.app.evil.com/redirect', {
      success: 'true'
    })
    assert.ok(redirect.startsWith('tourify://discover?'))
  })

  runTest('existing query values are preserved and merged', () => {
    const redirect = buildSafeMobileRedirect('tourify://discover?entry=push', {
      success: 'true'
    })
    const params = parseQueryFromUri(redirect)
    assert.equal(params.get('entry'), 'push')
    assert.equal(params.get('success'), 'true')
  })

  if (process.exitCode && process.exitCode !== 0) {
    console.log(chalk.red('\nAuth callback redirect tests failed'))
    return
  }

  console.log(chalk.green('\nAll auth callback redirect tests passed'))
}

run()
