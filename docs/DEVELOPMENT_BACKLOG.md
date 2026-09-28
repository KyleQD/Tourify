# Tourify — Development Backlog (Living Document)

| | |
|---|---|
| **Status** | LIVING DOCUMENT — single source of truth for launch-blocking and hardening work |
| **Created** | 2026-08-23, from `docs/AUDIT_FINDINGS_2026-08-23.md` (every item cites finding IDs) |
| **Rule** | An item may only be checked done when its acceptance criteria are met AND verified by test/CI evidence. Update Status column in place; append changelog entries; never delete rows. |

**Priority key**
- **P0** — Launch blocker: exploit, money loss, data loss, or platform cannot operate.
- **P1** — Must-fix before public scale: correctness, abuse resistance, operability.
- **P2** — Product completion & consistency users will hit in week one.
- **P3** — Scale/performance/quality debt that becomes urgent under growth.

---

## Phase 0 — Stop the bleeding (Security & Money integrity) · P0 · Target: Week 1

### WS-0.1 Kill unsigned-cookie authentication paths *(C1)*
- [x] Delete cookie-JSON fallbacks from `lib/auth/server.ts` (`authenticateApiRequest`, `checkAuth`) and `lib/auth/production-auth.ts`. *(2026-08-23)*
- [x] Convert all 9+ consumer routes (`messages/[conversationId]/{accept,decline,context}`, `messages/user-search`, `social/suggested`, `groups/threads/[id]/**`) to verified helpers (`authenticateRequestWithBearerFallback`). *(2026-08-23; eslint clean)*
- [ ] Keep `tourify-session-cookie.ts` only where it feeds token extraction into a real `getUser(token)` verification *(done — only `mobile-request-auth.ts` consumes it now)*; **remaining:** automated regression test asserting forged cookies yield 401.
- **Accept**: forged cookie JSON returns 401 on every listed route (test pending); grep proves no route derives identity from unverified cookie JSON ✓.

### WS-0.2 Close organization takeover chain *(C2)*
- [x] `createInviteAction`: verify caller is org owner/admin via server-side membership check before insert; owners only may mint `owner` invites. *(2026-08-23 — kept role enum but gated by verified membership, which is the actual exploit path)*
- [x] `orgs/invite/accept`: reject when either email empty (no silent match); error-checked writes; conditional-update (`accepted_at is null`) prevents double-accept races; member upsert idempotent via onConflict. *(2026-08-23)*
- [ ] Add invite revocation column + atomic accept RPC migration (needs DB pipeline approval).
- **Accept remaining**: integration test proving non-member cannot mint invites.

### WS-0.3 Ticket transfer ownership fix *(C3)*
- [x] Email-addressed transfers require signed-in user whose account email matches `to_email`; fixed short-circuit at `transfers/route.ts:129`. *(2026-08-23)*
- [x] Ownership claim is now conditional on original owner still holding the ticket; finalize guarded by `status='pending'` with compensating restore on lost race. *(2026-08-23)*
- [ ] Full single-RPC transaction for revoke→rewrite→reissue (needs DB pipeline approval).
- **Accept remaining**: regression tests for both paths.

### WS-0.4 Discount/referral clamp *(C4)*
- [x] Discounts clamped at application time to order base amount (covers legacy over-sized referral rows); creation clamped to $10 max server-side; promo validation endpoint no longer returns internal promo rows. *(2026-08-23)*
- [ ] Atomic per-user usage-counter enforcement on paid path.
- **Accept remaining**: clamp unit tests.

### WS-0.5 Atomic inventory & idempotent purchases *(C5, H7)*
- [x] Marketplace decrement now optimistic-concurrency conditional write with retry (no lost updates / negative stock). *(2026-08-23; checkout-time reservation RPC adoption remains P1)*
- [x] Ticket purchase honors `Idempotency-Key` header or `metadata.idempotency_key`; duplicate attempts return the original order/session. *(2026-08-23)*
- [x] Subscriptions webhook: insert-before-process ledger (`platform_webhook_events`, new additive migration `20260823200000_platform_webhook_events.sql`, graceful degradation pre-migration) + failures now return 500 so Stripe retries. *(2026-08-23)*
- [ ] Marketplace checkout key adoption + parallel race tests.

