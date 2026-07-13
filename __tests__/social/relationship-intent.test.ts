import { describe, expect, it } from 'vitest'
import {
  isFollowableAccountType,
  isGeneralAccountType,
  normalizeDiscoverAccountType,
  resolveRelationshipKind,
} from '@/lib/social/relationship-intent'

describe('relationship-intent', () => {
  it('classifies followable persona account types', () => {
    expect(isFollowableAccountType('artist')).toBe(true)
    expect(isFollowableAccountType('venue')).toBe(true)
    expect(isFollowableAccountType('organizer')).toBe(true)
    expect(isFollowableAccountType('business')).toBe(true)
    expect(isFollowableAccountType('organization')).toBe(true)
    expect(isFollowableAccountType('general')).toBe(false)
  })

  it('classifies general account types', () => {
    expect(isGeneralAccountType('general')).toBe(true)
    expect(isGeneralAccountType('primary')).toBe(true)
    expect(isGeneralAccountType('artist')).toBe(false)
  })

  it('resolves follow vs friend kind from account type', () => {
    expect(resolveRelationshipKind({ targetAccountType: 'artist' })).toBe('follow')
    expect(resolveRelationshipKind({ targetAccountType: 'venue' })).toBe('follow')
    expect(resolveRelationshipKind({ targetAccountType: 'organizer' })).toBe('follow')
    expect(resolveRelationshipKind({ targetProfileAccountType: 'general' })).toBe('friend')
    expect(resolveRelationshipKind({ forceKind: 'friend', targetAccountType: 'artist' })).toBe('friend')
  })

  it('normalizes discover account types', () => {
    expect(normalizeDiscoverAccountType('organizer')).toBe('organization')
    expect(normalizeDiscoverAccountType('business')).toBe('organization')
    expect(normalizeDiscoverAccountType('artist')).toBe('artist')
    expect(normalizeDiscoverAccountType('primary')).toBe('general')
  })
})
