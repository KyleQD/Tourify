/**
 * Regression guards for the CodeQL news-surface sanitize cluster
 * (security decision DISC-XSS-001, alerts #40, #41, #42, #43, #45, #46).
 *
 * Every alert in this cluster had the same root cause: a **regex tag strip
 * followed by an entity decode**. Stripping `<[^>]*>` and then turning
 * `&lt;`/`&gt;` back into `<`/`>` reintroduces the markup delimiters the strip
 * was supposed to remove, so the function is unsound as a sanitizer
 * (`js/double-escaping`); two sites decoded only a fixed entity subset, which
 * `js/incomplete-multi-character-sanitization` also flags.
 *
 * The root-cause fix is `toPlainText` in `lib/news/text-sanitize.ts`: decode
 * ONCE in a semicolon-terminated pass, strip second, then remove any residual
 * `<` / `>`. This suite pins that every call site in the cluster now goes
 * through it, and — load-bearing — that the strip-then-decode ordering has not
 * been reintroduced anywhere.
 *
 * These are source assertions, not behavioural ones, because four of the five
 * surfaces are route handlers and a client component that cannot be invoked
 * without standing up a request/React environment. The behaviour itself is
 * pinned in `__tests__/news/text-sanitize.test.ts`.
 *
 * IMPORTANT: none of this confirms a GitHub code-scanning alert as closed.
 * GitHub Advanced Security has no local engine; a registry disposition is not a
 * dismissal, and a local code fix is not a re-scan. Only a hosted re-scan on the
 * PR can move an alert's state.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Comments are stripped before every source assertion, because each fixed file
 * documents the removed pattern in prose. A guard that matched the prose would
 * be a guard that could never pass.
 */
function code(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    // `:` before the slashes keeps `https://` inside a string literal intact.
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/**
 * The defect shape itself, independent of naming: any `.replace(/&lt;…/g, '<')`
 * or `.replace(/&#8217;/…)` style literal decode, which no correct ordering can
 * contain because `toPlainText` owns entity decoding in one regex pass.
 */
const LITERAL_ENTITY_DECODE = /\.replace\(\s*\/&(?:lt|gt|amp|nbsp|quot|#\d+);/i

describe('alert #40 — app/api/feed/rss-news/route.ts', () => {
  const route = code('app/api/feed/rss-news/route.ts')

  it('routes third-party XML text through the shared decode-then-strip helper', () => {
    expect(route).toContain("from '@/lib/news/text-sanitize'")
    expect(route).toContain('toPlainText(')
  })

  it('no longer decodes entities back into markup characters', () => {
    expect(route).not.toMatch(LITERAL_ENTITY_DECODE)
  })

  it('keeps the CDATA unwrap in front of the helper, or `<link>` payloads are discarded', () => {
    // toPlainText treats `<![CDATA[…]]>` as markup; for a link the payload IS
    // the URL, so the unwrap must happen before it.
    expect(route).toMatch(/toPlainText\(\s*String\([^)]*\)\.replace\(\/\^<!\\\[CDATA\\\[/)
  })
})

describe('alert #41 — lib/opportunities/rss-opportunities-service.ts', () => {
  const service = code('lib/opportunities/rss-opportunities-service.ts')

  it('has no local toPlainText definition any more', () => {
    expect(service).not.toMatch(/function toPlainText\b/)
    expect(service).toContain("from '@/lib/news/text-sanitize'")
    expect(service).toContain('toPlainText(item.title)')
    expect(service).toContain('toPlainText(item.description)')
  })

  it('no longer decodes entities back into markup characters', () => {
    expect(service).not.toMatch(LITERAL_ENTITY_DECODE)
    expect(service).not.toMatch(/\.replace\(\/<\[\^>\]\+>\/g/)
  })
})

describe('alert #45 — components/news/news-page.tsx', () => {
  const page = code('components/news/news-page.tsx')

  it('replaced the local decodeTextEntity with the shared helper', () => {
    expect(page).not.toMatch(/decodeTextEntity/)
    expect(page).toContain("from '@/lib/news/text-sanitize'")
    expect(page).toContain('toPlainText(')
  })

  it('no longer decodes entities back into markup characters', () => {
    expect(page).not.toMatch(LITERAL_ENTITY_DECODE)
    expect(page).not.toMatch(/\.replace\(\/<\[\^>\]\*>\/g/)
  })
})

describe('alerts #42 and #46 — lib/services/rss-feed.service.ts', () => {
  it('the module is gone, so neither alert has a live sink in the tree', () => {
    // The design-system lane deleted it this cycle as a zero-importer module.
    // If it ever comes back, this suite must fail loudly rather than let the
    // two dispositions be re-registered against a resurrected helper.
    expect(existsSync(join(process.cwd(), 'lib/services/rss-feed.service.ts'))).toBe(false)
  })

  it('no RSSFeedService class with a strip-then-decode cleanText is reachable', () => {
    const service = code('lib/opportunities/rss-opportunities-service.ts')
    const page = code('components/news/news-page.tsx')
    const rssRoute = code('app/api/feed/rss-news/route.ts')
    const item = code('components/feed/rss-news-item.tsx')
    const news = code('lib/news/feed-service.ts')
    for (const source of [service, page, rssRoute, item, news]) {
      expect(source).not.toMatch(/class RSSFeedService\b/)
      expect(source).not.toMatch(/function cleanText\b/)
      expect(source).not.toMatch(LITERAL_ENTITY_DECODE)
    }
  })
})

describe('cluster invariants', () => {
  it('the shared helper is the only plain-text conversion the news surfaces import', () => {
    for (const path of [
      'app/api/feed/rss-news/route.ts',
      'lib/opportunities/rss-opportunities-service.ts',
      'components/news/news-page.tsx',
      'components/feed/rss-news-item.tsx',
    ]) {
      expect(code(path), path).toContain('@/lib/news/text-sanitize')
    }
  })

  it('none of the news surfaces renders third-party text as raw HTML', () => {
    for (const path of [
      'app/api/feed/rss-news/route.ts',
      'lib/opportunities/rss-opportunities-service.ts',
      'components/news/news-page.tsx',
      'components/feed/rss-news-item.tsx',
      'lib/news/feed-service.ts',
    ]) {
      expect(code(path), path).not.toContain('dangerouslySetInnerHTML')
    }
  })
})
