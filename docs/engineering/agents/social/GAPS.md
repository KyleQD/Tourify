# Social Domain Gaps

> Reconciled 2026-09-11 against current source and recent Social task records. `SOCIAL-004` implementation is not duplicated here; its remaining verification is recorded as a dependency.

## P1 — close delivered-surface verification first

| ID | Gap | Triage | Evidence/location | Next action |
|---|---|---|---|---|
| M-1 | DM realtime has focused contract tests but no authenticated two-member Realtime/RLS isolation evidence. | INCOMPLETE | `app/messages/messages-page-client.tsx:392-483`; `app/api/messages/[conversationId]/realtime/route.ts:10-32`; `docs/engineering/tasks/active/SOCIAL-004.json`. | Run staging test with two members and one outsider; verify topic issuance, INSERT/UPDATE visibility, typing, presence, read receipts, and cleanup. Then close or revise SOCIAL-004. |
| G-1 | Group detail also has live channels, but there is no dedicated multi-user isolation E2E proving a non-member cannot read, subscribe, react, or post. | INCOMPLETE | `app/groups/[id]/group-thread-client.tsx:197-245`; `app/api/groups/threads/[id]/messages/route.ts:57-70,139-152`; `app/api/groups/threads/[id]/members/route.ts:52-65`. | Add authenticated member/non-member API and browser checks after a staging target is available. |
| F-1 | Feed has a page, tabs, and composer, but no Social browser E2E covers auth, tab switching, pagination/refresh, compose, visibility, engagement, or XSS payload rendering. | INCOMPLETE | `app/feed/page.tsx:1-5`; `components/feed/social-feed.tsx:535-575`; `tests/e2e/` has no dedicated feed spec. | Add a stable feed fixture and a browser flow before making feed a release gate. |
| X-1 | E2E coverage is not aligned with Social critical paths. | MISSING | `tests/e2e/04-qa-multi-persona-clickthrough.spec.ts:114-117` only smoke-checks `/messages`; no dedicated feed/groups/notifications/collaboration spec is present. | Add feed, group membership, DM/realtime, notification, collaboration redirect/ownership, and XSS cases; upload Playwright artifacts on failure. |

## P1 — product and cross-domain decisions

| ID | Gap | Triage | Evidence/location | Next action |
|---|---|---|---|---|
| C-1 | Social collaboration entrypoints redirect to Artist or Discover, and the owner of the Social collaboration surface is not recorded. | INCOMPLETE | `app/collaboration/page.tsx:3-5`; `app/collaboration/discover/page.tsx:3-5`; `app/collaboration/projects/page.tsx:3-5`. | Product owner chooses artist-only, standalone Social, or defer; remove/retain redirects only after that decision. |
| G-2 | `/groups` lists only groups where the viewer already has an active `thread_members` row; it does not implement public discovery or join-by-search. | INCOMPLETE | `app/api/groups/threads/route.ts:19-77`; `app/groups/groups-page-client.tsx:48-78`. | Clarify whether “discovery” means membership inbox or public catalog; if catalog, define visibility, join/request flow, and abuse controls before implementation. |
| N-1 | `should_send_notification` exists in migration source, but deployed existence, function version, and target permissions are unverified. | INCOMPLETE | `supabase/migrations/20260415235824_notification_ecosystem_prefs_rls_outbound.sql:51-112`; `lib/services/optimized-notification-service.ts:728-747`. | Verify on approved staging/production targets through the gated DB process; record result and keep CP-051 manual migration rules. |
| N-2 | Notification RPC failure defaults to send, so a missing/broken gate can create notification spam. | IMPROVE | `lib/services/optimized-notification-service.ts:740-747`. | Decide fail-open vs fail-closed by priority; add an observable, tested fallback and deployment probe. |
| N-3 | Delivery-log insert errors are warned and swallowed, making outbound delivery accounting incomplete. | IMPROVE | `lib/services/notification-delivery.ts:167-180`. | Preserve user delivery behavior but surface structured failure metrics/alerts and test retry/reconciliation semantics. |

## P2 — product completion and maintainability

