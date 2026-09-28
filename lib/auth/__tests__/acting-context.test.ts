import { describe, expect, it } from 'vitest'
import { verifyActingProfileAccess } from '@/lib/auth/acting-context'

function mockSupabase(rows: Record<string, unknown>) {
  return {
    from(table: string) {
      const query: Record<string, unknown> = {}
      query.select = () => query
      query.eq = () => query
      query.maybeSingle = async () => ({ data: rows[table] ?? null, error: null })
      return query
    },
  }
}

describe('verifyActingProfileAccess', () => {
  it('rejects another user as a general persona', async () => {
    await expect(
      verifyActingProfileAccess({}, 'user-a', 'user-b', 'general'),
    ).resolves.toEqual({ owned: false })
  })

  it('rejects a foreign artist without delegated access', async () => {
    await expect(
      verifyActingProfileAccess(
        mockSupabase({ artist_profiles: null, account_relationships: null }),
        'user-a',
        'artist-b',
        'artist',
      ),
    ).resolves.toEqual({ owned: false })
  })

  it('accepts only the artist row bound to the authenticated user', async () => {
    await expect(
      verifyActingProfileAccess(
        mockSupabase({ artist_profiles: { id: 'artist-a' } }),
        'user-a',
        'artist-a',
        'artist',
      ),
    ).resolves.toEqual({ owned: true })
  })
})
