import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { normalizePostLoginRedirect } from '@/lib/auth/tourify-auth-helpers'
import {
  buildOrderClaimRedirectUrl,
  buildOrderCleanUrl,
  buildOrderClaimLoginHref,
} from '@/lib/marketplace/order-claim'

const ORDER_PAGE_PATH = join(process.cwd(), 'app/marketplace/order/[token]/page.tsx')
const TOKEN = 'a'.repeat(64)

function readOrderPageSource() {
  return readFileSync(ORDER_PAGE_PATH, 'utf8')
}

describe('guest order claim CTA link contract', () => {
  it('does not link to dead /auth/sign-in or /auth/sign-up routes', () => {
    const source = readOrderPageSource()
    expect(source).not.toMatch(/\/auth\/sign-in/)
    expect(source).not.toMatch(/\/auth\/sign-up/)
  })

  it('renders the claim trigger for paid guest orders', () => {
    const source = readOrderPageSource()
    expect(source).toContain('GuestOrderClaim')
    expect(source).toContain('{isGuest && isPaid && <GuestOrderClaim token={token} />}')
  })

  it('builds the canonical /login portal hrefs with an order claim redirect', () => {
    const signUpHref = buildOrderClaimLoginHref(TOKEN, 'signup')
    const signInHref = buildOrderClaimLoginHref(TOKEN, 'signin')

    expect(signUpHref.startsWith('/login?tab=signup&redirectTo=')).toBe(true)
    expect(signInHref.startsWith('/login?tab=signin&redirectTo=')).toBe(true)

    const redirectTo = decodeURIComponent(signUpHref.split('redirectTo=')[1])
    expect(redirectTo).toBe(buildOrderClaimRedirectUrl(TOKEN))
    expect(buildOrderClaimRedirectUrl(TOKEN)).toBe(`/marketplace/order/${TOKEN}?claim=1`)
    expect(buildOrderCleanUrl(TOKEN)).toBe(`/marketplace/order/${TOKEN}`)
  })

  it('allows the claim redirect through the canonical post-login redirect normalization', () => {
    const redirectTo = buildOrderClaimRedirectUrl(TOKEN)
    expect(normalizePostLoginRedirect(redirectTo)).toBe(redirectTo)
    expect(normalizePostLoginRedirect(buildOrderCleanUrl(TOKEN))).toBe(buildOrderCleanUrl(TOKEN))
  })

  it('never points the portal at an auth/ or api/ redirect target', () => {
    // The portal denies these prefixes; keep the claim flow honest.
    expect(normalizePostLoginRedirect('/auth/sign-in')).toBe('/dashboard')
    expect(normalizePostLoginRedirect('/auth/sign-up')).toBe('/dashboard')
    expect(normalizePostLoginRedirect('/api/marketplace/order/x/claim')).toBe('/dashboard')
  })
})