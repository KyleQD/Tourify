# Ticketing domain baseline (TICKET-001 audit)

Reviewed SHA: `a7193116c5a677b1c2939aa4a66e9415dac6eed1` (branch `codex/admin-master-remediation`; source maps were generated from this SHA and the worktree carries 386 uncommitted entries that include most ticketing code).

Scope: tickets, allocations, transfers, wallet, guest list, door operations, settlement interfaces — per `docs/engineering/agents/ticketing/CHARTER.md` and `docs/engineering/agents/ticketing/WORKING_SET.json`. Read-only audit; no production files changed.

## 1. What exists today

### 1.1 Public/holder surfaces (`app/tickets/`)

- `app/tickets/page.tsx` — 5-line redirect to `/tickets/my-tickets`.
- `app/tickets/purchase/page.tsx` — purchase flow (uses `ticket-purchase-form`).
- `app/tickets/confirmation/page.tsx`, `app/tickets/success/page.tsx`, `app/tickets/cancel/page.tsx` — checkout result pages.
- `app/tickets/my-tickets/page.tsx` — wallet page (ticket rows + QR proof).
- `app/tickets/invite/[token]/page.tsx` — guest-list invite accept/decline entry (tokenized, `lib/ticketing/guest-list-token.server.ts`).

### 1.2 Ticketing API routes (`app/api/ticketing/`, 23 routes, ~3,601 lines)

| Route | Role | Evidence |
|---|---|---|
| `route.ts` | Literal re-export proxy to `enhanced/route.ts` (M22 endpoint-sprawl; dual fallback probing at runtime) | `app/api/ticketing/route.ts` |
| `enhanced/route.ts` (855 L) | Legacy backbone: purchase, availability, promo/referral redemption, orders, tickets, check-in (flag-gated login), analytics | `app/api/ticketing/enhanced/route.ts` |
| `webhook/route.ts` | Stripe webhook; v2 path claims via `claimWebhookEvent` idempotency ledger (`ticket_stripe_webhook_events`) | `app/api/ticketing/webhook/route.ts`, `__tests__/ticketing/integrity.test.ts` |
| `check-in/route.ts` (641 L) | Door scan with distributed sliding-window rate limiter (30/min, Redis + in-memory fallback) and canonical permission gating (VEN-149) | `app/api/ticketing/check-in/route.ts` |
| `transfers/route.ts` | Ticket transfer workflow incl. ownership reissuance (`revokeAndReissueCredential`); C3 IDOR fixed (verified-email, conditional claim, race guard) | `app/api/ticketing/transfers/route.ts`, `docs/AUDIT_FINDINGS_2026-08-23.md` C3, `__tests__/ticketing/hardening-flows.test.ts` |
| `settlements/route.ts` | Settlement totals + revenue-share math (VEN-167); currently mutates active allocations (delete/reinsert) | `app/api/ticketing/settlements/route.ts`, `lib/ticketing/settlements.ts`, `__tests__/ticketing/settlements.test.ts` |
| `wallet/route.ts` | Wallet contents for the logged-in holder | `app/api/ticketing/wallet/route.ts` |
| `delivery/route.ts` | Email delivery of purchased tickets (Stripe session lookup, service role) | `app/api/ticketing/delivery/route.ts` |
| `verify/route.ts` | Post-checkout verification; reads `ticket_sales` + `ticket_types` + `events_v2` via service role (returns buyer PII by design) | `app/api/ticketing/verify/route.ts` |
| `config/route.ts` | `event_ticketing_config` read/write (owner type user/org/venue/artist/admin, windows, capacity, fees, grants) | `app/api/ticketing/config/route.ts` |
| `reports/route.ts` | Event ticketing metrics gated on `view_overview` / `view_full_financials` permissions | `app/api/ticketing/reports/route.ts` |
| `box-office/route.ts` | Box-office sale creation with contact-field permission scoping (VEN-153; M6 filter-interpolation fix) | `app/api/ticketing/box-office/route.ts` |
| `allocations/route.ts` | Allocation (hold/comps) lifecycle | `app/api/ticketing/allocations/route.ts` |
| `events/[eventId]/workspace/route.ts` | Event ticketing workspace DTO (`EventTicketingWorkspaceDto` in `lib/ticketing/guest-list.ts`) | `app/api/ticketing/events/[eventId]/workspace/route.ts` |
| `events/[eventId]/sales-orders/route.ts` | Sales/order listing per event | `app/api/ticketing/events/[eventId]/sales-orders/route.ts` |
| `events/[eventId]/allocations/route.ts` | Allocations per event | `app/api/ticketing/events/[eventId]/allocations/route.ts` |
| `events/[eventId]/attendees/route.ts` | Unified attendee list (paid + guest + crew) | `app/api/ticketing/events/[eventId]/attendees/route.ts`, `lib/ticketing/guest-list.ts` (`UnifiedAttendee`) |
| `events/[eventId]/eligible-recipients/route.ts` | Eligible comp/guest recipients (artist/staff/user) | `app/api/ticketing/events/[eventId]/eligible-recipients/route.ts` |
| `events/[eventId]/invites/route.ts` + `invites/[inviteId]/[action]/route.ts` | Guest-list invite CRUD/actions | `app/api/ticketing/events/[eventId]/invites/` |
| `invites/[token]/route.ts`, `invites/[token]/accept/route.ts`, `invites/[token]/decline/route.ts` | Token-based invite accept/decline | `app/api/ticketing/invites/[token]/` |

