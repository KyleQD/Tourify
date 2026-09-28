# Social state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `SOCIAL-004` — blocked/waiting_external; CORE-WEB-LAUNCH
- `SOCIAL-007` — blocked/waiting_dependency; CORE-WEB-LAUNCH
- `WFC-016` — blocked/queued_postlaunch; POSTLAUNCH-WORKFORCE
<!-- generated-agent-state:end -->

- Last reviewed SHA: `ca3bb0b08870b87ce5f6e4ac69c65ddf31942c96`
- Last reviewed at: 2026-09-26
- Completed audit: `SOCIAL-001`
- Active implementation tasks: `SOCIAL-004` (bounded realtime DM slice; deployed verification pending), `SOCIAL-005` (canonical idempotent follow contract; cross-actor local proof now complete, hosted proof pending), `SOCIAL-006` (operational logistics communications; pilot delivery-state data pending), `SOCIAL-007` (interaction/notification read isolation; app side closed, browser readers and hosted denial still open)
- Confidence: high for local messaging contracts and deterministic client state; high for local interaction/notification authorization contracts; high for the server-authorized viewer like-state contract; medium for live Realtime/RLS and deployed notification-RPC behavior

## Durable facts

- Mission: own feed, posts, follows, friends, groups, messaging, notifications, and collaboration.
- Default source paths are recorded in `WORKING_SET.json`; Social-001's evidence-based scope expansions are recorded in its task checkpoint.
- Accepted product direction is CP-020 standalone feed, CP-021 full community groups, and CP-022 full realtime messaging in `docs/engineering/DECISIONS.md`.
- **CP-058 (2026-09-25):** interaction and notification reads never rely on service-role access. Reads run on the caller-scoped client with Bearer *and* cookie parity, and the post-visibility gate in `lib/feed/post-comment-access.ts` is the enforcement boundary, not a filter. See `HF-DB-006-SOCIAL-007` for the residual database-layer exposure.
- **RLS posture that decides that boundary (read from the chain, not assumed):** `post_likes` SELECT is `USING (true)` (`20240430000000_create_posts.sql:47-49`) and `post_comments` SELECT is `USING (true)` (`20241220000010_enhance_feed_system.sql:131-134`), so RLS cannot refuse a cross-user interaction read for those two tables. `post_shares` SELECT is `auth.uid() = user_id` (`20241220000010_enhance_feed_system.sql:208-212`) and `posts` SELECT is `USING (true)`.
- **Canonical already-safe patterns to copy, not reinvent:** `app/api/posts/[id]/{likes,comments,shares}` gate with `resolvePostCommentAccess` and return a non-disclosing 404; `app/api/feed/posts` resolves profile privacy plus follow state and then applies a per-row visibility filter; `lib/services/optimized-notification-service.ts` pins every query to `.eq('user_id', userId)`.
- **The viewer's like state is a server contract, not a browser read (Wave 35).** `lib/social/post-like-state.ts` + `GET /api/social/post-likes?postIds=` is the canonical read: gate first, then a read pinned to the viewer's own `user_id`, bounded at 50 ids, fail-closed with an explicit `degraded` flag. `GET /api/feed/posts` already returned a per-row `is_liked` and both browser consumers already consumed it, so the two browser `post_likes` reads were **redundant**; they are retired by deletion, not migrated. See CP-088 and DOMAIN-003.
- **`canViewPostComments` is the only interaction-read predicate, and it is now inventory-guarded.** Any `app/api/**/route.ts` naming `post_likes`, `post_comments`, `post_shares`, `poll_votes` or `social_interaction` must call the gate, pin its reads to the caller's own rows, or appear in `__tests__/social/interaction-route-gate-inventory.test.ts` with a written reason. A service-role interaction read needs its own registry entry. Verified by making the guard fail on a deliberately non-compliant route.
- **Per-platform status on `scheduled_posts` is a live feature, and the chain is missing the columns.** `lib/services/cross-platform-posting.service.ts:195` inserts `platform_status` and `app/api/artist/content/overview/route.ts:137` selects it, but `20260413200000_port_missing_tables.sql:335-356` creates the table without it, so a fresh chain replay breaks both. `20250904110000` must be repaired forward, not retired; the column contract and the evidence are in `HF-SOC-007-SCHEDULED-POSTS-PLATFORM-STATUS-IS-LIVE`.

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

## Wave 35 — app side of the `HF-DB-006-SOCIAL-007` decision (2026-09-26)

