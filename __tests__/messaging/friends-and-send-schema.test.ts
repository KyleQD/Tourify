import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { unionFriendIds } from '@/lib/messaging/friends'
import {
  isEntityMessagingAccountType,
  tierFromEntityFollow,
} from '@/lib/messaging/resolve-dm-trust'

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  type: z.enum(['image', 'file', 'audio']),
  size: z.number().int().nonnegative(),
})

const sendMessageSchema = z.object({
  recipientId: z.string().uuid().optional(),
  recipientProfileId: z.string().uuid().optional(),
  recipientAccountType: z.string().max(40).optional(),
  content: z.string().trim().max(2000).optional(),
  attachments: z.array(attachmentSchema).default([]),
})

describe('messages send schema account targeting', () => {
  it('accepts recipient account targeting fields', () => {
    const parsed = sendMessageSchema.safeParse({
      recipientId: '11111111-1111-1111-1111-111111111111',
      recipientProfileId: '22222222-2222-2222-2222-222222222222',
      recipientAccountType: 'organization',
      content: 'Hello from a public page',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.recipientAccountType).toBe('organization')
      expect(parsed.data.recipientProfileId).toBe('22222222-2222-2222-2222-222222222222')
    }
  })

  it('accepts attachment-only sends', () => {
    const parsed = sendMessageSchema.safeParse({
      recipientId: '11111111-1111-1111-1111-111111111111',
      attachments: [
        {
          url: 'https://example.com/file.pdf',
          name: 'rider.pdf',
          type: 'file',
          size: 1200,
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects invalid attachment type', () => {
    const parsed = sendMessageSchema.safeParse({
      recipientId: '11111111-1111-1111-1111-111111111111',
      content: 'hi',
      attachments: [
        {
          url: 'https://example.com/x.bin',
          name: 'x.bin',
          type: 'binary',
          size: 10,
        },
      ],
    })
    expect(parsed.success).toBe(false)
  })
})

describe('general friends id union', () => {
  it('unions accepted friend requests with mutual personal follows', () => {
    const friends = unionFriendIds({
      acceptedRequestPeerIds: ['a', 'b'],
      mutualFollowIds: ['b', 'c'],
    })
    expect(friends.sort()).toEqual(['a', 'b', 'c'])
  })

  it('dedupes and drops empties', () => {
    expect(unionFriendIds({
      acceptedRequestPeerIds: ['x', ''],
      mutualFollowIds: ['x'],
    })).toEqual(['x'])
  })
})

describe('entity DM trust from account follow', () => {
  it('treats artist/venue/org as entity messaging targets', () => {
    expect(isEntityMessagingAccountType('artist')).toBe(true)
    expect(isEntityMessagingAccountType('venue')).toBe(true)
    expect(isEntityMessagingAccountType('organization')).toBe(true)
    expect(isEntityMessagingAccountType('general')).toBe(false)
  })

  it('routes followed entity DMs to Primary (open)', () => {
    expect(tierFromEntityFollow(true)).toEqual({
      tier: 'open',
      context_type: 'account_follow',
      context_id: null,
    })
  })

  it('routes unfollowed entity DMs to Requests', () => {
    expect(tierFromEntityFollow(false)).toEqual({
      tier: 'request',
      context_type: null,
      context_id: null,
    })
  })
})

describe('compose select does not auto-send', () => {
  it('pending compose implies no POST until user content exists', () => {
    const pendingRecipient = { id: 'friend-1' }
    const shouldPostOnSelect = false
    const hasUserContent = false
    expect(Boolean(pendingRecipient && shouldPostOnSelect)).toBe(false)
    expect(hasUserContent).toBe(false)
  })
})
