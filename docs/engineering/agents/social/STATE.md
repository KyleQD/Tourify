# Social state

- Last reviewed SHA: `d21769046d517898144ee09a1c7bb4a7d36b068f`
- Last reviewed at: 2026-09-25
- Completed audit: `SOCIAL-001`
- Active implementation tasks: `SOCIAL-004` (bounded realtime DM slice; deployed verification pending), `SOCIAL-007` (interaction/notification read isolation; hosted rerun pending)
- Confidence: high for local messaging contracts and deterministic client state; high for local interaction/notification authorization contracts; medium for live Realtime/RLS and deployed notification-RPC behavior

## Durable facts

- Mission: own feed, posts, follows, friends, groups, messaging, notifications, and collaboration.
- Default source paths are recorded in `WORKING_SET.json`; Social-001's evidence-based scope expansions are recorded in its task checkpoint.
- Accepted product direction is CP-020 standalone feed, CP-021 full community groups, and CP-022 full realtime messaging in `docs/engineering/DECISIONS.md`.
- **CP-058 (2026-09-25):** interaction and notification reads never rely on service-role access. Reads run on the caller-scoped client with Bearer *and* cookie parity, and the post-visibility gate in `lib/feed/post-comment-access.ts` is the enforcement boundary, not a filter. See `HF-DB-006-SOCIAL-007` for the residual database-layer exposure.
- **RLS posture that decides that boundary (read from the chain, not assumed):** `post_likes` SELECT is `USING (true)` (`20240430000000_create_posts.sql:47-49`) and `post_comments` SELECT is `USING (true)` (`20241220000010_enhance_feed_system.sql:131-134`), so RLS cannot refuse a cross-user interaction read for those two tables. `post_shares` SELECT is `auth.uid() = user_id` (`20241220000010_enhance_feed_system.sql:208-212`) and `posts` SELECT is `USING (true)`.
- **Canonical already-safe patterns to copy, not reinvent:** `app/api/posts/[id]/{likes,comments,shares}` gate with `resolvePostCommentAccess` and return a non-disclosing 404; `app/api/feed/posts` resolves profile privacy plus follow state and then applies a per-row visibility filter; `lib/services/optimized-notification-service.ts` pins every query to `.eq('user_id', userId)`.

## Current state

- **Feed — working:** `/feed` renders `SocialFeed` with Following/Discover/Your Posts tabs and embedded composition. The feed API/query and engagement paths exist. Remaining risk is release-grade browser coverage and compatibility-fallback observability.
- **Posts — partial:** CRUD/engagement/polls/appearance paths exist, but composition is embedded rather than a standalone route. Moderation status columns exist without a Social report workflow.
- **Follows/friends — working/complex:** entity follows and general-user friend requests are both active. The relationship contract is tested, but the canonical public status contract and management UI are not unified.
- **Groups — working/partial:** authenticated membership hub, group feed, member panel, roles, reactions, and live message/reaction channels exist. Public discovery semantics and multi-user isolation evidence remain open.
- **Messaging — working/partial:** account-scoped inboxes, trust tiers, attachments, task links, and the bounded realtime DM slice exist. Local fast verification passes; reconnect recovery, duplicate suppression, persisted unread/read state, and non-disclosing membership failures have focused coverage. `SOCIAL-004` still needs authenticated two-member plus outsider Realtime/RLS evidence.
- **Messaging verification (2026-09-20):** 24 focused messaging tests and the
  combined repository Vitest suite (568 files / 5,317 tests passed; 2 files / 8
  tests skipped) are green after the local privacy and deterministic-state fix.
- **Notifications — working/partial:** inbox, API, account scoping, preferences, channels, quiet hours, analytics, and realtime subscription exist. Deployed RPC verification, fail-open policy, entity settings, and delivery-log observability remain open. The `/api/notifications` inbox, PATCH, DELETE, preferences, and analytics reads are service-role but always pinned to the resolved acting identity, so they are safely scoped. `/api/notifications/social` was the one genuinely leaking read and is now caller-scoped, visibility-gated, self-only for aggregates, and paginated.
- **Collaboration — redirect-only:** Social entrypoints route to Artist or Discover; ownership is unresolved.
- **Social integrations/analytics — partial:** connect/disconnect and analytics cron/service paths exist; user-facing analytics ownership is unresolved.

## SOCIAL-007 interaction/notification read audit (2026-09-25)

- 20 interaction and notification read/write paths were traced from route to data access and classified: 4 leaking, 10 service-role-but-safely-scoped, 6 correctly RLS-scoped.
- Closed: `GET /api/notifications/social` (postId stats, arbitrary userId counters, and the ungated `social_interaction` write), `GET /api/posts/[id]/poll/vote` (no gate, no auth), and the group reaction 404-vs-403 message-existence oracle.
- Preserved unchanged: all 24 `SOCIAL-004` messaging tests, `POST /api/posts/[id]/poll/vote` (already `canVoteOnPoll`-gated), `GET /api/feed/posts` (the finding's cited correct contrast), and the `OptimizedNotificationService` user-pinned reads.
- Behavior change to be aware of: `sharesReceived` on the self-stats response now counts only share rows the caller may read, because `post_shares` RLS is `auth.uid() = user_id`. `posts.shares_count` is the aggregate surface for share totals.
- 35 focused negative isolation tests added under `__tests__/social/`; the test that previously asserted the leak is now a denial test.

## Priority next steps

1. Close `SOCIAL-004` only after staging two-member/non-member isolation; local fast/scoped verification is already clean.
2. Rerun `SIM-20260922-SOC-003` on an approved isolated target and close `SOCIAL-007`; the database still refuses nothing for `post_likes` / `post_comments` at the RLS layer (`HF-DB-006-SOCIAL-007`).
3. Define whether Groups discovery is membership-only or public; do not add another route until the contract is decided.
4. Verify `should_send_notification` and grants on the approved target under CP-051; decide and test the failure fallback.
5. Add Social critical-path E2E/security coverage: feed, groups, realtime messaging, notification state, route ownership, rate limits, and XSS.
6. Resolve collaboration ownership, moderation ownership, entity notification settings, and the canonical follow/friend status contract.

## Known risks

- Live Realtime/RLS isolation is unverified for both DM and group channels.
- `should_send_notification` source evidence exists, but deployed state is unknown; application fallback is fail-open.
- Notification delivery-log failures are swallowed after a warning.
- Principal Social mutation families lack consistent visible rate-limit markers.
- E2E coverage is not yet representative of Social release risk.
- Feed schema fallback variants can mask deployment drift.
- The application-layer visibility gate is now load-bearing for interaction reads, so a future route that skips it silently reintroduces the leak. It has negative tests; it does not have an automated route inventory that fails when a new interaction route omits it.
- `post_likes` and `post_comments` are still readable by any caller directly through PostgREST; the fix for that is database-owned and unstarted.

See `BASELINE.md`, `GAPS.md`, and `QUESTIONS.md` for the evidence-backed inventory and follow-up sequencing.

## Production launch graph — 2026-09-16

- SOCIAL-004 is a P1 core launch dependency. Conversation membership must guard reads, sends, topics, typing, presence, and read state at the server or data boundary.
- Closure requires cross-user and cross-tenant denial, reconnect/duplicate/offline behavior, and a live two-member isolated-staging verification.
