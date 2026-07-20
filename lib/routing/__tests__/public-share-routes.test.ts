import { isPublicShareRoute } from '@/lib/routing/public-share-routes'

describe('isPublicShareRoute', () => {
  it('allows anonymous music verify passport/certificate/origin paths', () => {
    expect(isPublicShareRoute('/music/verify/passport/abc123')).toBe(true)
    expect(isPublicShareRoute('/music/verify/certificate/abc123')).toBe(true)
    expect(isPublicShareRoute('/music/verify/origin/abc123')).toBe(true)
  })

  it('allows public post share pages', () => {
    expect(isPublicShareRoute('/posts/11111111-1111-1111-1111-111111111111')).toBe(true)
    expect(isPublicShareRoute('/posts/some-post-slug')).toBe(true)
  })

  it('does not treat the music hub itself as a public share route', () => {
    expect(isPublicShareRoute('/music')).toBe(false)
    expect(isPublicShareRoute('/music/library')).toBe(false)
  })
})