### 1.3 Ticketing modules (`lib/ticketing/`, 20 files, ~2,696 lines)

- Domain contracts/types + pure helpers: `index.ts`, `guest-list.ts` (DTOs, invite normalization, allocation release default, `isUnifiedGuestListEnabled`), `feature-flag.ts` (`isTicketingV2Enabled` env/request override), `sale-state.ts`, `pricing-projection.ts`, `fees.ts`, `credentials.ts` (opaque token QR payload), `event-venue-link.ts`.
- Services: `orders.ts` (pending orders, idempotency via Idempotency-Key), `inventory.ts` (`finalizeInventory`, reservation RPC use), `finalize.ts` (order finalize + race guard/compensation), `issuance.ts` (`issueTicketsForOrder`, `revokeAndReissueCredential`), `notifications.ts`, `analytics.ts` (`emitTicketAnalyticsEvent`), `ledger.ts`, `settlements.ts` (`calculateRevenueShares`), `account-resolver.ts` (owner/user resolution for canonical scoping).
- Permissions: `permissions.ts` (permission catalog + `hasTicketingPermission`).
- Guest list server: `guest-list.server.ts` (648 L — largest module; allocations, invites, expiration) + `guest-list-token.server.ts` (token signing/verification).

### 1.4 Ticketing components (`components/ticketing/`, 7) + ticket-type form

- `ticket-purchase-form.tsx` — buy flow UI.
- `door-check-in.tsx` — scanner: offline queue, reverse check-in, `client_scan_id` idempotent reconcile (VEN-154..161).
- `event-ticketing-workspace.tsx`, `ticket-sharing-tools.tsx`, `campaign-manager.tsx`, `ticket-qr-scanner.tsx`, `ticket-qr-code.tsx`.
- `components/ticket-type/ticket-type-form.tsx` — type config form.

### 1.5 Admin ticketing surfaces

- `app/admin/dashboard/ticketing/page.tsx` — primary shell; still sources the legacy enhanced Admin API and embeds dual-read panel, inventory ledger table, setup panel, allocation matrix, guest approvals, admissions/devices panels, and the canonical `EventTicketingWorkspace`.
- `app/admin/dashboard/ticketing/enhanced/page.tsx` — redirect/compatibility entry.
- `app/api/admin/ticketing/` (9 routes): `enhanced/route.ts` (reads `ticket_types`, campaigns, promos, sales, analytics), `read-model/route.ts` (TIX-104 dual-read; fail-closed on unavailable source), `commands/route.ts` (mixed bridge/canonical command service), `refund/route.ts` (dual `ticket_sales`/`tickets` updates), `setup/route.ts`, `allocations/route.ts`, `inventory/route.ts`, `admissions/route.ts`, `guest-approvals/route.ts`.
- `app/admin/dashboard/events/[id]/check-in/page.tsx` + `lib/admin/check-in.ts` — admission UI/read logic (uses `DoorCheckIn`).
- Admin components: `components/admin/event-ticket-manager.tsx`, `components/admin/event-ticketing-ops-panels.tsx`, `components/admin/ticketing/ticketing-read-model-panel.tsx`, `inventory-ledger-table.tsx`, `ticketing-setup-panel.tsx`, `allocation-matrix-panel.tsx`, `guest-approvals-panel.tsx`, `admissions-devices-panel.tsx`; tabs in `lib/admin/ticketing-workspace-tabs.ts`.
- Other consumers: `app/api/admin/dashboard/stats/route.ts` (ticket_sales aggregate), `app/api/admin/events/[id]/analytics/route.ts`, `app/api/admin/events/[id]/export/route.ts`, `app/admin/dashboard/tours/planner/components/ticketing-financials-step.tsx`, `app/api/admin/tours/[id]/stops/impact/route.ts`.

