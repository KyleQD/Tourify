import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('news articles category', () => {
  it('exposes Articles filter immediately after Featured', () => {
    const filters = read('components/news/news-filters.tsx')
    const featuredIndex = filters.indexOf("value: 'featured'")
    const articlesIndex = filters.indexOf("value: 'articles'")
    const newMusicIndex = filters.indexOf("value: 'new-music'")

    expect(articlesIndex).toBeGreaterThan(featuredIndex)
    expect(articlesIndex).toBeLessThan(newMusicIndex)
    expect(filters).toContain("label: 'Articles'")
  })

  it('normalizes articles category in the news feed API', () => {
    const route = read('app/api/news/feed/route.ts')
    expect(route).toContain("input === 'articles'")
  })

  it('loads published article and blog formats into news candidates', () => {
    const service = read('lib/news/feed-service.ts')
    expect(service).toContain(".in('format', ['article', 'blog'])")
    expect(service).toContain("category === 'articles'")
    expect(service).toContain("pressFormat === 'blog'")
  })

  it('gates feed fanout to blogs only in publishing', () => {
    const publishing = read('lib/blog/article-publishing.ts')
    expect(publishing).toContain('shouldSyncToFeed')
    expect(publishing).toContain("parsePressFormat(body.format, 'blog')")
  })
})
