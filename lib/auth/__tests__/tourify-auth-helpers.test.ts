import { describe, expect, it } from 'vitest'
import { normalizePostLoginRedirect } from '@/lib/auth/tourify-auth-helpers'

describe('normalizePostLoginRedirect', () => {
  it.each([
    ['https://evil.example/steal', '/dashboard'],
    ['//evil.example/steal', '/dashboard'],
    ['/\\evil.example/steal', '/dashboard'],
    ['/auth/callback?code=secret', '/dashboard'],
    ['/api/account/delete', '/dashboard'],
    ['/login?redirectTo=/settings', '/dashboard'],
    ['/debug/session', '/dashboard'],
  ])('rejects unsafe auth redirect %s', (target, expected) => {
    expect(normalizePostLoginRedirect(target)).toBe(expected)
  })

  it('preserves a safe internal path, query, and fragment', () => {
    expect(normalizePostLoginRedirect('/tickets/invite/token?step=2#confirm')).toBe(
      '/tickets/invite/token?step=2#confirm',
    )
  })
})
