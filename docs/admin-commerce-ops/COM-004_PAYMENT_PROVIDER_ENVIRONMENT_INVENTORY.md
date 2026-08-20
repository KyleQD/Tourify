# COM-004 — Payment Provider and Environment Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-004`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: identify all payment providers and environments.

## Primary Payment Provider

Stripe is the only confirmed primary payment processor in current code.

| Provider | Current role | Evidence |
| --- | --- | --- |
| Stripe Checkout | Marketplace native checkout, ticketing checkout, subscription checkout, box-office checkout. | `app/api/marketplace/checkout/route.ts`, `app/api/ticketing/enhanced/route.ts`, `app/api/ticketing/box-office/route.ts`, `app/api/subscriptions/checkout/route.ts`. |
| Stripe Webhooks | Marketplace, ticketing, subscription, photo purchase, and music royalty payout provider events. | `app/api/marketplace/webhook/route.ts`, `app/api/ticketing/webhook/route.ts`, `app/api/subscriptions/webhook/route.ts`, `app/api/photos/purchase/webhook/route.ts`, `app/api/webhooks/music-royalty-payouts/route.ts`. |
| Stripe Connect | Seller payout readiness, marketplace transfer destination, profile Connect account IDs, music royalty payouts. | `lib/marketplace/seller-payout-readiness.ts`, `lib/stripe-connect-resolve.ts`, `app/api/stripe/connect/route.ts`, `lib/music/royalties/payout-provider.ts`. |
| Stripe Billing | Subscriptions and billing portal. | `app/api/subscriptions/checkout/route.ts`, `app/api/subscriptions/webhook/route.ts`, `app/api/subscriptions/portal/route.ts`, `subscriptions` migration. |
| Stripe Refunds | Ticketing admin refunds and box-office refunds. | `app/api/admin/ticketing/refund/route.ts`, `app/api/ticketing/box-office/route.ts`. |

## Stripe Client and Environment Handling

| Env var | Purpose | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Server-side Stripe API client. | `lib/stripe.ts` uses one shared Stripe client. Key mode (`sk_test_...` vs `sk_live_...`) determines environment; there is no separate app-level Stripe mode variable. |
| `STRIPE_WEBHOOK_SECRET` | Default Stripe webhook signing secret. | Used by ticketing and subscriptions; also fallback for marketplace and music royalties. |
| `STRIPE_WEBHOOK_SECRET_MARKETPLACE` | Marketplace-specific Stripe webhook secret. | Used by `/api/marketplace/webhook`; falls back to `STRIPE_WEBHOOK_SECRET`. |
| `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES` | Music royalty payout webhook secret. | Used by `/api/webhooks/music-royalty-payouts`; falls back to `STRIPE_WEBHOOK_SECRET`. |
| `STRIPE_WEBHOOK_SECRET_PHOTOS` | Photo purchase webhook secret. | Used by `/api/photos/purchase/webhook`. |
| `NEXT_PUBLIC_SITE_URL` | Callback and checkout redirect base URL. | Checked in `scripts/check-integration-env.ts`; used by checkout/session routes as fallback origin. |

