import { isPublicNewsRoute } from '@/lib/routing/public-news-routes'

describe('public News route allowlist', () => {
  it.each([
    '/news',
    '/news/',
    '/news/latest',
    '/news/music',
    '/news/community',
    '/news/story/festival-update',
    '/news/topic/live-events',
    '/news/author/editor',
    '/news/source/publication',
  ])('permits anonymous public news route %s', pathname => {
    expect(isPublicNewsRoute(pathname)).toBe(true)
  })

  it.each([
    '/news/admin',
    '/news/editor',
    '/news/drafts',
    '/news/review/queue',
    '/news/story',
    '/news/story/id/edit',
    '/newsroom',
    '/admin/news',
    '/NEWS',
    '/settings',
  ])('does not permit anonymous restricted or unrelated route %s', pathname => {
    expect(isPublicNewsRoute(pathname)).toBe(false)
  })
})
