/**
 * VEN-267/268/272/273/277 — integration security suite: signed OAuth state
 * (tamper/expiry/actor-binding), safe DTO guarantees, catalog honesty and
 * Stripe separation.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createSignedOAuthState, verifySignedOAuthState } from '@/lib/admin/content-hub/oauth-state'
import { getProviderCatalog, isKnownProvider, STRIPE_SEPARATION_NOTE } from '@/lib/integrations/provider-catalog'

const USER = '11111111-1111-1111-1111-111111111111'

beforeAll(() => {
  // Deterministic signing secret for the suite (dev fallback path).
  process.env.MARKETPLACE_INTEGRATION_SECRET ||= 'test-integration-secret'
})

describe('signed OAuth state (VEN-268)', () => {
  it('round-trips a valid state bound to the initiating actor', () => {
    const { state } = createSignedOAuthState({ userId: USER, platform: 'instagram', codeVerifier: 'v'.repeat(43) })
    const verified = verifySignedOAuthState(state, USER)
    expect(verified).not.toBeNull()
    expect(verified!.platform).toBe('instagram')
    expect(verified!.codeVerifier).toHaveLength(43)
  })

  it('rejects tampered payloads', () => {
    const { state } = createSignedOAuthState({ userId: USER, platform: 'tiktok' })
    const [body] = state.split('.')
    const forgedBody = Buffer.from(JSON.stringify({ nonce: 'x', userId: USER, platform: 'youtube', issuedAt: Date.now() })).toString('base64url')
    const tampered = `${forgedBody}.${state.split('.')[1]}`
    expect(tampered).not.toBe(state)
    void body
    expect(verifySignedOAuthState(tampered, USER)).toBeNull()
  })

  it('binds the state to the initiating user — no actor swap', () => {
    const { state } = createSignedOAuthState({ userId: USER, platform: 'facebook' })
    const otherUser = '22222222-2222-2222-2222-222222222222'
    expect(verifySignedOAuthState(state, otherUser)).toBeNull()
  })

  it('rejects expired states', () => {
    const { state } = createSignedOAuthState({ userId: USER, platform: 'twitter' })
    // Forge a validly-signed payload with an old issuedAt using the same helper internals:
    const [body, sig] = state.split('.')
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    parsed.issuedAt = Date.now() - 11 * 60 * 1000 // beyond the 10-minute TTL
    const reb = Buffer.from(JSON.stringify(parsed), 'utf8').toString('base64url')
    // Re-sign with the known test secret to isolate expiry logic from signature logic.
    const { createHmac } = require('crypto') as typeof import('crypto')
    const sig2 = createHmac('sha256', process.env.MARKETPLACE_INTEGRATION_SECRET!).update(reb).digest('base64url')
    expect(verifySignedOAuthState(`${reb}.${sig2}`, USER)).toBeNull()
  })

  it('rejects unsigned legacy states', () => {
    const legacy = Buffer.from(JSON.stringify({ nonce: 'abc', userId: USER, platform: 'instagram' })).toString('base64url')
    expect(verifySignedOAuthState(legacy, USER)).toBeNull()
  })

  it('platform mismatch fails verification', () => {
    const { state } = createSignedOAuthState({ userId: USER, platform: 'youtube' })
    expect(verifySignedOAuthState(state, USER, 'tiktok')).toBeNull()
  })
})

describe('provider catalog (VEN-264/272)', () => {
  it('reports env readiness without leaking values', () => {
    const catalog = getProviderCatalog()
    expect(catalog.length).toBeGreaterThanOrEqual(5)
    for (const entry of catalog) {
      expect(Object.keys(entry)).not.toContain('secret')
      expect(entry.missing_env.every((key) => /^[A-Z0-9_]+$/.test(key))).toBe(true)
      // Capability honesty: every declared capability is an explicit boolean.
      for (const value of Object.values(entry.capabilities)) {
        expect(typeof value).toBe('boolean')
      }
    }
  })

  it('knows only real providers', () => {
    expect(isKnownProvider('instagram')).toBe(true)
    expect(isKnownProvider('eventbrite')).toBe(false) // the deleted demo provider
    expect(isKnownProvider('spotify')).toBe(false)
  })
})

describe('Stripe separation (VEN-273)', () => {
  it('Stripe is not part of the integrations catalog', () => {
    const providers = getProviderCatalog().map((p) => p.provider.toLowerCase())
    expect(providers).not.toContain('stripe')
    expect(STRIPE_SEPARATION_NOTE).toMatch(/finance/i)
  })
})
