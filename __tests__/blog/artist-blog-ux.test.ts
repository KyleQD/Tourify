import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('artist blog UX / integration', () => {
  it('gates list loading on artist and acting readiness to avoid infinite skeletons', () => {
    const page = read('app/artist/features/blog/page.tsx')

    expect(page).toContain('isLoading: isArtistLoading')
    expect(page).toContain('isActingReady')
    expect(page).toContain('if (isArtistLoading) return')
    expect(page).toContain('if (!user)')
    expect(page).toContain('setIsLoading(false)')
    expect(page).toContain('showSkeletons')
    expect(page).toContain('<Suspense')
  })

  it('supports deep links for new, edit, and status filters', () => {
    const page = read('app/artist/features/blog/page.tsx')

    expect(page).toContain("searchParams.get('new') === '1'")
    expect(page).toContain("searchParams.get('edit')")
    expect(page).toContain('syncStatusToUrl')
    expect(page).toContain('Clear filters')
    expect(page).toContain('Content Hub')
    expect(page).toContain('href="/artist/content"')
    expect(page).toContain('refreshStats')
    expect(page).toContain("label: 'View live'")
    expect(page).not.toContain('<SelectItem value="scheduled">')
    expect(page).not.toContain('<SelectItem value="archived">')
  })

  it('adds editor parity markers from the public composer', () => {
    const editor = read('app/artist/features/blog/blog-editor.tsx')

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

  it('wires Blog into sidebar Create & Publish navigation', () => {
    const sidebar = read('components/app-sidebar.tsx')

    expect(sidebar).toContain("name: 'Blog'")
    expect(sidebar).toContain("href: '/artist/features/blog'")
    expect(sidebar).toContain('BookOpen')
  })

  it('routes Content Hub write actions into the in-shell create flow', () => {
    const hub = read('app/artist/content/page.tsx')

    expect(hub).toContain('/artist/features/blog?new=1')
    expect(hub).toContain('published')
    expect(hub).toContain('blogDrafts')
  })

  it('redirects orphan blog id drafts into the edit deep link', () => {
    const orphan = read('app/artist/features/blog/[id]/page.tsx')

    expect(orphan).toContain('isActingReady')
    expect(orphan).toContain('router.replace(`/blog/${data.article.slug}`)')
    expect(orphan).toContain('`/artist/features/blog?edit=${encodeURIComponent(id)}`')
  })

  it('points dashboard write-article CTA at artist blog create', () => {
    const dashboard = read('components/dashboard/dashboard-page-client.tsx')

    expect(dashboard).toContain("router.push('/artist/features/blog?new=1')")
  })
})
