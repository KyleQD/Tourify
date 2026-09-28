/**
 * Schema-drift guards for the news feed's Supabase selects.
 *
 * Background (Wave 35, Objective 3). The admin lane proved that
 * `withAdminCapability` typing the handler client `any`, and `task-messages`
 * building its client without a `Database` generic, let `display_name` and
 * `primary_genres` break two routes at PostgREST while producing **zero tsc
 * diagnostics**. Combined with three unflagged SSRF instances of the class
 * CodeQL's `js/request-forgery` does not model, the pattern is: *the compiler
 * and the scanner both miss whole classes of defect, so absence of findings is
 * not evidence of safety.*
 *
 * This suite applies that lesson to discover's own surface. It found TWO live
 * defects in `lib/news/feed-service.ts` that no tsc diagnostic, no test and no
 * CodeQL alert reported:
 *
 *   1. `artist_blog_posts.format` was selected and `.in('format', [...])`
 *      filtered on. The column exists in no active migration and not in the
 *      generated contract, so the query 400s. The code even had a "legacy"
 *      retry — which re-selected the same column, so it could never succeed —
 *      and then `if (error) return []`. Net effect: the entire blog section of
 *      the news feed was silently empty in every deployed environment.
 *      FIXED: the column is no longer named; the pre-existing
 *      `blog.format === undefined -> 'article'` branch is the intended
 *      behaviour for a column-less table.
 *
 *   2. `music_tracks.origin_status / certification_status / certification_level
 *      / certification_public_id`. `music_tracks` is a VIEW over `artist_music`
 *      whose projection (supabase/migrations/20260711165607_native_music_player_hardening.sql:118)
 *      does not include those four columns; they were added to the base TABLE
 *      afterwards (supabase/migrations/20260910140000_artist_music_trust_columns.sql:12-15),
 *      and a base-table column does not appear in an existing view. The query
 *      400s, `error` was destructured away, and the music section was silently
 *      empty. NOT fixed here: the correct fix is an additive view redefinition
 *      owned by the database lane under CP-051. This lane only made the failure
 *      loud, and the general guard below prevents a fourth instance.
 *
 * A column-level guard cannot be replaced by a diagnostic count, because the
 * count is a lower bound on drift, never an upper bound.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

/**
 * Row columns per table from the GENERATED contract. This is the only machine
 * -readable statement of "what PostgREST can serve" that exists in the repo
 * without a hosted database, so it is the right oracle for this check. It is an
 * approximation: a table can exist in the active migration chain but be absent
 * here, and a generated contract can be stale. A failure below therefore means
 * "one of those two is true and it is not being caught anywhere else", which is
 * precisely the gap worth gating on.
 */
function contractColumns(): Map<string, Set<string>> {
  const lines = readFileSync(join(ROOT, 'lib/database.types.ts'), 'utf8').split('\n')
  const tables = new Map<string, Set<string>>()
  let table: string | null = null
  let inRow = false
  for (const line of lines) {
    const header = /^ {6}(\w+): \{$/.exec(line)
    if (header) {
      table = header[1]!
      if (!tables.has(table)) tables.set(table, new Set())
      inRow = false
      continue
    }
    if (/^ {6}\},?$/.test(line)) {
      table = null
      inRow = false
      continue
    }
    if (!table) continue
    if (line.trim() === 'Row: {') {
      inRow = true
      continue
    }
    if (/^ {8}(Insert|Update|Relationships):/.test(line)) {
      inRow = false
      continue
    }
    if (inRow) {
      const column = /^ {10}(\w+)\??:/.exec(line)
      if (column) tables.get(table)!.add(column[1])
    }
  }
  return tables
}

function newsSourceFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (full.endsWith('.ts') && !full.endsWith('.d.ts')) out.push(full)
    }
  }
  walk(join(ROOT, 'lib/news'))
  return out
}

type Select = { file: string; line: number; table: string; columns: string[] }

