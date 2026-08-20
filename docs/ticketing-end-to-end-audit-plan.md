# Ticketing End-to-End Audit And Build Plan

Date: 2026-08-17

## Executive Summary

Tourify has a meaningful ticketing foundation, but it is not yet a finalized end-to-end ticketing system. The strongest pieces are the July 2026 foundation tables, Stripe checkout/finalization, individual ticket issuance, wallet display, credential revocation on transfer/refund, event-level grants, and an admin command service with capability checks and audit logging.

The biggest product risk is model split. Public purchase, wallet, box office, and venue/artist surfaces still use bridge tables such as `ticket_types` and `ticket_sales`, while some newer admin setup panels point at not-yet-migrated or differently named canonical tables. This means an organizer can appear to configure one ticketing model while buyers and staff operate another.

The system should converge on one canonical ticketing source of truth before it is treated as "real ticketing" for production events. The implementation should preserve current working paths, but route every write through audited commands, add a true inventory movement ledger, finish buyer delivery and account ownership, add device/offline admissions, and create versioned settlement handoff.

## Current System Map

### Existing Buyer Flow

1. Public event page resolves a native ticketing event id, then links to `/tickets/purchase` when native ticketing is enabled.
2. `/tickets/purchase` renders `TicketPurchaseForm`.
3. `TicketPurchaseForm` loads active ticket types from `/api/ticketing/enhanced?action=event_tickets`.
4. Availability and purchase are posted to `/api/ticketing/enhanced`.
5. Paid tickets create a Stripe Checkout session.
6. Stripe webhook finalization updates `ticket_sales`, finalizes inventory, issues `tickets`, creates `ticket_credentials`, and logs analytics.
7. The buyer can view tickets in `/tickets/my-tickets`, which reads `/api/ticketing/wallet`.
8. Buyer can show QR, transfer a ticket, and accept/decline inbound transfers.

What works:

- Auth-required purchase when ticketing v2 is enabled.
- Stripe checkout session creation.
- Inventory reservation before checkout when v2 is enabled.
- Individual tickets and active credential rows after payment/finalization.
- Wallet display of valid, assigned, transferred, and checked-in tickets.
- Transfer accept flow reissues a credential and supersedes the old one.

Main gaps:

- Public GET availability still uses `quantity_available - quantity_sold` and can omit `quantity_reserved`.
- Free/comp and paid flows are not all handled by one state-machine command.
- Ticket delivery exposes raw credential tokens in text/email rather than a polished pass/secure link model.
- Transfer by email exists, but there is no visible claim-link flow for a recipient without a Tourify account.
- Buyer account ownership depends on auth state; guest ownership and later claim are not finished.

### Existing Organizer/Admin Flow

1. Event ticket manager shows ticketing enabled state, ticket types, sales, reports, and links to public purchase/scanner.
2. Admin ticketing page aggregates overview, ticket types, sales, campaigns, promos, social performance, read-model comparison, setup, inventory, allocations, guest approvals, and admissions.
3. Admin mutations mostly route through `executeTicketingCommand`.
4. Dedicated refund route validates org scope, requires reason, uses service-role job wrapper, and can process Stripe refunds.

What works:

- Acting organization scoping exists for admin ticketing endpoints.
- Ticket type create/update/delete runs through the command service.
- Refund route has reason, org verification, service-role boundary, partial-ticket validation, and Stripe idempotency.
- There is a read-model comparison concept for legacy/canonical cutover.

Main gaps:

- `app/api/admin/ticketing/setup/route.ts` reads `event_ticketing_configs` plural, but the active foundation uses `event_ticketing_config` singular.
- `app/api/admin/ticketing/inventory/route.ts` reads `ticketing_inventory_ledger`, but the active foundation only has reservations and counter updates.
- `app/api/admin/ticketing/admissions/route.ts` reads `scanner_devices` and `admissions_scans`, but the active foundation uses `ticket_checkins` and does not include device/offline package tables.
- Event-level ops panels still call buyer/legacy-style APIs such as `/api/ticketing/config`, `/api/ticketing/allocations`, `/api/ticketing/box-office`, and `/api/ticketing/settlements`.
- Box office refund path is thinner than the dedicated admin refund path.

### Existing Data Model

Current durable tables include:

