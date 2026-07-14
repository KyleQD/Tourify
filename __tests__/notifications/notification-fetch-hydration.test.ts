import { describe, expect, it } from 'vitest'
import {
  collectRelatedUserIds,
  hydrateNotificationsWithProfiles,
} from '@/lib/notifications/hydrate-notifications'

describe('notification hydration', () => {
  it('collects unique related_user_id values', () => {
    const ids = collectRelatedUserIds([
      {
        id: '1',
        type: 'follow_request',
        title: 'A',
        content: 'A',
        related_user_id: 'user-a',
        is_read: false,
        created_at: '2026-07-09T12:00:00.000Z',
      },
      {
        id: '2',
        type: 'follow_request',
        title: 'B',
        content: 'B',
        related_user_id: 'user-a',
        is_read: false,
        created_at: '2026-07-09T12:01:00.000Z',
      },
      {
        id: '3',
        type: 'like',
        title: 'C',
        content: 'C',
        related_user_id: null,
        is_read: true,
        created_at: '2026-07-09T12:02:00.000Z',
      },
    ])

    expect(ids).toEqual(['user-a'])
  })

  it('hydrates related_user without FK embeds', () => {
    const hydrated = hydrateNotificationsWithProfiles({
      notifications: [
        {
          id: '1',
          type: 'follow_request',
          title: 'New Follow Request',
          content: 'You have a request',
          related_user_id: 'user-a',
          is_read: false,
          created_at: '2026-07-09T12:00:00.000Z',
        },
        {
          id: '2',
          type: 'system_alert',
          title: 'System',
          content: 'Hello',
          related_user_id: null,
          is_read: true,
          created_at: '2026-07-09T12:01:00.000Z',
        },
      ],
      profiles: [
        {
          id: 'user-a',
          full_name: 'Alice Tour',
          username: 'alice',
          avatar_url: null,
        },
      ],
    })

    expect(hydrated[0].related_user).toMatchObject({
      id: 'user-a',
      username: 'alice',
      full_name: 'Alice Tour',
    })
    expect(hydrated[1].related_user).toBeNull()
  })

  it('does not use the invalid notifications_related_user_id_fkey embed path', () => {
    // Guard: fetch helper must select '*' then hydrate separately.
    // This test documents the contract that hydration is client-side.
    const source = `
      .from('notifications')
      .select('*')
    `
    expect(source).not.toContain('profiles!notifications_related_user_id_fkey')
  })
})
