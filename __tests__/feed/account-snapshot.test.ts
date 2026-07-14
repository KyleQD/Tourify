import { describe, expect, it } from 'vitest'

import { getAccountAuthor } from '@/lib/accounts/account-author'
import {
  resolveAccountAuthorSnapshot,
  resolveAccountAuthorSnapshotsBatch,
} from '@/lib/accounts/acting-account-snapshot'

class FakeSingleQuery {
  private selectedColumns = ''
  private id: string | null = null
  private ids: string[] | null = null

  constructor(
    private readonly table: string,
    private readonly rows: Record<string, Record<string, any>>
  ) {}

  select(columns: string) {
    this.selectedColumns = columns
    return this
  }

  eq(column: string, value: string) {
    if (column === 'id') this.id = value
    return this
  }

  in(column: string, values: string[]) {
    if (column === 'id') this.ids = values
    return this
  }

  maybeSingle() {
    if (this.selectedColumns !== '*') {
      return Promise.resolve({
        data: null,
        error: {
          code: 'PGRST204',
          message: "Could not find one of the requested columns in the schema cache",
        },
      })
    }

    return Promise.resolve({
      data: this.id ? this.rows[this.id] ?? null : null,
      error: null,
    })
  }

  then(resolve: (value: { data: any; error: null }) => unknown, reject?: (reason?: unknown) => unknown) {
    if (this.selectedColumns !== '*') {
      return Promise.resolve({
        data: null,
        error: {
          code: 'PGRST204',
          message: "Could not find one of the requested columns in the schema cache",
        },
      }).then(resolve as any, reject)
    }

    const data = this.ids
      ? this.ids.map((id) => this.rows[id]).filter(Boolean)
      : this.id
        ? [this.rows[this.id]].filter(Boolean)
        : Object.values(this.rows)

    return Promise.resolve({ data, error: null }).then(resolve, reject)
  }
}

class FakeSupabase {
  constructor(private readonly tables: Record<string, Record<string, Record<string, any>>>) {}

  from(table: string) {
    return new FakeSingleQuery(table, this.tables[table] || {})
  }
}

describe('account author snapshots', () => {
  it('reads venue account names without depending on optional columns', async () => {
    const supabase = new FakeSupabase({
      venue_profiles: {
        'venue-1': {
          id: 'venue-1',
          venue_name: 'The Blue Room',
          url_slug: 'the-blue-room',
        },
      },
    })

    await expect(
      resolveAccountAuthorSnapshot({
        supabase,
        accountType: 'venue',
        profileId: 'venue-1',
        userId: 'owner-1',
      })
    ).resolves.toMatchObject({
      id: 'venue-1',
      type: 'venue',
      name: 'The Blue Room',
      username: 'the-blue-room',
    })
  })

  it('batch-resolves authors with one lookup per entity table', async () => {
    const supabase = new FakeSupabase({
      artist_profiles: {
        'artist-1': {
          id: 'artist-1',
          artist_name: 'Nova',
          url_slug: 'nova',
        },
      },
      venue_profiles: {
        'venue-1': {
          id: 'venue-1',
          venue_name: 'The Blue Room',
          url_slug: 'the-blue-room',
        },
      },
      profiles: {
        'user-1': {
          id: 'user-1',
          full_name: 'Alex',
          username: 'alex',
        },
      },
    })

    const authors = await resolveAccountAuthorSnapshotsBatch(supabase, [
      'artist:artist-1:owner-1',
      'venue:venue-1:owner-2',
      'general:user-1:user-1',
    ])

    expect(authors.get('artist:artist-1:owner-1')).toMatchObject({
      id: 'artist-1',
      type: 'artist',
      name: 'Nova',
      username: 'nova',
    })
    expect(authors.get('venue:venue-1:owner-2')).toMatchObject({
      id: 'venue-1',
      type: 'venue',
      name: 'The Blue Room',
      username: 'the-blue-room',
    })
    expect(authors.get('general:user-1:user-1')).toMatchObject({
      id: 'user-1',
      type: 'general',
      name: 'Alex',
      username: 'alex',
    })
  })

  it('uses resolved author data before old generic cached names', () => {
    expect(
      getAccountAuthor({
        user_id: 'owner-1',
        posted_as_profile_id: 'venue-1',
        posted_as_type: 'venue',
        account_display_name: 'Community Member',
        account_username: 'community-member',
        resolved_author: {
          id: 'venue-1',
          type: 'venue',
          name: 'The Blue Room',
          username: 'the-blue-room',
          avatarUrl: null,
          isVerified: false,
        },
      })
    ).toEqual({
      id: 'venue-1',
      type: 'venue',
      name: 'The Blue Room',
      username: 'the-blue-room',
      avatarUrl: null,
      isVerified: false,
    })
  })
})
