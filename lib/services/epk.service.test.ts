let computeEPKQuality: typeof import('./epk.service').computeEPKQuality
let createEpkSlug: typeof import('./epk.service').createEpkSlug

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'

  const epkModule = await import('./epk.service')
  computeEPKQuality = epkModule.computeEPKQuality
  createEpkSlug = epkModule.createEpkSlug
})

describe('epk service helpers', () => {
  it('builds deterministic URL-safe slugs', () => {
    expect(createEpkSlug('DJ Nøva  Live!')).toBe('dj-nva-live')
    expect(createEpkSlug('  The   Midnight  Set  ')).toBe('the-midnight-set')
  })

  it('scores complete one-page EPKs highly', () => {
    const result = computeEPKQuality({
      artistName: 'Tourify Artist',
      bio: 'A'.repeat(220),
      musicCount: 4,
      photoCount: 6,
      hasPress: true,
      hasBookingEmail: true,
      hasOneLiner: true
    })

    expect(result.score).toBe(100)
    expect(result.missing).toEqual([])
  })

  it('returns missing checklist items for incomplete EPKs', () => {
    const result = computeEPKQuality({
      artistName: '',
      bio: 'Short bio',
      musicCount: 1,
      photoCount: 1,
      hasPress: false,
      hasBookingEmail: false,
      hasOneLiner: false
    })

    expect(result.score).toBeLessThan(50)
    expect(result.missing).toContain('artist name')
    expect(result.missing).toContain('at least 3 tracks')
    expect(result.missing).toContain('booking contact')
  })
})
