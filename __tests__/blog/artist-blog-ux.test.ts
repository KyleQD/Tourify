import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('artist press UX / integration', () => {
  it('gates list loading on artist and acting readiness to avoid infinite skeletons', () => {
    const page = read('app/artist/press/page.tsx')

    expect(page).toContain('isLoading: isArtistLoading')
    expect(page).toContain('isActingReady')
    expect(page).toContain('if (isArtistLoading) return')
    expect(page).toContain('if (!user)')
    expect(page).toContain('setIsLoading(false)')
    expect(page).toContain('showSkeletons')
    expect(page).toContain('<Suspense')
  })

  it('supports deep links for new, edit, and status filters', () => {
    const page = read('app/artist/press/page.tsx')

    expect(page).toContain("searchParams.get('new') === '1'")
    expect(page).toContain("searchParams.get('edit')")
    expect(page).toContain('syncStatusToUrl')
    expect(page).toContain('Clear filters')
    expect(page).toContain('Content Hub')
    expect(page).toContain('href="/artist/content"')
    expect(page).toContain('refreshStats')
    expect(page).toContain("label: 'View live'")
    expect(page).toContain('Filter by title')
    expect(page).toContain('totalShares')
    expect(page).not.toContain('Search posts...')
    expect(page).not.toContain('<SelectItem value="scheduled">')
    expect(page).not.toContain('<SelectItem value="archived">')
  })

  it('presents a management library with aggregate analytics and desktop rows', () => {
    const page = read('app/artist/press/page.tsx')

    expect(page).toContain('Manage blogs, articles, and press releases you authored')
    expect(page).toContain('totalShares')
    expect(page).toContain('post.stats?.shares')
    expect(page).toContain('<table')
    expect(page).toContain('PressRowActions')
  })

  it('adds editor parity markers from the public composer', () => {
    const editor = read('app/artist/press/press-editor.tsx')

    expect(editor).toContain('isActingReady')
    expect(editor).toContain('Preparing account')
    expect(editor).toContain('isPreview')
    expect(editor).toContain('Preview Mode')
    expect(editor).toContain('insertMarkdown')
    expect(editor).toContain('artist-blog-content')
    expect(editor).toContain('CATEGORY_OPTIONS')
    expect(editor).toContain('Title must be at least 5 characters')
    expect(editor).toContain('Content must be at least 50 characters')
    expect(editor).toContain('showTrackAttach')
    expect(editor).toContain("label: 'View live'")
    expect(editor).toContain('Posted as')
    expect(editor).not.toContain("prompt('Paste a track ID")
    expect(editor).not.toContain('<SelectItem value="scheduled">')
  })

  it('wires Press into sidebar Create & Publish navigation', () => {
    const sidebar = read('components/app-sidebar.tsx')

    expect(sidebar).toContain("name: 'Press'")
    expect(sidebar).toContain("href: '/artist/press'")
    expect(sidebar).toContain('BookOpen')
  })

  it('wires Press into mobile Create & Publish navigation', () => {
    const mobile = read('components/artist/mobile-artist-nav.tsx')

    expect(mobile).toContain("label: 'Press'")
    expect(mobile).toContain("href: '/artist/press'")
  })

  it('routes Content Hub write actions into the in-shell create flow', () => {
    const hub = read('app/artist/content/page.tsx')

    expect(hub).toContain('/artist/press?new=1')
    expect(hub).toContain('published')
    expect(hub).toContain('blogDrafts')
  })

  it('redirects orphan press id drafts into the edit deep link', () => {
    const orphan = read('app/artist/press/[id]/page.tsx')

    expect(orphan).toContain('isActingReady')
    expect(orphan).toContain('router.replace(`/blog/${data.article.slug}`)')
    expect(orphan).toContain('`/artist/press?edit=${encodeURIComponent(id)}`')
  })

  it('redirects legacy blog routes to press', () => {
    const blogPage = read('app/artist/features/blog/page.tsx')
    const blogId = read('app/artist/features/blog/[id]/page.tsx')

    expect(blogPage).toContain("redirect(suffix ? `/artist/press?${suffix}` : '/artist/press')")
    expect(blogId).toContain("redirect(`/artist/press/${id}`)")
  })

  it('points dashboard write CTA at artist press create', () => {
    const dashboard = read('components/dashboard/dashboard-page-client.tsx')

    expect(dashboard).toContain("router.push('/artist/press?new=1')")
    expect(dashboard).toContain("currentAccount?.account_type === 'artist' && currentAccount.is_active")
  })
})
