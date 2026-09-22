# Tourify Platform — Full Audit Findings (Working Document)

| | |
|---|---|
| **Date** | 2026-08-23 |
| **Repo state audited** | Branch `venue-program/ven-wave0-foundation`, 94 commits ahead of `origin/main`. Working tree: modified `package-lock.json`; untracked `.activation-evidence/`, `.g1-evidence/`. |
| **Mode** | Read-only. No data was modified, reset, or deleted. Only additions: this document and `docs/DEVELOPMENT_BACKLOG.md`. |
| **Status** | WORKING DOCUMENT — update as items are fixed; each finding has an ID referenced by the backlog (`docs/DEVELOPMENT_BACKLOG.md`). |
| **Fix pass 1** | 2026-08-23: C1, C2, C3, C4, C5(marketplace+idempotency), H1, H4, H5, M3, C6(placeholder-key) FIXED in code. See `[FIXED]` tags below. |
| **Fix pass 2 (Phase 1)** | 2026-08-23: H9(explicit degradation+enforce flag+coverage), H10(fixed), M6(fixed), M40(3 crons scheduled), L16(ops-readiness warnings), H14(partial: jest green, mechanical vitest fails fixed 31→27), H11+H12(migration files staged w/ manifests, NOT applied). |

---

## 1. Executive Summary

Tourify is a very large Next.js 15 + Supabase platform (~885K hand-written TS/TSX lines, **373 pages**, **909 API route handlers**, plus a separate Expo mobile app) spanning artist management, venue operations, tours/logistics, marketplace commerce, ticketing, music distribution/rights, hiring/staffing, messaging/social feed, and a large admin surface.

**Overall launch-readiness verdict: NOT READY.** It is best described as a wide, fast-moving beta with pockets of genuine engineering excellence undermined by systemic security gaps, unguaranteed money integrity, a fractured database foundation, dark observability, and unverified operational basics (backups, monitoring). Several issues are exploitable today for account impersonation, organization takeover, ticket theft, and free purchases.

**Headline numbers**

