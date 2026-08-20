# COM-012 Subscription Renewal and Entitlement Path Inventory

Date: 2026-08-12

Source task: COM-012 — Identify every subscription renewal and entitlement path.

## Scope

This inventory separates:

- Stripe Billing subscription lifecycle paths,
- artist subscription tier product/price sync,
- billing portal paths,
- purchased digital entitlement delivery,
- music library access grants,
- music marketplace investor subscription state paths,
- beta/free-access UI behavior.

No provider-side billing mutation was performed for this task.

## Suite Requirements

The suite defines subscription operations around:

- trialing,
- active,
- past due,
- grace period,
- payment failed,
- scheduled cancellation,
- cancelled,
- expired.

Subscription list/read models should expose subscriber, account type, plan, amount, currency, renewal date, payment state, failed attempts, entitlements, cancellation state, and issue count.

Reconciliation rules called out by the suite:

- payment succeeded but entitlement missing,
- entitlement active after cancellation,
- plan mismatch,
- duplicate subscription,
- renewal failed without user notice,
- grace period expired without entitlement update.

## Confirmed Stripe Subscription Creation Path

Path: `app/api/subscriptions/checkout/route.ts`

Authenticated users can create a Stripe Checkout Session with:

- `mode: "subscription"`,
- one Stripe Price id,
- a Stripe Customer resolved from `profiles.stripe_customer_id`,
- new Stripe Customer creation when missing,
- profile update with the new `stripe_customer_id`,
- metadata containing `tourify_user_id`.

This route does not write a local `subscriptions` row directly. Local state is expected to arrive through Stripe webhooks.

## Confirmed Stripe Subscription Renewal and State Mutation Path

Path: `app/api/subscriptions/webhook/route.ts`

The subscription webhook validates `stripe-signature` against `STRIPE_WEBHOOK_SECRET`, then uses the service-role client to mutate local subscription state.

Handled events:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Create/update behavior:

- resolves the Tourify user by matching `profiles.stripe_customer_id` to the Stripe customer,
- upserts `subscriptions` on `stripe_subscription_id`,
- stores `stripe_price_id`,
- stores `stripe_customer_id`,
- stores Stripe subscription status,
- stores `current_period_start`,
- stores `current_period_end`,
- stores `cancel_at_period_end`,
- stores `canceled_at`.

Deletion behavior:

- sets local `subscriptions.status` to `canceled`,
- sets `canceled_at` to the current server timestamp.

Renewal success behavior:

- `invoice.paid` sets `subscriptions.status` to `active` by Stripe subscription id.

Renewal failure behavior:

- `invoice.payment_failed` sets `subscriptions.status` to `past_due` by Stripe subscription id.

Observed gaps:

- invoice events do not store invoice ids, amounts, currency, attempt counts, failed payment reason, or next payment attempt,
- renewal success/failure does not emit a local audit/event record,
- no user notification path was confirmed for renewal success or failure,
- no entitlement grant/revoke/sync path is coupled to subscription status changes,
- no grace-period expiration job was found,
- no duplicate subscription detection beyond the unique `stripe_subscription_id`.

## Confirmed Subscription Schema

Path: `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql`

The `subscriptions` table stores:

- `user_id`,
- `stripe_subscription_id`,
- `stripe_price_id`,
- `stripe_customer_id`,
- `status`,
- `current_period_start`,
- `current_period_end`,
- `cancel_at_period_end`,
- `canceled_at`,
- `metadata`,
- timestamps.

Allowed statuses:

- `active`,
- `past_due`,
- `canceled`,
- `incomplete`,
- `incomplete_expired`,
- `trialing`,
- `unpaid`,
- `paused`.

RLS:

- users can select their own subscriptions,
- service role can manage all subscriptions.

## Confirmed Artist Subscription Tier Sync Path

Path: `app/api/subscriptions/tiers/sync/route.ts`

Authenticated artists can sync an `artist_subscription_tiers` row to Stripe:

- loads the tier owned by the current user,
- creates or updates a Stripe Product,
- creates or reuses a Stripe recurring Price,
- deactivates the old Price and creates a new Price when amount or interval changes,
- writes `stripe_product_id` and `stripe_price_id` back to `artist_subscription_tiers`.

This is plan/product setup, not a renewal or entitlement path. It is still included because it is the source for Stripe Price ids used by subscription checkout.

## Confirmed Billing Portal Path

Path: `app/api/subscriptions/portal/route.ts`

Authenticated users can create a Stripe Billing Portal session when `profiles.stripe_customer_id` exists.

This route lets Stripe manage payment methods, cancellation, and billing changes. Local state is still expected to be updated through the subscription webhook, not directly through the portal route.