- The database lane returned a decision not to author the tightening migration, naming the two browser `post_likes` readers as the blocker. That consumer coordination is now done from the app side. `HF-DB-006-SOCIAL-007` is still `pending` — the decision was returned, the handoff was not accepted.
- The two reads were already self-scoped and disclosed nothing. What made them a blocker was that the *browser* depended on the permissive policy. `GET /api/feed/posts` was already returning a per-row `is_liked` that both transforms already consumed, so the reads were redundant: the correct change is a deletion, not an integration. The field's own computation moved to the caller-scoped client so the replacement is not itself a service-role interaction read.
- `lib/social/post-like-state.ts` + `GET /api/social/post-likes?postIds=` is the canonical read for any surface that is not the feed. Gate first, then a read pinned to the viewer's own id, bounded at 50, fail-closed with an explicit `degraded` flag. It is a strict subset of the retired browser read, which is what lets the database lane point a tightened policy at it.
- The missing inventory guard is built. `__tests__/social/interaction-route-gate-inventory.test.ts` enumerates every API route naming an interaction table and fails unless the route gates, self-pins, or is registered with a written reason; service-role interaction reads need a separate registered entry. It was proven to fail on a deliberately non-compliant route.
- `sharesReceived`: documented inside the `GET /api/notifications/social` response contract, with `posts.shares_count` named as the aggregate. There is **no in-repo consumer** (a repository-wide scan of `app`, `components`, `lib`, `hooks`, `apps`, `scripts` found zero), so nothing could have depended on the old structurally-always-zero value. A test now fails a future consumer that reads the field without naming the aggregate.
- Residual, deliberately unchanged: `GET/POST /api/posts/[id]/poll/vote` still reads on the service-role client. It is gated; moving it also moves the follow-state resolution and the vote write, and neither can be verified without an approved isolated target. It is an explicit entry in the guard's service-role registry, not an omission.
- Also found and handed off rather than fixed: `app/api/artist/content/overview/route.ts:137` and `lib/services/cross-platform-posting.service.ts:195` both use `scheduled_posts.platform_status`, a column the chain never creates. A fresh replay breaks both. See `HF-SOC-007-SCHEDULED-POSTS-PLATFORM-STATUS-IS-LIVE`.

## Priority next steps

1. Close `SOCIAL-004` only after staging two-member/non-member isolation; local fast/scoped verification is already clean.
2. Rerun `SIM-20260922-SOC-003` on an approved isolated target and close `SOCIAL-007`; the database still refuses nothing for `post_likes` / `post_comments` at the RLS layer (`HF-DB-006-SOCIAL-007`, still `pending`).
3. Artist lane: make the two `post_likes` deletions recorded in `HF-SOC-007-POST-LIKES-SERVER-READ-CONTRACT`, including the now-unused `supabase` import in `artist-home-feed.tsx`.
4. Database lane: accept `HF-DB-006-SOCIAL-007` and author the additive `platform_status` / `platform_errors` migration asked for by `HF-SOC-007-SCHEDULED-POSTS-PLATFORM-STATUS-IS-LIVE`.
5. Define whether Groups discovery is membership-only or public; do not add another route until the contract is decided.
6. Verify `should_send_notification` and grants on the approved target under CP-051; decide and test the failure fallback.
7. Add Social critical-path E2E/security coverage: feed, groups, realtime messaging, notification state, route ownership, rate limits, and XSS.
8. Resolve collaboration ownership, moderation ownership, entity notification settings, and the canonical follow/friend status contract.

## Known risks

- Live Realtime/RLS isolation is unverified for both DM and group channels.
- `should_send_notification` source evidence exists, but deployed state is unknown; application fallback is fail-open.
- Notification delivery-log failures are swallowed after a warning.
- Principal Social mutation families still lack consistent visible rate-limit markers. The canonical follow mutation is now bounded (30/60s per authenticated user); the interaction writes on `app/api/notifications/social` and the group message routes are not.
- E2E coverage is not yet representative of Social release risk.
- Feed schema fallback variants can mask deployment drift.
- ~~The application-layer visibility gate is now load-bearing for interaction reads, so a future route that skips it silently reintroduces the leak. It has negative tests; it does not have an automated route inventory that fails when a new interaction route omits it.~~ Closed 2026-09-26 by `__tests__/social/interaction-route-gate-inventory.test.ts`.
- `post_likes` and `post_comments` are still readable by any caller directly through PostgREST. The application and client sides are now ready for the tightening, but the fix is database-owned, `HF-DB-006-SOCIAL-007` is unaccepted, and no migration exists.
- A fresh chain replay breaks cross-platform scheduling: `scheduled_posts.platform_status` is written and read by live code but created by no migration. Measured by reading the chain; not reproduced against a database (CP-051).

See `BASELINE.md`, `GAPS.md`, and `QUESTIONS.md` for the evidence-backed inventory and follow-up sequencing.

## Production launch graph — 2026-09-16

- SOCIAL-004 is a P1 core launch dependency. Conversation membership must guard reads, sends, topics, typing, presence, and read state at the server or data boundary.
- Closure requires cross-user and cross-tenant denial, reconnect/duplicate/offline behavior, and a live two-member isolated-staging verification.

## Workforce Command Center assignment — 2026-09-26

- Goal: own WFC department communication audiences, recipients, delivery, read, acknowledgment, reminder, and retry contracts.
- Queued task: `WFC-016`, blocked on `WFC-004`; it does not displace SOCIAL-004 or SOCIAL-007 obligations.
- Required handoff: provide Admin with a department-scoped, auditable communication API and compatibility behavior for current workforce messages; organization membership alone must not reveal every department message.
- Governing plan: `docs/engineering/exec-plans/active/WFC-COMMAND-CENTER-20260926.md`.
