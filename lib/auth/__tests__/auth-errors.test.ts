import { isEmailNotConfirmedAuthError, mapAuthError } from '@/lib/auth-errors'

describe('isEmailNotConfirmedAuthError', () => {
  it('detects Supabase-style email not confirmed', () => {
    expect(isEmailNotConfirmedAuthError('Email not confirmed')).toBe(true)
    expect(isEmailNotConfirmedAuthError(new Error('Email not confirmed'))).toBe(true)
  })

  it('detects friendly rewrite from AuthProvider', () => {
    expect(
      isEmailNotConfirmedAuthError(
        'Confirm your email before signing in. Check your inbox and spam folder, or tap “Resend verification email” in the dialog.',
      ),
    ).toBe(true)
  })

  it('does not treat invalid credentials as unverified', () => {
    expect(isEmailNotConfirmedAuthError('Invalid login credentials')).toBe(false)
    expect(isEmailNotConfirmedAuthError('Invalid email or password')).toBe(false)
  })
})

describe('mapAuthError', () => {
  it('maps email not confirmed before invalid-credentials heuristics', () => {
    const info = mapAuthError('Email not confirmed')
    expect(info.message).toBe('Email not confirmed')
    expect(info.severity).toBe('warning')
  })

  it('maps invalid login credentials to invalid password copy', () => {
    const info = mapAuthError('Invalid login credentials')
    expect(info.message).toBe('Invalid email or password')
    expect(info.severity).toBe('error')
  })
})
