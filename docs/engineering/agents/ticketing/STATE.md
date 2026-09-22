# Ticketing state

- Last reviewed SHA: `b93967752b4262a2d7441755843eb886514fef26` (working tree, branch release/clean-snapshot, 2026-09-21)
- Last reviewed at: 2026-09-21 (TICKET-005 local deliverable verification)
- Active task: TICKET-005 (P0) — local deliverable complete; hosted create-to-settlement lifecycle blocked on credentials
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

## TICKET-005 local deliverable checkpoint — 2026-09-21

- Canonical refund replay certification landed: `refundOrderTickets` returns `{duplicate: true}` when `apply_ticket_refund` raises "already been refunded" (zero side effects — no re-restored inventory, no second ledger receipt, no analytics/notifications), and throws on genuine errors; `finalizePaidOrder` returns `{alreadyFinalized: true, skipped: 'terminal_state'}` with NO re-issuance/ledger/analytics for `refunded`/`cancelled`/`metadata.refund` orders (late-arriving `checkout.session.completed` after `charge.refunded` is the canonical case).
- Ledger replay safety: `writeRefundLedger` and the `writeSaleLedger` fallback throw on unavailable pre-check reads (fail closed — never infer row-absent from an unreachable read) and treat 23505/duplicate insert errors as duplicate acknowledgements; `financial_transactions.idempotency_key` + `idx_fin_tx_idempotency` (partial unique) is the DB-side replay guard, with `ticket_refund:{orderId}:{ticketId|full}` keys.
- Request-scoped purchase idempotency landed: `findIdempotentPurchase` (lib/ticketing/orders.ts) dedupes same `idempotency_key` + buyer + event while the order is actionable (pending/completed/paid), newest-order-wins; wired into `app/api/ticketing/enhanced/route.ts` (still returns `deduped: true` with the original order and keeps the keyed `ticket_purchase:{userId}:{key}` Stripe session reference).
- DB-005 handoff (recorded in TICKET-005.json + this file): the active chain has NO distributed DB-unique purchase idempotency on `ticket_sales` — only partial unique indexes on `order_number`, `stripe_checkout_session_id`, `webhook_event_id` (20260821000000_reconcile_ticketing_foundation.sql). Suggested constraint: partial unique index on `ticket_sales(buyer_user_id, event_id, metadata->>'idempotency_key')` or a dedicated `idempotency_key` column. Until DB-005 lands, two concurrent FIRST requests can both create rows; request-scoped dedup only covers double-click/retry.
- Certification tests added: `__tests__/ticketing/refund-replay.test.ts` and `__tests__/ticketing/purchase-idempotency.test.ts` (25 tests). Focused suite: 15 files, 120 tests passed. Focused ESLint on the 6 changed files exit 0; `git diff --check` exit 0.
- No migration authored by this lane and no hosted/webhook/Stripe execution strings in this lane's diff; hosted create-to-settlement lifecycle and Stripe execution remain blocked (no credentials). Changes left uncommitted for orchestrator (no git add/commit per constraints).
