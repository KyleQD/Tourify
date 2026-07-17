let computeEPKQuality: typeof import('./epk.service').computeEPKQuality
let createEpkSlug: typeof import('./epk.service').createEpkSlug
let epkService: typeof import('./epk.service').epkService
let resolveEpkSlugCandidate: typeof import('./epk.service').resolveEpkSlugCandidate

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'

  const epkModule = await import('./epk.service')
  computeEPKQuality = epkModule.computeEPKQuality
  createEpkSlug = epkModule.createEpkSlug
  epkService = epkModule.epkService
  resolveEpkSlugCandidate = epkModule.resolveEpkSlugCandidate
})

describe('epk service helpers', () => {
  it('builds deterministic URL-safe slugs', () => {
    expect(createEpkSlug('DJ Nøva  Live!')).toBe('dj-nva-live')
    expect(createEpkSlug('  The   Midnight  Set  ')).toBe('the-midnight-set')
  })

  it('generates a unique slug when the artist-name slug is already taken', async () => {
    const ownerBySlug: Record<string, string> = {
      'tourify-artist': 'other-user',
      'tourify-artist-2': 'other-user',
    }

    await expect(
      resolveEpkSlugCandidate({
        userId: 'current-user',
        artistName: 'Tourify Artist',
        lookupOwnerBySlug: async (slug) => ownerBySlug[slug] ?? null,
      })
    ).resolves.toBe('tourify-artist-3')
  })

  it('keeps the current artist slug when it already belongs to the artist', async () => {
    await expect(
      resolveEpkSlugCandidate({
        userId: 'current-user',
        inputSlug: 'tourify-artist',
        artistName: 'Tourify Artist',
        existingSlug: 'tourify-artist',
        lookupOwnerBySlug: async () => 'current-user',
      })
    ).resolves.toBe('tourify-artist')
  })

  it('preserves an existing saved slug during normal saves even when the client sends a stale artist slug', async () => {
    const lookupOwnerBySlug = jest.fn(async (slug: string) =>
      slug === 'tourify-artist' ? 'other-user' : 'current-user'
    )

    await expect(
      resolveEpkSlugCandidate({
        userId: 'current-user',
        inputSlug: 'tourify-artist',
        artistName: 'Tourify Artist',
        existingSlug: 'tourify-artist-2',
        lookupOwnerBySlug,
      })
    ).resolves.toBe('tourify-artist-2')

    expect(lookupOwnerBySlug).not.toHaveBeenCalled()
  })

  it('allows an explicit manual slug change when the new slug is available', async () => {
    await expect(
      resolveEpkSlugCandidate({
        userId: 'current-user',
        inputSlug: 'new-press-kit',
        artistName: 'Tourify Artist',
        existingSlug: 'tourify-artist-2',
        slugUpdateMode: 'manual',
        lookupOwnerBySlug: async () => null,
      })
    ).resolves.toBe('new-press-kit')
  })

  it('rejects a custom slug that belongs to another artist', async () => {
    await expect(
      resolveEpkSlugCandidate({
        userId: 'current-user',
        inputSlug: 'custom-press-kit',
        artistName: 'Tourify Artist',
        lookupOwnerBySlug: async () => 'other-user',
      })
    ).rejects.toMatchObject({
      code: 'epk_slug_conflict',
      status: 409,
    })
  })

  it('treats artist profile ids as the slug owner key for scoped EPKs', async () => {
    await expect(
      resolveEpkSlugCandidate({
        userId: 'artist-profile-one',
        inputSlug: 'shared-login-act',
        artistName: 'Shared Login Act',
        existingSlug: 'shared-login-act',
        lookupOwnerBySlug: async () => 'artist-profile-one',
      })
    ).resolves.toBe('shared-login-act')

    await expect(
      resolveEpkSlugCandidate({
        userId: 'artist-profile-one',
        inputSlug: 'shared-login-act',
        artistName: 'Shared Login Act',
        lookupOwnerBySlug: async () => 'artist-profile-two',
      })
    ).rejects.toMatchObject({
      code: 'epk_slug_conflict',
      status: 409,
    })
  })

  it('returns a 422 save failure for invalid EPK appearance colors', async () => {
    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows' },
    })
    const eq = jest.fn().mockReturnValue({ single })
    const select = jest.fn().mockReturnValue({ eq })
    const db = {
      from: jest.fn().mockReturnValue({ select }),
    }

    const result = await epkService.saveEPKData(
      'current-user',
      {
        artistName: 'Tourify Artist',
        epkAppearance: {
          accentHex: 'red',
        } as any,
      },
      db as any
    )

    expect(result).toMatchObject({
      success: false,
      code: 'invalid_epk_appearance',
      status: 422,
    })
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