- `event_ticketing_config`
- `ticket_types`
- `ticket_sales`
- `ticket_inventory_reservations`
- `tickets`
- `ticket_credentials`
- `ticket_ownership_events`
- `ticket_transfers`
- `ticket_checkins`
- `ticket_allocations`
- `ticket_revenue_allocations`
- `event_ticketing_grants`
- `ticket_stripe_webhook_events`
- `ticket_analytics_events`

This is enough to support an MVP if the flows are unified, but it is not enough for finalized production ticketing because the inventory model is still reservation/counter based, admissions devices/offline scans are not fully modeled, and settlement/provider reconciliation is not durable enough.

## Sequential User Flow Audit

### Flow 1 - Organizer Creates A Ticketed Event

Current state:

- Admin event pages can enable ticketing and create ticket types.
- There are tests preventing silent default GA/VIP capacities.
- Some setup panels expect a future canonical config table shape that does not exist in active migrations.

Improvements needed:

- Use one setup contract: `event_ticketing_config` plus normalized ticket type/tier records.
- Require explicit "ticketed" or "not ticketed" during event setup.
- Require capacity source: manual, venue contract, or provider.
- Make currency, sales window, fees, tax, refund policy, transfer policy, checkout visibility, max per order/user, and delivery rules first-class.
- Add a setup checklist status: draft, incomplete, ready, live, paused, ended.
- Block public sales until setup is ready and payment/payout requirements are satisfied.

### Flow 2 - Organizer Publishes Tickets For Sale

Current state:

- Public purchase CTA appears when a native ticketing config is enabled and active ticket types exist.
- If config is missing but ticket types exist, the public event page may still allow purchase.

Improvements needed:

- Do not allow native purchase when the event has active ticket types but no config.
- Add an explicit publish command with readiness checks.
- Snapshot buyer-facing terms, prices, fee policy, tax policy, and sales window at publish time.
- Add preview links and hold public CTA until publish succeeds.
- Add source freshness labels if external provider data participates in availability.

### Flow 3 - Buyer Finds And Buys Tickets

Current state:

- Buyer can reach `/tickets/purchase?event_id=...`.
- Checkout validates ticket/event match, terms acceptance, sales window, max-per-order, and max-per-user when config exists.
- v2 purchase requires authentication.
- Stripe checkout is a single aggregated line item matching server buyer total.

Improvements needed:

- Make native tickets visible in event discovery cards, artist/venue event lists, and public event details, not only via event page CTA.
- Convert checkout into a canonical order command with explicit idempotency key.
- Treat availability as authoritative through reservations/ledger, not UI counters.
- Add waitlist/sold-out states.
- Add accessible all-in price disclosure before checkout.
- Add buyer account prompts that support sign-in, sign-up, and claim-by-email without losing cart state.
- Add checkout recovery for pending reservations and expired reservations.

### Flow 4 - Buyer Receives Tickets

Current state:

- Success page verifies Stripe session and shows order summary.
- Delivery can download a text file and can email raw credential information or a QR image.
- Wallet shows QR codes for active credentials.

Improvements needed:

- Replace text-file delivery with a secure ticket receipt and per-ticket pass view.
- Email should contain a magic claim/manage link, not raw credential secrets.
- Generate mobile-friendly Apple Wallet/Google Wallet-ready pass artifacts or a progressive web wallet pass.
- Add resend receipt, resend tickets, change email, and claim account flows.
- Store delivery attempts and failures with retry status.
- Separate order receipt from admission credential so receipts can be shared without exposing scannable entry.

### Flow 5 - Buyer Manages Tickets

Current state:

- `/tickets/my-tickets` shows wallet tickets, status, event date, QR, and transfer modal.
- Transfer can be initiated to a user id or email.
- Pending transfers are listed and can be accepted, declined, or canceled.

Improvements needed:

- Add ticket detail page per ticket with event details, terms, transfer/refund eligibility, order history, and delivery history.
- Replace "recipient user ID" UI with people search/contact/email entry.
- Add email recipient claim flow: invite/claim link, expiry, reminder, cancel.
- Enforce transfer policy dates and max transfer count.
- Prevent accepting expired transfers.
- Model transfer state transitions atomically and audit them.
- Add lost/reissue ticket action for buyers within policy.
- Add refund request flow if organizer policy allows requests.

### Flow 6 - Staff Scans Tickets At The Door

Current state:

- Check-in API verifies credential status, ticket event, scanner permission, duplicate check-in, refunded/canceled status, and records `ticket_checkins`.
- Reversal exists with permission.
- Legacy fallback can authorize some staff when v2 flag is off.

Improvements needed:

