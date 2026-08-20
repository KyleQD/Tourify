# COM-019 - Representative End-to-End Transaction Traces

Date: 2026-08-12

## Source Task

- Task: `COM-019`
- Phase: `P0 - Discovery and Financial Safety Baseline`
- Requirement: create representative current-state transaction traces for marketplace, ticketing, subscription, and promotion commerce flows.

## Scope

This is a current-state evidence document. It records how money, provider state, local records, fulfillment, and admin observability move through existing code before canonical Commerce Operations contracts are added.

No provider-side mutation, database migration, destructive command, checkout creation, webhook replay, or production data change was performed.

## Trace 1 - Marketplace Native Checkout

Representative path: `POST /api/marketplace/checkout` -> Stripe Checkout -> `POST /api/marketplace/webhook`.

### Sequence

1. Buyer starts native marketplace checkout through `app/api/marketplace/checkout/route.ts`.
2. The route authenticates a signed-in buyer or prepares guest checkout with guest email/token rules.
3. The route validates cart lines, blocks self-purchase, blocks external listings from native checkout, requires a single seller, rejects mixed currencies, and checks inventory.
4. The route loads an active marketplace fee snapshot and calculates subtotal, platform fee, tax, total, and seller net.
5. The route checks seller Stripe Connect payout readiness before creating checkout.
6. Service-role writes create:
   - `marketplace_orders`
   - `marketplace_order_items`
   - `marketplace_payout_ledger`
   - optional `marketplace_checkout_attempts` when a client idempotency key is supplied
7. The route creates a Stripe Checkout Session in payment mode with one line per item, an optional platform-fee line item, Stripe shipping collection when needed, and Connect `payment_intent_data.application_fee_amount` plus `transfer_data.destination`.
8. The route persists `stripe_checkout_session_id` and `payment_reference` on `marketplace_orders`.
9. Stripe calls `app/api/marketplace/webhook/route.ts`, which verifies the Stripe signature using the marketplace-specific or shared webhook secret.
10. The webhook calls `handleMarketplaceStripeEventIdempotent` in `lib/marketplace/webhook-processor.ts`.
11. The processor inserts `marketplace_payment_events` before processing. The provider event id unique constraint is the replay guard.
12. For `checkout.session.completed` with `payment_status = paid`, the processor loads the order by `metadata.order_id`, skips if already paid, and applies `getPaidLifecycleTransition`.
13. The order becomes `status = confirmed`, `payment_status = paid`, and `payment_reference = payment_intent || session.id`.
14. The payout ledger is updated to `payout_status = scheduled` with the same payment reference.
15. Inventory is decremented, digital entitlements are ensured, Printful fulfillment requests are created for eligible items, and notifications are dispatched best-effort.
16. Payment failures and refunds update order payment state and put payout ledger entries on hold.

### Current Source Of Truth

- Provider payment truth: Stripe Checkout Session and PaymentIntent.
- Local order truth: `marketplace_orders`.
- Local line-item/fulfillment truth: `marketplace_order_items`.
- Local seller payout projection: `marketplace_payout_ledger`.
- Local webhook replay/audit projection: `marketplace_payment_events`.
- Local checkout idempotency projection: `marketplace_checkout_attempts`.

### Evidence And Gaps

- This is the strongest existing commerce flow and should be the first adapter model for canonical checkout and ledger work.
- It already has seller payout readiness gating and a local attempt table.
- Money is still stored in legacy decimal columns, while the new Commerce API contract requires `{ amountMinor, currency }`.
- `marketplace_payout_ledger` does not carry currency as a first-class column in the current trace.
- Admin surfaces currently read legacy marketplace records rather than a canonical Commerce transaction read model.
- Payout retry hardening remains a later high-risk action: permission, reason, idempotency key, provider re-fetch, duplicate payout detection, and audit logging are not proven by this trace.

## Trace 2 - Ticketing Stripe Ticket Purchase And Issuance

Representative path: `POST /api/ticketing/enhanced` -> Stripe Checkout -> `POST /api/ticketing/webhook` -> ticket issuance.

### Sequence

