# COM-006 — Checkout Creation Path Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-006`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: identify every checkout creation path.

## Confirmed Stripe Checkout Creation Paths

The current codebase has six confirmed `stripe.checkout.sessions.create(...)` paths.

| Route | Product area | Checkout mode | Pre-created local record | Payment methods | Key metadata |
| --- | --- | --- | --- | --- | --- |
| `POST /api/marketplace/checkout` | Marketplace native listings. | `payment` | `marketplace_orders`, `marketplace_order_items`, `marketplace_payout_ledger`, optional `marketplace_checkout_attempts`. | `card`, `us_bank_account`. | `source`, `order_id`, `seller_user_id`, `buyer_user_id`, `is_guest`. |
| `POST /api/photos/purchase` | Photo marketplace purchase/licensing. | `payment` | `photo_purchases`. | `card`, `us_bank_account`. | `purchase_id`, `photo_id`, `buyer_user_id`, `seller_user_id`. |
| `POST /api/ticketing/enhanced` | Public enhanced ticketing checkout. | `payment` | `ticket_sales` pending order through `createPendingOrder`; inventory reservation when v2 is enabled. | Stripe default card flow for one aggregated line item. | `sale_id`, `order_id`, `user_id`, `event_id`, `ticket_type_id`, `order_number`, `buyer_total`, `discount_amount`. |
| `POST /api/ticketing/box-office` | Admin/operator box-office card sales. | `payment` | `ticket_sales` pending order through `createPendingOrder`. | Stripe default card flow for one aggregated line item. | `sale_id`, `order_id`, `order_number`, `box_office`. |
| `POST /api/subscriptions/checkout` | User subscription checkout. | `subscription` | Stripe customer may be created and stored on `profiles.stripe_customer_id`; subscription row is created later by webhook. | Stripe price ID from request. | `tourify_user_id`. |
| `POST /api/payment` | Legacy/generic booking ticket payment. | `payment` | Existing `bookings` row must exist and be user-owned. | `card`. | `bookingId`, `eventId`, `eventTable`, `ticketQuantity`, `userId`. |

`app/api/subscriptions/portal/route.ts` creates Stripe Billing Portal sessions, not Checkout sessions, and is excluded from this checkout-creation inventory.

## Marketplace Checkout

`app/api/marketplace/checkout/route.ts` is the most complete checkout creation path:

- Allows authenticated or guest checkout.
- Requires guest email for unauthenticated buyers.
- Parses `marketplaceCheckoutRequestSchema`.
- Uses a client-supplied idempotency key when provided.
- Reuses an open existing Stripe session for a pending idempotency attempt.
- Requires a single seller per cart.
- Blocks self-purchase.
- Blocks external listings from native checkout.
- Rejects mixed currencies.
- Performs inventory checks before creating local rows.
- Loads fee rules through `loadActiveFeeSnapshot`.
- Requires seller Stripe Connect payout readiness.
- Creates local order, items, payout ledger, and checkout attempt before Stripe session creation.
- Deletes local rows if Stripe session creation fails.
- Passes `application_fee_amount` and `transfer_data.destination` to Stripe when a seller Connect account is available.

This is the strongest model for later canonical checkout contracts, but it still stores decimal money amounts in legacy DB columns and stores the seller destination account in metadata.

## Photo Purchase Checkout

`app/api/photos/purchase/route.ts` creates a photo purchase row and then creates a Stripe Checkout session.

Key traits:

- Requires authenticated buyer.
- Blocks self-purchase.
- Blocks repurchase when a completed purchase exists.
- Calculates marketplace-style fee breakdown.
- Resolves seller Stripe Connect destination from profile fields.
- Uses `payment_intent_data.transfer_data.destination` when a Connect account exists.

Gaps:

- No explicit checkout idempotency key or attempt table.
- Does not require seller payout readiness before creating checkout.
- Does not write to `marketplace_payout_ledger`.
- Stores `stripe_payment_intent_id` as the Checkout session ID, which is a naming mismatch for later reconciliation.

## Ticketing Enhanced Checkout

`app/api/ticketing/enhanced/route.ts` creates a pending ticket order through `createPendingOrder`, emits analytics, and then creates a Stripe Checkout session when the buyer total is non-zero and Stripe is configured.

