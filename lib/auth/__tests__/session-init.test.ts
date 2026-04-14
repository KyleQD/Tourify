import { isSessionCheckTimeout } from '@/lib/auth/session-init'

describe('session-init helpers', () => {
  it('detects timeout marker', () => {
    expect(isSessionCheckTimeout(new Error('SESSION_CHECK_TIMEOUT'))).toBe(true)
    expect(isSessionCheckTimeout(new Error('other'))).toBe(false)
    expect(isSessionCheckTimeout('x')).toBe(false)
  })
})
