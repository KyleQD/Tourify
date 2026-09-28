/**
 * SOCIAL-007 — the load-bearing gate needs an inventory guard.
 *
 * `lib/feed/post-comment-access.ts` is the enforcement boundary for interaction
 * reads on `post_likes` and `post_comments`, because both carry a permissive
 * `USING (true)` SELECT policy in the shipped chain
 * (`20240430000000_create_posts.sql:47-49` and
 * `20241220000010_enhance_feed_system.sql:131-134`). SOCIAL-007's negative
 * tests prove the gate works on the routes that call it. Nothing proved that a
 * *new* interaction route would call it, so a route added later could read
 * another actor's likes or comments and the suite would stay green.
 *
 * This file is that missing proof. It is a source-inventory guard, in the same
 * spirit as the `readFileSync` contract assertions elsewhere in the suite: it
 * enumerates every API route that names an interaction table and fails when one
 * of them is neither gated, nor demonstrably pinned to the caller's own rows,
 * nor registered here with a written reason.
 *
 * The escape hatch is the registry below and nothing else. A new interaction
 * route is not in it, so a new route fails this test until someone records why
 * it is safe. That is the whole point.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const API_ROOT = join(ROOT, 'app/api')

/** Tables whose shipped SELECT posture makes the application gate load-bearing. */
const INTERACTION_TABLES = [
  'post_likes',
  'post_comments',
  'post_shares',
  'poll_votes',
  'social_interaction',
] as const

/**
 * Symbols that prove the post-visibility gate runs. `authorizePost` is the
 * local fail-closed wrapper in `app/api/notifications/social/route.ts`;
 * `resolveViewerPostLikeState` reaches `canViewPostComments` from
 * `lib/social/post-like-state.ts`.
 */