- Add scanner device registration and revocation.
- Add gate/checkpoint configuration.
- Add event-specific offline package generation with expiry, credential hashes, and key version.
- Add offline scan queue and reconciliation job.
- Add device freshness and anomaly dashboard.
- Add manual override flow with reason and escalation permissions.
- Enforce check-in window and re-entry policy from event config.
- Avoid scanning by raw ticket id in production; require credential token or signed envelope.

### Flow 7 - Organizer Handles Box Office, Comps, Guest List, Refunds

Current state:

- Box office can search orders/tickets, sell cash/card/comp tickets, and refund full or selected tickets.
- Allocations can create pools and issue comp tickets.
- Refund route handles stronger admin refund logic, but box-office refund bypasses parts of that route.

Improvements needed:

- Make box office sales a command using the same checkout/order issuance pipeline.
- Route all refunds through the dedicated refund command/job path.
- Add comp request and approval workflow before issuance.
- Track guest host, category, plus-one, privacy notes, credential type, and arrival.
- Add void ticket, reissue credential, resend, chargeback, and dispute operations.
- Add separation-of-duties controls for high-risk refunds/voids.

### Flow 8 - Organizer Reconciles Sales And Settles Event

Current state:

- Settlement helpers calculate shares.
- Reports derive gross, refunds, fees, no-shows, comps, and by-type counts from current tables.
- Financial transaction ledger writes exist for sales/refunds.

Improvements needed:

- Add versioned settlement package per event.
- Reconcile gross, discounts, fees, tax, refunds, chargebacks, comps, allocations, provider statements, payouts, and attendance.
- Add settlement approval states: draft, review, approved, exported, paid, reopened.
- Persist settlement variance reasons.
- Link settlement package to finance closeout and show-level closeout.
- Never delete/reinsert active revenue allocations as the settlement editing pattern; version changes instead.

### Flow 9 - External Provider Sync

Current state:

- Stripe webhook idempotency exists.
- Ticketmaster discovery provider exists for event discovery.
- No full provider ticketing inbox/quarantine/reconciliation worker was found in the active chain.

Improvements needed:

- Add generalized provider event inbox for Stripe, Ticketmaster, Eventbrite, Dice, etc.
- Store raw webhook evidence securely with signature result and provider account.
- Map external event/order/ticket ids to Tourify event ids.
- Quarantine unmatched, stale, duplicate, out-of-order, or failed events.
- Add operator repair tools and reconciliation dashboard.
- Add provider freshness labels to public/admin inventory.

## Priority Build Plan

### Phase 0 - Stabilize Source Of Truth

Deliverables:

- Fix table naming mismatch: admin setup should use `event_ticketing_config` or a real migration should create the plural canonical table and backfill it.
- Decide whether `ticket_types` and `ticket_sales` remain canonical-forward bridge tables or get replaced by new normalized canonical tables.
- Add a ticketing route registry listing every read/write consumer.
- Add a persisted org/event cutover record instead of relying only on environment flags.

Acceptance:

- Every ticketing admin page can state which source it is reading.
- Missing canonical tables show setup blockers, not empty success.
- No native public sale can start without a config row.

### Phase 1 - Canonical Commands For All Writes

Deliverables:

- Route ticket type, config, publish/unpublish, purchase start, reservation release, payment finalization, issue comp, transfer, void, refund, check-in, reverse check-in, and settlement approval through command services.
- Require idempotency keys on all mutation routes.
- Add typed error envelopes for buyer and admin UI.
- Add audit rows for every privileged operation.

Acceptance:

- No UI directly mutates ticketing tables outside the command/service boundary.
- Replaying a command returns the existing result or a clear idempotency conflict.
- Tests cover duplicate purchase submit, webhook replay, refund replay, and transfer replay.

### Phase 2 - Real Inventory Ledger

Deliverables:

- Create `ticketing_inventory_ledger` or equivalent movement table.
- Record reserve, release, sell, hold, comp, transfer, void, refund, expired, and provider-adjustment movements.
- Keep counter columns as cached read models only.
- Add a reconciliation job that compares ledger balances to counters, reservations, tickets, and orders.

Acceptance:

- Last-ticket concurrency cannot oversell.
- Every current availability value can be reconstructed from movements.
- Any mismatch blocks publish/cutover and appears in the admin read-model panel.

### Phase 3 - Buyer Wallet And Delivery

Deliverables:

