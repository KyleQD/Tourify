# Ticketing state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b` (working tree)
- Last reviewed at: 2026-09-11 (TICKET-002/TICKET-003 verification)
- Active task: none; TICKET-002 and TICKET-003 are complete within their bounded scopes
- Confidence: working (canonical direction accepted via TIX-001/ADR-007; security fixes landed; several money-integrity and cutover gaps open)

## Durable facts

- Mission: Own tickets, allocations, transfers, wallet, guest list, door operations, and settlement interfaces. (CHARTER.md)
- Default working set is recorded in `WORKING_SET.json`.
- Canonical destination and consumer classification: `docs/admin-feature-specs/adr/TIX-001-canonical-ticketing.md` (accepted) + `docs/admin-feature-specs/discovery/TIX-002-ticketing-consumer-inventory.md` + `docs/architecture/adr/ADR-007-ticketing.md`. Task plan with acceptance criteria: `docs/admin-feature-specs/09_Ticketing_Admissions_and_Guest_Lists.md` (TIX-101..105, 501..513, 601..603).
- Security/integrity fixes already landed (evidence in BASELINE.md §3): C3 transfer IDOR, C4 discount clamp, H7 purchase idempotency + webhook event ledger, H9 check-in distributed limiter, M6 box-office filter, VEN-147 grant collapse fix, VEN-148 owner account resolution, VEN-149 scan permission gating, VEN-153 box-office scoping, VEN-154..161 door offline queue (`client_scan_id`), VEN-167 org-scoped settlement, TIX-104 dual-read fail-closed.
- Gate semantics: organization membership implies ONLY `view_overview`; every other permission requires an explicit `event_ticketing_grants` row; event creator is ownership anchor (VEN-147, `supabase/migrations/20260823060000_ticketing_grant_collapse_fix.sql`).
- Owner resolution: `resolve_event_ticketing_owner_user_ids(event_id)` resolves user/admin/org/venue/artist owners (VEN-148); `lib/ticketing/account-resolver.ts` mirrors it server-side.
- Feature flags: `isTicketingV2Enabled()` (env `FEATURE_TICKETING_V2`) gates purchase/check-in paths incl. login requirement; `UNIFIED_GUEST_LIST_ENABLED !== 'false'` default-on gates unified guest list.
- `app/tickets/page.tsx`, `app/venue/tickets/page.tsx`, `app/artist/tickets/page.tsx` are redirect shims (my-tickets, venue dashboard, artist store respectively).
- `app/api/ticketing/route.ts` is a literal re-export proxy of `enhanced/route.ts` (M22 endpoint sprawl — pending consolidation).
- Settlement writes are append-only/versioned through the existing RPC contract; identical retries no-op and unavailable RPCs fail closed (TICKET-002).
- Admin/venue ticketing read surfaces in the TICKET-003 scope return `ticketing_unavailable` for missing/failed authoritative data and preserve legitimate zero values.
- Credentials are opaque tokens (no signature/rotation yet) — TIX-508 pending.
- 10 focused `__tests__/ticketing/` suites are mocked unit/contract tests; no deployed-schema/RLS/E2E/offline/load coverage (TIX-602 pending).

## Current focus

- Answer P1 questions from `QUESTIONS.md` (false-zero read truthfulness, settlement versioning, undeployed Admin table drift, purchase auth GA contract, promo abuse control) and convert owner answers into bounded build/fix tasks.
- Next verification commands: `npm run agents:validate` before each handoff.

## Known risks

- Working tree carries 386 uncommitted entries; source maps were refreshed at SHA `7cf660ad...` and remain working-tree evidence.
- `supabase/migrations/20260720020254_admin_ticketing_security.sql` is marker-only; object-creation migration for the admin ticketing overview RPCs is not in the active chain (F6 — verify deployed reality before touching those routes).
- Check-in limiter falls back to a per-instance in-memory Map when Redis is absent (documented degradation vs fail-closed opt-in `RATE_LIMIT_ENFORCE`).
- TICKET-003/TICKET-004 local-readiness checkpoint: admin overview routes now return `ticketing_unavailable` when canonical metrics are missing, and purchase authentication is independent of `FEATURE_TICKETING_V2`.

Update this file only when a task establishes a durable fact future work needs.

## Production launch graph — 2026-09-16

- TICKET-005 is P0 and owns deployed create-to-settlement certification, including inventory races, purchase authentication, webhook replay, transfer, QR/check-in, refund, append-only settlement, and unavailable-vs-zero truthfulness.
- TICKET-005 consumes DB-002, DB-005, DB-006, and INTG-006 evidence; no anonymous or cross-tenant money access is acceptable.

## TICKET-005 execution checkpoint — 2026-09-16

- Implemented published/enabled sale gating, reserved inventory accounting, fail-closed reservation consumption, credential replacement rollback, buyer-scoped delivery, conditional transfer and check-in claims, and unavailable settlement reads.
- Focused ticketing verification passed 35 tests; hosted DB/Stripe lifecycle, distributed purchase idempotency, and canonical refund replay evidence remain open.