| ID | Gap | Triage | Evidence/location | Next action |
|---|---|---|---|---|
| F-2 | Feed composition is embedded in `SocialFeed`; there is no dedicated compose route or deep-linkable create flow. | INCOMPLETE | `components/feed/social-feed.tsx:540-542`; `app/api/posts/create/route.ts`. | Keep embedded composition if intentional; otherwise define a route/deep-link contract before building another surface. |
| F-3 | Feed query has a large compatibility fallback chain, which can hide schema drift and complicate diagnosis. | IMPROVE | `lib/feed/feed-posts-query.ts`; `app/api/feed/posts/route.ts:169-180`. | Pair schema/type reconciliation with telemetry for fallback variant usage; remove variants only with deployment evidence. |
| FF-1 | Follow and friend relationships remain two related models with several overlapping APIs. | IMPROVE | `lib/social/relationship-intent.ts`; `lib/messaging/friends.ts`; `app/api/social/relationship/route.ts`; `app/api/follow/route.ts`. | Document the canonical status/read contract and retain compatibility routes until callers are migrated. |
| FF-2 | Search and relationship actions exist, but no dedicated friend list, pending-request inbox, or block-management page is in the declared Social pages. | INCOMPLETE | `app/friends/search/`; `app/api/social/relationship/route.ts`; `app/api/social/friend-search/route.ts`. | Product chooses whether these are required for launch; then build one coherent graph-management surface. |
| N-4 | Notifications have an inbox and API preferences, but no verified entity-account/team settings experience is documented. | INCOMPLETE | `app/notifications/page.tsx`; `app/api/notifications/preferences/route.ts`; `lib/notifications/account-scope.ts`. | Decide whether entity settings are per-account, per-team, or all-or-nothing; test target-profile isolation. |
| N-5 | Realtime notification subscription re-runs when callback identities change and refreshes by refetching the inbox on every event. | IMPROVE | `hooks/use-notifications.ts:323-352`. | Stabilize callback dependencies and add reconnect/de-duplication behavior under the shared realtime resilience work. |
| SI-1 | Social analytics is computed by cron/service paths but has no clearly owned user-facing dashboard. | INCOMPLETE | `app/api/cron/social-analytics/route.ts`; `hooks/use-social-integrations.ts`; `lib/services/social-integrations.service.ts`. | Decide internal-only vs artist/venue-facing analytics and assign the owning surface. |
| X-2 | Static permission maps detect auth/service-role markers but do not prove resource scope; Social routes need a focused persona matrix. | IMPROVE | `docs/engineering/generated/permissions.md`; group/DM handlers above. | Add member/non-member and account-context tests for every mutation/read family. |
| X-3 | Mutation abuse controls are inconsistent: a static scan found rate-limit markers on RSS and post comments, but not on the principal feed, follow, post, group, relationship, or notification route families. | IMPROVE | `app/api/feed/**`, `app/api/posts/**`, `app/api/follow/**`, `app/api/social/**`, `app/api/groups/**`, `app/api/notifications/**`; `lib/utils/rate-limit`. | Define endpoint classes and limits; prioritize follow, post creation, comments, likes, group messages, friend actions, and notification test routes. |
| X-4 | Content moderation has schema/status evidence but no Social report/flag workflow or ownership contract. | INCOMPLETE | `supabase/migrations/20260604100000_content_moderation.sql:1-16`; no matching Social report route under `app/api/posts/**` or `components/feed/**`. | Decide Social-owned moderation vs Admin-owned review, then define reporting, visibility, audit, and escalation contracts. |

## Counts and sequencing

- Current reconciled audit set: 17 gaps — 4 P1 verification, 5 P1 product/cross-domain, and 8 P2 completion/quality items.
- Completed since the original audit: standalone feed (`SOCIAL-002`), community groups (`SOCIAL-003`), and bounded DM realtime implementation (`SOCIAL-004`, verification still active).
- Sequencing: (1) staging isolation and release E2E/security evidence, (2) collaboration/group/notification decisions and target RPC verification, (3) focused graph/settings/rate-limit/moderation work, (4) scale/unification improvements such as WS-1.3 and Phase 4 notification/navigation consolidation.
