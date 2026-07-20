# Phase 5 Current-State Audit Results

Audit date: 2026-07-17 (America/Los_Angeles)  
Package: `docs/music-trust/phase-5/tourify_music_institutional_phase5/`  
Governing prompt: `35_CODEX_MASTER_IMPLEMENTATION_PROMPT.md`

## Repository baseline

- Repository: tourify-beta-K2
- Branch: `codex/live-sync-dashboard-news`
- Commit: `673b82984da5670b94ed68d1efd94130539ea859`
- Package manager: npm 11 / package-lock.json
- Next.js/React: Next.js 15.5.14, React 18.2.0
- Supabase CLI: present locally; remote mutation unauthorized
- Unit regression (Phase 1–4 music suites): **53 passed** before Phase 5 code changes
- Full lint/build/E2E: deferred (dirty worktree)

## Canonical music architecture

- `artist_music` UUID PK remains canonical
- Upload: `app/api/artist/music/*`; private `artist-music` bucket
- Playback: `/api/music/stream` → `resolveMusicAccess` → Jukebox (unchanged)
- Download marketplace: separate from securities and institutional deal surfaces
- Moderation/EPK/feed/profile: pre-existing; not replaced

## Phase 2 audit

- Tables: `music_rights_*` (parties, claims, agreements, passports, evidence, disputes)
- Passports versioned with private/public manifests; flags off
- Blockers: live credential/anchor providers, pilot counsel

## Phase 3 audit

- `music_royalties_*` ingestion/ledger/allocations/statements/payouts
- `music_valuation_*` model-governed ranges (not NAV/appraisal)
- `music_finance_*` offerings/orders/onchain readiness (flags off; onchain never legal SOT)
- Integer money helpers in royalties domain

## Phase 4 audit

- `music_marketplace_*` partner-led shell: offerings, disclosures, investor eligibility read model, subscriptions, positions, deny-default transfers, partner ATS receipts, surveillance, admin kill switches
- Flags: `music_marketplace_*_enabled` default off
- Ownership SOT: transfer agent / regulated partner — not Tourify rows
- Handoff: `docs/music-trust/phase-4/PHASE_5_HANDOFF_READINESS.md` — Phase 4 did not build institutional marketplace

## Existing institutional capabilities

- No prior `music_institutional_*` / `institutional_*` production tables
- Reusable patterns: org-ish profiles, admin dual-control (`music_marketplace_admin_actions`), private document buckets, partner webhook receipts, feature flags
- Conflicts: none requiring destructive rewrite; Phase 5 adds parallel institutional namespace

## Supabase and storage

- Phase 1–4 music migrations present under `supabase/migrations/20260717*` and `20260718*`
- Marketplace migrations use conditional Phase 3 FKs (learned dependency ordering)
- Phase 5 will use `public.music_institutional_*` + private institutional buckets
- Generated types regeneration deferred/blocked until ops approval

## Role and partner map

| Activity | Responsible party | Status |
|---|---|---|
| direct catalog transaction | Seller + counsel; Tourify workflow only | candidate (sandbox) |
| placement/solicitation | Registered intermediary | unresolved |
| investment advice | External adviser (not Tourify) | unresolved |
| fund sponsor/GP/adviser | External | unresolved |
| fund administration/NAV | Fund admin provider | candidate |
| custody/bank/escrow | External | unresolved |
| transfer agent/depository | External / Phase 4 TA path | candidate |
| order routing/ATS | Phase 4 partner ATS receipts | candidate |
| tax/audit/valuation | External; Tourify estimates ≠ NAV | unresolved |
| tokenization | Optional; never legal SOT | unresolved |
| cross-border | Separate approval required | unresolved |

## Security and privacy

- Auth: Supabase Auth; admin via profiles admin_level
- MNPI: data-room classification + access logs planned
- No raw QP/QIB/tax/bank docs in ordinary tables
- Incident/kill-switch patterns from Phase 4 runbooks to extend
- RTO/RPO / vendor risk: runbooks; live DR drill blocked

## Gaps and ADRs

| ID | Decision |
|---|---|
| ADR-P5-001 | Tables use `public.music_institutional_*` (Data API convention; adapt reference `institutional_*`) |
| ADR-P5-002 | Tourify is workflow/evidence/analytics shell — not adviser/BD/ATS/TA/custodian/fund admin/escrow/bank |
| ADR-P5-003 | Approved transaction classification required before bids/subs/closing/tokenization |
| ADR-P5-004 | Direct asset sale/license paths separated from private_security/fund_interest/structured_finance |
| ADR-P5-005 | Fund admin is NAV SOT; Tourify parallel NAV never silently replaces official |
| ADR-P5-006 | Eligibility default deny via provider assertions only |
| ADR-P5-007 | Securities institutional paths reuse Phase 4 marketplace controls; no Tourify matching |
| ADR-P5-008 | Tokenization/cross-border/securitization/lending disabled without separate approval |
| ADR-P5-009 | Independent `music_institutional_*` flags default off with kill switches |
| ADR-P5-010 | Phase 6 global licensing exchange not implemented; handoff notes only |

## Regression baseline

| Suite | Result |
|---|---|
| Phase 1–4 marketplace/royalties/rights/trust jest | **53 passed** |
| Remote advisors / live pilot | Blocked |

## Blockers

- Counsel + named partner contracts
- Live fund-admin/NAV sandbox reconciliation
- Smart-contract audit (if tokenization)
- Separate approvals (securitization/lending/cross-border/leverage)
- Launch approvals + pilot cohort
- Remote migration apply
