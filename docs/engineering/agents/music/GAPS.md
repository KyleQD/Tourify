# Music gaps

Reconciled: 2026-09-10 by MUSIC-001 against the current working tree, refreshed generated maps, and completed MUSIC-002/MUSIC-005/ARTIST-004 evidence.

## Triage legend

- **missing** — required feature, schema, or infrastructure is not present in the active boundary.
- **incomplete** — code exists, but production readiness or end-to-end evidence is missing.
- **improve** — the path works or is covered, but the boundary, resilience, or operating evidence should be stronger.

## Active gaps

### GAP-01 — Rights, certification, trust/origin, and royalty schema is not in the active migration chain [missing]

- **Location**: `app/api/artist/music/rights/**`, `app/api/artist/music/certification/**`, `app/api/artist/music/royalties/**`, `scripts/music-origin-worker.ts`, `scripts/music-royalties-import-worker.ts`, `supabase/migrations/`.
- **Evidence**: Code references tables including `music_rights_projects`, `music_rights_passports`, `music_upload_declarations`, `music_origin_records`, `music_certification_cases`, and `music_royalties_import_batches`. Their DDL is found under `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/` (the trust, certification, rights, and royalty migration files), not under the active `supabase/migrations/` directory. The refreshed generated database map contains no `music_rights_*` or `music_royalties_*` objects.
- **Impact**: The catalog/playback foundation is represented in active migrations, but rights, trust, certification, and royalties cannot be assumed deployable or present in a target database.
- **Next action**: DB/music owners reconcile the archived schema into the authoritative chain additively, validate RLS, and record the target-environment result. Do not copy the archive blindly.

### GAP-02 — Music processing workers have no scheduler or health contract [missing]

- **Location**: `scripts/music-*-outbox-worker.ts`, `scripts/music-preview-worker.ts`, `scripts/music-origin-worker.ts`, `scripts/music-royalties-import-worker.ts`, `scripts/music-rights-anchor-worker.ts`, `scripts/music-rights-derivative-worker.ts`, `scripts/music-trust-reconcile.ts`, `vercel.json`, `app/api/cron/`.
- **Evidence**: There are 16 outbox workers, 5 processing workers, and 1 reconciliation worker; none is registered in `vercel.json` or represented by a music cron route. `MUSIC-004` is the active deployment-framework task.
- **Impact**: Queued outbox, preview, origin, royalty-import, rights-processing, and trust-repair work will not run automatically.
- **Next action**: Decide the worker runtime/cadence, implement retry/DLQ/health semantics, and register only after the schema reconciliation in GAP-01.

### GAP-03 — Music worker integration tests are missing [missing]

- **Location**: the worker paths in GAP-02 and `__tests__/`.
- **Evidence**: Current tests cover pure domain policies and route-auth contracts, but no worker integration test targets the preview, origin, royalty-import, trust-reconcile, anchor, or derivative scripts.
- **Impact**: Claiming queue progress, idempotency, retry, dead-letter, and service-role behavior remains unverified.
- **Next action**: Add fixture-backed worker tests after the active schema and worker contract are settled.

### GAP-04 — Critical music API behavior lacks route-level regression coverage [incomplete]

- **Location**: `app/api/music/stream/`, `app/api/music/play/`, `app/api/music/playlists/`, `app/api/music/certificate/`, `app/api/artist/music/rights/`, `app/api/artist/music/royalties/`, `app/api/artist/music/certification/`.
- **Evidence**: `app/api/music/library/__tests__/route.test.ts`, the Artist Music auth-adoption suite, Marketplace auth-adoption suite, and webhook tests exist. There are still no dedicated route behavior suites for most stream/play/playlist/certificate/rights/royalty/certification handlers.
- **Impact**: Auth adoption is verified, but resource scoping, RLS interaction, feature-disabled responses, and mutation semantics lack comparable route-level safety.
- **Next action**: Prioritize route tests by launch surface and money/rights risk.

### GAP-05 — Royalty payout flow is not verified end to end [incomplete]

