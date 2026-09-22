# Music state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b`
- Last reviewed at: 2026-09-11
- Active task: MUSIC-004 (worker deployment framework)
- Confidence: working — route auth adoption is verified; schema reconciliation and worker operations remain unresolved

## Durable facts

- Mission: Own music catalog, playback, rights, royalties, ingestion, and music worker flows.
- Default working set is recorded in `WORKING_SET.json`.
- Core catalog table: `artist_music` with access_mode, preview, storage, and rights-attestation columns.
- 30 core music API routes, 33 artist music API routes, 13 music-marketplace routes.
- 24 worker scripts reconcile to 16 outbox, 5 processing, 1 trust reconciliation, and 2 manual smoke scripts. The framework registers the 21 outbox/processing workers; the trust reconciler remains unregistered until its schema and repair policy are approved, and smoke scripts are never worker registrations.
- The reconciled operations contract is hybrid: registered outbox/processing work is assigned to a durable runtime, while the short database-oriented trust reconciliation path is reserved for a future `pg_cron_maintenance` registration. Vercel cron remains a trigger option, not an active registration.
- Current cadence is explicitly `manual_until_approved` for every worker class: no interval, stale-work window, scheduler entry, or production launch is configured. The shared retry baseline is five attempts with 60-second initial backoff, two-times exponential backoff, and a one-hour cap; terminal failures are operator-reviewed `dead_letter` records with no automatic replay.
- Existing non-creator scripts still contain local retry/terminal-status variants (for example, rights-anchor's eight-attempt policy and royalty-import quarantine). They are inventory evidence, not approved activation policy, and require schema/operations review before adoption of the shared runner contract.
- **Zero music processing or reconciliation workers are scheduled** — this is the highest-priority operational gap.
- Playback library (`lib/playback/`) provides registry, adapters, and resolvers for track/radio/world-media.
- Music trust flags, trust persistence, and a phase-1 policy/RLS test exist; the trust reconcile worker has no integration test and is unscheduled.
- Royalty payout webhook (`/api/webhooks/music-royalty-payouts`) uses local HMAC verification and fails closed without `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES`; the unsigned and generic-secret fallbacks were removed.
- The focused `__tests__/feed/music-post-preview.test.ts` run passes locally (8/8); the backlog's global 27-failure count needs a fresh inventory.
- Creator-* governance subsystems are co-located under `lib/music/` (282 files total) — ownership boundary unclear.
- Rights, certification, trust/origin, and royalty code references schema whose DDL is only in the pre-reconciliation local-only migration archive, not the active migration chain.
- Music-marketplace route auth adoption (MUSIC-005, 2026-09-10): all 13 `app/api/music-marketplace/**` handlers use Marketplace's server-side `requireMarketplaceAccount` result and preserve their existing user-scoped ownership predicates. Native `/api/marketplace/orders` uses the same contract; native checkout retains its explicit optional-auth guest path.
- **Commerce ownership boundary (MUSIC-003, 2026-09-10):** `lib/music/music-commerce-boundary.ts` assigns catalog, rights, and royalties to Music; checkout, orders, transfers, portfolios, and `/api/music-marketplace/**` financial operations to Marketplace. It exposes only safe catalog and fulfillment references, not prices, storage paths, or order mutations.
- **Artist auth handoff (MUSIC-003, 2026-09-10):** `lib/music/music-commerce-auth.ts` re-exports the canonical ARTIST-002 `requireArtistMusicUser` contract. It resolves an authenticated user to an owned `artist_profiles` row before artist music routes address catalog, rights, or royalty resources.
- **Artist Music route adoption (ARTIST-004, 2026-09-10):** all 33 `app/api/artist/music/**` handlers use `requireArtistMusicUser`; no direct `requireApiUser` or `auth.getUser` references remain in that route family.
- **Marketplace route adoption (MUSIC-005, 2026-09-10):** all 13 `app/api/music-marketplace/**` handlers use `requireMarketplaceAccount`; native `/api/marketplace/orders` uses the same contract and checkout retains its explicit guest path.

## Current focus

- MUSIC-001 audit reconciliation is complete; current implementation focus is MUSIC-004 worker deployment framework.
- MUSIC-003 boundary deliverables, ARTIST-004 Artist Music auth adoption, and MUSIC-005 Marketplace auth adoption are implemented and focused-tested.
- The next audit/implementation dependency is additive schema reconciliation for rights, trust, certification, and royalties before worker scheduling or trust-reconcile registration.

## Known risks

- No music worker is scheduled — outbox and processing queues are inert until GAP-01/GAP-02 are resolved. The 16/21/24 count discrepancy is reconciled as 16 outbox + 5 processing registrations, plus 1 unregistered reconciliation script and 2 manual smoke scripts.
- Rights/royalty/trust schema is not represented in the active migration chain; deployment cannot be inferred from archived DDL.
- The shared framework policy is intentionally not an activation approval: cadence and stale-work windows remain unset, and local worker retry/quarantine variants remain unresolved until the owner approves the launch subset and operational targets.
- Artist Music and Marketplace route auth adoption is verified; route-level behavior coverage remains incomplete.
- Local webhook forwarding requires the dedicated music royalties endpoint secret; unsigned payloads are rejected in every environment.
- The repository was already heavily modified at bootstrap.
- Generated maps describe topology, not behavioral correctness.

## Gaps summary

| Triage | Count |
| --- | --- |
| missing | 3 |
| incomplete | 8 |
| improve | 4 |

## Owner direction — 2026-09-10

The launch slice is catalog and playback. Rights, royalty, trust, and certification
schema must be promoted additively before dependent workers run. Worker operations
start with a framework and use the approved hybrid deployment; flags remain
default-deny with pilot allowlists and never replace authorization.

## Production launch graph — 2026-09-16

- MUSIC-004 is blocked/P2 until the core web release is stable and operations approves the worker launch subset, cadence, stale-work windows, retries, DLQ, and monitoring.
- Advanced rights, royalty, trust, certification, governance, and their workers remain disabled in the initial production launch; catalog/playback is the only possible music launch slice.