## Billing UI State

Paths:

- `app/settings/billing/page.tsx`
- `components/settings/billing-settings.tsx`

The billing settings page currently renders beta/free-access copy and does not query local `subscriptions` state or Stripe billing state.

This means the customer-facing billing UI is not currently a reliable subscription operations surface.

## Purchased Digital Entitlement Delivery

### Marketplace Webhook Processor Path

Path: `lib/marketplace/webhook-processor.ts`

After marketplace checkout completion, `ensureDigitalEntitlements`:

- loads digital marketplace order items,
- skips items that already have a `marketplace_entitlements` row,
- inserts active entitlements for digital assets,
- sets signed URL expiration to 24 hours,
- sets `max_downloads` to 5,
- marks the order item fulfillment status as completed.

This path is tied to one-time marketplace purchases, not recurring subscriptions.

### Marketplace Webhook Handler Path

Path: `lib/marketplace/webhook-handler.ts`

The older marketplace webhook handler also delivers digital entitlements and includes additional music-library behavior:

- inserts `marketplace_entitlements`,
- includes listing/music/storage metadata,
- upserts `user_music_library` rows for purchased music tracks,
- records a music purchase event,
- marks digital order items completed.

Both marketplace webhook implementations contain entitlement-delivery logic, so later phases need to reconcile/retire duplication or prove which handler is authoritative in deployment.

### Marketplace Delivery Access Path

Path: `app/api/marketplace/delivery/[orderItemId]/route.ts`

Authenticated buyers or sellers can load a digital entitlement for an order item. The route:

- verifies the caller is the buyer or seller on the order,
- loads `marketplace_entitlements`,
- blocks when no entitlement exists,
- blocks when the download limit is reached,
- refreshes signed URLs from Supabase Storage when needed,
- increments `download_count`,
- stores `last_downloaded_at`.

This path consumes and refreshes purchase entitlements; it does not create subscription entitlements.

## Music Library Entitlement and Access Paths

Paths:

- `app/api/music/library/route.ts`
- `lib/music/music-access.ts`

`app/api/music/library/route.ts` lets users add free tracks to `user_music_library` with `source: "free_add"`. For non-free tracks, it requires an existing library row and returns `purchase_required` if one is missing.

`lib/music/music-access.ts` grants full access when:

- the viewer owns the track,
- the viewer has a `user_music_library` row for the track,
- the track is free and not clip-gated.

This is an access/entitlement path, but it is not a subscription renewal path.

## Music Marketplace Investor Subscription Path

### Create and Read

Path: `app/api/music-marketplace/subscriptions/route.ts`

When the music marketplace subscriptions flag is enabled:

- `GET` lists the current investor's `music_marketplace_subscriptions`,
- `POST` validates an offering is accepting subscriptions,
- enforces request idempotency with `(offering_id, investor_user_id, idempotency_key)`,
- calls the sandbox intermediary adapter,
- inserts a `music_marketplace_subscriptions` row with status `submitted_to_partner`,
- inserts a `music_marketplace_subscription_events` transition record.

This is not Stripe Billing. It is a partner-routed investor/offering subscription workflow with escrow/legal acceptance controlled by partners.

### Partner Webhook State Updates

Path: `app/api/webhooks/music-marketplace/[partner]/route.ts`

Partner webhook receipts are persisted idempotently. When a payload contains `subscription_id` and `subscription_status`, the webhook:

- loads the subscription,
- validates the transition with `canTransitionSubscription`,
- updates `music_marketplace_subscriptions.status`,
- inserts `music_marketplace_subscription_events`.

### State Machine

Path: `lib/music/marketplace/order-state-machine.ts`

Music marketplace subscription states:

- `draft_local`,
- `submitted_to_partner`,
- `partner_received`,
- `payment_pending`,
- `escrowed`,
- `accepted`,
- `allocated`,
- `rejected`,
- `cancelled`,
- `refund_pending`,
- `refunded`,
- `cooling_off`,
- `compliance_hold`.

These are investment/offering subscription states, not recurring billing renewal states.

## Admin Operations and Kill Switches

Path: `app/api/admin/music-marketplace/ops/route.ts`

Music marketplace admin ops can disable `music_marketplace_subscriptions_enabled` through the `kill_switch_subscriptions` action when `music_marketplace_admin_ops_enabled` is active and the caller is an admin.

This is an operational control, not a subscription renewal or entitlement sync path.

## Non-Commerce Subscription Uses Excluded

The repository also contains unrelated uses of “subscription” for:

- Supabase realtime channels,
- forum follow/subscription records,
- creator/community membership APIs.

These are not subscription commerce renewal or paid entitlement paths for the Commerce Operations buildout and are excluded from this task.

