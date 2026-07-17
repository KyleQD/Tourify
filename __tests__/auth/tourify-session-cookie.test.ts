import { describe, expect, it } from 'vitest'
import { parseSessionFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

const session = {
  access_token: 'test-access-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: 'user-123',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'artist@example.com',
  },
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

describe('tourify auth session cookie parsing', () => {
  it('parses the single browser session cookie', () => {
    const cookie = `sb-tourify-auth-token=${encodeURIComponent(JSON.stringify(session))}`

    expect(parseSessionFromRequestCookieHeader(cookie)?.access_token).toBe('test-access-token')
  })

  it('reconstructs chunked Supabase SSR session cookies', () => {
    const encoded = encodeURIComponent(JSON.stringify(session))
    const midpoint = Math.floor(encoded.length / 2)
    const cookie = [
      `sb-tourify-auth-token.0=${encoded.slice(0, midpoint)}`,
      `sb-tourify-auth-token.1=${encoded.slice(midpoint)}`,
    ].join('; ')

    expect(parseSessionFromRequestCookieHeader(cookie)?.user.id).toBe('user-123')
  })

  it('decodes base64url Supabase SSR session cookies', () => {
    const cookie = `sb-tourify-auth-token=base64-${base64UrlEncode(JSON.stringify(session))}`

    expect(parseSessionFromRequestCookieHeader(cookie)?.access_token).toBe('test-access-token')
  })
})
