# Phase 3 Current State Audit Results

Audit date: 2026-07-17 (America/Los_Angeles)  
Package: `docs/music-trust/phase-3/tourify_music_royalty_valuation_phase3/`  
Governing prompt: `29_CODEX_MASTER_IMPLEMENTATION_PROMPT.md`

## Repository identification

- repository/branch/commit: `/Users/kyledaley/Developer/myproject/tourify-beta-K2` · `codex/live-sync-dashboard-news` · `673b82984da5670b94ed68d1efd94130539ea859`
- package manager and versions: npm 11.5.2, Node 20.19.0
- Next.js/React/Supabase versions: Next.js 15.5.14, React 18.2.0, `@supabase/supabase-js` 2.39.3
- deployment targets: Next.js/Vercel + Supabase; no remote mutation authorized by this audit

## Phase 1 and 2 status

- upload declaration implementation: `music_upload_declarations` + `persistMusicDeclaration` (flag-gated)
- origin records: `music_origin_records` + `scripts/music-origin-worker.ts`
- certification cases: `music_certification_*` + admin/artist APIs
- rights domain tables: `music_rights_*` (projects, works, recordings, parties, claims, agreements, passports, disputes, outbox)
- issued passport snapshots: `music_rights_passports` / `music_rights_passport_versions` with private/public manifests
- dispute/suspension events: `music_rights_disputes`, passport suspend/revoke via admin review
- outstanding blockers: remote migration apply; counsel; Sepolia keys; Phase 2 flags default off; royalty freeze read-model not yet published (to be added in Phase 3)

## Existing financial systems

- marketplace and paid-track flow: `app/api/marketplace/checkout/route.ts`, library entitlements
- Stripe or other payment provider: Stripe (`lib/stripe.ts`, `lib/marketplace/stripe-server.ts`)
- connected-account onboarding: `app/api/stripe/connect/route.ts`, `lib/stripe-connect-resolve.ts`
- payout readiness helpers: `lib/marketplace/seller-payout-readiness.ts`
- webhooks: `app/api/marketplace/webhook/route.ts`
- existing ledger/accounting tables: `marketplace_payout_ledger` only (not royalty domain)
- taxes/1099 support: not implemented for music royalties
- existing wallet/blockchain code: Phase 2 testnet passport registry only; no royalty tokens

## Jobs and observability

- job framework: table-backed workers (`music_preview_generation_jobs`, fingerprint rows, `music_rights_outbox_events`)
- idempotency pattern: unique keys + upserts on outbox/cert cases
- scheduled workers: npm scripts (`music:preview-worker`, `music:origin-worker`, `music:rights-*`)
- logs/traces/alerts: structured server logs; no dedicated royalty metrics yet

## Database and security

- canonical ID types: UUID for `artist_music` and rights entities
- exposed schemas: `public` (Data API); prefer `public.music_royalties_*` prefixes over new Postgres schemas
- RLS/capability functions: owner RLS + `music.certification.review` / `music.rights.review`
- security-invoker views: `music_tracks`, `music_rights_public_passport_verification`
- storage buckets: `artist-music`, `music-certification-evidence`, `music-rights-*`
- generated type workflow: `lib/database.types.ts` (partial vs migrations)
- service credentials: server-only service role; never client-exposed

## Integration decisions (ADRs)

| ID | Decision |
|---|---|
| ADR-P3-001 | Use `public` tables with `music_royalties_*`, `music_valuation_*`, `music_finance_*` prefixes (not separate Postgres schemas) for Data API compatibility. |
| ADR-P3-002 | Pilot statement formats: Tourify marketplace CSV + generic CSV; DDEX DSR adapter stubbed with documented deferral until pilot fixtures exist. |
| ADR-P3-003 | Payout provider: Stripe Connect abstraction reusing existing connect onboarding; Tourify never stores raw bank account numbers. |
| ADR-P3-004 | Money: `bigint` minor units + rational shares via `lib/music/royalties/money.ts`; no JS float. |
| ADR-P3-005 | Rights consumption: `IssuedPassportSnapshotV1` / `RoyaltyEligibleInterestV1` read models from issued passport versions + accepted claims; freeze on dispute/suspend. |
| ADR-P3-006 | Valuation: versioned models issuing ranges only; never mutates ledger or rights. |
| ADR-P3-007 | Fan utility: nonfinancial collectibles flag-gated; no appreciation/profit language. |
| ADR-P3-008 | Regulated financing / on-chain instruments: partner-gated, flags off; no open secondary market; tokens never legal source of truth. |
| ADR-P3-009 | Feature flags default disabled; ensure `feature_flags` table exists before inserts. |
| ADR-P3-010 | Accounting boundary: Tourify records allocations/statements; Stripe executes payouts; Tourify is not a broker/exchange/money transmitter. |

## Regression baseline

| Suite | Result |
|---|---|
| `jest lib/music-rights/__tests__` + Phase 1 music trust | **33 passed** |
| Full lint/build | Deferred (dirty worktree) |
| Remote advisors | Blocked (no remote mutation) |

## Blockers

| Blocker | Safe state | Unblocking |
|---|---|---|
| Counsel tax/regulated language | Flags off; disclaimers | Counsel approval |
| Live Stripe royalty payout secrets | Abstraction + maker-checker; flag off | Ops secrets + staging test |
| DDEX full parser | CSV pilot + DDEX stub | Spec fixtures + adapter |
| Partner financing agreements | Partner APIs reject unapproved orders | Partner + counsel |
| Live pilot cohort | Synthetic fixtures | Product enrollment |