const GATE_SYMBOL_PATTERN =
  /resolvePostCommentAccess|canViewPostComments|resolveViewerPostLikeState|authorizePost\s*\(/

/**
 * Evidence that every interaction read is pinned to the caller's own identity
 * rather than to a caller-supplied id. Two parts are required: the query is
 * anchored to the post's owner, and the owner is the resolved session identity.
 */
const OWNER_SCOPE_PATTERN = /\.eq\(\s*['"]posts\.user_id['"]/
const SESSION_IDENTITY_PATTERN = /(user\.id|userId|ctx\.userId|authResult\?\.user\?\.id)\b/

interface RegistryEntry {
  reason: string
}

/**
 * Routes that touch an interaction table without calling the shared gate
 * symbol. Each entry is a claim that the surface is authorized a different
 * way, and the claim is written down here so a reviewer can disagree with it.
 * A new interaction route is not in this table, so it fails the test below.
 */
const GATE_EXEMPTIONS: Record<string, RegistryEntry> = {
  'app/api/feed/posts/route.ts': {
    reason:
      'The feed applies its own post-visibility scope in lib/feed/feed-posts-query.ts ' +
      '(applyFeedScopeToQuery + isVisiblePost, plus resolveProfileFeedVisibilityAccess ' +
      'for ?user_id=), which is the gate for this surface. The viewer like state it ' +
      'projects as is_liked is read on the caller-scoped client and pinned to ' +
      '.eq("user_id", viewerUserId); the strict per-post gate for non-feed surfaces is ' +
      'lib/social/post-like-state.ts. Changing the feed scope means changing this entry.',
  },
  'app/api/debug/tables/route.ts': {
    reason:
      'Internal diagnostics route outside the social surface. It is gated by ' +
      'isAuthorizedInternalRequest (INTERNAL_API_SECRET / CRON_SECRET bearer, ' +
      'fail-closed without them) and returns schema existence plus one sample ' +
      'comment shape, not an interaction surface. Recorded, not endorsed: the ' +
      'service-role sample comment body is reported to the release lane as an ' +
      'observation in SOCIAL-007.',
  },
}

/**
 * Interaction routes that still reach for a service-role client. CP-058 says an
 * interaction read must not use one as its read path, so every remaining entry
 * is an exception with a reason rather than a default.
 */
const SERVICE_ROLE_EXEMPTIONS: Record<string, RegistryEntry> = {
  'app/api/posts/[id]/poll/vote/route.ts': {
    reason:
      'The mandatory gate is in place for both GET and POST, and the server derives the ' +
      'voter identity, so the read is classified service-role-but-safely-scoped. It is ' +
      'left on the service-role client deliberately: moving it to the caller-scoped client ' +
      'also moves the follow-state resolution (accounts / account_follows) and the poll_votes ' +
      'insert, and neither that RLS nor the vote write can be verified without an approved ' +
      'isolated target. Recorded as residual, with the switch as the next step once one exists.',
  },
  'app/api/feed/posts/route.ts': {
    reason:
      'createFeedReadClient is service-role for the post/profile hydration only. The ' +
      'interaction read it also served (post_likes) is now issued on the caller-scoped ' +
      'client; the remaining service-role reads are feed hydration pinned to an ' +
      'already-resolved scope, not interaction rows.',
  },
  'app/api/debug/tables/route.ts': {
    reason:
      'Internal diagnostics route; it is secret-gated rather than session-gated, so it ' +
      'cannot use a caller-scoped client. Recorded, not endorsed.',
  },
  'app/api/community/activity/route.ts': {
    reason:
      'Cross-account fanout for the caller\'s own posts: every interaction read is pinned ' +
      'to .eq("posts.user_id", userId) for the authenticated user, and the route must name ' +
      'the other actor to build an activity feed. The post-visibility gate is satisfied by ' +
      'the owner override in canViewPostComments.',
  },
}

const REGISTRY = GATE_EXEMPTIONS

const SERVICE_ROLE_IMPORT_PATTERN = /from ['"]@\/lib\/supabase\/service-role['"]/

function collectRouteFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectRouteFiles(full, out)
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      out.push(full)
    }
  }
  return out
}

function readRouteSource(fullPath: string) {
  return readFileSync(fullPath, 'utf8')
}

function isInteractionRoute(source: string) {
  return INTERACTION_TABLES.some((table) => source.includes(table))
}

const routeFiles = collectRouteFiles(API_ROOT)
const interactionRoutes = routeFiles
  .map((full) => ({ full, repoPath: relative(ROOT, full), source: readRouteSource(full) }))
  .filter((route) => isInteractionRoute(route.source))

describe('SOCIAL-007 interaction-route gate inventory', () => {
  it('finds the interaction routes this guard is about', () => {
    // If this ever drops, the guard below is guarding nothing.
    const paths = interactionRoutes.map((route) => route.repoPath).sort()
    expect(paths).toContain('app/api/posts/[id]/likes/route.ts')
    expect(paths).toContain('app/api/posts/[id]/comments/route.ts')
    expect(paths).toContain('app/api/posts/[id]/shares/route.ts')
    expect(paths).toContain('app/api/posts/[id]/poll/vote/route.ts')
    expect(paths).toContain('app/api/notifications/social/route.ts')
    expect(paths).toContain('app/api/social/post-likes/route.ts')
  })

  it('never lets an interaction route reach the database without a gate, a self-pin, or a recorded reason', () => {
    const unguarded: string[] = []

    for (const route of interactionRoutes) {
      if (REGISTRY[route.repoPath]) continue
      if (GATE_SYMBOL_PATTERN.test(route.source)) continue
      if (OWNER_SCOPE_PATTERN.test(route.source) && SESSION_IDENTITY_PATTERN.test(route.source)) continue
      unguarded.push(route.repoPath)
    }

    expect(
      unguarded,
      `Interaction routes must call the post-visibility gate, pin every read to the ` +
      `caller's own rows, or be registered with a reason in ` +
      `__tests__/social/interaction-route-gate-inventory.test.ts.\n` +
      `Unguarded:\n${unguarded.map((p) => `  - ${p}`).join('\n')}`,
    ).toEqual([])
  })

  it('requires every registry entry to carry a written reason', () => {
    for (const [label, table] of [
      ['GATE_EXEMPTIONS', GATE_EXEMPTIONS],
      ['SERVICE_ROLE_EXEMPTIONS', SERVICE_ROLE_EXEMPTIONS],
    ] as const) {
      for (const [path, entry] of Object.entries(table)) {
        expect(typeof entry.reason, `${label}[${path}] has no reason`).toBe('string')
        expect(entry.reason.length, `${label}[${path}] reason is too thin to review`).toBeGreaterThan(60)
      }
    }
  })

  it('keeps every registry entry pointing at a route that still exists', () => {
    const existingRoutes = routeFiles.map((full) => relative(ROOT, full))
    for (const path of Object.keys({ ...GATE_EXEMPTIONS, ...SERVICE_ROLE_EXEMPTIONS })) {
      expect(
        existingRoutes,
        `${path} is registered but is no longer a route; delete the entry`,
      ).toContain(path)
    }
  })

  it('does not let a new interaction route reach for a service-role read', () => {
    const undeclared: string[] = []
    for (const route of interactionRoutes) {
      if (!SERVICE_ROLE_IMPORT_PATTERN.test(route.source)) continue
      if (SERVICE_ROLE_EXEMPTIONS[route.repoPath]) continue
      undeclared.push(route.repoPath)
    }

    expect(
      undeclared,
      'CP-058: an interaction read must not use a service-role client as its read path. ' +
      'Either move the read to the caller-scoped client, or register the route in ' +
      'SERVICE_ROLE_EXEMPTIONS with a reason.\n' +
      `Undeclared:\n${undeclared.map((p) => `  - ${p}`).join('\n')}`,
    ).toEqual([])
  })

  it('keeps the caller-scoped engagement routes free of the service-role client', () => {
    for (const path of [
      'app/api/posts/[id]/likes/route.ts',
      'app/api/posts/[id]/comments/route.ts',
      'app/api/posts/[id]/shares/route.ts',
      'app/api/notifications/social/route.ts',
      'app/api/social/post-likes/route.ts',
    ]) {
      const source = readRouteSource(join(ROOT, path))
      expect(source, `${path} must not import the service-role client`).not.toMatch(
        SERVICE_ROLE_IMPORT_PATTERN,
      )
    }
  })

  it('keeps the gate mandatory in the shared access helper', () => {
    const source = readRouteSource(join(ROOT, 'lib/feed/post-comment-access.ts'))
    // Fail-closed: a read error or a missing row is a denial, never a permit.
    expect(source).toContain('if (error || !data) return { allowed: false, post: null }')
  })
})
