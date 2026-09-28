# Social decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DOMAIN-001 — Application-layer post visibility is the interaction-read boundary

- Date: 2026-09-25
- Status: accepted
- Task: SOCIAL-007
- Decision: Cross-domain decision CP-058. Interaction reads use the caller-scoped
  Supabase client; the `resolvePostCommentAccess` gate is mandatory, fail-closed,
  and returns one indistinguishable 404 for missing and non-entitled posts.
- Evidence: `supabase/migrations/20240430000000_create_posts.sql:47-49` gives
  `post_likes` a `USING (true)` SELECT policy and
  `supabase/migrations/20241220000010_enhance_feed_system.sql:131-134` does the same
  for `post_comments`, so RLS cannot be the boundary for those two tables;
  `post_shares` is `auth.uid() = user_id`
  (`supabase/migrations/20241220000010_enhance_feed_system.sql:208-212`).
- Consequences: The gate is a security control, not a UX filter. Any new
  interaction read path must call it first. Tightening the two permissive SELECT
  policies is database-owned and tracked as `HF-DB-006-SOCIAL-007`.

## DOMAIN-002 — Self-only per-user engagement aggregates

- Date: 2026-09-25
- Status: accepted
- Task: SOCIAL-007
- Decision: `GET /api/notifications/social` refuses any `?userId=` that is not the
  authenticated identity with 403 and never echoes the requested id. Aggregate
  engagement counters are therefore a self-service surface only.
- Evidence: `__tests__/social/interaction-notification-isolation.test.ts`
  ("denies reading another user's interaction counters", "never discloses the
  requested user's id in a denial").
- Consequences: Cross-user engagement reporting must go through an explicitly
  authorized surface (self, the content owner, or an admin analytics path), not
  through this endpoint. `sharesReceived` is limited to share rows the caller may
  read, so `posts.shares_count` remains the aggregate for share totals.

## DOMAIN-003 — The viewer like-state contract lives on the server, and the batch read is gated before it reads

- Date: 2026-09-26
- Status: accepted
- Task: SOCIAL-007
- Decision: `lib/social/post-like-state.ts` is the single implementation of "which of
  these posts has the viewer liked". The post-visibility gate resolves first; no
  `post_likes` row is read for a post that failed it; the read is always pinned to
  the viewer's own `user_id`; the batch is bounded at 50 and an oversized request
  is refused rather than truncated; and a failed read returns an empty set plus
  `degraded: true`, which the route surfaces as a 500 rather than a false zero.
  `GET /api/feed/posts` keeps its own scope predicate for `is_liked` — the feed's
  visibility scope is the gate for the feed — but issues that one interaction read
  on the caller-scoped client.
- Evidence: `__tests__/social/viewer-post-like-state.test.ts` computes the retired
  browser read literally and asserts the server read returns the same `Set` for
  entitled posts; a followers-only post the viewer does not follow yields no like
  read at all; a missing post and a non-entitled post are byte-identical; the
  query count stays at or under five for any batch size. `normalizeFeedPostDTO`
  round-trips `is_liked` for true, false and absent.
- Consequences: The route is a strict subset of the browser read, so the
  database lane can point a tightened `post_likes` policy at it. A surface that
  needs per-post like state and is not the feed must use it rather than
  re-deriving the gate.

## DOMAIN-004 — A dead service module pinned only by a URL assertion is retired, and the guard moves to the live clients

- Date: 2026-09-26
- Status: accepted
- Task: SOCIAL-005
- Decision: `lib/services/social-interactions.service.ts` is **retire, not adopt**
  (this is social's answer to the "Social or QA" item in
  `HF-DESIGN-034-TEST-ASSERTED-MODULES`). The test assertion that pinned it moves
  to the three live clients — `components/profile/public-profile-view.tsx`,
  `components/feed/social-feed.tsx`, `apps/mobile/lib/api/follow.ts` — and the
  module itself is left with a narrower assertion that only keeps it on the
  canonical `/api/social/follow` shape until its owning lane removes it.
- Evidence: zero importers; `getCurrentUserId()` returns `null` and
  `isAuthenticated()` returns `false` by construction, so the module's own guards
  can never pass; `shareProfile` and `getProfileStats` read `profiles` from a
  module-scope browser Supabase client, so adopting it would reintroduce a
  client-side table read — the exact class of reader this wave is retiring. The
  URL assertion it was pinned by says nothing about those reads, so pinning it
  created a false sense of safety while keeping dead code alive.
- Consequences: `lib/services/**` remains the design-system lane's, so social
  narrows the pin and does not delete the file. If the design-system lane
  deletes it, the remaining assertion in
  `__tests__/social/profile-follow-route.test.ts` must be removed in the same
  change. The follow contract itself is unaffected: the canonical route, the
  legacy `/api/follow` shim and the `/api/notifications/social` follow branch all
  delegate to `app/api/social/follow/route.ts`, and that is now proven across
  actors in `__tests__/social/follow-contract-consistency.test.ts`.

## DOMAIN-005 — The canonical follow mutation is bounded, and a malformed target is refused before the insert

- Date: 2026-09-26
- Status: accepted
- Task: SOCIAL-005
- Decision: `app/api/social/follow/route.ts` rate-limits its mutation per
  authenticated user (30 per 60s, via the existing `createRateLimiter`, degrading
  to allow-all when Redis is unconfigured, exactly like the sibling
  `app/api/posts/[id]/comments` mutation), and refuses a `followingId` that is not
  a UUID with 400 before any write. The limit lives here because every entrypoint
  — profile, feed, the legacy shim, the notification branch — funnels through this
  handler.
- Evidence: `follows.following_id` is a UUID column, so a malformed target could
  only ever surface as a driver error and a 500. The side effect being protected is
  a notification to another user, which makes an unbounded mutation loop a
  notification-spam primitive; the route previously had no bound while the
  canonical comment route did. `__tests__/social/follow-contract-consistency.test.ts`
  asserts the 429 path performs no write and no notification, and that the limiter
  is keyed to the acting user rather than the target.
- Consequences: Retries stay safe — a replay storm consumes a few of 30 requests
  and a replayed follow still returns `changed: false` with no duplicate side
  effects. No client sends a non-UUID target, so no client contract changed. The
  follower's follower count still comes from `profiles.followers_count`, which the
  chain's count triggers maintain and which can disagree with the number of edges
  a request wrote; the route reports the column, never a locally derived count.