### 1.6 Venue, artist, business surfaces

- Venue: `app/venue/tickets/page.tsx` (redirects to `/venue/dashboard/tickets`), `app/venue/dashboard/tickets/page.tsx` + `loading.tsx`, `app/venue/events/[id]/check-in/page.tsx` (DoorCheckIn bus), `lib/venue/door-check-in-state.ts` (212 L offline queue state), `app/api/venue/ticketing/route.ts`.
- Artist: `app/artist/tickets/page.tsx` (redirects to `/artist/store?tab=listings&type=ticket`), `event-wizard/event-wizard-ticketing.tsx`, guest-list manager, artist ticketing actions/analytics (legacy types/sales; TIX-002 classification).
- Business: `app/business/tickets/page.tsx` (legacy aggregate consumer).
- Cross-domain consumers per `docs/admin-feature-specs/discovery/TIX-002-ticketing-consumer-inventory.md`: `app/api/analytics/route.ts`, `app/api/events/[id]/finances/route.ts`, `app/api/events/[id]/route.ts`, `app/api/events/[id]/guestlist/route.ts`.

### 1.7 Database objects (additive migration chain; 9 of 278 migrations touch ticketing)

- `supabase/migrations/20260328130000_ticketing_v2.sql` — legacy v2 tables (`ticket_types`, `ticket_sales` linked to `events_v2`).
- `supabase/migrations/20250814091000_event_attendance_guestlist.sql` — event attendance + guest list.
- `supabase/migrations/20260720020254_admin_ticketing_security.sql` — marker-only advisory; asserts `get_admin_ticketing_overview(uuid,uuid)` exists (objects created via execute_sql chunks, not this file).
- `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` — foundation reconciliation.
- `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` — private schema, service-role-only security-invoker wrappers, `ticketing_migration_issues` queue.
- `supabase/migrations/20260823060000_ticketing_grant_collapse_fix.sql` — VEN-147: org membership implies ONLY `view_overview`; all other permissions require explicit `event_ticketing_grants` rows (idempotent, security-definer).
- `supabase/migrations/20260823170000_worker_checkin_contract.sql` — worker check-in contract.
- `supabase/migrations/20260825010000_ticketing_owner_account_resolution.sql` — VEN-148: `resolve_event_ticketing_owner_user_ids(event_id)` resolves user/admin/org/venue/artist owners to authoritative humans; config writes honor resolved owners.
- `supabase/migrations/20260825020000_door_operations.sql` — `ticket_checkpoints`, `ticket_checkins.client_scan_id` for idempotent offline reconcile (VEN-159/VEN-157).
- Backups only (NOT in active chain): `supabase/migrations_backup/` holds `ticketing_integrations`, `ticketing_webhooks` — historical artifacts, never deployed (TIX-002).

Canonical tables per TIX-002: `events_v2` (parent), `event_ticketing_config`, `ticket_types` (bridge), `ticket_sales` (bridge), `event_ticket_types` (inactive legacy; SEC-108 authenticated read-only), `ticket_inventory_reservations`, `tickets`, `ticket_credentials`, `ticket_ownership_events`, `ticket_transfers`, `ticket_checkins`, `ticket_allocations`, `ticket_revenue_allocations`, `event_ticketing_grants`, `ticket_stripe_webhook_events`, `ticket_analytics_events`, `settlements` (canonical/bridge), `ticket_campaigns`/`promo_codes` (legacy/bridge marketing), `ticket_shares`/`ticket_referrals`/`ticket_analytics`/`social_media_performance` (legacy marketing analytics), `financial_transactions` (finance bridge).

### 1.8 Tests (`__tests__/ticketing/`, 10 files)

`permissions.test.ts`, `permission-catalog.test.ts`, `pricing-projection.test.ts`, `sale-states.test.ts`, `fees-credentials.test.ts`, `unified-guest-list.test.ts`, `settlements.test.ts`, `door-offline-queue.test.ts`, `hardening-flows.test.ts` (C3/C4/C5/H7/M6 regression per audit), `integrity.test.ts` (webhook idempotency claim). These are focused unit/contract tests (mocked Supabase); none prove deployed-schema, RLS, E2E, real offline, or load behavior.

