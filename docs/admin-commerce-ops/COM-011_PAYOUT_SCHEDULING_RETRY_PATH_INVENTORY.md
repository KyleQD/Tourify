# COM-011 Payout Scheduling and Retry Path Inventory

Date: 2026-08-12

Source task: COM-011 — Identify every payout scheduling and retry path.

## Scope

This inventory separates:

- provider-backed money movement,
- local payout ledger scheduling,
- provider event observation,
- finance settlement/accounting closeout,
- read-only payout surfaces.

No provider-side payout mutation was performed for this task.

## Suite Requirements

The suite defines payout states as not eligible, pending, scheduled, processing, paid, failed, on hold, reversed, cancelled, and unknown provider state.

The safe retry workflow requires:

1. Re-fetch provider state.
2. Verify no successful or processing transfer exists.
3. Load internal ledger state.
4. Show seller and destination.
5. Show amount and currency.
6. Show failure reason.
7. Show previous attempts.
8. Require reason.
9. Require permission.
10. Use idempotency.
11. Execute or schedule.
12. Store provider result.
13. Audit.
14. Create issue if state remains uncertain.

## Confirmed Scheduling Paths

### Marketplace Checkout Payout Ledger Creation

Path: `app/api/marketplace/checkout/route.ts`

On checkout creation, the route inserts a row into `marketplace_payout_ledger` with:

- `payout_status: "pending"`,
- `payout_provider: "stripe_connect"`,
- `available_at` set to seven days in the future,
- `gross_amount`, `platform_fee_amount`, and `net_amount` stored as decimal DB values,
- destination and fee context stored in metadata, including `sellerStripeAccountId` and `feeSnapshotId`.

Before creating the checkout/order, the route calls `getSellerPayoutReadiness` and blocks checkout when the seller does not have a ready Stripe account.

Provider note: the marketplace checkout path uses Stripe Connect destination context during payment creation. The later `marketplace_payout_ledger` schedule is a local payable/ledger state, not a separate provider payout execution path.

### Marketplace Paid Webhook Transition

Paths:

- `lib/marketplace/order-lifecycle.ts`
- `lib/marketplace/webhook-processor.ts`

When a `checkout.session.completed` event is processed and the order is not already paid, `getPaidLifecycleTransition` returns a payout patch:

- `payout_status: "scheduled"`,
- `payout_reference: paymentReference`.

`lib/marketplace/webhook-processor.ts` applies this patch to `marketplace_payout_ledger` by `order_id`.

This is the primary confirmed marketplace transition from pending payout ledger row to scheduled payout ledger row.

### Marketplace Failure and Refund Holds

Paths:

- `lib/marketplace/order-lifecycle.ts`
- `lib/marketplace/webhook-processor.ts`

`payment_intent.payment_failed` applies:

- order payment status `failed`,
- payout status `on_hold`,
- payout reference set to the payment intent id.

`charge.refunded` applies:

- order status `refunded`,
- order payment status `refunded`,
- payout status `on_hold`,
- payout reference set to the payment intent id.

These are not payout scheduling paths, but they are payout-state transitions that determine later retry eligibility.

### Music Royalty Payout Batch and Instruction Creation

Path: `app/api/artist/music/payouts/batches/route.ts`

When music royalty payouts are enabled, `POST` creates:

- a `music_royalties_payout_batches` row with status `pending_approval`,
- `music_royalties_payout_instructions` rows with status `draft`,
- provider `stripe_connect`,
- provider recipient id,
- currency,
- `amount_minor`,
- unique `idempotency_key`.

The route validates payout readiness through `music_royalties_payee_accounts` and `music_royalties_payout_readiness`.

`PATCH` approves or cancels a batch. Approval requires maker-checker separation and moves:

- batch status to `approved`,
- draft instructions to `approved`,
- `approved_at` timestamps.

This creates approved payout instructions but does not itself submit provider transfers.

### Music Royalty Provider Adapter

Path: `lib/music/royalties/payout-provider.ts`

The Stripe Connect royalty payout provider adapter exposes `submitPayout(input)` and:

- returns `held` when `STRIPE_SECRET_KEY` is missing,
- defaults to dry-run unless `MUSIC_ROYALTY_PAYOUTS_DRY_RUN=false`,
- creates Stripe transfers with `amount`, `currency`, `destination`, and `transfer_group`,
- uses Stripe idempotency with the instruction idempotency key.

No current caller of `submitPayout` was found in `app`, `lib`, or `supabase/migrations`. This means the provider execution primitive exists, but no active scheduling/submission worker or API path is currently wired to execute approved music royalty payout instructions.

## Confirmed Retry Path

### Admin Marketplace Payout Retry

Path: `app/api/admin/marketplace/payouts/[id]/retry/route.ts`

The route:

- authenticates a user,
- loads `profiles.role`,
- allows only `profile.role === "admin"`,
- loads `marketplace_payout_ledger` by id,
- permits retry when `payout_status` is `on_hold`, `failed`, or `pending`,
- increments `metadata.retryAttempts`,
- sets `payout_status: "scheduled"`,
- sets `available_at` to three days in the future,
- stores `lastRetryBy` and `lastRetryAt` in metadata.

This is a local rescheduling path only. It does not re-fetch Stripe provider state, does not detect duplicate successful/processing provider transfers, does not require a reason, does not require a commerce capability, does not require a request idempotency key, and does not write a first-class audit event.

This route is the first high-risk payout hardening target called out by the implementation plan.

## Provider Event Observation Paths

### Music Royalty Payout Webhook

Path: `app/api/webhooks/music-royalty-payouts/route.ts`

This webhook validates Stripe signatures when configured, persists provider events into `music_royalties_payout_provider_events`, resolves an instruction by metadata `payout_instruction_id`, provider transfer id, or transfer group/idempotency key, and maps:

- `transfer.created` / `payout.created` to instruction status `submitted`,
- `transfer.paid` / `payout.paid` to instruction status `paid`,
- `transfer.failed` / `payout.failed` to instruction status `failed`.

This path observes provider state and updates local instructions. It is not a payout retry or scheduler.

### Marketplace Payment Webhook

Path: `lib/marketplace/webhook-processor.ts`

Marketplace payment webhooks update the marketplace payout ledger after payment completion, failure, or refund. These events use payment objects and do not observe a separate provider payout/transfer lifecycle for `marketplace_payout_ledger`.

## Read-Only Payout Surfaces

### Seller Payout List

Path: `app/api/marketplace/payouts/route.ts`

Authenticated sellers can read their own `marketplace_payout_ledger` rows. This route has no scheduling or retry behavior.

### Seller Analytics

Paths:

- `app/api/marketplace/analytics/route.ts`
- `lib/marketplace/seller-analytics.ts`

Seller analytics reads payout rows and treats `pending` and `scheduled` rows as upcoming payout values. This is read-only.

### Admin Marketplace Order Detail

Paths:

- `app/admin/dashboard/marketplace/orders/[id]/page.tsx`
- `app/api/admin/marketplace/orders/[id]/route.ts`

The admin order detail view displays payout rows and calls the retry route for eligible statuses. The API route loads order detail with payout ledger rows; the page triggers the retry action.

## Accounting and Settlement Closeout Paths

### Finance Settlement Transition

Path: `lib/admin/finance-command.service.ts`

The settlement command service can transition `settlements.status` to `paid` with:

- `finance.pay` capability,
- settlement state checks,
- `settled_at`,
- `settled_by`,
- audit logging through `logAuditEvent`.

This is an accounting closeout path. It does not schedule or execute provider payouts.

### Ticketing Settlement Read Model

Path: `app/api/ticketing/settlements/route.ts`

This route calculates gross, refunds, fees, net, allocation shares, and reads a settlement row. It does not schedule or retry payouts.

### Event Ticketing Payout Destination Fields

Path: `supabase/migrations/20260712120000_event_ticketing_foundation.sql`

`event_ticketing_config` includes:

- `payout_destination_account_id`,
- `stripe_connect_account_id`.

These fields store destination configuration. No active provider payout scheduling or retry path was found for these fields.

## Additional Commerce-Adjacent Provider Payout Notes

