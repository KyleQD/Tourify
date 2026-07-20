# Phase 6 Current-State Audit Results

Audit date: 2026-07-17 (America/Los_Angeles)  
Package: `docs/music-trust/phase-6/tourify_music_licensing_phase6/`  
Governing prompt: `35_CODEX_MASTER_IMPLEMENTATION_PROMPT.md`

## Repository baseline

- Branch: `codex/live-sync-dashboard-news`
- Commit: `673b82984da5670b94ed68d1efd94130539ea859`
- Package manager: npm / package-lock.json
- Next.js 15.5.14 / React 18.2.0
- Baseline Phase 1–5 jest: **62 passed** before Phase 6 code changes
- Post-implementation `lib/music` jest: **86 passed** (includes Phase 6 licensing-core)
- Full lint/build: deferred dirty worktree

## Canonical music stack

- `artist_music` UUID PK canonical; private `artist-music` bucket
- Upload: `app/api/artist/music/*`, upload-url route
- Stream: `/api/music/stream` → `resolveMusicAccess` → Jukebox (unchanged)
- Marketplace downloads, feed, profile, EPK, analytics: pre-existing; not replaced

## Phase 1–2 trust and rights

- Trust/origin/certification tables and public verify routes
- `music_rights_*` parties, claims, agreements, passports, disputes (flags off)
- Passport claims = evidence, not automatic licensing authority (ADR)

## Phase 3–5 dependencies

- Phase 3: `music_royalties_*` ledger/allocations; `music_valuation_*`; finance readiness
- Phase 4: `music_marketplace_*` partner-led securities shell (flags off)
- Phase 5: `music_institutional_*` orgs/data rooms/classification (flags off)
- Partner webhook + outbox patterns reusable
- No production licensing exchange tables yet

## Licensing-specific existing code

- No `music_licensing_*` / `music_license_*` production tables
- EPK/event features may mention licensing casually — not a clearance exchange
- DMCA/dispute: Phase 2 rights + Phase 1 trust runbooks

## Authorization and operations

- Supabase Auth; admin via profiles; capability patterns from prior phases
- Feature flags + kill switches established in Phases 2–5
- Outbox workers: rights, royalties, marketplace, institutional

## External providers and approved roles

| Role | Status |
|---|---|
| Signature provider | unresolved / candidate sandbox |
| Payments/invoicing | candidate (Stripe patterns exist; licensing separate) |
| CMO/PRO/publisher/label agents | unresolved |
| DDEX/CISAC | unresolved |
| Watermark/delivery | candidate (Phase 2 adapters) |
| Insurance/counsel | unresolved |

## Gaps and ADRs

| ID | Decision |
|---|---|
| ADR-P6-001 | Tables `public.music_licensing_*` / `music_license_*` / `music_cue_sheet*` |
| ADR-P6-002 | Tourify is workflow/evidence shell — not CMO/PRO/publisher/label/insurer/counsel/bank |
| ADR-P6-003 | Classification required before search/quote/approval rules |
| ADR-P6-004 | Default deny availability; Passport ≠ licence authority |
| ADR-P6-005 | Only executed effective agreement authorizes use/delivery |
| ADR-P6-006 | AI licensing separate explicit opt-in; never bundled |
| ADR-P6-007 | Payments via signed webhooks + reconcile; never client redirects |
| ADR-P6-008 | Phase 3 ledger remains SOT; invoices hand off only |
| ADR-P6-009 | Independent `music_licensing_*` flags default off |
| ADR-P6-010 | Phase 7 not implemented; handoff notes only |

## Proposed repository map

- Migrations: `supabase/migrations/*_music_licensing_*.sql`
- Domain: `lib/music/licensing/**`
- APIs: `app/api/licensing/**`, `app/api/admin/licensing/**`
- UI: `/artist/music/licensing`, `/licensing`, admin ops panel
- Worker: `scripts/music-licensing-outbox-worker.ts`

## Blockers

- Counsel + named partner contracts
- Live cue/payment/signature sandbox reconciliation
- Written mandates for Tourify-mediated grants
- Separate approvals (AI training, automated pricing, multi-territory direct grants)
- Launch/pilot cohort; remote migration apply