### 1.9 Cron / automation

- `app/api/cron/ticket-invite-expiry/route.ts` — expires pending invites (guarded by `isAuthorizedCronRequest`).

## 2. Intended direction (source of truth: specs and accepted ADRs)

- `docs/admin-feature-specs/adr/TIX-001-canonical-ticketing.md` (accepted) + `docs/architecture/adr/ADR-007-ticketing.md` — canonical event-ticketing model is the destination; legacy tables become read-only compatibility sources and are retired; append-only inventory ledger; unguessable signed credentials; explicit capacity (no defaults); refund/void/transfer/comp/override require reason + separation of duties; imported provider state distinct from Tourify-originated sales.
- `docs/admin-feature-specs/09_Ticketing_Admissions_and_Guest_Lists.md` — task plan TIX-101..105, TIX-501..513, TIX-601..603 with acceptance criteria (policies dropped, RLS/FUNCTIONS hardened, canonical command layer, feature-flag read model TIX-104 [done], setup/inventory/allocations/guest approval/campaigns/order ops/tour workspace/credentials/devices/offline/admissions dashboard/webhook boundary/settlement handoff, migration + security/load review, retirement).
- `docs/admin-feature-specs/discovery/TIX-002-ticketing-consumer-inventory.md` — per-table class (canonical/bridge/compatibility/retire), per-surface destination, and retirement milestones.
- `docs/DEVELOPMENT_BACKLOG.md` — workstreams WS-0.3 (ticket transfer ownership — implemented in `app/api/ticketing/transfers/route.ts`), WS-0.5 (idempotent purchases), WS-1.2 (settlement RPCs; move QR issuance server-side), WS-1.3 (check-in limiter — implemented in `app/api/ticketing/check-in/route.ts`), DB Q4 (ticketing schema reconciliation).
- `docs/work-packets/TA-PH0.md` + `docs/engineering/agents/ticketing/BACKLOG.md` — bounded task ledger.
- Legacy ledger: `.agents/organization-ticketing/INVENTORY.md`, `PROGRESS.md`, `TASK_LOG.md` (`TKT-P00`, `TKT-0001` in_progress) — verified drift findings that anchor GAPS.md.

## 3. Evidence of integrity/security work already landed (with paths)

- C3 transfer IDOR fix (verified-email, conditional claim, race guard + compensation): `app/api/ticketing/transfers/route.ts`, `lib/ticketing/finalize.ts`.
- C4 discount forge clamp ($10) + promo validation: `app/api/ticketing/enhanced/route.ts`.
- H7 purchase idempotency (Idempotency-Key + order/session dedupe) and webhook event ledger: `app/api/ticketing/enhanced/route.ts`, `app/api/ticketing/webhook/route.ts`, `__tests__/ticketing/integrity.test.ts`.
- H9 check-in rate limiter (distributed sliding window + in-memory fallback; RATE_LIMIT_ENFORCE fail-closed opt-in): `app/api/ticketing/check-in/route.ts`.
- M6 box-office filter interpolation fix: `app/api/ticketing/box-office/route.ts`.
- VEN-147 grant collapse fix: `supabase/migrations/20260823060000_ticketing_grant_collapse_fix.sql`.
- VEN-148 owner account resolution: `supabase/migrations/20260825010000_ticketing_owner_account_resolution.sql`, `lib/ticketing/account-resolver.ts`.
- VEN-149 canonical permission gating on scans: `app/api/ticketing/check-in/route.ts`.
- VEN-153 box-office contact permission scoping: `app/api/ticketing/box-office/route.ts`.
- VEN-154..161 door offline queue + reverse check-in + `client_scan_id` reconcile: `components/ticketing/door-check-in.tsx`, `lib/venue/door-check-in-state.ts`, `supabase/migrations/20260825020000_door_operations.sql`.
- VEN-167 org/account-scoped settlement: `app/api/ticketing/settlements/route.ts`, `lib/ticketing/settlements.ts`.
- TIX-104 feature-flag dual-read, fail-closed: `app/api/admin/ticketing/read-model/route.ts`.

## 4. Foreign-key consumers (edge evidence only; owners are other agents)

Venue door surfaces, artist store redirect, business tickets page, admin tours impact route, event finances/analytics/export routes, marketplace store listing (artist ticket redirect destination) — all consume ticketing contracts; TIX-002 retains the full matrix.