Key traits:

- Supports promo and referral code effects before checkout.
- Uses one aggregated Stripe line item equal to server-calculated buyer total.
- Updates `ticket_sales.stripe_checkout_session_id` when ticketing v2 is enabled.
- Free or complimentary path skips Stripe and issues immediately.

Gaps:

- No explicit idempotency key on the Checkout session creation path.
- Currency is hard-coded to `usd`.
- Free-ticket issuance occurs inside the checkout route and must be handled separately in COM-009.

## Box-Office Checkout

`app/api/ticketing/box-office/route.ts` creates pending ticket orders for operators.

Key traits:

- Requires API auth and `operate_box_office` ticketing permission.
- Card sales create a Stripe Checkout session.
- Cash and comp paths skip Stripe and finalize/issue locally.
- Uses service-role writes for pending order and status updates.

Gaps:

- No explicit idempotency key on card checkout creation.
- Currency is hard-coded to `usd`.
- Card checkout success returns to the admin event screen and relies on webhook/finalization to complete payment state.

## Subscription Checkout

`app/api/subscriptions/checkout/route.ts` creates subscription-mode Checkout sessions.

Key traits:

- Requires authenticated user.
- Accepts a Stripe `priceId`.
- Creates a Stripe customer and stores `profiles.stripe_customer_id` if needed.
- Stores `tourify_user_id` metadata for webhook reconciliation.

Gaps:

- No explicit idempotency key.
- Price IDs are accepted from the request; authorization/entitlement rules are deferred to later subscription tasks.
- Subscription state is created later by webhook, not before checkout.

## Legacy Generic Payment Checkout

`app/api/payment/route.ts` creates a Stripe Checkout session for a user-owned `bookings` row.

Key traits:

- Authenticates through mobile bearer fallback.
- Verifies booking ownership before creating checkout.
- Resolves event details across legacy/canonical event tables.
- Uses one ticket line item with quantity.
- GET endpoint verifies the session and directly marks `bookings.status = confirmed`.

Gaps:

- No webhook/idempotency model was confirmed for this route.
- No ticket issuance, order ledger, payout ledger, or fee snapshot was confirmed.
- Uses `NEXT_PUBLIC_APP_URL`, while other newer checkout routes often use `NEXT_PUBLIC_SITE_URL` or request origin.

## Cross-Path Gaps

- Checkout creation has no shared command wrapper, request envelope, correlation ID, or structured Commerce error model.
- Only marketplace checkout has a local attempt table and meaningful idempotency behavior.
- Currency handling is inconsistent: marketplace reads listing currency, while ticketing/photo/legacy routes mostly hard-code `usd`.
- Stripe Checkout metadata keys are inconsistent across product areas.
- Several routes create local rows before Stripe session creation but use different rollback strategies.
- Seller destination readiness is strict in marketplace checkout, optional in photo checkout, and not active in ticketing checkout.

## Evidence Commands

- `rg -n "checkout\\.sessions\\.create|stripe\\.checkout|Checkout Session|createCheckout|checkout session|mode: ['\\\"]payment|mode: ['\\\"]subscription|payment_intent_data|success_url|cancel_url" app lib -g '*.ts' -g '*.tsx'`
- `find app/api -type f -name route.ts | rg 'checkout|purchase|box-office|subscription|enhanced|payment|stripe|ticketing' | sort`
- `rg -n "createCheckoutSession|checkoutSession|stripe checkout|stripeCheckout|sessions\\.create" app lib scripts -g '*.ts' -g '*.tsx'`
- `sed -n '1,240p' app/api/marketplace/checkout/route.ts`
- `sed -n '240,460p' app/api/marketplace/checkout/route.ts`
- `sed -n '1,230p' app/api/photos/purchase/route.ts`
- `sed -n '1,140p' app/api/ticketing/enhanced/route.ts`
- `sed -n '450,560p' app/api/ticketing/enhanced/route.ts`
- `sed -n '1,210p' app/api/ticketing/box-office/route.ts`
- `sed -n '1,110p' app/api/subscriptions/checkout/route.ts`
- `sed -n '1,260p' app/api/payment/route.ts`