## Database Targets

Confirmed billing subscription targets:

- `profiles.stripe_customer_id`
- `subscriptions`
- `artist_subscription_tiers`

Confirmed purchased entitlement/access targets:

- `marketplace_entitlements`
- `marketplace_order_items`
- `marketplace_orders`
- `user_music_library`

Confirmed music marketplace investor subscription targets:

- `music_marketplace_subscriptions`
- `music_marketplace_subscription_events`
- `music_marketplace_partner_event_receipts`
- `music_marketplace_offerings`
- `music_marketplace_offering_versions`

## Provider Targets

- Stripe Checkout Sessions
- Stripe Customers
- Stripe Products
- Stripe Prices
- Stripe Billing Portal
- Stripe subscription webhooks
- Stripe invoice webhooks
- Music marketplace sandbox intermediary adapter
- Music marketplace partner webhooks

## Gaps for Later Phases

1. No canonical subscription DTO or read model currently normalizes Stripe Billing, artist tiers, purchased entitlements, and music marketplace investor subscriptions.
2. Stripe subscription renewal success/failure does not create structured issue records.
3. Stripe renewal failure does not record failed attempt metadata, invoice id, amount, currency, or failure reason.
4. Stripe subscription changes do not reconcile or mutate explicit subscription entitlements.
5. Billing settings UI does not display live subscription state.
6. Purchased digital entitlements are not connected to recurring subscription state.
7. Marketplace entitlement creation appears duplicated between `lib/marketplace/webhook-processor.ts` and `lib/marketplace/webhook-handler.ts`.
8. No explicit job was found for grace-period expiration, entitlement revocation after cancellation, or entitlement mismatch repair.
9. Music marketplace subscriptions are investment/offering workflow records and should not be confused with Stripe recurring billing.
10. No admin Commerce HQ route currently exposes subscription renewal failure workflows or entitlement reconciliation.

## Verification Commands

Commands run for this inventory:

```bash
rg -n "COM-012|subscription|renewal|entitlement|membership|invoice|portal|billing" docs/admin-commerce-ops/18_SUBSCRIPTIONS_FEES_AND_PROMOTIONS.md docs/admin-commerce-ops/20_BACKEND_APIS_SERVICES_EVENTS_AND_WEBHOOKS.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md docs/admin-commerce-ops/02_AUDIT_BASELINE.md
rg -n "subscription|entitlement|invoice\\.paid|customer\\.subscription|checkout\\.session\\.completed|billing_portal|portal|stripe_subscription|subscription_id" app lib supabase/migrations -g '*.ts' -g '*.tsx' -g '*.sql'
find app/api -path '*subscription*' -o -path '*entitlement*' -o -path '*billing*' | sort
find app -path '*subscription*' -o -path '*entitlement*' -o -path '*membership*' | sort
rg --files docs/admin-commerce-ops
sed -n '1,180p' app/api/subscriptions/webhook/route.ts
sed -n '1,150p' app/api/subscriptions/checkout/route.ts
sed -n '1,130p' app/api/subscriptions/portal/route.ts
sed -n '1,150p' app/api/subscriptions/tiers/sync/route.ts
sed -n '1,130p' supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql
sed -n '300,370p' lib/marketplace/webhook-processor.ts
sed -n '210,380p' lib/marketplace/webhook-handler.ts
sed -n '1,130p' 'app/api/marketplace/delivery/[orderItemId]/route.ts'
sed -n '1,160p' app/api/music-marketplace/subscriptions/route.ts
sed -n '1,120p' lib/music/marketplace/order-state-machine.ts
sed -n '60,130p' 'app/api/webhooks/music-marketplace/[partner]/route.ts'
sed -n '220,265p' supabase/migrations/20260718001450_music_marketplace_offerings_investors.sql
rg -n "create table.*user_music_library|user_music_library|marketplace_entitlements|entitlement_id" supabase/migrations app lib -g '*.sql' -g '*.ts'
sed -n '1,220p' app/settings/billing/page.tsx
sed -n '1,240p' components/settings/billing-settings.tsx
rg -n "from\\(\\\"subscriptions\\\"\\)|from\\('subscriptions'\\)|artist_subscription_tiers|stripe_price_id|stripe_subscription_id|current_period_end|cancel_at_period_end" app lib components -g '*.ts' -g '*.tsx'
sed -n '1,130p' app/api/admin/music-marketplace/ops/route.ts
```

## COM-012 Result

COM-012 is complete as an inventory task. The implementation risk remains open: recurring subscription state is stored, but subscription-driven entitlement reconciliation, renewal issue handling, failed-attempt detail, and Commerce HQ subscription operations are not yet built.
