# Phase 7 Current-State Audit Results

Audit date: 2026-07-17 (America/Los_Angeles)  
Package: `docs/music-trust/phase-7/tourify_music_rights_admin_phase7/`  
Governing prompt: `34_CODEX_MASTER_IMPLEMENTATION_PROMPT.md`

## Repository baseline

- Branch: `codex/live-sync-dashboard-news`
- Commit: `673b82984da5670b94ed68d1efd94130539ea859`
- Package manager: npm / package-lock.json
- Next.js 15.5.14 / React 18.2.0
- Baseline `npx jest lib/music`: **86 passed** before Phase 7 code changes
- Post-implementation `npx jest lib/music`: **96 passed** (includes Phase 7 rights-admin-core)
- Full lint/build: deferred dirty worktree

## Canonical music architecture

- `artist_music` UUID PK canonical; private `artist-music` bucket
- Upload: `app/api/artist/music/*`, upload-url route
- Stream: `/api/music/stream` → `resolveMusicAccess` → Jukebox (unchanged)
- Marketplace downloads, feed, profile, EPK, analytics: pre-existing; not replaced

## Phase 2–6 implementation audit

- Phase 2: `music_rights_*` parties, claims, agreements, passports, disputes (flags off); Passport = evidence only
- Phase 3: `music_royalties_*` ledger/allocations; finance readiness; immutable journals
- Phase 4–5: marketplace + institutional shells (flags off)
- Phase 6: `music_licensing_*` / `music_license_*` clearance exchange shell (flags off); usage/invoice → Phase 3 handoff
- Phase 6 `music_licensing_mandates` are licensing-authority records — **distinct** from Phase 7 administration mandates

## External providers and official sources

| Provider / role | Status |
|---|---|
| Copyright Office / recordation | unresolved |
| The MLC / publishing administrator | unresolved / candidate sandbox |
| SoundExchange / neighboring-right | unresolved |
| PROs/CMOs/publishers/labels | unresolved |
| DDEX/CISAC | unresolved |
| Content ID / UGC rights-management | unresolved / candidate |
| Monitoring/fingerprinting | candidate (Phase 1–2 adapters) |
| Notice/takedown / DMCA agent | unresolved (designated-agent renewal pending) |
| Payments/tax | candidate (Stripe patterns; recoveries → Phase 3) |
| Counsel/enforcement | unresolved |

## Authority and entity-role decisions

| Role | Decision |
|---|---|
| Tourify software / evidence / workflow | **selected** |
| Administrator / collection agent / CMO / PRO | **unresolved** — partner-only; Tourify does not assume |
| Law firm / litigator | **unresolved** — counsel partner only |
| Enforcement vendor | **candidate** sandbox adapters |

Written administration mandates for Tourify-mediated actions: **none production** — shell records only.

## Database and security

- Additive migrations + RLS + feature flags pattern established Phases 2–6
- Outbox workers: rights, royalties, marketplace, institutional, licensing
- No production `music_rights_admin_*` / `music_enforcement_*` / `music_dmca_*` tables yet

## Gaps and ADRs

| ID | Decision |
|---|---|
| ADR-P7-001 | Tables `music_rights_admin_*` / `music_rights_*` / `music_enforcement_*` / `music_dmca_*` |
| ADR-P7-002 | Tourify is workflow/evidence shell — not CMO/PRO/publisher/label/fiduciary/counsel/court |
| ADR-P7-003 | Passport / Phase 6 license ≠ administration mandate |
| ADR-P7-004 | Every external action requires active written mandate + exact scope (`resolveMandate`) |
| ADR-P7-005 | No auto-takedown/monetization claim from fingerprint/metadata/AI alone — human review required |
| ADR-P7-006 | Official-source mirrors versioned; no silent overwrite (`reconcileExternalRecord`) |
| ADR-P7-007 | Recoveries/claims hand off to Phase 3 ledger only |
| ADR-P7-008 | Inbound DMCA SP duties separate from outbound rightsholder enforcement |
| ADR-P7-009 | Independent `music_rights_admin_*` flags default off; auto-submission/takedown/litigation separately gated |
| ADR-P7-010 | Phase 8 not implemented; handoff notes only |

## Proposed repository map

- Migrations: `supabase/migrations/*_music_rights_admin_*.sql`
- Domain: `lib/music/rights-admin/**`
- APIs: `app/api/rights-admin/**`, `app/api/admin/rights-admin/**`
- UI: `/artist/music/rights-admin`, `/rights-admin`, admin ops panel
- Worker: `scripts/music-rights-admin-outbox-worker.ts`

## Blockers

- Counsel + named partner matrix
- Live sandbox registration/claim/DMCA reconciliation
- Written administration mandates
- Separate approvals (automated external submission, litigation, fiduciary collection)
- Designated-agent DMCA production registration/renewal
- Launch/pilot cohort; remote migration apply
