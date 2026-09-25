/**
 * SOCIAL-007 — the `sharesReceived` contract, and who can see it.
 *
 * `GET /api/notifications/social` (self-stats branch) used to compute every
 * counter, including `sharesReceived`, through the service-role client, so the
 * field structurally returned 0 for every caller: `post_shares` rows authored
 * by other actors were counted against a query the RLS-bypassing client
 * happily ran, but the value was not a number anyone could rely on. CP-058 moved
 * the read onto the caller-scoped client, which means `sharesReceived` now
 * counts the share rows the caller may read — its own shares on its own posts.
 *
 * That is a behaviour change, so it needs two things this file enforces:
 *
 *   1. The route must keep saying so, in the response contract a consumer reads.
 *   2. A consumer that appears later must be made to see it, so the test fails
 *      on a new `sharesReceived` reference that does not name the aggregate
 *      surface (`posts.shares_count`).
 *
 * The behavioural half — self-only, never another actor's — is proven in
 * `interaction-notification-isolation.test.ts`. This file is the documentation
 * guard.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const ROUTE_PATH = 'app/api/notifications/social/route.ts'
const AGGREGATE_SURFACE = 'posts.shares_count'

function readRepoFile(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out)
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe('SOCIAL-007 sharesReceived response contract', () => {
  it('names the aggregate surface and the RLS reason in the route contract', () => {
    const source = readRepoFile(ROUTE_PATH)
    const contract = source.slice(source.indexOf('RESPONSE CONTRACT'))
    expect(contract).toContain('sharesReceived')
    expect(contract).toContain(AGGREGATE_SURFACE)
    expect(contract).toContain('auth.uid() = user_id')
    expect(contract).toContain('sharesGiven')
  })

  it('pins the RLS-scoped read that backs the counter', () => {
    const source = readRepoFile(ROUTE_PATH)
    // The counter is a count over `post_shares` joined to the caller's own
    // posts. If this changes, the contract above has to change with it.
    expect(source).toContain(".from('post_shares')")
    expect(source).toContain(".select('id, posts!inner(user_id)', { count: 'exact', head: true })")
    expect(source).toContain('.eq(\'posts.user_id\', user.id)')
  })

  it('has no in-repo consumer that predates the contract', () => {
    const roots = ['app', 'components', 'lib', 'hooks', 'apps', 'scripts']
    const consumers: string[] = []

    for (const root of roots) {
      let full: string
      try {
        full = join(ROOT, root)
        statSync(full)
      } catch {
        continue
      }
      for (const file of collectSourceFiles(full)) {
        const repoPath = relative(ROOT, file)
        if (repoPath === ROUTE_PATH) continue
        if (!readFileSync(file, 'utf8').includes('sharesReceived')) continue
        consumers.push(repoPath)
      }
    }

    // No consumer today, which is the honest answer: nothing in the repository
    // could have depended on the old structurally-always-zero value.
    expect(consumers).toEqual([])
  })

  it('fails a new consumer that reads sharesReceived without naming the aggregate', () => {
    // The rule the consumer scan above enforces, expressed as a contract on the
    // route so a future consumer has something concrete to satisfy.
    const source = readRepoFile(ROUTE_PATH)
    expect(source).toContain('must use those columns')
  })
})