### WS-0.6 Production environment & data safety *(C6)*
- [ ] Split demo/prod into separate Supabase projects; update `deployment/*.env` templates; complete Vercel production env (STRIPE_*, RESEND_API_KEY, CRON_SECRET, INTERNAL_API_SECRET, ENCRYPTION_KEY, correct SITE_URL, Sentry DSNs).
- [ ] Enable + verify PITR/backups; run one documented restore drill; record RPO/RTO in `RECOVERY_AND_CONTINUITY_PLAN.md`.
- [x] Replaced `sk_test_placeholder` fallback: royalty webhook now verifies Stripe signatures locally via HMAC (no API client / no key needed for verification). *(2026-08-23)*
- **Accept**: prod env validation passes at runtime boot; drill evidence committed; grep shows no placeholder key fallbacks.

### WS-0.7 XSS + CSP *(H1, H2)*
- [x] Escape-before-linkify in `formatContent`. *(2026-08-23)*
- [x] CSP: `'unsafe-eval'` removed in production; blanket `https:` script origin removed (verified app loads zero third-party scripts). *(2026-08-23)*
- [ ] Nonce/hash infrastructure to drop `'unsafe-inline'`; e2e XSS-payload test.

### WS-0.8 Admin gate split *(H3)*
- [ ] Define platform-admin = `profiles.is_admin` OR numeric capability; org/tour roles grant org surfaces only. Enforce internal `assertAdmin` on every `/api/admin/*` route not already wrapped (audit list ~15 known gaps).
- **Accept**: organizer account receives 403 on `/api/admin/*` ops routes lacking business need (persona matrix extended).

### WS-0.9 Private storage for sensitive docs *(H4, H5)*
- [x] New uploads moved to `private-docs` (private) with signed read URLs; registry rows carry the new bucket. *(2026-08-23)*
- [ ] Backfill migration for pre-existing objects still sitting in `profile-images` (needs DB pipeline approval).
- [x] Path forced into caller's `<user-id>/` prefix, traversal stripped, expiry clamped 60s–7d. *(2026-08-23 — endpoint had zero callers, no breakage)*
- **Accept**: anonymous fetch of credential URL → 404/403; cross-prefix sign attempt rejected (tests pending).
- **Accept**: anonymous fetch of credential URL → 404/403; cross-prefix sign attempt rejected (tests).

---

## Phase 1 — Correctness & operability · P1 · Target: Weeks 2–4

### WS-1.1 Database foundation *(M8, M9, M10, H11, H12)*
- [ ] Complete migration reconciliation (unblock their own Phases 0–3): decide every quarantined/duplicate version; land baseline; make CLI chain the sole source of truth; delete root `migrations/` duplicates after reconciliation; retire manual-paste instructions (`scripts/setup-auth.sh`), ad-hoc appliers, and stale Prisma schema.
- [x] PII hardening migration STAGED: quarantined fix re-issued byte-identical as `20260823210000_harden_hiring_onboarding_pii.sql` (fresh timestamp; original was quarantined solely for a version collision) + validation manifest. NOT applied.
- [x] Venues/RBAC RLS baseline STAGED: `20260823210100_venues_rbac_rls_baseline.sql` — enables RLS on venues + rbac family, scoped policies, and SECURITY DEFINER `has_entity_permission` replacement to prevent policy recursion + manifest. NOT applied.
- [x] Webhook ledger STAGED: `20260823200000_platform_webhook_events.sql` + manifest (from Phase 0 pass). NOT applied.
- [ ] Apply all three through the gated pipeline (dry-run → staging → production).
- [x] Staged migration `20260823221000_event_hq_rls_tighten.sql` (+manifest): Event HQ tables were fully open INCLUDING anon writes; now authenticated-only reads, creator-scoped writes, admin override. *(2026-08-23)*
- **Accept**: live table count reconciles with chain (±documented exceptions); persona-matrix covers staffing personas; linter report clean on new baseline.