1. Buyer starts enhanced ticket checkout through `app/api/ticketing/enhanced/route.ts`.
2. The route validates event, ticket type, quantity, buyer fields, referral and promo-code inputs.
3. `createPendingOrder` creates a pending `ticket_sales` order and, when ticketing v2 is enabled, reserves inventory.
4. The route emits `checkout_started` analytics and may record ticket share conversion data.
5. If buyer total is non-zero and Stripe is configured, the route creates one aggregated Stripe Checkout Session in payment mode.
6. Stripe metadata includes `sale_id`, `order_id`, `user_id`, `event_id`, `ticket_type_id`, `order_number`, `buyer_total`, and `discount_amount`.
7. When ticketing v2 is enabled, the route stores `stripe_checkout_session_id` on `ticket_sales`.
8. Stripe calls `app/api/ticketing/webhook/route.ts`, which verifies the Stripe signature with `STRIPE_WEBHOOK_SECRET`.
9. When ticketing v2 is enabled, `claimWebhookEvent` inserts `ticket_stripe_webhook_events`; duplicate Stripe event ids are treated as already processed.
10. For paid `checkout.session.completed`, the webhook calls `finalizePaidOrder`.
11. `finalizePaidOrder` loads `ticket_sales`, exits early if already completed and issued, updates pending payment state to `completed`, and stores payment/session/webhook references.
12. Inventory is finalized or the classic sold-count function is used as fallback.
13. When ticketing v2 is enabled, `issueTicketsForOrder` creates one `tickets` row per admission, one active `ticket_credentials` row per ticket, and `ticket_ownership_events` with `event_type = issued`.
14. `ticket_sales.issuance_status` becomes `issued`, `finalized_at` is set, ticket sales ledger rows are written for event finance, analytics events are emitted, promo/referral usage is finalized, and notifications are sent.
15. `payment_intent.payment_failed` marks the order failed and releases inventory where possible.
16. `charge.refunded` invokes `refundOrderTickets` in v2, which revokes/updates tickets through the database refund function; classic fallback adjusts order and sold counts.

### Current Source Of Truth

- Provider payment truth: Stripe Checkout Session and PaymentIntent.
- Local order/payment truth: `ticket_sales`.
- Local admission truth: `tickets`.
- Local credential truth: `ticket_credentials`.
- Local ownership timeline: `ticket_ownership_events`.
- Local webhook replay/audit projection: `ticket_stripe_webhook_events` when ticketing v2 is enabled.
- Local event finance projection: ticketing ledger helpers and settlement/report routes.

### Evidence And Gaps

- Paid card orders are provider-confirmed before ticket issuance.
- Free, complimentary, cash, box-office, and allocation issuance can create valid tickets without a provider payment; canonical Commerce timelines must label those sources separately.
- Ticket Checkout creation has no explicit client idempotency key.
- Currency is hard-coded to `usd` in the public enhanced Stripe Checkout path.
- Replay protection is conditional on the ticketing v2 feature flag.
- Ticketing uses decimal major-unit amounts in `ticket_sales` and event finance projections; canonical APIs must expose minor units with currency.

## Trace 3 - Subscription Checkout, Renewal, And Local Projection

Representative path: `POST /api/subscriptions/checkout` -> Stripe subscription Checkout -> `POST /api/subscriptions/webhook`.

### Sequence