- Add order detail and ticket detail pages.
- Add secure email receipt, ticket claim, resend, and pass views.
- Replace raw token delivery with signed management links and wallet QR rendering.
- Add claim-by-email for purchases and transfers.
- Add buyer-visible policy states for transferable, non-transferable, refund-eligible, checked-in, refunded, voided, and expired.

Acceptance:

- Buyer can buy, receive email, claim, view QR, transfer, cancel transfer, accept transfer, and see updated credentials without support.
- Old QR is rejected after transfer/reissue/refund.
- Delivery failures are visible to support/admin.

### Phase 4 - Organizer Ticketing Workspace

Deliverables:

- Build event setup wizard: configuration, tiers, inventory, fees/taxes, terms, publish preview.
- Build operations workspace: orders, attendees, guest list, comps, transfers, refunds, voids, resend, reissue.
- Build tour workspace: per-stop inventory, allocations, comps, check-in, refunds, exceptions, settlement readiness.
- Replace legacy venue/artist ticket pages with scoped projections from the canonical read model.

Acceptance:

- Organizer can run a show without leaving the event ticketing workspace.
- Venue/artist users only see their granted share/scope.
- Discovery, event pages, artist pages, and venue pages all expose native purchase consistently.

### Phase 5 - Admissions And Offline Mode

Deliverables:

- Add scanner devices, gates, operators, event scan package, key version, and revocation tables.
- Build scanner device enrollment and lost-device revoke flow.
- Build offline scan package download/sync APIs.
- Build reconciliation worker for offline scans.
- Add admissions dashboard with live counts, stale devices, duplicate spikes, denial rates, and capacity alerts.

Acceptance:

- Door staff can scan online and offline.
- Offline duplicates reconcile deterministically.
- Revoked devices cannot submit scans.
- Admin can see data freshness and resolve conflicts.

### Phase 6 - Provider Reconciliation And Settlement

Deliverables:

- Generalize webhook inbox beyond Stripe finalization.
- Add provider identity mapping and quarantine.
- Add provider statement import/reconciliation.
- Add settlement package builder and approval workflow.
- Link approved settlement to finance/event closeout.

Acceptance:

- Stripe payment totals match ticket orders and financial ledger.
- Provider sales and native sales reconcile by event, ticket type, and currency.
- Settlement cannot be approved while mismatches exceed tolerance.

### Phase 7 - Legacy Retirement

Deliverables:

- Disable legacy writes per organization after successful cutover evidence.
- Keep historical reads and exports under retention policy.
- Remove unused compatibility routes, panels, fallback authorization, and old table assumptions.
- Lock RLS to canonical access patterns and run direct database isolation tests.

Acceptance:

- Route telemetry shows no active legacy write paths.
- Two-org isolation tests pass for config, tickets, credentials, transfers, sales, refunds, scans, reports, and settlement.
- A complete production rehearsal passes: setup -> publish -> buy -> deliver -> transfer -> scan -> refund -> settle.

## Recommended First Implementation Slice

1. Fix the admin setup table mismatch and make `/api/admin/ticketing/setup` read the same config used by public checkout.
2. Add a publish gate so native public purchase requires `event_ticketing_config.ticketing_enabled = true`, active ticket types, valid sales window, and no read-model blocker.
3. Add a buyer ticket detail page and replace raw text delivery with a secure manage link.
4. Route box-office refund through `/api/admin/ticketing/refund`.
5. Add the persisted inventory ledger table and write movements from reserve/finalize/release/refund.
6. Add scanner device tables and adapt check-in to include `device_id`, gate, scan source, and freshness.

This slice makes the product feel coherent immediately while setting up the larger admissions, settlement, and provider reconciliation work.

## Release Readiness Checklist

- Organizer can create an event, explicitly choose ticketed/not-ticketed, configure tiers, and publish tickets.
- Public event pages and discovery surfaces expose native tickets consistently.
- Buyer can purchase, receive, claim, view, transfer, and manage tickets.
- Old credentials are invalid after transfer, refund, void, or reissue.
- Door staff can scan online with permission and device identity.
- Offline scan package and reconciliation work before a real venue pilot.
- Refund, comp, void, transfer, and override require reason and audit trail.
- Settlement reconciles sales, fees, refunds, comps, attendance, and provider statements.
- Legacy compatibility writes are disabled only after persisted cutover evidence.
- Security tests cover IDOR, oversell race, webhook replay, scanner spoofing, promo abuse, stale transfer, and refund privilege boundaries.
