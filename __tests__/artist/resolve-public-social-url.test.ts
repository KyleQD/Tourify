import { describe, expect, it } from 'vitest'
import {
  listPublicSocialLinks,
  resolvePublicSocialUrl,
} from '@/lib/artist/resolve-public-social-url'

describe('resolvePublicSocialUrl', () => {
  it('passes through full URLs', () => {
    expect(resolvePublicSocialUrl('instagram', 'https://instagram.com/x')).toBe('https://instagram.com/x')
  })

  it('maps handles to platform URLs', () => {
    expect(resolvePublicSocialUrl('instagram', '@artist')).toBe('https://instagram.com/artist')
    expect(resolvePublicSocialUrl('tiktok', 'creator')).toBe('https://tiktok.com/@creator')
    expect(resolvePublicSocialUrl('apple_music', 'artist/123')).toContain('music.apple.com')
  })

  it('lists canonical public links', () => {
    const links = listPublicSocialLinks({
      instagram: 'artist',
      tiktok: '@tk',
      facebook: 'page',
      empty: '',
    })
    expect(links.map(l => l.platform)).toEqual(['instagram', 'tiktok', 'facebook'])
    expect(links[0].url).toContain('instagram.com/artist')
  })
})
