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
