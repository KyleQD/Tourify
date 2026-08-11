import { describe, expect, it, vi } from 'vitest'
import {
  applyNotificationAccountScope,
  applyNotificationAccountScopes,
  buildGeneralInboxOrFilter,
  buildNotificationAccountScopesOrFilter,
  notificationMatchesAccountScope,
  resolveNotificationInboxKind,
} from '@/lib/notifications/account-scope'
import {
  entityNotificationTarget,
  generalNotificationTarget,
} from '@/lib/notifications/notification-target'

describe('notification account scope', () => {
  it('resolves personal inbox for general and missing entity', () => {
    expect(resolveNotificationInboxKind({ accountType: 'general', targetProfileId: 'user-1' })).toBe(
      'general'
    )
    expect(resolveNotificationInboxKind({ accountType: 'organization', targetProfileId: null })).toBe(
      'general'
    )
  })

  it('resolves entity inbox for org/artist/venue with profile id', () => {
    expect(
      resolveNotificationInboxKind({
        accountType: 'organization',
        targetProfileId: 'org-1',
      })
    ).toBe('entity')
    expect(
      resolveNotificationInboxKind({
        accountType: 'admin',
        targetProfileId: 'org-1',
      })
    ).toBe('entity')
  })

  it('builds a personal or-filter that includes legacy nulls', () => {
    const filter = buildGeneralInboxOrFilter('user-1')
    expect(filter).toContain('target_account_type.eq.general')
    expect(filter).toContain('target_profile_id.is.null')
    expect(filter).toContain('target_profile_id.eq.user-1')
  })

  it('applies strict entity eq without null bleed', () => {
    const eq = vi.fn(function (this: unknown) {
      return this
    })
    const or = vi.fn(function (this: unknown) {
      return this
    })
    const query = { eq, or }

    applyNotificationAccountScope(query as any, {
      userId: 'user-1',
      accountType: 'organization',
      targetProfileId: 'org-1',
    })

    expect(eq).toHaveBeenCalledWith('target_profile_id', 'org-1')
    expect(or).not.toHaveBeenCalled()
  })

  it('applies personal or-filter for general account', () => {
    const eq = vi.fn(function (this: unknown) {
      return this
    })
    const or = vi.fn(function (this: unknown) {
      return this
    })
    const query = { eq, or }

    applyNotificationAccountScope(query as any, {
      userId: 'user-1',
      accountType: 'general',
      targetProfileId: 'user-1',
    })

    expect(or).toHaveBeenCalledWith(buildGeneralInboxOrFilter('user-1'))
    expect(eq).not.toHaveBeenCalled()
  })

  it('combines personal and owned entity targets in one database filter', () => {
    const filter = buildNotificationAccountScopesOrFilter('user-1', [
      { userId: 'user-1', accountType: 'general', targetProfileId: 'user-1' },
      { userId: 'user-1', accountType: 'artist', targetProfileId: 'artist-1' },
      { userId: 'user-1', accountType: 'venue', targetProfileId: 'venue-1' },
      { userId: 'user-1', accountType: 'venue', targetProfileId: 'venue-1' },
    ])

    expect(filter).toContain('target_account_type.eq.general')
    expect(filter).toContain('target_profile_id.eq.user-1')
    expect(filter).toContain('target_profile_id.in.(artist-1,venue-1)')
  })

  it('applies combined scopes with a single or-filter', () => {
    const or = vi.fn(function (this: unknown) {
      return this
    })
    const query = { or }
    const scopes = [
      { userId: 'user-1', accountType: 'general', targetProfileId: 'user-1' },
      { userId: 'user-1', accountType: 'organization', targetProfileId: 'org-1' },
    ]

    applyNotificationAccountScopes(query as any, 'user-1', scopes)

    expect(or).toHaveBeenCalledWith(buildNotificationAccountScopesOrFilter('user-1', scopes))
  })

  it('matches legacy personal rows and exact entity rows client-side', () => {
    const generalScope = { userId: 'user-1', accountType: 'general', targetProfileId: 'user-1' }
    const orgScope = { userId: 'user-1', accountType: 'organization', targetProfileId: 'org-1' }

    expect(notificationMatchesAccountScope({ target_profile_id: null }, generalScope)).toBe(true)
    expect(notificationMatchesAccountScope({
      target_profile_id: 'org-1',
      target_account_type: 'organization',
    }, orgScope)).toBe(true)
    expect(notificationMatchesAccountScope({
      target_profile_id: 'org-2',
      target_account_type: 'organization',
    }, orgScope)).toBe(false)
  })
})

describe('notification target helpers', () => {
  it('tags personal recipients as general', () => {
    expect(generalNotificationTarget('user-1')).toEqual({
      targetProfileId: 'user-1',
      targetAccountType: 'general',
    })
  })

  it('maps employer entities onto account types', () => {
    expect(
      entityNotificationTarget({
        entityType: 'organization',
        entityId: 'org-1',
        fallbackUserId: 'user-1',
      })
    ).toEqual({
      targetProfileId: 'org-1',
      targetAccountType: 'organization',
    })

    expect(
      entityNotificationTarget({
        entityType: 'venue',
        entityId: 'venue-1',
        fallbackUserId: 'user-1',
      })
    ).toEqual({
      targetProfileId: 'venue-1',
      targetAccountType: 'venue',
    })
  })

  it('falls back to general when entity id is missing', () => {
    expect(
      entityNotificationTarget({
        entityType: 'organization',
        entityId: null,
        fallbackUserId: 'user-1',
      })
    ).toEqual({
      targetProfileId: 'user-1',
      targetAccountType: 'general',
    })
  })
})
