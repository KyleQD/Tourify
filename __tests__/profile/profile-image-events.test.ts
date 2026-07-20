import { describe, expect, it } from 'vitest'
import { resolveProfileCoverUrl } from '@/lib/profile/profile-image-events'

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