- **Location**: `app/api/artist/music/royalties/**`, `app/api/artist/music/payouts/**`, `scripts/music-royalties-import-worker.ts`, `app/api/webhooks/music-royalty-payouts/route.ts`.
- **Evidence**: Import, normalization, matching, allocation, onboarding, batch/status, and signed webhook pieces exist; focused webhook tests pass. There is no integration receipt for import → match → allocate → payout → webhook, and the import worker is unscheduled.
- **Impact**: Royalty correctness and payout state transitions remain unproven in a real data path.
- **Next action**: Build a staged fixture flow after GAP-01/GAP-02 are resolved.

### GAP-06 — Trust reconciliation is only partially verified [incomplete]

- **Location**: `scripts/music-trust-reconcile.ts`, `lib/music/music-trust-flags.ts`, `lib/music/music-trust-persistence.ts`, `lib/music/__tests__/music-trust-phase1.test.ts`, `supabase/tests/music_trust_phase1_rls.sql`.
- **Evidence**: Trust policy unit tests and a SQL RLS contract exist, but the reconciliation worker has no integration test, is unscheduled, and depends on schema objects currently outside the active migration chain.
- **Impact**: Repair status and origin-processing transitions may remain stale or unavailable in deployed environments.
- **Next action**: Reconcile schema, then test idempotent repair and enabled/disabled origin-processing branches.

### GAP-07 — Music feature-flag and release policy is unresolved [incomplete]

- **Location**: `lib/music/music-trust-flags.ts`, `lib/music/royalties/music-royalties-flags.ts`, `lib/music/licensing/music-licensing-flags.ts`, `lib/music/marketplace/music-marketplace-flags.ts`, `app/artist/music/**`, `app/music/verify/**`.
- **Evidence**: Multiple artist surfaces explicitly render disabled states or return `feature_disabled`; licensing, rights, royalties, marketplace, certification, and trust flags are defined, while the product backlog still calls for deciding which gated surfaces ship. `/artist/features/music` redirects to `/artist/music`, and `/venue/dashboard/music` redirects to `/venue/dashboard`.
- **Impact**: The existence of routes does not establish launch availability or anonymous public verification reachability.
- **Next action**: Product owner ranks launch surfaces and records ship/hide/drop decisions before implementation work expands.

### GAP-08 — Shared music service boundary remains fragmented [improve]

- **Location**: `lib/music/music-access.ts`, `app/api/music/**`, `app/api/artist/music/**`.
- **Evidence**: Common access/storage/event/stat helpers exist in `lib/music/music-access.ts`, while rights, certification, royalty, and valuation routes still contain substantial route-local Supabase logic. There is no single music application-service entry point.
- **Impact**: Validation, error semantics, and transaction boundaries can diverge across high-risk flows.
- **Next action**: Extract only after the schema and launch order are stable; do not create a broad abstraction before route tests identify duplication.

### GAP-09 — Creator governance ownership is unclear [improve]

- **Location**: `lib/music/creator-*/`, `app/api/creator-*/`, `scripts/music-*-outbox-worker.ts`.
- **Evidence**: The Music working set contains 282 `lib/music` files, including multiple creator governance/treaty subsystems with their own API and worker surfaces. These are not catalog/playback/rights/royalty primitives, and no separate owning charter is recorded.
- **Impact**: Backlog, schema, worker, and release ownership can be confused with core Music responsibilities.
- **Next action**: Product/architecture owner decides whether to keep, extract, or retire these readiness sandboxes.

### GAP-10 — Venue Music dashboard is a redirect stub [incomplete]

- **Location**: `app/venue/dashboard/music/page.tsx`.
- **Evidence**: The page is `VenueDashboardMusicRedirectPage` and redirects to `/venue/dashboard`; no venue-specific Music management surface is present in `components/music/`.
- **Impact**: Venue music curation or event playback management is not available from the venue dashboard.
- **Next action**: Product owner chooses build, redirect-only, or drop.

### GAP-11 — Admin Music dashboard behavior is unverified [incomplete]

- **Location**: `app/admin/dashboard/music/page.tsx`, `app/api/admin/content/music/**`, `app/api/admin/music/**`.
- **Evidence**: The page exists, but no dedicated admin Music component or focused dashboard behavior suite was found. Admin rights/certification/import routes exist separately.
- **Impact**: It is unclear whether admins have a coherent moderation and operations surface.
- **Next action**: Define platform-admin operations and add a focused contract before expanding the page.

