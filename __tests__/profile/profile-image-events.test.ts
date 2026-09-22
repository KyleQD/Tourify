import { describe, expect, it } from 'vitest'
import {
  resolveAppearanceImageField,
  resolveProfileCoverUrl,
} from '@/lib/profile/profile-image-events'

describe('resolveProfileCoverUrl', () => {
  it('prefers cover_image over metadata header_url', () => {
    expect(
      resolveProfileCoverUrl({
        cover_image: 'https://cdn.example/cover.jpg',
        metadata: { header_url: 'https://cdn.example/header.jpg' },
      })
    ).toBe('https://cdn.example/cover.jpg')
  })

  it('falls back to metadata.header_url', () => {
    expect(
      resolveProfileCoverUrl({
        cover_image: null,
        metadata: { header_url: 'https://cdn.example/header.jpg' },
      })
    ).toBe('https://cdn.example/header.jpg')
  })

  it('returns null when nothing is set', () => {
    expect(resolveProfileCoverUrl({})).toBeNull()
    expect(resolveProfileCoverUrl(null)).toBeNull()
  })
})

describe('resolveAppearanceImageField', () => {
  it('keeps existing cover when Save Appearance sends empty string', () => {
    expect(
      resolveAppearanceImageField('', 'https://cdn.example/cover.jpg')
    ).toBe('https://cdn.example/cover.jpg')
  })

  it('clears only on explicit null', () => {
    expect(
      resolveAppearanceImageField(null, 'https://cdn.example/cover.jpg')
    ).toBeNull()
  })

  it('keeps existing when field is omitted', () => {
    expect(
      resolveAppearanceImageField(undefined, 'https://cdn.example/cover.jpg')
    ).toBe('https://cdn.example/cover.jpg')
  })

  it('accepts a new non-empty URL', () => {
    expect(
      resolveAppearanceImageField(
        'https://cdn.example/new.jpg',
        'https://cdn.example/old.jpg'
      )
    ).toBe('https://cdn.example/new.jpg')
  })
})