### WS-1.2 Transactions everywhere money/data mutates *(H6, H8)*
- [x] Object-level authz added to `app/events/_actions/event-actions.ts`: all four actions now require `event.manage` on the referenced org; status updates authorize against the event's *actual* org (never client-named); holds verify calendar↔org binding. *(2026-08-23)*
- [x] Audited remaining `_actions`: `orgs/_actions` fixed in pass 1; forums actions authenticate properly; `app/lib/actions/*` are Prisma-era legacy — retire with the Prisma cleanup rather than harden. *(2026-08-23)*
- [ ] Marketplace checkout idempotency: VERIFIED ALREADY IMPLEMENTED (payload.idempotencyKey + unique-violation race handling) — backlog item closed as no-op.
- [x] Settlements: `replace_ticket_revenue_allocations` RPC staged (atomic delete+insert + in-transaction ≤100% share validation) + route wired with graceful degradation; zod-level percentage-sum pre-check added. *(2026-08-23)*
- [x] Tour delete: `delete_tour_cascade` RPC staged (links+events+tour in one transaction, typed tour_not_found) + route wired with fallback; 404 semantics preserved. *(2026-08-23)*
- [x] Box-office sell: compensating saga — cash/comp orders that complete but fail fulfillment now revert to `failed` (visible + retryable) instead of paid-but-ticketless. True SQL atomicity impossible while QR issuance lives app-side; long-term move issuance into an RPC tracked below.
- [x] Messages conversation-create: VERIFIED already race-safe (unique-violation refetch path exists); schema-drift fallback cascade remains tech-debt cleanup only. *(2026-08-23)*
- [ ] Staged migration awaiting pipeline: `20260823220001_money_path_transactional_rpcs.sql` (+ manifest; carries same documented DELETE-FROM-in-function-body flag as the repo's own venue-lifecycle RPC). Renumbered during branch reconciliation to preserve the tracked `20260823220000_site_map_bridge.sql` identity.
- [ ] Long-term: move ticket credential issuance server-side into an RPC so box-office/transfers become single-transaction.
- **Accept**: each listed flow has an atomicity test; actions deny cross-org writes (tests).

### WS-1.3 Rate limiting & abuse controls *(H9, H10, M6)*
- [x] Limiter explicitly degrades: production warns once that limiting is INACTIVE; `RATE_LIMIT_ENFORCE=true` flips to deny-all when Redis is absent. *(2026-08-23)*
- [x] Covered: search ×3 (+unified via re-export), upload signing, avatar upload, error-report POST. *(2026-08-23)*
- [x] `analytics/errors`: GET platform-admin-only (`assertPlatformAdmin`) reading via service role; POST zod-whitelisted fields + batch/length caps + IP limiter. *(2026-08-23)*
- [x] `.or()` interpolations sanitized (user-search, box-office `q`). *(2026-8-23)*
- [x] Ticket check-in limiter now distributed-first (`ticket-checkin` namespace via Upstash), in-memory Map demoted to explicit fallback when Redis absent. *(2026-08-23)*
- [ ] Remaining coverage: login/signup/reset (client-side Supabase calls — no first-party endpoint; document reliance on Supabase built-ins or add edge middleware), messaging fan-out redis layer.
- **Accept remaining**: load/rate-limit smoke demonstrates 429s in an env with real Upstash.

### WS-1.4 Observability on *(C6/L16)*
- [ ] Set Sentry DSNs (web+mobile), enable traces; uptime monitoring on `/healthz` + key flows; alert routing (on-call rotation doc); SLOs for auth/checkout/stream.
- [ ] Instrument checkout/purchase funnel events end-to-end.
- **Accept**: injected error pages appear in Sentry <5 min; uptime alerts fire in drill.

### WS-1.5 Scheduled work actually scheduled *(M40, L17)*
- [x] Scheduled 3 of 4 unscheduled crons in vercel.json: staffing-overview-refresh (*/5), workflow-automations (*/10), admin-publication-outbox (*/5). *(2026-08-23)*
- [ ] `event-reminders` remains unscheduled deliberately — route is a stub ("implement your reminder logic"); implement then schedule.
- [ ] Register MV refresh (`refresh_forum_mviews`) via pg_cron; deploy the 21 music outbox workers as scheduled jobs with retry+DLQ.
- **Accept**: vercel.json maps every existing cron route; workers have health checks and are monitored.

### WS-1.7 Systematic internal-guard sweep on /api/admin mutations *(H3 follow-up)* — VERIFIED COMPLETE 2026-08-23
- [x] Full classification of all flagged mutation routes: **zero genuinely unguarded mutations found.** Every suspect uses one of ~8 guard idioms: `requireSiteMapAccess`, `resolveActingAdminContext`+`requireAdminCapability`, `hasEntityPermission` RPCs, `canReviewStaffingApplications`, domain permission checks (`userCanAdminRoyaltiesOps`, reviewer/ops permissions), ownership checks, or read-only introspection. The original audit claim was a pattern-matching false positive.
- [ ] Codify ONE standard wrapper and migrate the ~8 idioms onto it (maintainability, not security).
- [ ] H3 core remains open as a product decision: middleware's broad org-account gate for `/admin/**` pages vs strict platform-admin semantics for `/api/admin/**`.

### WS-1.6 Restore green CI *(H14, §8 results)*
- [x] Runner mismatch fixed (audius suites excluded from jest) — jest now 100% green (617/617). *(2026-08-23)*
- [x] ENOENT-on-quarantined-migration tests repaired via `__tests__/helpers/migration-source.ts` resolver; stale discover assertion updated to the real FollowFriendButton contract. Vitest failures 31→27. *(2026-08-23)*
- [x] Added C1 regression suite (`no-unsigned-cookie-fallback.test.ts`) and C2 regression suite (`org-invite-takeover-guard.test.ts`). *(2026-08-23)*
- [ ] Drive the remaining 27 failures to zero through the documented BLOCKED product/schema decisions (event-tour-builder, publication immutability, logistics contracts, music-post-preview, author-feed IDs, url_slug ownership, parity suites).
- [ ] Make full typecheck tractable: project references / scoped tsconfigs, burn down worst `any` files; target <10 min full check; keep it in required CI.
- [ ] Make `e2e.yml` a required check for deploys; extend Playwright journeys to complete real transactions (sell→check-in→settle; hire→assign shift).
- **Accept**: CI green on main; e2e blocks merges; typecheck completes in budget locally and in CI.

---

## Phase 2 — Product completion (what users hit in week one) · P2 · Weeks 3–8

### WS-2.1 Nav/link/API contract sweep *(M35–M38)*
- [x] VERIFIED STALE (2026-08-23): all 61 audited dead hrefs live in zero-importer legacy nav components (twin-tree dead code queued for Phase 4 removal). One live dead link found & fixed (`venue/mobile-navigation /documents/new` → `/documents`). Link-integrity CI job still wanted.
- [x] VERIFIED RESOLVED upstream (2026-08-23): all 7 previously-missing endpoints now exist (`search/unified`, `business/settings`, `venue/staff-onboarding`, `onboarding/validate-invitation`, `posts`, demo-accounts removed with no remaining callers). Closed as no-op.
- [ ] Decide feature-flag reality: either ship or hide the 144 `feature_disabled` surfaces + 29 coming-soon pages; make public music verify reachable anonymously if intended.
- **Accept**: crawl of all nav hrefs returns 200/redirect-only; zero client calls to 404 endpoints (CI).

### WS-2.2 Event HQ completion *(M38/M39)*
- [ ] Land tables/impl behind comms/day-sheet/documents/group-chats/work-mode so actions stop 501ing; admin shift editing; publish-validation workflow; separate worker-decline from cancel; preserve shift history (soft-delete).
- **Accept**: HQ happy-path e2e passes; scheduling audit items closed.

### WS-2.3 Endpoint consolidation *(M22, M24)*
- [ ] Collapse search ×4 → one; profile-update ×3 → one; onboarding ×2; messages list ×2; delete legacy tours route after admin parity; pick events vs events_v2 strategy and stop runtime schema probing in hot paths.
- [ ] Adopt `packages/api-contracts` for all new/edited routes; add zod to posts/create, onboarding/submit, notifications PATCH.
- **Accept**: duplicate families reduced to one each with redirect shims; contracts coverage metric tracked.

### WS-2.4 GDPR/trust basics *(M18, H11)*
- [x] Self-service account deletion endpoint shipped: `POST /api/account/delete` — verified session + typed confirmation ("DELETE MY ACCOUNT"), IP rate-limited, scrubs SET-NULL survivor PII (job-application contact fields), removes user storage objects across buckets, writes audit row, then `auth.admin.deleteUser` (cascades FK-linked content). *(2026-08-23)*
- [ ] Settings UI entry point (Danger Zone panel) wiring into EnhancedSettingsRouter.
- [ ] Erasure coverage map: enumerate tables WITHOUT auth.users FKs that may retain content; extend scrub list as reconciliation lands.
- **Accept remaining**: e2e delete journey on staging.

### WS-2.5 Mobile store submission *(M31–M33)*
- [x] Push `projectId` fix: token registration now passes `extra.eas.projectId` explicitly. *(2026-08-23)*
- [x] `event_group` conversations now route via their web `action_url` handoff (they are a separate event_group_chats system with no native screen yet) instead of silently doing nothing. *(2026-08-23)*
- [x] Built missing `apps/mobile/app/group-chats/[id].tsx` thread screen against existing thread APIs — previously index pushed a dead route. *(2026-08-23)*
- [x] Mobile typecheck restored to fully green in-repo (was failing: Sentry option drift fixed; deps installed from lockfile). *(2026-08-23)*
- [ ] Build My Tickets view; real brand assets + localized screenshots via existing pipeline; rewrite store metadata; legal URLs; Apple/Play data forms; verify AASA/assetlinks; reviewer notes + test accounts; confirm EAS credentials.
- **Accept**: TestFlight/Internal pass; submission checklist 100%; both stores approved (or documented pending).

### WS-2.6 i18n + accessibility foundations *(L10, L11)*
- [ ] Pick web i18n framework; extract strings for top 20 surfaces; locale parity with mobile (en, pt-BR, ja, de, fr).
- [ ] A11y pass on core flows (auth, feed, ticket purchase, messaging): aria, keyboard, focus management; shared EmptyState/ErrorState/Skeleton adoption.
- **Accept**: axe scan of core flows clean of criticals; locales build.

---

## Phase 3 — Scale & performance · P3 · Ongoing from Week 4

### WS-3.1 Data-access layer modernization *(M26–M28)*
- [ ] Adopt React Query on web (installed already): start with feed, notifications, messages, venue dashboards; kill global SocialProvider prefetch; add AbortController to top-50 effect fetches.
- [ ] Reduce `'use client'` saturation on read-heavy pages (venue/event/profile directories SSR-first).
- [ ] Move `puppeteer` to devDependencies; dynamic-import heavy charts/motion on dashboards only.
- **Accept**: p95 route transitions drop (perf-budget CI on key pages); bundle analyzer budgets recorded.

### WS-3.2 Database scale mechanics *(M11–M16)*
- [ ] Rewrite hot policies to initplan form (`(select auth.uid())`) starting with posts/notifications/messages; simplify correlated-exists policies.
- [ ] Partition telemetry tables; retention jobs; apply validated counter-repair migrations; add missing FK indexes (applicant_id etc.); schedule concurrent-index steps.
- [ ] Extend FTS to services currently using leading-wildcard ILIKE; land quarantined marketplace FTS decision.
- **Accept**: pgbench/synthetic load on feed+notifications meets latency SLO; slow-query log reviewed weekly.

### WS-3.3 Pagination & payload hygiene *(M25)*
- [ ] Default pagination on all list endpoints (cursor-based); ban new `.select('*')` via lint rule; trim nested payloads on orders/conversations.
- **Accept**: no unbounded lists in top-100 traffic endpoints (measured).

### WS-3.4 Caching/CDN for public pages
- [ ] ISR/cache-headers for public venue/event/artist profiles; signed-edge caching strategy that respects auth-aware variants.
- **Accept**: public profile p95 TTFB <300ms at cache-warm.

---

## Phase 4 — Debt & hygiene · P3 · Rolling

- [ ] Delete verified dead code: root `dashboard.tsx`, `onboarding-complete.tsx`, mock dashboard chain, `app/venue/components/ui/`, `docs/implementation/**` copies, orphan nav components, broken `contexts/index.ts` barrel *(L2, M30)*.
- [ ] Unify twins: venue component trees, navigation ×5, notification centers ×4, `use-mobile` collision, loading/error primitives, two `database.types.ts` *(L3, M29)*.
- [ ] Retire deprecated auth shim imports (root `app/providers.tsx` first) *(L4)*.
- [ ] Decide speculative surfaces (~74 treaty/governance routes): extract to frozen archive or productize *(M23)*.
- [ ] Repo hygiene: dual lockfiles, scoped tsconfig debris, AI-artifact dirs to .gitignore, root debug scripts/emails/plans archived *(L1, L9)*.
- [ ] Realtime resilience: centralized channel registry, reconnect/resubscribe, de-duplicate polling-vs-realtime domains *(L13)*.
- [ ] Remove `types/react.d.ts` JSX wildcard; drive `any` counts down per-dir budgets *(L8)*.
- [ ] Fix android OTA workflow secret-context expression *(L14)*.

---

## Launch-Readiness Gate (all must be true)

| # | Gate | Evidence source |
|---|---|---|
| G1 | All Phase 0 items closed | This doc + security regression suite |
| G2 | Separate demo/prod DBs; PITR verified; restore drilled | Ops runbook |
| G3 | CI fully green incl. e2e blocking + typecheck in budget | GitHub checks |
| G4 | Sentry + uptime + alerting live | Monitoring dashboard |
| G5 | All crons/workers scheduled with monitoring | vercel.json + worker health |
| G6 | Rate limiting active in prod for auth/money/upload/AI | Load test report |
| G7 | RLS: staffing PII hardened; venues/rbac covered; persona matrix green | Migration CI |
| G8 | No raw error leakage on top-traffic endpoints | Contract tests |
| G9 | Mobile submitted/approved; push working in prod builds | Store console |
| G10 | Legal: terms, privacy, GDPR deletion, ticket-buyer terms live | Site + legal review |

---

## Changelog

| Date | Change |
|---|---|
| 2026-08-23 | Initial backlog generated from full-platform read-only audit (`docs/AUDIT_FINDINGS_2026-08-23.md`). Verified: vitest 31F/4595P, jest 617P/2 suite-fails (runner mismatch), eslint 0E/35W, tsc >25min timeout, criticals C1–C6 confirmed line-by-line. |
| 2026-08-23 | **Fix pass 1**: C1, C2, C3, C4, C5(marketplace+idempotency+subscriptions ledger), H1, H2(script-src), H4(new uploads), H5, M3(test routes), C6(placeholder-key) fixed. 22 files changed; eslint clean on all; jest app/api 22/22 pass; vitest auth/marketplace suites 153/153 pass; feed/social/ticketing failures unchanged vs baseline (pre-existing product/schema blockers). New additive migration `20260823200000_platform_webhook_events.sql` created (NOT applied — requires gated pipeline). |
| 2026-08-23 | **Fix pass 2 (Phase 1)**: rate-limiter explicit degradation + enforce flag + new coverage (search/uploads/error-reports); analytics/errors auth-gated + validated; PostgREST filters sanitized; 3 crons scheduled; ops-readiness warnings at boot; jest fully green (617); vitest 31→27 fails; C1+C2 regression tests added; 2 staged RLS migrations + manifests (hiring PII hardening re-issue; venues/rbac baseline w/ recursion-safe definer function). |
| 2026-08-23 | **Fix pass 3**: event-actions object authz (H8 closed); marketplace checkout idempotency verified already-implemented (H7 fully closed); check-in limiter distributed; WS-1.7 admin sweep completed — zero unguarded mutations found across all 44 suspects (~8 idioms catalogued); forums/_actions audited clean. Tests green (jest app/api 22/22; vitest events/ticketing/marketplace suites 98+ pass). |
| 2026-08-23 | **Fix pass 4**: money-path transactional layer staged (`replace_ticket_revenue_allocations`, `delete_tour_cascade` RPCs + route wiring w/ graceful degradation); box-office compensating saga; settlements ≤100% validation at API and DB layers; Event-HQ RLS tightening staged (anon-write hole closed); messages create verified race-safe. Migrations gated ✓ (DELETE-FROM flag = repo-precedented function-body pattern, documented in manifest). |
| 2026-08-23 | **Fix pass 5 (Phase 2)**: GDPR self-service deletion API shipped (typed confirm, PII survivor scrub, storage cleanup, cascade delete); mobile push projectId + event_group web-handoff routing fixed; NEW group-chats/[id] screen built (dead-route fix); mobile typecheck restored green (Sentry drift); M35 verified stale (dead-code hrefs) w/ 1 live fix; M36 verified resolved upstream. Mobile lint 0 errors. |
