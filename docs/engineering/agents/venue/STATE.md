# Venue state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b` (task base_sha)
- Last reviewed at: 2026-09-11 (DESIGN-004 compatibility handoff)
- Active task: VENUE-003 completed (booking lifecycle state-machine contract)
- Confidence: high — deep read of all generated maps, legacy records, and domain paths

## Durable facts

- Mission: Own venue identity, public profiles, bookings, venue operations, and venue kit.
- Default working set is recorded in `WORKING_SET.json`.
- 70+ web routes, 45+ API handlers, 32 venue-prefixed DB tables, 30+ functions, 100+ components.
- Venue account lifecycle, ownership transfer, RBAC, and booking reservation RPCs exist in migrations (staged, not applied).
- Legacy specialist `.agents/venue-pages-builder/` completed 87/87 items + 16/16 audit modules (2026-07-28). External acceptance gates remain open.
- Component tree is split: `app/venue/components/` (canonical, 95+ files) and `components/venue/` (shared). Dedup needed.
- `app/venue/components/mobile-venue-nav.tsx` is now the canonical mobile-nav implementation; `components/venue/mobile-venue-nav.tsx` remains a compatibility re-export while the broader tree is consolidated incrementally.
- `app/venue/components/site-map-viewer.tsx` is now the canonical site-map viewer implementation; `components/venue/site-map-viewer.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/event-details/delete-event-dialog.tsx` is now the canonical event-delete implementation; `components/venue/venue/delete-event-dialog.tsx` remains a compatibility re-export for the legacy nested path.
- `app/venue/components/staff/venue-staff-scheduler-shell.tsx` is now the canonical scheduler-shell implementation; `components/venue/staff/venue-staff-scheduler-shell.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/shift-templates.tsx` is now the canonical shift-templates implementation; `components/venue/staff/shift-templates.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/shift-requests.tsx` is now the canonical shift-requests implementation; `components/venue/staff/shift-requests.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/venue-staff-shifts-panel.tsx` is now the canonical staff-shifts implementation; `components/venue/staff/venue-staff-shifts-panel.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/role-management.tsx` is now the canonical role-management implementation; `components/venue/staff/role-management.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/user-role-assignment.tsx` is now the canonical user-role-assignment implementation; `components/venue/staff/user-role-assignment.tsx` remains a compatibility re-export for the legacy path.
- The current import audit found no remaining `@/components/venue/*` imports under `app/venue/**`; remaining legacy consumers are non-venue shared surfaces and require separate caller/interface decisions.
- DESIGN-004 completed the shared compatibility handoff for `components/venue/ui/**`:
  26 files are keep, 23 are registered retire-later, and the byte-identical
  `use-toast.ts` hook is now explicitly registered as retire-later debt targeting
  `hooks/use-toast.ts`. Venue-owned consolidation is exhausted; global tree cleanup
  is represented by DESIGN-005 through DESIGN-027 and does not require venue behavior changes.
- 29 redirect/debt route files still present (cosmetic, not functional).
- Venue booking-request lifecycle coverage now exists under `__tests__/venue/booking-lifecycle.test.ts`; the canonical six-state contract is documented in `BOOKING_LIFECYCLE.md`. Hosted migration/RLS/backfill/grant/index evidence remains a separate release gate.
- Venue API routes use ~8 different authorization idioms; standardization needed.
- No React Query adoption on venue dashboards; no ISR on public profiles.
- DESIGN-031 (design-system) verified `hooks/venue/use-mobile.tsx` had zero consumers
  and converted it to a pure compatibility re-export of the canonical
  `hooks/use-mobile.ts` (2026-09-11); the path remains importable and the owning venue
  surface may decide final removal later. No venue behavior change.
- No Zod API contracts on venue routes; venue search has two paths.

## Current focus

- VENUE-001 audit complete. Produce follow-up task records for top-priority questions (Q1–Q3).
- The venue/design-system compatibility boundary is handed off; keep VENUE-002 blocked
  unless a follow-up task identifies an approved venue consumer migration.
- Baseline, gaps, and questions delivered to `docs/engineering/agents/venue/`.

## Known risks

- Staged RLS migration (`venues_rbac_rls_baseline.sql`) is security-critical and must land before any venue auth work.
- Venue booking lifecycle has no test evidence; manual SQL acceptance gate still open.
- Mobile has zero venue surfaces; web-only for operators may be intentional but unconfirmed.
- Working tree is dirty (386+ entries); only venue domain and task record were modified.

Update this file only when a task establishes a durable fact future work needs.

## Production launch graph — 2026-09-16

- VENUE-002 remains blocked/P2 at the existing ownership boundary and is not a core launch blocker unless QA-003 identifies a live venue caller that depends on the legacy component tree.
- Venue-facing core journeys remain subject to DB-002 authorization, DB-006 events_v2, and QA-003 staging certification.

## Preserved venue-feature lineage — 2026-09-22 (CP-056)

- `origin/codex/admin-workflow-completion` (HEAD `521a206d`) preserves the beta-era venue
  feature family not present in master: app/venue (120 files, incl. bookings, create-event
  wizard, document management, EPK), components/venue (46), styles/venue, context/venue,
  hooks/use-mobile.tsx, and app/providers.tsx. Port candidate islands additively behind the
  venue-pages-builder skill into release/clean-snapshot; do not merge the branch wholesale.

## Venue integrations are encrypted-vault only — 2026-09-22 (INTG-007)

- `app/api/venue/integrations/route.ts` reads token material exclusively through the
  encrypted token vault (`readVenueIntegrationSecrets`/`writeVenueIntegrationSecrets`).
  The retired `venue_social_integrations.access_token/refresh_token` plaintext columns
  are never selected, read, or written by venue-domain code (HF-INTG-007-VENUE consumed;
  migration 20260921000000 nulls the legacy venue plaintext columns once applied).
- POST refresh fails closed with an intentional 400 when the vault holds no refresh grant
  (no legacy column fallback); disconnect clears the vault and toggles `is_connected` only.
- GET health semantics are vault-derived: disconnected / needs_reauth / connected from row
  connection state plus vault `accessToken` presence. Coverage: `__tests__/venue/venue-integrations-api.test.ts`
  (9 tests).