Photo marketplace purchase code resolves seller Stripe Connect accounts and stores a `seller_payout` amount, but no separate payout retry/schedule path was identified for COM-011 in the admin commerce payout surface.

Music marketplace partner settlement webhooks record settlement/provider order state, but no payout scheduling or retry path was identified for the admin commerce payout buildout baseline.

## Database Targets

Confirmed payout/scheduling/retry related:

- `marketplace_payout_ledger`
- `marketplace_orders`
- `marketplace_payment_events`
- `music_royalties_payee_accounts`
- `music_royalties_payout_readiness`
- `music_royalties_payout_batches`
- `music_royalties_payout_instructions`
- `music_royalties_payout_provider_events`

Accounting/configuration but not payout execution:

- `settlements`
- `financial_transactions`
- `ticket_revenue_allocations`
- `event_ticketing_config.payout_destination_account_id`
- `event_ticketing_config.stripe_connect_account_id`

## Gaps for Later Phases

1. Marketplace retry is a local reschedule and does not meet the suite safe retry workflow.
2. Marketplace retry still uses broad `profile.role === "admin"` instead of commerce capability enforcement.
3. Marketplace retry does not require an action reason.
4. Marketplace retry does not require or persist request idempotency.
5. Marketplace retry does not re-fetch Stripe provider state.
6. Marketplace retry does not detect existing successful or processing transfers before scheduling.
7. Marketplace retry writes retry metadata into a JSON blob but not a first-class audit/event table.
8. Marketplace payout ledger stores Stripe destination in metadata rather than a typed destination snapshot.
9. Marketplace `scheduled` status is not backed by a dedicated provider payout execution worker.
10. Music royalty payout transfer adapter exists, but no active caller/worker was found.
11. There is no canonical unified payout/seller payable read model across marketplace, music royalties, ticketing, and settlements.
12. Legacy decimal marketplace payout amounts must be adapted to canonical `{ amountMinor, currency }` before new commerce APIs expose them.

## Verification Commands

Commands run for this inventory:

```bash
sed -n '1,220p' docs/admin-commerce-ops/15_PAYOUTS_SETTLEMENTS_AND_RECONCILIATION.md
rg -n "COM-011|payout|seller payable|settlement|retry|scheduled" docs/admin-commerce-ops/15_PAYOUTS_SETTLEMENTS_AND_RECONCILIATION.md docs/admin-commerce-ops/20_BACKEND_APIS_SERVICES_EVENTS_AND_WEBHOOKS.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md docs/admin-commerce-ops/02_AUDIT_BASELINE.md
sed -n '1,180p' 'app/api/admin/marketplace/payouts/[id]/retry/route.ts'
sed -n '330,370p' app/api/marketplace/checkout/route.ts
sed -n '1,120p' lib/marketplace/order-lifecycle.ts
sed -n '140,240p' lib/marketplace/webhook-processor.ts
sed -n '1,160p' app/api/marketplace/payouts/route.ts
sed -n '1,180p' lib/music/royalties/payout-provider.ts
sed -n '1,260p' app/api/artist/music/payouts/batches/route.ts
sed -n '1,190p' app/api/webhooks/music-royalty-payouts/route.ts
sed -n '110,210p' supabase/migrations/20260717241000_music_royalties_allocations_payouts_statements.sql
rg -n "submitPayout|createStripeConnectRoyaltyPayoutProvider|payout_provider|payout_status|available_at|retry.*payout|payout.*retry|transfers\\.create|payouts\\.create" app lib supabase/migrations
sed -n '230,280p' app/api/marketplace/checkout/route.ts
sed -n '700,800p' lib/admin/finance-command.service.ts
sed -n '1,180p' app/api/ticketing/settlements/route.ts
rg -n "payout_destination_account_id|stripe_connect_account_id|settled_at|settled_by|status.*paid|payout" app/api lib/admin supabase/migrations/20260712120000_event_ticketing_foundation.sql supabase/migrations -g '*.ts' -g '*.sql'
```

## COM-011 Result

COM-011 is complete as an inventory task. The implementation risk is not closed: payout retry remains unsafe and must be hardened in the later payout tasks before broader payout tooling ships.
