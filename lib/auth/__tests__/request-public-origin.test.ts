import { afterEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { getRequestPublicOrigin } from '@/lib/auth/request-public-origin'

const savedEnv = { ...process.env }

afterEach(() => {
  process.env = { ...savedEnv }
})

describe('getRequestPublicOrigin', () => {
  it('uses the configured canonical origin instead of forwarded host input', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://tourify.app/'
    const request = new NextRequest('https://internal.example/auth/callback', {
      headers: {
        'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'https',
      },
    })

    expect(getRequestPublicOrigin(request)).toBe('https://tourify.app')
  })

  it('uses the request origin only for unconfigured local/test execution', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.VERCEL_URL
    process.env.NODE_ENV = 'test'

    expect(
      getRequestPublicOrigin(new NextRequest('http://localhost:4312/auth/callback')),
    ).toBe('http://localhost:4312')
  })
})
