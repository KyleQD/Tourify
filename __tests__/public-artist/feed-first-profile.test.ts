import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decodeFeedCursor, encodeFeedCursor } from '@/lib/feed/feed-cursor'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('public artist feed-first profile', () => {
  it('keeps cursor pagination opaque, stable, and validated', () => {
    const cursor = encodeFeedCursor(10)
    expect(cursor).not.toContain('10')
    expect(decodeFeedCursor(cursor)).toBe(10)
    expect(decodeFeedCursor(cursor)).toBe(10)
    expect(decodeFeedCursor('not-a-cursor')).toBeNull()
    expect(decodeFeedCursor(encodeFeedCursor(-5))).toBe(0)
  })

  it('separates pinned posts and paginates only unpinned posts', () => {
    const loader = read('lib/public-artist/get-public-artist-profile.ts')
    const api = read('app/api/feed/posts/route.ts')
    const query = read('lib/feed/feed-posts-query.ts')

    expect(loader).toContain('const pinnedPosts = postsPublic.filter(p => p.isPinned)')
    expect(loader).toContain('const posts = allUnpinnedPosts.slice(0, 10)')
    expect(loader).toContain('encodeFeedCursor(10)')
    expect(api).toContain("searchParams.get('exclude_pinned') === 'true'")
    expect(query).toContain("query.eq('is_pinned', false)")
  })

  it('uses feed, profile rail, and showcase zones while retaining section order', () => {
    const page = read('components/public-artist/public-artist-page.tsx')
    const styles = read('components/public-artist/artist-profile-theme.module.css')

    expect(page).toContain('data-artist-zone="feed"')
    expect(page).toContain('data-artist-zone="rail"')
    expect(page).toContain('data-artist-zone="showcase"')
    expect(page).toContain('profileAppearance?.sectionOrder.indexOf(section)')
    expect(styles).toContain('[data-artist-zone="feed"]')
  })

  it('resolves post styles and likes before rendering and isolates authored snapshots', () => {
    const loader = read('lib/public-artist/get-public-artist-profile.ts')
    const page = read('components/public-artist/public-artist-page.tsx')
    const styles = read('components/public-artist/artist-profile-theme.module.css')

    expect(loader).toContain('resolvePostStyleFlags')
    expect(loader).toContain("from('post_likes')")
    expect(page).toContain('enablePostStyles={Boolean(dto.postStylesRead)}')
    expect(styles).toContain('[data-post-appearance]')
    expect(styles).toContain('var(--post-card-text, var(--post-text))')
  })

  it('allows anonymous visitors through the parent artist layout', () => {
    const layout = read('app/artist/layout.tsx')
    expect(layout).toContain('if (!loaded) return <>{children}</>')
    expect(layout).not.toContain('redirect("/login?redirectTo=%2Fartist")')
  })
})
