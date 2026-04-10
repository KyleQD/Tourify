import { createConnectSessionToken, verifyConnectSessionToken } from '@/lib/connect/connect-session-token'

describe('connect session token utilities', () => {
  beforeEach(() => {
    process.env.CONNECT_SESSION_SECRET = 'unit-test-secret'
  })

  it('creates and verifies a valid token', () => {
    const result = createConnectSessionToken({
      sharerUserId: '11111111-1111-1111-1111-111111111111',
      expiresInSeconds: 120,
      oneTimeClaim: true,
    })

    const verification = verifyConnectSessionToken(result.token)

    expect(verification.errorCode).toBeNull()
    expect(verification.payload).not.toBeNull()
    expect(verification.payload?.sharerUserId).toBe('11111111-1111-1111-1111-111111111111')
    expect(verification.payload?.sessionId).toBe(result.payload.sessionId)
  })

  it('rejects a tampered token', () => {
    const result = createConnectSessionToken({
      sharerUserId: '22222222-2222-2222-2222-222222222222',
      expiresInSeconds: 120,
    })
    const tamperedToken = `${result.token.slice(0, -1)}x`

    const verification = verifyConnectSessionToken(tamperedToken)

    expect(verification.payload).toBeNull()
    expect(verification.errorCode).toBe('invalid_token_signature')
  })

  it('rejects an expired token', () => {
    const result = createConnectSessionToken({
      sharerUserId: '33333333-3333-3333-3333-333333333333',
      expiresInSeconds: -1,
    })

    const verification = verifyConnectSessionToken(result.token)

    expect(verification.payload).toBeNull()
    expect(verification.errorCode).toBe('token_expired')
  })
})