Environment validation exists in `scripts/check-integration-env.ts`, which checks `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Supabase keys, and `NEXT_PUBLIC_SITE_URL`. It does not currently validate marketplace/photo/music-specific webhook secrets.

## Confirmed Stripe Payment Flows

| Flow | Route / module | Provider actions | Idempotency / safety notes |
| --- | --- | --- | --- |
| Marketplace checkout | `app/api/marketplace/checkout/route.ts` | Creates Stripe Checkout session, optionally with `payment_intent_data.application_fee_amount` and `transfer_data.destination`. | Uses `marketplace_checkout_attempts` and order `idempotency_key`; writes marketplace order/items/payout ledger before session creation and rolls back on failure. |
| Marketplace webhook | `app/api/marketplace/webhook/route.ts`, `lib/marketplace/webhook-processor.ts` | Verifies Stripe signature, processes checkout complete, payment failed, charge refunded. | Inserts into `marketplace_payment_events` before processing; duplicate provider event IDs are skipped. |
| Ticketing checkout | `app/api/ticketing/enhanced/route.ts`, `app/api/ticketing/box-office/route.ts` | Creates Stripe Checkout sessions for ticket sales. | Uses ticketing order/finalization helpers; needs deeper flow tracing in COM-006/COM-007/COM-009. |
| Ticketing webhook | `app/api/ticketing/webhook/route.ts` | Verifies Stripe signature, finalizes paid order, marks failures, handles refunds. | Claims `ticket_stripe_webhook_events` when ticketing v2 is enabled. |
| Ticketing admin refund | `app/api/admin/ticketing/refund/route.ts` | Calls `stripe.refunds.create`. | Requires `ticketing.refund`, service-role job target revalidation, reason, Stripe idempotency key, ledger write, and audit event. |
| Subscription checkout | `app/api/subscriptions/checkout/route.ts` | Creates Stripe customer if missing, creates subscription Checkout session. | Authenticated user route; no explicit idempotency key found in this route. |
| Subscription webhook | `app/api/subscriptions/webhook/route.ts` | Verifies Stripe signature and upserts subscription state. | Uses service-role client; no explicit webhook idempotency table found for subscriptions in this pass. |
| Music royalty payout | `lib/music/royalties/payout-provider.ts`, `app/api/webhooks/music-royalty-payouts/route.ts` | Can submit Stripe Connect transfers when dry-run is disabled; processes transfer/payout webhook events. | Defaults to dry-run unless `MUSIC_ROYALTY_PAYOUTS_DRY_RUN=false`; uses transfer idempotency key. |

## Commerce Integrations That Are Not Primary Payment Providers

| Provider | Role | Evidence |
| --- | --- | --- |
| Shopify | External catalog/listing integration and webhooks. | `lib/marketplace/shopify-adapter.ts`, `app/api/marketplace/integrations/shopify/*`. Uses `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, optional `SHOPIFY_SCOPES`, and `SHOPIFY_ADMIN_API_VERSION` defaulting to `2026-07`. |
| Printful | Fulfillment integration and fulfillment-status webhooks. | `app/api/marketplace/integrations/printful/*`, `lib/marketplace/printful-webhook.ts`, `lib/marketplace/printful-fulfillment.ts`. Uses `PRINTFUL_WEBHOOK_SECRET` for webhook verification. |

## Unconfirmed / Legacy Payment Methods

Migration scans show text values such as `cash`, `check`, `credit_card`, `bank_transfer`, `paypal`, and `corporate_account` in logistics/financial tables. These appear to be manual accounting payment methods, not provider-backed payment processors in current commerce code. No PayPal, Square, Plaid, or tax-provider client was confirmed in this pass.

## Environment and Provider Gaps

- There is no single provider/environment registry; provider usage is distributed across routes and helper modules.
- Stripe environment mode is implicit in `STRIPE_SECRET_KEY`, so mixed test/live key mistakes are possible unless validated externally.
- `scripts/check-integration-env.ts` does not validate `STRIPE_WEBHOOK_SECRET_MARKETPLACE`, `STRIPE_WEBHOOK_SECRET_PHOTOS`, `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES`, `SHOPIFY_*`, or `PRINTFUL_WEBHOOK_SECRET`.
- Subscription webhooks update state but no subscription-specific webhook idempotency table was found.
- Marketplace admin payout retry does not currently call Stripe or re-fetch provider payout/transfer state; this remains a high-risk hardening target.

## Evidence Commands

- `sed -n '1,260p' lib/stripe.ts`
- `sed -n '1,120p' scripts/check-integration-env.ts`
- `rg -n "STRIPE_|Stripe|stripe|checkout\.sessions\.create|refunds\.create|payment_intent|payment_method|webhooks\.constructEvent|SHOPIFY|PRINTFUL|PAYPAL|SQUARE|PLAID|TAX|Tax" app lib scripts supabase/migrations -g '*.ts' -g '*.tsx' -g '*.sql'`
- `rg -n "process\.env\.[A-Z0-9_]*(STRIPE|SHOPIFY|PRINTFUL|TAX|PAYMENT|PAYOUT|CONNECT|WEBHOOK)[A-Z0-9_]*" app lib scripts -g '*.ts' -g '*.tsx'`
- `sed -n '1,90p' app/api/marketplace/integrations/printful/webhook/route.ts`
- `sed -n '1,90p' app/api/marketplace/integrations/shopify/webhook/route.ts`
- `sed -n '1,110p' app/api/webhooks/music-royalty-payouts/route.ts`
- `sed -n '1,120p' lib/music/royalties/payout-provider.ts`