1. Artist plan setup starts through `POST /api/subscriptions/tiers/sync`.
2. The tier sync route verifies the artist owns the `artist_subscription_tiers` row.
3. The route creates or updates a Stripe Product, creates or replaces a recurring Stripe Price when amount or interval changes, hard-codes currency to `usd`, and stores `stripe_product_id` and `stripe_price_id` on the tier.
4. Subscriber checkout starts through `POST /api/subscriptions/checkout`.
5. The route authenticates the user, accepts a request-supplied Stripe `priceId`, resolves or creates a Stripe Customer, and stores `profiles.stripe_customer_id` if newly created.
6. The route creates a Stripe Checkout Session in subscription mode and passes `metadata.tourify_user_id`.
7. No local `subscriptions` row is created during checkout.
8. Stripe calls `app/api/subscriptions/webhook/route.ts`, which verifies the Stripe signature.
9. For `customer.subscription.created` and `customer.subscription.updated`, the webhook resolves the local user by matching `profiles.stripe_customer_id`, then upserts `subscriptions` by `stripe_subscription_id`.
10. The local row stores `stripe_price_id`, `stripe_customer_id`, Stripe status, current period start/end, cancel-at-period-end, and canceled timestamp.
11. `customer.subscription.deleted` sets local status to `canceled`.
12. `invoice.paid` sets local status to `active`.
13. `invoice.payment_failed` sets local status to `past_due`.
14. Billing portal sessions can be created through `POST /api/subscriptions/portal`, but state still returns through Stripe webhooks.

### Current Source Of Truth

- Provider billing truth: Stripe Subscription, Customer, Invoice, Product, and Price.
- Local customer reference: `profiles.stripe_customer_id`.
- Local subscription projection: `subscriptions`.
- Local plan setup reference: `artist_subscription_tiers`.

### Evidence And Gaps

- The local `subscriptions` table is a webhook projection, not the initiating command record.
- Invoice ids, renewal amounts, currency, attempt counts, failure reasons, and next retry dates are not stored in the current projection.
- No subscription webhook event claim table or provider event replay guard was confirmed.
- No canonical entitlement grant/revoke/sync path is coupled to subscription status changes.
- The customer billing UI does not currently prove operational subscription state.
- The checkout route accepts a Stripe Price id from the request; later Commerce APIs need scoped plan authorization and normalized subscription DTOs.

## Trace 4 - Promotion Activation Without Paid Promotion Payment

Representative current paths:

- Organic posts: `POST /api/promotions`
- Artist event promotion into ticketing: `POST /api/artist/events/[id]/promote`
- Artist marketing campaign records: `artist_marketing_campaigns`
- Ticket discount campaigns and promo codes: admin ticketing command service and enhanced ticketing checkout

### Sequence - Organic Promotion Post

1. Authenticated user calls `POST /api/promotions`.
2. The route validates author type, title, content, images, tags, visibility, status, publish time, event/tour links, and collaborators.
3. The route inserts `promotion_posts`.
4. Optional collaborator rows are inserted into `post_collaborators`.
5. The result is content activation or scheduling, not a commerce transaction.

### Sequence - Artist Event Promotion Into Ticketing

1. Authenticated artist calls `POST /api/artist/events/[id]/promote`.
2. The route validates optional org id and promote reason.
3. `ArtistEventPromoteService.promoteEvent` loads the artist-owned source event.
4. If already promoted, it returns the existing `events_v2` link.
5. Otherwise the service resolves or creates organization scope, builds a unique event slug, inserts an `events_v2` row, and updates the original `events` row with `promoted_event_v2_id`, `promoted_at`, `promote_reason`, and `promoted_org_id`.
6. The result is ticketing enablement, not a paid promotion purchase.

### Sequence - Ticket Discount Campaign And Promo Code

1. Admin ticketing commands create `ticket_campaigns` and `promo_codes` under event/org scope.
2. Public ticket checkout reads active promo codes and applies discounts to buyer total.
3. Promo-code usage is incremented only after successful free checkout or successful paid finalization.
4. This is discount activation and redemption, not paid promotion spend.

### Current Source Of Truth

- Organic content truth: `promotion_posts` and `post_collaborators`.
- Event-promotion bridge truth: `events.promoted_event_v2_id`, `events.producer_settings`, and `events_v2`.
- Marketing campaign truth: `artist_marketing_campaigns`.
- Discount campaign truth: `ticket_campaigns` and `promo_codes`.

### Evidence And Gaps

- No dedicated paid promotion checkout route, payment capture, webhook, refund, credit, spend ledger, or provider-backed activation path was found.
- Existing marketing campaign records have budget/spend fields, but no confirmed provider payment or reconciliation path updates those fields.
- Existing promo codes reduce ticket buyer totals; they are not promotion purchases.
- Later Commerce Operations implementation must add a canonical paid promotion transaction adapter instead of treating current promotion activation as financially complete.