| Area | Result |
|---|---|
| Critical security/money bugs | **6** (verified in this audit, §3) |
| High-severity issues | **14+** (§4) |
| Medium/Low issues | 40+ cataloged (§5–§6) |
| Unit tests (Vitest) | 4,595 pass / **31 fail** / 8 skip (worse than team-documented 14 fails) |
| Jest suite | 617 pass / 2 suites fail (runner mismatch only) |
| ESLint | 0 errors, 35 warnings (within budget) |
| Full `tsc --noEmit` | **Did not complete within 25 minutes** (confirms team's own ">6 min unverified" flag) |
| Team self-reported blockers | 56+ documented items consolidated in §11 |

---

## 2. Scope & Method

Everything below derives from read-only inspection and execution:

1. **Static analysis**: middleware, auth libs, RBAC, CORS, CSP, uploads, webhooks, secrets scanning.
2. **API layer review**: 44 route handlers sampled across every money/data-critical domain; counts and pattern greps across all 909.
3. **Database review**: migration chain reconciliation (root `migrations/` vs `supabase/migrations/` vs quarantine vs backup vs ad-hoc scripts), RLS/policy extraction, storage bucket definitions, Prisma schema staleness.
4. **Frontend/library review**: duplication mapping, dead-code verification (zero-importer checks), performance patterns, a11y/i18n sampling, realtime/polling audit.
5. **Mobile review**: feature matrix, security posture, store-submission readiness.
6. **Tests/CI/CD/Ops review**: all 16 GitHub workflows, cron mapping, env contract, observability wiring, team self-audit docs (`docs/audits/*`, `docs/audit-remediation/2026-07-27/*`, `progress.json`).
7. **Executed verification** (read-only): `vitest run`, `jest`, `eslint .`, `tsc --noEmit` (timed out >25 min).

Commands that could mutate state (builds, seed scripts, DB scripts, `qa:seed*`) were deliberately **not** run.

Severity key: **C** = critical, **H** = high, **M** = medium, **L** = low. Every finding has an ID used by the backlog.

---

## 3. CRITICAL Findings (verified)

### C1. Unsigned session-cookie parsing grants identity impersonation → service-role DB access `[FIXED 2026-08-23: all fallbacks removed; 9 routes + both auth libs converted to verified auth]`
- **Files**: `lib/supabase/tourify-session-cookie.ts` (whole file; esp. `parseUserFromTourifySessionCookieValue` :126, expiry check :12–17); consumers:
  - `app/api/messages/[conversationId]/accept/route.ts`, `.../decline/route.ts`, `.../context/route.ts`
  - `app/api/messages/user-search/route.ts`
  - `app/api/social/suggested/route.ts`
  - `app/api/groups/threads/[id]/**` (thread GET/PATCH/DELETE, members, messages, reactions)
- **Aggravators**: `lib/auth/server.ts:51–84` (`authenticateApiRequest` falls back to cookie JSON parse and returns a **service-role client** bound to the unverified identity); `lib/auth/production-auth.ts:78–93` same pattern (`withProductionAuth`); `checkAuth()` tries cookie parsing *first* (:113–131).
- **Verified**: Yes, read line-by-line. Cookie value is parsed as raw JSON; the only validation is `expires_at > now`, which is attacker-controlled. No JWT signature check anywhere in the path.
- **Impact**: Setting cookie `sb-tourify-auth-token={"access_token":"x","user":{"id":"<victim>"},"expires_at":9999999999}` impersonates any user on those endpoints (accept/decline victims' DM requests; read/write/delete group threads; enumerate users). Via `authenticateApiRequest` fallback, the returned client bypasses RLS entirely.
- **Note**: `middleware.ts` itself comments "Never trust unsigned cookie JSON as a user identity" — the codebase violates its own rule. Bearer/mobile path (`lib/auth/mobile-request-auth.ts`) does verify correctly.

### C2. Organization takeover via invite actions (any user can grant themselves `owner`) `[FIXED 2026-08-23: server-side owner/admin membership gate; only owners mint owners; strict email match; error-checked writes; conditional-update race guards]`
- **Files**: `app/orgs/_actions/org-actions.ts` `createInviteAction` (inserts client-supplied `orgId` + role ∈ {owner, admin, …} with **only** authentication + rate limit — no membership/ownership check; verified :50–71); `app/api/orgs/invite/accept/route.ts` (copies `invite.role` verbatim into `org_members.role`, sets `can_manage_settings: true` for owner/admin :59–62; skips email match when either side's email is empty).
- **Impact**: Any authenticated user mints an owner invitation to any organization → accepts it → controls the org (settings, content, members). Complete privilege-escalation chain, verified end-to-end.

### C3. Ticket-transfer IDOR → ticket theft `[FIXED 2026-08-23: verified-email requirement for email transfers; conditional ownership claim; finalize race guard + compensation]`
- **File**: `app/api/ticketing/transfers/route.ts:129` — ownership check `if (transfer.to_user_id && transfer.to_user_id !== auth.user.id)` short-circuits when the transfer was created to an email (`to_user_id` null): **any** authenticated user can accept any pending email-addressed transfer, taking ownership (`owner_user_id` rewritten) and receiving reissued QR credentials. No email verification. Five sequential writes with no transaction (partial-failure leaves tickets revoked/reissued inconsistently).

### C4. Self-issued unlimited discounts in ticketing `[FIXED 2026-08-23: server-side clamp at creation ($10 max) AND at application (≤ order base); promo validation no longer leaks internal rows]`
- **Files**: `app/api/ticketing/enhanced/route.ts` `create_referral` action lets the caller set `discount_amount` (uncapped); at purchase time `discountAmount += referral.discount_amount` with no clamp against price or per-user cap. Usage counters incremented only best-effort on the free path.
- **Impact**: Free (or corrupted-fee) orders at will.

### C5. Inventory oversell races in both money pipelines
- Marketplace: `lib/marketplace/webhook-processor.ts` `decrementInventory()` is select-then-update `[FIXED 2026-08-23: optimistic-concurrency conditional decrement with retry; checkout-time reservation RPCs remain the P1 completion item]` with no `inventory_count >= qty` guard or atomic RPC → concurrent paid webhooks oversell.
- Ticketing: availability pre-check advisory; correctness depends on feature flag `isTicketingV2Enabled()` (which also toggles whether purchase requires login at all). `reserve_ticket_inventory` RPC exists but isn't used consistently.

### C6. Production cannot be operated safely today (ops-critical configuration)
- Demo and production **share one Supabase project** (`deployment/demo.env:11`, `deployment/production.env:15` → same ref `auqddrodjezjlypkzfpi`), contradicting the staging-first migration design; the team itself froze shared-DB writes (`docs/audit-remediation/2026-07-27/EXECUTION_STATUS.md`).
- Vercel production env incomplete per team handoff (`docs/tourify-live-deploy-readiness-handoff.md`, status: blocked): missing `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, `INTERNAL_API_SECRET`, `ENCRYPTION_KEY`; `SITE_URL` points at demo.
- Backups/PITR **unverified** (RPO/RTO "Unverified"; PITR decision pending cost approval; storage-object backup "Not implemented" — `RECOVERY_AND_CONTINUITY_PLAN.md`).
- Live production deployment stale (June 10, 2026 per handoff doc).
- Payments/email degrade **silently** when env vars are missing (optional in `lib/config/environment-contract.ts`): Stripe payouts disabled, emails skipped with only a console warning, royalty payout webhook constructs Stripe with `"sk_test_placeholder"` fallback (`app/api/webhooks/music-royalty-payouts/route.ts:25`).

---

## 4. HIGH Findings

### Security
- **H1. Stored XSS in feed rendering** `[FIXED 2026-08-23: escape-before-linkify in formatContent]` — `components/feed/post-card.tsx:171–180` `formatContent()` regex-linkifies without HTML-escaping the rest of the content; rendered via `dangerouslySetInnerHTML` (:283–287, :537). A post containing `<img src=x onerror=…>` executes for every viewer.
- **H2. CSP too weak to mitigate XSS** `[PARTIALLY FIXED 2026-08-23: 'unsafe-eval' removed from production, blanket https: script origin removed (no third-party scripts exist); 'unsafe-inline' remains pending nonce infrastructure]`
- **H3. "Admin" is not an allowlist** — `lib/auth/admin.ts:26–141` + `lib/auth/admin-profile-gates.ts:16–26`: any organizer/organization account, org member (owner/admin/tour_manager/production), or confirmed tour team member passes `userHasAdminSurfaceAccess` → reaches **all** `/admin/**` pages and every `/api/admin/**` route relying on middleware alone (organizers auto-assigned `adminLevel: 'super'`). Fails closed on error (good), but the gate itself is wide. `[CORRECTION 2026-08-23: re-verification found both originally-named ops routes ARE strictly protected (`userCanAdminRoyaltiesOps`, `assertAdmin`); per-route guard coverage is far broader than first scanned — idioms include `withAdminCapability`, `withAdminAuth`, `checkAdminPermissions`, `has_entity_permission`, bare `role==='admin'`. A systematic sweep of ~56 mutation routes lacking recognizable guards remains backlog WS-1.7; shared helper added at `lib/auth/platform-admin.ts`.]`
- **H4. Staff certification documents uploaded to a PUBLIC bucket** `[FIXED 2026-08-23: uploads moved to private-docs]` — `app/api/settings/certifications/upload/route.ts:42–53` → `profile-images` bucket provisioned `public: true` (`app/api/setup-storage/route.ts:21–25`). Private staff credentials readable by URL.
- **H5. Unrestricted storage-path upload signing** `[FIXED 2026-08-23: own-prefix enforcement + expiry clamp; endpoint had zero callers]` — `app/api/upload/signed-url/route.ts:13–15`: any authenticated user gets a signed upload URL for **any** caller-supplied `filePath` in `private-docs` (cross-user overwrite/planting); client-controlled `expiresInSec` ignored.

### Money-path integrity
- **H6. No transactions anywhere in money paths** `[PARTIALLY FIXED 2026-08-23: settlements + tour-cascade atomic via staged RPCs w/ graceful-degradation wiring; box-office compensating saga (failed orders visible+retryable); transfers guarded pass 1; messages create verified race-safe; marketplace checkout already idempotent]` — marketplace checkout (order→items→ledger→Stripe compensated by hard DELETEs), settlements delete-then-insert, box-office sell, transfers, messages conversation creation, tour DELETE cascades. Postgres RPCs exist but are inconsistently used.
- **H7. Idempotency gaps on payment-adjacent writes** `[PARTIALLY FIXED 2026-08-23: ticket purchase now honors Idempotency-Key header/body and dedupes orders+sessions; subscriptions webhook gained event ledger + error propagation; marketplace checkout key adoption still pending]` — ticket purchase had no idempotency key (double-click = duplicate orders/Stripe sessions); subscriptions webhook lacks event dedupe and swallows failed upserts returning 200 (blocks Stripe retries); subscriptions checkout trusts arbitrary client `priceId`.
- **H8. Server actions missing object-level authz** `[FIXED 2026-08-23: all four events/_actions now gate on has_perm(event.manage) against the referenced/actual org; hold creation verifies calendar↔org binding]` — `app/events/_actions/event-actions.ts` (create/update/hold take client-supplied `orgId`/`eventId`, authentication only, no org-role check; safe only if RLS happens to block it — unverifiable at this layer, inconsistent with the rest of the app).

### Scale & abuse
- **H9. Rate limiting decorative at scale** `[PARTIALLY FIXED 2026-08-23: explicit INACTIVE warning in production; RATE_LIMIT_ENFORCE=true fail-closed opt-in; limiters added to search×3, upload signing, avatar upload, error-report POST]` — `lib/utils/rate-limit.ts:31–32` fails open when Upstash env absent; only ~37/909 routes use it; login/signup/password-reset rely solely on Supabase built-ins; `ticketing/check-in` uses an in-process Map (useless across serverless instances).
- **H10. Unauthenticated telemetry writes / error-report reads** `[FIXED 2026-08-23: GET now platform-admin only via assertPlatformAdmin + service-role read; POST zod-whitelisted fields, batch≤10, field caps, IP rate-limit]` — `app/api/analytics/errors/route.ts` POST anonymous inserts, GET returns up to 500 error reports (messages, session IDs) with no auth check; `app/api/epk/telemetry/route.ts` anonymous insert.

### Product/data
- **H11. Staffing/hiring PII readable by any signed-in user** — `job_applications`, `staff_onboarding_candidates`, `staff_members`, shifts etc. have `auth.role()='authenticated'`-wide SELECT/INSERT/UPDATE policies while carrying applicant email/phone/form responses (`supabase/migrations/20250818120000_admin_staffing_core.sql:328–439`). Purpose-built fix exists **only in quarantine** (`supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/20260718070001_harden_hiring_onboarding_templates_and_pii.sql`). Their own shift-hardening migration admits the class of bug (`20260823072000_shift_rls_hardening.sql:5–11`).
- **H12. Canonical `venues` table + RBAC core have NO RLS in-chain** — `venues` created without RLS/policies (`20250818120000_admin_staffing_core.sql:16–24`); `rbac_roles`, `rbac_user_entity_roles`, `rbac_user_permission_overrides`, `rbac_permission_audit_log` lack ENABLE statements (the authorization grants themselves are unprotected at the chain level; live-DB coverage unverifiable from repo).
- **H13. Typecheck does not complete** — full `tsc --noEmit` ran >25 min without finishing (this audit, 8 GB heap script). CI claims typecheck gating; local verification impossible; monorepo-scale type debt (~3,420 `: any`) unmeasurable in reasonable time.
- **H14. Test suite red and drifting** `[PARTIALLY FIXED 2026-08-23: jest/vitest runner mismatch resolved (jest 617/617 green); quarantined-migration ENOENTs resolved via __tests__/helpers/migration-source.ts resolver; stale discover assertion updated to real contract; remaining 27 vitest failures are the documented BLOCKED_PRODUCT/SCHEMA decisions; new C1+C2 regression tests added]` — 31 failing tests across 22 files (vs team-documented 14), including failures caused by tests reading migration files that were moved to quarantine (`__tests__/social/follow-friend-ecosystem.test.ts`, `__tests__/polls/polls-integration.test.ts` expect `supabase/migrations/20260712003357_account_follows.sql`, `20260712020525_follower_polls_and_analytics.sql` — ENOENT). Suite health is coupled to migration-file placement.

---

## 5. MEDIUM Findings

### Auth/session/security
- **M1. Session refresh runs only on a subset of routes** (`middleware.ts:89–101`) — public pages never refresh tokens; idle users accumulate stale sessions until a protected navigation.
- **M2. Auth tokens readable by JavaScript** — `lib/supabase/client.ts:63–143,245–264` mirrors session into non-httpOnly cookies + localStorage (amplifies H1/H2).
- **M3. Debug/test routes reachable in production** `[PARTIALLY FIXED 2026-08-23: test-db / test-header-url / test-rss / test-venues added to productionBlockedPrefixes; storage/ensure + social/all-users left active (functional endpoints) pending review]`; secret-gated fail-closed but leak stack traces in error payloads; `/api/debug/db-schema` dumps schema/sample rows if bearer leaks.
- **M4. Migration/DDL helper routes ship in production surface** — `app/api/migrations/*` (create-tables, setup-policies…) behind internal bearer only.
- **M5. Unsigned-webhook escape hatch** — env-gated `*_WEBHOOK_ALLOW_UNSIGNED=true` mutates order/subscription/payout state unsigned (`app/api/webhooks/music-marketplace/[partner]/route.ts`, `music-royalty-payouts/route.ts`). Default fails closed.
- **M6. PostgREST filter interpolation** `[FIXED 2026-08-23: syntax-altering chars stripped before .or() interpolation in user-search + box-office]` — `app/api/messages/user-search/route.ts:30` and `ticketing/box-office` `q` param interpolated into `.or()` filters (filter-semantics manipulation, not SQLi).
- **M7. Acting headers trusted as hints** — `x-acting-profile-id`/`x-acting-account-type` validated against delegation tables (`lib/auth/acting-context.ts` — verified good) but dual server auth stacks (`api-auth` vs `production-auth`) make enforcement uneven across mobile-facing routes.

### Database
- **M8. ~200 live tables owe existence to ad-hoc scripts/dashboard pastes** — live snapshot: 543 public tables vs 327 distinct tables in the CLI chain; 276 local migrations quarantined; root `migrations/` has duplicate version prefixes and `_old/_fixed/_safe/_simple` variants; `scripts/setup-auth.sh:221–225` still instructs pasting `complete_database_setup.sql` into SQL Editor; `apply_comprehensive_solution.js` et al. execute raw SQL via `exec_sql` RPC (now revoked from authenticated — those scripts silently broken).
- **M9. Migration history diverged from remote** — reconciliation script hardcodes exactly 180 remote versions vs 234 local active files; documented collisions (`20250120000000`, `20250818122000`, quarantined duplicate-version pairs); Phase 2 reconciliation **BLOCKED** per `EXECUTION_STATUS.md`.
- **M10. Stale Prisma schema presented as part of the stack** — `prisma/schema.prisma` (6 NextAuth-era models incl. a `password` field) explicitly not the production schema; `postinstall: prisma generate` still runs; pure confusion risk.
- **M11. RLS performance antipattern at scale** — `auth.uid()` unwrapped 1,236× (re-evaluated per row); `(select auth.uid())` initplan form used only 23×; correlated-exists policies over join paths (`venues_v2_select`), plpgsql helper calls per-row everywhere.
- **M12. No partitioning/retention for append-only telemetry** — analytics*, `staffing_api_telemetry`, public-insert `epk_telemetry`, `connect_telemetry_events`, `rbac_permission_audit_log`, `hiring_audit_events`: zero partitioning; only notifications have cleanup functions.
- **M13. Materialized views refresh unscheduled** — `refresh_forum_mviews()` defined; pg_cron line commented out ("register in dashboard") — stale-MV risk.
- **M14. Denormalized counters will drift under concurrency** — followers/posts/views/comment/likes/applications counts trigger-maintained only in some domains; comment-counter repair migration validated but **not applied** (their tracker).
- **M15. Missing indexes on filtered FK columns** — e.g., `job_applications.applicant_id`; several fixed late (follows 2026-08-01, events.venue_id months after column). JSONB-typed hot filters rely on expression indexes (`settings->>'visibility'`).
- **M16. Search inconsistency** — good recent FTS rollout (10 tables weighted tsvector + GIN + trgm) but services still issue leading-wildcard `ILIKE '%term%'` (`friend-suggestions.ts:250,305`, `hiring-roster.service.ts:487`, `artist.service.ts:248`); marketplace FTS quarantined so marketplace has neither.
- **M17. Dual hard-delete/lifecycle paths** — `app/api/venues/delete/route.ts:34–43` hard-deletes `venue_profiles` while new archive→delete lifecycle RPC with preflight/audit/ownership-transfer exists (`20260823120000_venue_account_lifecycle.sql`). Two deletion paths coexist.
- **M18. No self-service account deletion (GDPR erasure)** `[PARTIALLY FIXED 2026-08-23: POST /api/account/delete live (typed confirmation, PII survivor scrub, storage removal, cascade delete); settings UI entry + full erasure coverage map still pending]` — no `auth.admin.deleteUser` anywhere; privacy page says contact support; `job_applications` applicant PII survives via ON DELETE SET NULL.
- **M19. Conflicting storage-bucket setup scripts** — six+ scripts define the same buckets with different public flags; `application-documents.public=true` flagged by their own handoff doc as an exposure.
- **M20. `event_resources FOR DELETE USING (true)` / `event_bulletins UPDATE/DELETE USING (true)`** (`20260413120000_event_hq_tables.sql`).

### API/frontend
- **M21. Information leakage** — 313 spots return raw `error.message`/DB errors to clients (posts/create, transfers, settlements, admin/marketplace/orders…).
- **M22. Endpoint sprawl & duplicates** — search ×4 (`/api/search` 574L, `/enhanced` 422L, `/global`, `/unified`), profile update ×3, onboarding submit ×2, messages list ×2, ticketing = literal re-export proxy of enhanced, legacy `/api/tours/[id]` kept live alongside admin variant, events vs events_v2 dual schema probed at runtime by fallback cascades (messages handler tries up to three schema variants per request).
- **M23. Speculative surface area** — ~74 "creator treaty"/interoperability/federation governance routes across 10+ domains, flag-gated with self-described legacy disclaimers; 288-route admin domain; 80+ debug/test/speculative routes expand attack surface and maintenance cost.
- **M24. Contracts package aspirational** — `packages/api-contracts` zod schemas imported by 6–7 of 909 routes; the other ~900 validate ad hoc (or not at all — e.g. `onboarding/submit` spreads raw body into service; `posts/create` has no zod/content cap).
- **M25. Pagination defaults absent** — only 57 route files paginate; 485 `.select('*')`; conversation list unbounded; nested `order_items(*)` full payloads; N+1 await-in-loop in 61 routes; 135 routes create service-role clients inline.
- **M26. Frontend data layer pre-library era** — React Query v5 installed but **zero web usage** (mobile-only); 729 raw `fetch('/api/…')` calls inside components; global `SocialProvider` prefetches feed on every route mount (`contexts/social-context.tsx:68–92` via `app/providers.tsx`); 41 `setInterval` polling loops duplicating existing realtime subscriptions; cancellation (AbortController) in only 15 files vs 524 doing effect fetches.
- **M27. Client-component saturation** — 78% of tsx files `'use client'` (92% in components/); only 43 pages do direct server-side data access.
- **M28. Heavy-dep hygiene** — `puppeteer@^24` in runtime `dependencies` (only used by scripts; downloads Chromium on prod installs); framer-motion statically imported in 171 files; tree-shake list covers only lucide-react.
- **M29. Two sources of truth for DB types** — `lib/database.types.ts` (33,756 lines) AND `types/database.types.ts` (1,590 lines), different content, both actively imported (21 vs 15 files).
- **M30. Broken barrel file** — `contexts/index.ts:5` imports `ProfileProvider` from `../context/venue/profile-context` which doesn't exist; latent build-breaker if ever imported.

### Mobile
- **M31. Push token registration defect** `[FIXED 2026-08-23: projectId now passed from extra.eas config]` — `getExpoPushTokenAsync()` called without `projectId` (`apps/mobile/lib/notifications/push-notifications.ts:35`) — fails on some production builds.
- **M32. Ticketing parity gap** `[PARTIALLY FIXED 2026-08-23: group-chats dead-route screen built + event_group web-handoff routing added; My Tickets view still pending]` — quantity hardcoded to 1; no My Tickets surface.
- **M33. Store assets are placeholders; metadata describes wrong product** — generated solid-color PNGs; `store-metadata.csv` contains travel-app copy ("Discover local experiences… trips"); legal URLs pending; Apple/Play data-safety forms blank; AASA/assetlinks ownership unverified; reviewer notes empty.
- **M34. Direct Supabase table access from ~8 mobile screens** bypasses API layer (chat, unread counts, search, events, shifts/bookings) — RLS-mitigated but unauditable; offline queue stores request bodies plaintext in AsyncStorage.

### Product/UX (from platform's own audit + spot verification)
- **M35. Dead navigation & 404s** `[VERIFIED STALE 2026-08-23: all 61 hrefs sit in zero-importer legacy nav components; 1 live dead link found+fixed]` — team audit reports 61 dead nav hrefs, 31 confirmed live 404s in venue/artist nav trees (`docs/audits/PLATFORM_AUDIT_REPORT.md`).
- **M36. Client calls missing APIs** `[VERIFIED RESOLVED upstream 2026-08-23: all endpoints exist; zero remaining callers of removed demo API]` — 7 APIs called from client don't exist (`/api/search/unified` mismatch, `/api/business/settings`, `/api/venue/staff-onboarding`, `/api/onboarding/validate-invitation`, `/api/posts`, demo-accounts ×2).
- **M37. Feature-flagged-off reality gap** — 144 APIs signal `feature_disabled`; 29 coming-soon surfaces; 180 music-trust flags default off; public music verify unreachable anonymously; `/licensing`, `/institutional`, `/cooperative` 404 on demo.
- **M38. Event-HQ APIs return 501** when tables missing (comms, day-sheet, documents, group-chats, secure-uploads, work-mode…) — surfaces render but core actions fail.
- **M39. Scheduling/shifts gaps (self-reported)** — admin UI lacks shift edit; no publish-validation workflow; worker decline conflated with cancellation; `staff_shifts` hard-deletes lose history; dual shift APIs with different auth models; `adhoc_venue_id` workaround.
- **M40. Cron coverage holes** — 4 of 7 cron routes **unscheduled** in vercel.json: `event-reminders` (stub: "implement your reminder logic"), `staffing-overview-refresh`, `workflow-automations`, `admin-publication-outbox`.

---

## 6. LOW Findings

- **L1.** Repo-root debris: dead `dashboard.tsx` (50KB mock, zero importers — verified), `onboarding-complete.tsx` (dead), mock dashboard chain `components/dashboard.tsx`+`dashboard-client.tsx` (unrouted), `apply_comprehensive_solution.js`, `debug-kyle-profile.js`, `fix_dup.py`, `fix_service*.py`, `temp-auth-workaround.js`, `test_write.txt`, 5 email-template HTML variants (one 334KB), 12+ one-off `*-plan.md` files, stray `.pid`/`.log` files.
- **L2.** Entirely dead directories verified zero-importers: `app/venue/components/ui/` (50 files ≈4.9K lines), `docs/implementation/**` (61 duplicate .tsx copies), `components/feed-main.tsx`, `components/messages.tsx`, orphan navigation components.
- **L3.** Duplication clusters: twin venue component trees (137 colliding filenames: 76 byte-identical, 60 drifted), 5 competing navigation systems, 4 notification centers, `useIsMobile` ×4 (including same-directory collision `hooks/use-mobile.ts` vs `.tsx` — extension-order resolution hazard), loading-spinner ×4, error-boundary ×5, profile-context ×2.
- **L4.** Auth shim chain: canonical `contexts/auth-context.tsx` + deprecated `context/auth` (still used by 9 files **including root `app/providers.tsx`**) + `hooks/use-auth.ts`.
- **L5.** `eval('import("ioredis")')` style hack in `lib/cache/redis-cache.ts:35`.
- **L6.** Committed env samples expose project ref only (values are placeholders) — acceptable, but `vercel-import.env`/`deployment/*.env` templates point both envs at one project (see C6).
- **L7.** Overly broad prefix matching in middleware protectedRoutes (`'/venue'` matches `/venues`; mitigated by share-route exemptions).
- **L8.** `types/react.d.ts:11` declares `IntrinsicElements: { [elemName: string]: any }` — disables unknown-JSX-element errors globally.
- **L9.** Dual lockfiles (`package-lock.json` + `pnpm-lock.yaml`); five extra scoped tsconfigs left in tree; `.agents/.bob/.cursor` AI artifacts committed.
- **L10.** A11y weak-to-moderate: aria attributes in only 251 of ~2,000 component files; canvas/DnD editors essentially inaccessible; keyboard support thin outside Radix primitives.
- **L11.** i18n absent on web entirely (mobile ships 5 locales) — hardcoded English strings throughout web.
- **L12.** No shared EmptyState/ErrorState primitives (~100 files hand-roll); Skeleton used in only 40 files.
- **L13.** Realtime: hook-level cleanup correct; service-layer subscriptions depend on callers remembering `removeChannel`; no reconnect/resubscribe logic; same domains served by both polling and realtime.
- **L14.** Android OTA workflow `if:` condition uses invalid `secrets.X != ''` context comparison (never works as intended).
- **L15.** `e2e.yml` Playwright failures do **not block deployments** (deploy triggers off `ci.yml` only); no per-PR preview environments; no canary/rollback automation.
- **L16.** Observability dark even though scaffolding exists: Sentry configs delegate to shared module that no-ops without DSN (DSN unset in prod); no uptime monitoring, alert routing, on-call, SLOs; load testing is a GET-smoke script only.
- **L17.** 21 `music:*-worker` outbox workers exist only as manual CLI scripts — nothing schedules them in production.
- **L18.** `android-native-release`/iOS release signing unconfirmed (EAS-managed, but no evidence `eas credentials` has been run); version mismatch package.json 0.1.0 vs app.config 1.0.0.

---

## 7. User-Flow Audit Matrix (state of each major flow)

| Flow | Web state | Mobile state | Key gaps |
|---|---|---|---|
| Signup/Login/Verify | Works; redirects hardened | 90%; PKCE correct | Password-reset deep-link gap (mobile); no rate limiting beyond Supabase built-ins; unsigned-cookie paths (C1) |
| Onboarding (all account types) | Multiple competing flows (submit vs unified vs token) | 90% | Duplicate endpoints spread raw bodies; artist_profiles creation ownership disputed by own tests (failing test) |
| Dashboard | Renders per account type | n/a | God-files (1.9K-line pages); 13-query mount storms (perf doc) |
| Feed/Social | Works; XSS hole (H1) | Posts/follows fine | Global provider refetch; engagement counter drift (M14) |
| Messaging/DMs | Works; request accept/decline vulnerable (C1); conversation list unbounded | 90%; realtime OK | Schema-drift fallback cascade per request; `event_group` conversations silently unroutable on mobile |
| Events (create/manage/HQ) | Create works; HQ actions 501 where tables missing | Browse/detail 80% | Dual events/events_v2 schemas; server-action authz gap (H8) |
| Ticketing (purchase/check-in/transfer/settle) | Purchase works when v2 flag on; transfer theft (C3); discounts forgeable (C4); oversell (C5); verify endpoint exposes buyer PII publicly by design | Quantity locked to 1; no My Tickets (M32) | Flag-dependent auth requirements; no idempotency (H7) |
| Marketplace (browse/listings/checkout/orders/payouts) | Checkout contract-tested (best-in-repo); oversell race (C5); tax quote hardcoded 3 states | Deliberate deferral → web handoff | Guest checkout OK; sequential-write compensation instead of transactions |
| Subscriptions/billing | Works with Stripe when keys set | n/a | Silent disablement when env missing (C6); arbitrary priceId accepted |
| Tours/planner/advancing | Core works; delete non-transactional | Deferred | Legacy route kept live alongside admin variant; event-tour-builder test failing (product decision pending) |
| Venue ops (profile/settings/staff/shifts/hiring) | Newest wave actively fixing (94 commits ahead); PII policy hole (H11); scheduling gaps (M39) | Shifts/bookings via direct reads | Canonical venues table lacks RLS in-chain (H12); two deletion paths (M17) |
| Music (upload/stream/rights/royalties) | Stream/download well-built (signed URLs, resolver) | 90% w/ background audio | Royalty webhook placeholder-key fallback (C6); play-count spam vector; trust flags default off |
| Hiring/jobs | Deep implementation; PII exposure (H11) | Jobs deferred | 20-route domain, 9-test-file coverage only |
| Orgs/teams | Invite takeover chain (C2) | n/a | Role enum includes owner on client-callable action |
| Admin console | Huge surface (288 routes); model endpoints exist (`admin/finances/commands`) | n/a | Gate too broad (H3); inconsistent internal enforcement |
| Search | 4 overlapping endpoints | 60% (bare ilike) | Consolidation debt (M22); marketplace FTS quarantined |
| Notifications | Works; prefs API exists | 75% | Push projectId bug (M31); preferences screen missing |
| EPK/press | Present | Deferred | God-component 3.4K lines |
| Legal/terms/privacy | Pages exist | Pending URLs | No GDPR deletion flow (M18); ticket-buyer terms present |
| Institutional/licensing/cooperative/treaty surfaces | 404 on demo; flag-gated | n/a | Decide: ship or delete (speculative ~74 routes) |

---

## 8. Verified Toolchain Results (this audit's runs)

| Command | Result |
|---|---|
| `npx vitest run` | **Test Files: 22 failed \| 451 passed \| 2 skipped. Tests: 31 failed \| 4,595 passed \| 8 skipped.** 171s. Failure clusters: publication schema/outbox, logistics route contracts (5), music-post-preview (3), workforce assignment mapping (2), account-author-feeds (2), artist-public-profile-parity (2), artist-url-slug (2), follow-friend-ecosystem (2 — ENOENT on quarantined migration), polls integration (ENOENT), premiere-styles, post-engagement persistence, site-map ops, event-share, feed-analytics-scope, grant-tour-admins-scope, legacy-tour-route-inventory, event-tour-builder. 4 whole files crash on import/collection (sec101-migration-contract, post-styles/migration-contract, tour-quick-start, admin-owner-org-scope-migration). |
| `npx jest` | 99 suites: 97 pass, **2 fail** — `lib/music/providers/audius/__tests__/audius-{mappers,errors}.test.ts` import vitest but match jest's testMatch (runner mismatch; jest.config excludes only one such file). 617 tests pass. |
| `npx eslint .` | **0 errors, 35 warnings** (budget 97/101 — passes). Warnings: unused eslint-disable directives in `lib/admin/*`, `lib/auth/admin.ts`, `lib/playback/registry.ts`, `scripts/e2e-social-harness.ts`. |
| `npx tsc --noEmit` | **Timed out >25 min without completing** (NODE_OPTIONS 8GB heap per package script). Confirms team's ">6 min unverified" flag. Blocking for CI credibility and any large refactor. |

Failing-test root causes fall into three buckets: (a) product decisions pending (event-tour-builder, music-post-preview rendering, public-profile parity), (b) schema decisions pending (publication immutability, logistics contracts, author-feed IDs, url_slug ownership), (c) mechanical breakage from the migration quarantine (ENOENT file reads).

---

## 9. What Is Genuinely Good (keep and protect)

1. **CI discipline**: lint-warning ratchet, service-role allowlist, admin-route registry, migration validation gates, debug-artifact scan, toolchain pinning, peer-dep checks.
2. **Migration pipeline process** (when followed): manual-dispatch workflows with dry-run, checksums, target verification, staging-first requirement, serialized concurrency.
3. **Live RLS testing** in ephemeral Supabase CI for admin personas and several domain contracts.
4. **Webhook hygiene**: signature verification on every handler checked (Stripe constructEvent, Printful HMAC, Shopify HMAC, partner HMAC) + idempotent event storage in marketplace.
5. **Model endpoints to emulate**: `app/api/admin/finances/commands` (capability check + zod + mandatory Idempotency-Key), `app/api/music/import` (flag + rate limit + ownership + idempotent).
6. **CORS**: strict origin allowlist, echo-only matched origins, dev-only localhost.
7. **Fail-closed posture** in internal/cron guards and middleware catch blocks; production 404 blocking for many debug surfaces.
8. **Env contract** validated at build AND runtime (`instrumentation.ts`), rejecting anon/service-role reuse and incomplete option groups.
9. **Mobile engineering**: SecureStore sessions, PKCE OAuth, offline queue/cache, shared Zod contracts, redirect allowlists with unit tests, zero TODO/mock markers in ~19.5K lines, strong release automation.
10. **Recent venue wave** (branch under audit): real fixes landing daily — booking overlap exclusion constraints, lifecycle RPCs with preflight/audit, publish validation, SSR directory, structured-data SEO.
11. **Honest self-documentation**: the team's own audit docs accurately predicted most of what this independent audit found.

---

## 10. Scale Ceiling Summary (what breaks first at 1M users)

1. Rate limiting no-ops (Upstash unset) → abuse/unbounded spend on AI/upload/search endpoints.
2. Per-row `auth.uid()` policies + correlated-exists policies on feeds/notifications → RLS evaluation dominates query time.
3. Unpaginated selects + 485 `select('*')` + unbounded conversation/order lists → payload explosions.
4. No queue infrastructure; 30s serverless cap; unscheduled crons/workers → fan-out features (reminders, broadcasts, royalties import) stall silently.
5. Telemetry tables unpartitioned → index bloat, vacuum pressure.
6. Single shared Supabase project for demo+prod, no verified PITR → one bad deploy/migration is unrecoverable.
7. No CDN caching strategy for public pages (venue/event/profile pages render per-request through auth-aware paths).

---

## 11. Consolidated Self-Reported Issues (team's own docs, cross-checked)

Sources: `progress.json`, `docs/audit-remediation/2026-07-27/{EXECUTION_STATUS,VITEST_DECISION_SHEET,RECOVERY_AND_CONTINUITY_PLAN}.md`, `docs/tourify-live-deploy-readiness-handoff.md`, `docs/audits/{PLATFORM_AUDIT_REPORT,REMEDIATION_STATUS,DEMO_DEPLOY}.md`, `docs/scheduling-shifts-audit/00-executive-summary.md`, `docs/mobile-readiness-report.md`, `docs/performance-baseline.md`, `docs/initial-architecture-audit.md`, `docs/WORKSPACE_CLEANUP_PLAN.md`.

- Reconciliation Phases 2, 3, 5, 7 **BLOCKED**; Phase 0/1/4 in progress; repository migration gate intentionally red (quarantined migrations lack manifests, unsafe backfills).
- 14 (now 31) failing unit tests blocked on product/schema/test review; P0-001…P0-010 referenced in handoff but absent from TASK_TRACKER.csv (tracker drift).
- Backup/PITR window + recovery drill outstanding; RPO/RTO unverified; rule "never restore over production DB" documented.
- Prod env incomplete (see C6); storage exposures (`application-documents.public=true`, anon-readable forum MVs); migration history divergence (hosted 172 vs local 179 at time of doc; now 180 vs 234+quarantine).
- 68 P0 / 44 P1 platform-audit findings incl. dead nav links, missing APIs, 501 surfaces, feature_disabled sprawl, demo deploy lag.
- Scheduling subsystem doubts; venue↔Work-Mode sync disconnect; decline/cancel conflation; shift history loss.
- Perf: middleware getUser on nearly every request; admin stats mount storm (13 queries); feed author N+1; 4.7K-line client planner page.
- Workspace hygiene: stale Prisma, dual lockfiles, agent-artifact dirs, root clutter, mixed working tree.

---

## 12. Evidence Index

- Security: file+line citations inline above; verified by direct reads (`tourify-session-cookie.ts` full file; `lib/auth/server.ts:51–84`; `transfers/route.ts:129`; `org-actions.ts:50–71`; `orgs/invite/accept/route.ts:21–62`).
- Tests: raw outputs captured in-session (vitest failure list §8; jest tail; eslint tail; tsc timeout).
- Docs: every §11 item traceable to the named doc under `docs/`.
- Counts: 373 pages / 909 API routes / 1,121 component files / 1,197 lib files / 70 hooks / 539 test files / 235 supabase migrations + 30 root migrations / 911,123 LOC (app+components+lib+hooks).

*Maintainer instructions: mark findings `[FIXED <date> @commit]` as they close; add new findings at the bottom of the relevant section with the next sequential ID; never delete entries.*