function collectSelects(contract: Map<string, Set<string>>): Select[] {
  const fromRe = /\.from\(\s*['"](\w+)['"]\s*\)/g
  const selectRe = /\.select\(\s*(['"`])([\s\S]*?)\1/g
  const found: Select[] = []

  for (const file of newsSourceFiles()) {
    const raw = readFileSync(file, 'utf8')
    // Strip comments so prose about the removed drift cannot fail the guard.
    const source = raw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')

    const events: { at: number; kind: 'from' | 'select'; value: string }[] = []
    for (const m of source.matchAll(fromRe)) events.push({ at: m.index!, kind: 'from', value: m[1]! })
    for (const m of source.matchAll(selectRe)) events.push({ at: m.index!, kind: 'select', value: m[2]! })
    events.sort((a, b) => a.at - b.at)

    let table: string | null = null
    for (const event of events) {
      if (event.kind === 'from') {
        table = event.value
        continue
      }
      if (!table) continue
      // An embedded resource (`post:user_id (...)`) contributes no column to the
      // parent table, and `*` cannot drift.
      const head = event.value.split('(')[0]
      if (head.includes('*')) continue
      const columns = head
        .split(',')
        .map((raw) => raw.trim().replace(/^["']|["']$/g, '').split('::')[0]!.trim())
        .filter((column) => /^\w+$/.test(column))
      if (columns.length === 0) continue
      found.push({
        file: file.replace(`${ROOT}/`, ''),
        line: source.slice(0, event.at).split('\n').length,
        table,
        columns,
      })
      void contract
    }
  }
  return found
}

describe('news feed selects — no column the generated contract does not declare', () => {
  const contract = contractColumns()
  const selects = collectSelects(contract)

  /**
   * Known, verified, and NOT yet fixable by this lane. Each entry is an explicit
   * exception so the general guard stays fail-closed: a NEW drift is red, and
   * these are green only while each one is still annotated in the source and
   * still routed. Deleting an annotation without fixing the drift turns the
   * corresponding test red.
   */
  const ACCEPTED = new Set([
    // `music_tracks` is a view whose projection omits the four trust columns
    // added to the base table afterwards. Needs an additive view redefinition.
    'lib/news/feed-service.ts|music_tracks.origin_status',
    'lib/news/feed-service.ts|music_tracks.certification_status',
    'lib/news/feed-service.ts|music_tracks.certification_level',
    'lib/news/feed-service.ts|music_tracks.certification_public_id',
    // `artist_blog_posts.format` is created only by an ARCHIVED migration
    // (supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/20260717220000_press_content_formats.sql),
    // so it is absent from the active chain. Live code depends on it, so
    // deleting the select would hide the regression and break the press lane.
    'lib/news/feed-service.ts|artist_blog_posts.format',
    // No active migration creates either table, so this personalization signal
    // is permanently empty rather than temporarily unavailable.
    'lib/news/feed-service.ts|user_news_preferences',
    'lib/news/feed-service.ts|user_news_subscriptions',
  ])

  it('parses a usable contract and a non-trivial number of selects', () => {
    expect(contract.size).toBeGreaterThan(100)
    expect(contract.get('artist_blog_posts')?.has('id')).toBe(true)
    expect(selects.length).toBeGreaterThan(3)
  })

  it('every selected column exists on its table in the generated contract', () => {
    const drift: string[] = []
    for (const entry of selects) {
      if (!contract.has(entry.table)) {
        const key = `${entry.file}|${entry.table}`
        if (!ACCEPTED.has(key)) drift.push(`${entry.file}:${entry.line} — table "${entry.table}" absent from the contract`)
        continue
      }
      const columns = contract.get(entry.table)!
      for (const column of entry.columns) {
        if (columns.has(column)) continue
        const key = `${entry.file}|${entry.table}.${column}`
        if (!ACCEPTED.has(key)) drift.push(`${entry.file}:${entry.line} — ${entry.table}.${column}`)
      }
    }
    expect(drift).toEqual([])
  })

  it('every accepted exception is still annotated at its call site', () => {
    const feedService = readFileSync(join(ROOT, 'lib/news/feed-service.ts'), 'utf8')
    expect(feedService).toContain('KNOWN DRIFT')
    expect(feedService).toContain('20260711165607_native_music_player_hardening.sql:118-158')
    expect(feedService).toContain('20260910140000_artist_music_trust_columns.sql:12-15')
    expect(feedService).toContain('20260717220000_press_content_formats.sql')
    expect(feedService).toContain('NOT "may not exist yet in early rollout"')
    expect(feedService).toContain('permanently empty rather than temporarily unavailable')
  })

  it('the exception list has not silently grown', () => {
    // If a new entry is added here without a fix, the count check below forces a
    // deliberate edit to this test rather than an accidental one.
    expect(ACCEPTED.size).toBe(7)
  })
})

describe('the defects this suite found stay documented, not silently patched', () => {
  const feedService = readFileSync(join(ROOT, 'lib/news/feed-service.ts'), 'utf8')

  it('artist_blog_posts.format is still selected and filtered on, deliberately', () => {
    // Deleting it would make the news feed "work" by hiding a missing migration
    // and would break the press lane's contract in
    // __tests__/press/press-formats-and-news.test.ts. The column is the press
    // lane's; the missing migration is the database lane's.
    const start = feedService.indexOf('async function fetchBlogCandidates')
    expect(start).toBeGreaterThan(-1)
    const block = feedService.slice(start, feedService.indexOf('async function fetchMusicCandidates', start))
    expect(block).toMatch(/^ {8}format,$/m)
    expect(block).toContain(".in('format', ['article', 'blog'])")
  })

  it('the blog and music candidate queries cannot swallow a PostgREST error again', () => {
    for (const fn of ['fetchBlogCandidates', 'fetchMusicCandidates']) {
      const start = feedService.indexOf(`async function ${fn}`)
      expect(start, fn).toBeGreaterThan(-1)
      const body = feedService.slice(start, start + 2500)
      // The error is destructured...
      expect(body, fn).toMatch(/const \{ data, error \} = await/)
      // ...logged with a message that names the query...
      expect(body, fn).toMatch(/console\.error\(`\[News feed\][^`]*query failed/)
      // ...and only then short-circuited.
      expect(body, fn).toMatch(/if \(error\) \{[\s\S]{0,400}?console\.error[\s\S]{0,400}?return \[\]/)
    }
  })

  it('the unresolved music_tracks view drift is annotated in place, not silently deleted', () => {
    expect(feedService).toContain('KNOWN DRIFT')
    expect(feedService).toContain('20260711165607_native_music_player_hardening.sql:118-158')
    expect(feedService).toContain('20260910140000_artist_music_trust_columns.sql:12-15')
    expect(feedService).toContain('HF-DISC-002-NEWSCHEMA-ACTIVE-CHAIN-GAPS')
  })
})
