# Phase 4 Current-State Audit Results

Audit date: 2026-07-17 (America/Los_Angeles)  
Package: `docs/music-trust/phase-4/tourify_music_marketplace_phase4/`  
Governing prompt: `32_CODEX_MASTER_IMPLEMENTATION_PROMPT.md`

## Repository identity

- Branch: `codex/live-sync-dashboard-news`
- Commit: `673b82984da5670b94ed68d1efd94130539ea859`
- Package manager and lockfile: npm 11.5.2 / package-lock.json
- Next.js/React versions: Next.js 15.5.14, React 18.2.0
- Supabase CLI and project status: local CLI present; no remote mutation authorized

## Phase 1 music baseline

- Canonical `artist_music` schema and ID types: UUID PK
- Upload and storage paths: `artist-music` private bucket; `app/api/artist/music/*`
- Stream and access control: `/api/music/stream` → `resolveMusicAccess`
- Existing marketplace purchase/listing integration: music download marketplace separate from securities
- Web and mobile playback regression tests: Phase 1–3 jest baseline **43 passed**

## Phase 2 rights baseline

- Rights Passport tables: `music_rights_*` including passports/versions/credentials
- Issued snapshot format: private/public manifests + Phase 3 `IssuedPassportSnapshotV1` helpers
- Parties, claims, agreements, disputes: present and flag-gated
- Credential and blockchain status: VC envelope + testnet registry (flags off)

## Phase 3 finance baseline

- Royalty source/ledger tables: `music_royalties_*` (20260717240000 / 41000)
- Allocation snapshot model: `music_royalties_rights_snapshots` + allocation engine
- Payout provider and KYC/tax ownership: Stripe Connect abstraction; readiness states; Tourify does not store raw bank data
- Valuation runs and governance: `music_valuation_*`
- Existing regulated-finance pilot code: `music_finance_offerings`, orders (default reject), onchain instruments (`is_legal_source_of_truth = false`), fan collectibles

## Existing Tourify marketplace and payments

- Marketplace listing/order tables: marketplace core + music commerce (downloads/entitlements — not securities)
- Stripe: Connect + checkout + webhooks
- Seller payout readiness: `lib/marketplace/seller-payout-readiness.ts`
- Webhooks and idempotency: marketplace webhook + Phase 3 royalty payout webhook pattern
- Financial/admin permissions: admin capability patterns + `music.rights.review`

## Partner and regulatory map

| Role | Status | Notes |
|---|---|---|
| securities counsel | unresolved | Required before any live offering |
| intermediary/broker-dealer/funding portal | candidate | Sandbox adapter only until contract |
| ATS | candidate | Order/execution receipts only; no Tourify matching |
| transfer agent | candidate | Official ownership source of truth |
| custody/wallet provider | unresolved | Tourify stores no private keys |
| escrow/payment provider | candidate | Partner-controlled; Stripe may settle fiat rails under partner |
| KYC/AML/sanctions provider | candidate | Eligibility read model only; no raw ID docs in app tables |
| tax reporting provider | unresolved | Tax-doc links only |
| smart-contract auditor | unresolved | Tokenization optional and gated |

## Security and data inventory

- Auth/MFA: Supabase Auth
- Capability/role source: profiles admin levels + RBAC permissions
- RLS patterns: owner-scoped public tables with service_role workers
- Storage buckets: artist-music, music-certification-evidence, music-rights-*, music-royalty-*
- Audit-event / outbox: music_rights_outbox_events, music_royalties_outbox_events
- KMS/HSM/multisig: env secrets for local; prod runbooks pending
- Incident response: Phase 2/3 runbooks exist; Phase 4 runbooks to add

## Conflicts and assumptions

1. Phase 3 `music_finance_offerings` is readiness-only; Phase 4 adds `music_marketplace_*` domain and may reference Phase 3 rows via optional FK — securities lifecycle truth lives in marketplace offerings after pathway approval.
2. Existing music download marketplace must remain separate from securities UI/APIs.
3. Doc `23` suggests `/api/v1/music-marketplace/*`; App Router implementation uses `app/api/music-marketplace/**` with same resource names.
4. Schema naming ADR: `public.music_marketplace_*` prefixes (Data API compatible).

## Architecture decisions (ADRs)

| ID | Decision |
|---|---|
| ADR-P4-001 | `public.music_marketplace_*` table prefixes |
| ADR-P4-002 | Partner-led shell; Tourify never matches orders or holds custody/escrow |
| ADR-P4-003 | Transfer eligibility defaults deny; TA/partner official ledger is ownership SOT |
| ADR-P4-004 | Immutable disclosure versions + partner webhook receipts |
| ADR-P4-005 | Sandbox/fixture partner adapters until counsel names production partners |
| ADR-P4-006 | Tokenization optional, flag-gated, never legal SOT; no private keys in Tourify |
| ADR-P4-007 | Independent feature flags default off with kill switches |
| ADR-P4-008 | Integer/rational quantities and money; compensating corrections only |
| ADR-P4-009 | Fan utility remains non-securities (`music_finance_fan_collectibles`); securities offerings never imply fan utility investment |
| ADR-P4-010 | Phase 5 institutional marketplace not implemented; handoff notes only |

## Regression baseline

| Suite | Result |
|---|---|
| Phase 1–3 music/royalties/rights jest | **43 passed** |
| Full lint/build | Deferred dirty worktree |
| Remote advisors | Blocked |

## Blockers

- Counsel + named partner contracts
- Live sandbox reconciliation
- Smart-contract audit (if tokenization)
- Launch approvals
- Remote migration apply
- Live pilot cohort
