# Ticketing state

- Last reviewed SHA: `ca3bb0b08870b87ce5f6e4ac69c65ddf31942c96` (working tree, branch codex/qa004-staging-campaign, 2026-09-25, Wave 35)
- Last reviewed at: 2026-09-25 (TICKET-005 P0 claim/complete fix + DB-008 drift cluster)
- Active task: TICKET-005 (P0) — webhook claim/complete P0 fixed and mutation-proven locally; hosted create-to-settlement lifecycle blocked on credentials and a target
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
- 17 focused `__tests__/ticketing/` suites, 149 tests: mocked unit/contract tests plus route-level tests over real Stripe signature verification and a recording Supabase stub; still no deployed-schema/RLS/E2E/offline/load coverage (TIX-602 pending).

## Current focus

- Answer P1 questions from `QUESTIONS.md` (false-zero read truthfulness, settlement versioning, undeployed Admin table drift, purchase auth GA contract, promo abuse control) and convert owner answers into bounded build/fix tasks.
- Next verification commands: `npm run agents:validate` before each handoff.

## Known risks

- Working tree carries many uncommitted entries across 6 concurrent lanes; generated maps are stale at HEAD and `npm run agents:generate` was deliberately not run (shared-map race), so `agents:validate` reports 8 pre-existing map-SHA warnings.
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

## TICKET-005 P0 checkpoint — 2026-09-25 (claim/complete split)

- The INTG-006 P0 is FIXED. `ticket_stripe_webhook_events` stamped `processed_at not null default now()` at claim time, so completion was unobservable and the route's `{received: true, duplicate: true}` on a 23505 could acknowledge work that never happened. A paid order could stay permanently unfinalized.
- **Durable fact — claim is not completion.** `claimWebhookEvent` returns `{kind:'claimed'}|{kind:'duplicate'}`; a duplicate is resolved by `readWebhookEventCompletion` (reads `completed_at`), and `completeWebhookEvent` writes the marker only after every handler write succeeded. completed → acknowledge with zero side effects; claimed-but-not-completed → **resume**. An unreadable marker or an unwritable completion **fails closed with 500**. The route's response gained an additive `outcome` (`processed` | `resumed` | `duplicate`).
- **Durable fact — the resume path follows the repository's existing shape**, `app/api/photos/purchase/webhook/route.ts` (claim → read the marker → resume or acknowledge → *check* the completion write). Reuse that shape for any new claim-before-process route rather than inventing one.
- **Durable fact — enabling resume inverts the safety argument.** "A retry is a no-op" no longer holds, so every side effect was re-audited under "this may run again": data-boundary-guarded writes (inventory RPCs, `issueTicketsForOrder`, ledger idempotency, referral mark) run unconditionally; the **unguarded** `increment_promo_code_usage` counter runs only on the delivery that performed the `pending → completed` transition; and a status flag is not a receipt — `payment_status='completed' AND issuance_status='issued'` no longer short-circuits alone, because a delivery that died after issuance but before the ledger write leaves an order with **no revenue receipt**, so the guard now verifies the receipt and otherwise falls through to the idempotent repair path. Every such failure resolves toward writing or retrying, never toward acknowledging.
- Migration `20260926130000_ticketing_webhook_completion_marker.sql`: adds nullable `completed_at`, `attempts integer NOT NULL DEFAULT 1`, and a partial index on the incomplete subset. No backfill (deliberate: a historical row's outcome is unprovable, and asserting it finished is the defect inverted — a replay of an old event therefore RESUMES). No RLS or policy change. Planned manifest authored; authored only, never applied (CP-051).
- `message.includes('duplicate')` as a duplicate test is too loose and is gone; duplicate detection is now `code === '23505' || /duplicate key/i`, matching the photos route.
- Drift cluster (DB-008, ticketing): re-derivation did not reproduce the inventory. `settlements` was the only in-grant object and is fixed — `app/api/ticketing/settlements/route.ts` read an archive-only relation whose error was **fused into the availability gate**, so `GET /api/ticketing/settlements` returned 503 `ticketing_unavailable` on every active-chain deployment and the authoritative money read was unreachable; the read is removed and absence is stated as `settlement: null` + `settlement_available: false`, with the 503 gate still covering `ticket_revenue_allocations` + `financial_transactions`. The other three objects are handed off (`HF-TICKET-035-TICKET-NOTIFICATIONS`, `HF-TICKET-035-TRACK-VENUE-PROFILE-VIEW`, `HF-TICKET-035-ARTIST-STATS-RPC`).
- Focused suite: **17 files, 149 tests passed** (was 15/120). `check:migration-chain` and `check:migration-validation` exit 0 (306 files). Scoped tsc over `app/api/ticketing/**` + `lib/ticketing/**`: webhook and settlements routes clean; the 9 TS2589/TS2769 in `app/api/ticketing/enhanced/route.ts` (144, 145, 286, 287, 583, 735, 736, 773, 774) are pre-existing and unchanged. Focused ESLint exit 0, `git diff --check` exit 0, `agents:validate` 0 errors / 8 pre-existing map-SHA warnings. Six mutations of the fix were each proven to fail the expected cases.
- **Still open, recorded not closed:** a partial issuance is not repaired (`issueTicketsForOrder` returns as soon as any ticket exists for the order, so a delivery that dies between ticket 1 and 2 leaves the order `completed` with `issuance_status` unset and re-runs the repair path on every later replay); analytics rows are not deduplicated across a resume (`ticket_analytics_events` has no unique key, so `checkout_completed` / `ticket_purchased` can double — metric inflation, not a ledger error); a failed completion marker has no operator alert beyond the log; `increment_promo_code_usage` is not in the active chain at all, so the newly guarded counter is currently inert. Hosted create-to-settlement proof, the DB-005 index application, and the two migrations' apply all remain blocked on a target and credentials.