## Cross-Trace Findings

- Stripe is the provider source of truth for marketplace, ticketing, and subscriptions, but each domain projects provider state differently.
- Only marketplace has a local checkout attempt table with meaningful client idempotency.
- Marketplace and ticketing have webhook replay guards; subscription does not currently have a confirmed provider event claim table.
- Money representation is inconsistent and mostly decimal-major-unit in legacy DB records; canonical Commerce APIs must adapt to `{ amountMinor, currency }`.
- Currency is explicit in marketplace orders, hard-coded in ticketing checkout and subscription tier prices, and absent from paid-promotion paths because no paid promotion path exists.
- Fulfillment and entitlement are domain-specific today: marketplace entitlements/Printful, ticket credentials, subscription status projection, and promotion content/event activation.
- Admin observability is fragmented across marketplace, ticketing, subscription, and promotion surfaces; a unified Commerce ledger/read model and issue system still need to be built.

## Build Implications For Later Phases

- Use marketplace checkout as the first canonical payment/order adapter model because it has the richest current idempotency and payout-readiness behavior.
- Keep ticketing provider-paid, free, comp, cash, allocation, transfer, and refund/revocation traces distinguishable in canonical timelines.
- Treat subscription rows as provider projections and add event replay, invoice detail, entitlement reconciliation, and scoped plan authorization before exposing them as complete Commerce subscriptions.
- Treat paid promotion commerce as missing, not legacy-complete; initial Commerce HQ should surface this as unavailable/incomplete rather than an empty successful dataset.
- Design issue rules around trace gaps:
  - paid but fulfillment missing,
  - paid but ticket issuance missing,
  - refund without revocation,
  - subscription active but entitlement missing,
  - subscription canceled but entitlement active,
  - campaign active without captured payment,
  - payment captured but campaign not activated.

## Evidence Commands

- `sed -n '1,220p' docs/admin-commerce-ops/COM-006_CHECKOUT_CREATION_PATH_INVENTORY.md`
- `sed -n '1,220p' docs/admin-commerce-ops/COM-009_TICKET_ISSUANCE_PATH_INVENTORY.md`
- `sed -n '1,220p' docs/admin-commerce-ops/COM-012_SUBSCRIPTION_RENEWAL_ENTITLEMENT_PATH_INVENTORY.md`
- `sed -n '1,220p' docs/admin-commerce-ops/COM-013_PROMOTION_PAYMENT_ACTIVATION_PATH_INVENTORY.md`
- `sed -n '220,470p' app/api/marketplace/checkout/route.ts`
- `sed -n '1,180p' app/api/marketplace/webhook/route.ts`
- `sed -n '1,260p' lib/marketplace/webhook-processor.ts`
- `sed -n '1,240p' lib/marketplace/order-lifecycle.ts`
- `sed -n '450,630p' app/api/ticketing/enhanced/route.ts`
- `sed -n '1,220p' lib/ticketing/finalize.ts`
- `sed -n '1,240p' lib/ticketing/issuance.ts`
- `sed -n '1,190p' app/api/ticketing/webhook/route.ts`
- `sed -n '1,150p' app/api/subscriptions/checkout/route.ts`
- `sed -n '1,210p' app/api/subscriptions/webhook/route.ts`
- `sed -n '1,180p' app/api/subscriptions/tiers/sync/route.ts`
- `sed -n '1,120p' supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql`
- `sed -n '1,220p' 'app/api/artist/events/[id]/promote/route.ts'`
- `sed -n '1,260p' lib/artist/artist-event-promote.service.ts`
- `sed -n '1,180p' app/api/promotions/route.ts`
- `rg -n "stripe|checkout|payment|paid|budget|spent|artist_marketing_campaigns|promotion_posts|promo_codes|ticket_campaigns" app/api/promotions app/api/artist lib/artist lib/admin/ticketing-command.service.ts supabase/migrations/20250814120000_artist_business_core.sql supabase/migrations/20250813130000_promotion_core.sql -g '*.{ts,tsx,sql}'`