### GAP-12 — Music analytics has no aggregation strategy [incomplete]

- **Location**: `app/api/artist/music/analytics/route.ts`, `lib/music/music-access.ts`, `supabase/migrations/20260711160518_native_music_player_ecosystem.sql`.
- **Evidence**: `music_plays` and `music_engagement_events` are recorded and per-event stats can be synchronized; no music aggregation worker or materialized analytics view is in the current Music working set.
- **Impact**: Raw-event reads may become expensive or inconsistent as playback volume grows.
- **Next action**: Set a launch-scale threshold and choose raw reads, indexed rollups, or a scheduled aggregate.

### GAP-13 — Generated permissions inventory under-reports Marketplace auth adoption [improve]

- **Location**: `docs/engineering/generated/permissions.md`, `app/api/music-marketplace/**`, `__tests__/music-commerce/route-auth-adoption.test.ts`.
- **Evidence**: The refreshed permissions map labels all 13 Music Marketplace routes `manual review required`, while source inspection and route regression tests verify `requireMarketplaceAccount` in all 13 handlers. The map is a static heuristic, not behavioral proof.
- **Impact**: Future audits may reopen a closed auth finding or miss drift if the generated inventory is treated as authoritative.
- **Next action**: Teach the permissions inventory about the Marketplace contract or publish an explicit verified-contract annotation.

### GAP-14 — Audius route resilience is not verified [improve]

- **Location**: `app/api/music/providers/audius/**`, `lib/music/providers/audius/**`.
- **Evidence**: Audius mapper/error unit tests exist, but no route-level provider contract test, circuit breaker, fallback provider, or operational availability policy is present.
- **Impact**: Discovery/import and streaming behavior depends on an external provider without a documented failure mode.
- **Next action**: Decide whether Audius is optional discovery, a production dependency, or replaceable through the provider registry.

### GAP-15 — Rights anchor and derivative processing are explicitly stubbed [incomplete]

- **Location**: `scripts/music-rights-anchor-worker.ts`, `scripts/music-rights-derivative-worker.ts`, `lib/music-rights/`.
- **Evidence**: The anchor worker documents “Testnet stub only — no real mainnet transactions”; the derivative worker is described as a stub protected-derivative pipeline. Neither has integration tests or scheduling.
- **Impact**: Rights evidence/derivative status cannot be represented as production-grade external processing.
- **Next action**: Product owner decides whether these are launch features, staged simulations, or future work; label and gate accordingly.

## Resolved or superseded findings from the initial 2026-09-09 pass

| Prior finding | Current evidence | Result |
| --- | --- | --- |
| Initial auth gap for Artist Music routes | `docs/engineering/tasks/completed/ARTIST-004.json`; 33/33 route handlers use `requireArtistMusicUser`; `__tests__/artist/music/route-auth-adoption.test.ts` | Closed as an auth-adoption gap; resource-scope behavior still needs route tests in GAP-04 |
| Initial auth gap for Music Marketplace routes | `docs/engineering/tasks/completed/MUSIC-005.json`; 13/13 handlers use `requireMarketplaceAccount` | Closed as a runtime auth gap; inventory limitation remains GAP-13 |
| Unsigned/generic-secret royalty webhook fallback | `docs/engineering/tasks/completed/MUSIC-002.json`; dedicated secret and HMAC tests | Closed; release still must provision `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES` |
| Audius had no tests | `lib/music/providers/audius/__tests__/` | Superseded by GAP-14: unit coverage exists, route resilience does not |
| `music-post-preview` was listed as blocked | `npx vitest run __tests__/feed/music-post-preview.test.ts` → 1 file / 8 tests passed | Focused blocker is closed locally; global CI failure count requires a fresh inventory |

## Summary by triage

| Triage | Count | IDs |
| --- | ---: | --- |
| missing | 3 | GAP-01, GAP-02, GAP-03 |
| incomplete | 8 | GAP-04, GAP-05, GAP-06, GAP-07, GAP-10, GAP-11, GAP-12, GAP-15 |
| improve | 4 | GAP-08, GAP-09, GAP-13, GAP-14 |
