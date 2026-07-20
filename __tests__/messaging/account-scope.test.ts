import { describe, expect, it } from 'vitest'
import {
  applyConversationAccountScope,
  buildAccountAwareConversationPairFilter,
  buildConversationInboxOrFilter,
  conversationBelongsToInbox,
  resolveMessagingInboxKind,
  resolveSenderAccountSide,
} from '@/lib/messaging/account-scope'
import {
  buildAttachmentStoragePath,
  inferAttachmentType,
  isAllowedAttachmentMime,
} from '@/lib/messaging/attachments'

describe('messaging account scope', () => {
  it('resolves general vs entity inbox kinds', () => {
    expect(resolveMessagingInboxKind({ accountType: 'general', profileId: 'u1' })).toBe('general')
    expect(resolveMessagingInboxKind({ accountType: 'artist', profileId: 'a1' })).toBe('entity')
    expect(resolveMessagingInboxKind({ accountType: 'artist', profileId: null })).toBe('general')
  })

  it('builds general inbox filter covering null and general tags', () => {
    const filter = buildConversationInboxOrFilter({ userId: 'user-1', accountType: 'general' })
    expect(filter).toContain('participant_1.eq.user-1')
    expect(filter).toContain('participant_1_account_type.eq.general')
    expect(filter).toContain('participant_1_account_type.is.null')
    expect(filter).toContain('participant_2.eq.user-1')
  })

  it('builds entity inbox filter by profile id', () => {
    const filter = buildConversationInboxOrFilter({
      userId: 'user-1',
      accountType: 'organization',
      profileId: 'org-9',
    })
    expect(filter).toBe(
      'and(participant_1.eq.user-1,participant_1_profile_id.eq.org-9),and(participant_2.eq.user-1,participant_2_profile_id.eq.org-9)',
    )
  })

  it('applies inbox scope via query.or', () => {
    const calls: string[] = []
    const query = {
      or(filters: string) {
        calls.push(filters)
        return query
      },
    }
    applyConversationAccountScope(query, {
      userId: 'user-1',
      accountType: 'venue',
      profileId: 'venue-2',
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('participant_1_profile_id.eq.venue-2')
  })

  it('matches conversations to the correct inbox side', () => {
    const conversation = {
      participant_1: 'user-a',
      participant_2: 'user-b',
      participant_1_profile_id: 'user-a',
      participant_1_account_type: 'general',
      participant_2_profile_id: 'artist-1',
      participant_2_account_type: 'artist',
    }

    expect(
      conversationBelongsToInbox(conversation, {
        userId: 'user-b',
        accountType: 'artist',
        profileId: 'artist-1',
      }),
    ).toBe(true)

    expect(
      conversationBelongsToInbox(conversation, {
        userId: 'user-b',
        accountType: 'general',
        profileId: 'user-b',
      }),
    ).toBe(false)

    expect(
      conversationBelongsToInbox(conversation, {
        userId: 'user-a',
        accountType: 'general',
        profileId: 'user-a',
      }),
    ).toBe(true)
  })

  it('builds account-aware conversation pair filters both directions', () => {
    const filter = buildAccountAwareConversationPairFilter({
      senderId: 's1',
      recipientId: 'r1',
      senderProfileId: 's1',
      recipientProfileId: 'artist-9',
    })
    expect(filter).toContain('participant_1.eq.s1')
    expect(filter).toContain('participant_2_profile_id.eq.artist-9')
    expect(filter).toContain('participant_1.eq.r1')
  })

  it('resolves sender account side defaults for general', () => {
    expect(resolveSenderAccountSide({ userId: 'u1', accountType: 'general' })).toEqual({
      profileId: 'u1',
      accountType: 'general',
    })
    expect(
      resolveSenderAccountSide({ userId: 'u1', accountType: 'artist', profileId: 'a1' }),
    ).toEqual({
      profileId: 'a1',
      accountType: 'artist',
    })
  })
})

describe('messaging attachments helpers', () => {
  it('infers attachment types from mime', () => {
    expect(inferAttachmentType('image/png')).toBe('image')
    expect(inferAttachmentType('audio/mpeg')).toBe('audio')
    expect(inferAttachmentType('application/pdf')).toBe('file')
  })

  it('allows common image and document mimes', () => {
    expect(isAllowedAttachmentMime('image/jpeg')).toBe(true)
    expect(isAllowedAttachmentMime('application/pdf')).toBe(true)
    expect(isAllowedAttachmentMime('application/zip')).toBe(false)
  })

  it('builds a safe storage path', () => {
    const path = buildAttachmentStoragePath({
      userId: 'user-1',
      threadKey: 'thread-a',
      fileName: 'My File (1).PDF',
    })
    expect(path.startsWith('user-1/thread-a/')).toBe(true)
    expect(path).toContain('My_File__1_.PDF')
  })
})
