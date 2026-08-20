# COM-017 Webhook Signature and Replay Protection Inventory

Date: 2026-08-12

Source task: COM-017 - Document current webhook signature and replay protection.

## Scope

This inventory records current commerce-adjacent webhook routes, signature verification methods, provider event persistence, duplicate detection, and replay protection behavior.

Suite questions addressed:

- Which webhook routes verify signatures?
- Which webhook routes prevent replay?
- Which routes persist provider event IDs?
- Which routes rely on idempotent writes but do not store provider events?
- Which routes use unsigned or token-only modes?

No route behavior, provider behavior, schema, or secret configuration was changed for this task.

## Route Summary

| Route | Provider | Signature or Auth Check | Replay Protection | Event Store |
| --- | --- | --- | --- | --- |
| `app/api/marketplace/webhook/route.ts` | Stripe marketplace | `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET_MARKETPLACE` or `STRIPE_WEBHOOK_SECRET` | Yes, unique `provider_event_id` claim before processing | `marketplace_payment_events` |
| `app/api/ticketing/webhook/route.ts` | Stripe ticketing | `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` | Yes when ticketing v2 is enabled; otherwise only handler-level idempotence | `ticket_stripe_webhook_events` |
| `app/api/photos/purchase/webhook/route.ts` | Stripe photos | `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET_PHOTOS` | No provider event claim found | None found |
| `app/api/subscriptions/webhook/route.ts` | Stripe subscriptions | `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` | Partial: upsert/update by Stripe subscription id, no event claim | None found |
| `app/api/webhooks/music-royalty-payouts/route.ts` | Stripe Connect royalty payouts | Stripe signature when secret and signature are present; optional unsigned mode | Yes, upsert on `(provider, event_id)` | `music_royalties_payout_provider_events` |
| `app/api/marketplace/integrations/printful/webhook/route.ts` | Printful | HMAC SHA-256 using `x-printful-signature` and `PRINTFUL_WEBHOOK_SECRET` | Yes when an external event id can be derived | `marketplace_provider_webhook_events` |
| `app/api/marketplace/integrations/shopify/webhook/route.ts` | Shopify | HMAC SHA-256 using `x-shopify-hmac-sha256` and Shopify client secret | Yes, unique Shopify webhook id; fallback id includes timestamp | `marketplace_provider_webhook_events` |
| `app/api/webhooks/music-marketplace/[partner]/route.ts` | Music marketplace partners | Custom `x-tourify-partner-signature`; optional unsigned mode | Yes, duplicate lookup by partner event id | `music_marketplace_partner_event_receipts` |
| `app/api/licensing/partners/webhooks/[provider]/route.ts` | Music licensing partners | Custom `x-tourify-partner-signature`; optional unsigned mode | Yes, duplicate lookup by provider event id | `music_licensing_partner_events` |
| `app/api/institutional/partners/webhooks/[provider]/route.ts` | Music institutional partners | Custom `x-tourify-partner-signature`; optional unsigned mode | Yes, duplicate lookup by provider event id | `music_institutional_partner_events` |
| `app/api/rights-admin/partners/webhooks/[provider]/route.ts` | Music rights-admin partners | Custom `x-tourify-partner-signature`; optional unsigned mode | Yes, duplicate lookup by provider event id | `music_rights_admin_partner_events` |
| `app/api/webhooks/supabase/notifications/route.ts` | Supabase database webhook | Bearer token or `x-notification-webhook-secret` | No provider event claim found | None found |

## Stripe Marketplace Webhook

Paths:

- `app/api/marketplace/webhook/route.ts`
- `lib/marketplace/webhook-processor.ts`
- `supabase/migrations/20260728000011_marketplace_checkout_attempts.sql`
- `lib/marketplace/__tests__/checkout-p6.test.ts`

Signature verification:

- Reads raw body with `request.text()`.
- Requires `stripe-signature`.
- Verifies using `stripe.webhooks.constructEvent`.
- Secret preference is `STRIPE_WEBHOOK_SECRET_MARKETPLACE`, then `STRIPE_WEBHOOK_SECRET`.

Replay protection:

- `handleMarketplaceStripeEventIdempotent` inserts into `marketplace_payment_events` before processing.
- `marketplace_payment_events.provider_event_id` is unique.
- Duplicate insert errors return `{ outcome: "duplicate" }` and the route returns `200`.
- Non-duplicate event-store failures return `500` so Stripe retries.

Event table:

- `provider_event_id`
- `event_type`
- `processing_status`
- `attempts`
- `last_error`
- `raw_payload`
- `received_at`
- `processed_at`

Coverage:

- Existing tests cover duplicate provider event IDs, already-paid order no-op behavior, and non-duplicate event-store failure.

Gaps:

- The idempotent processor currently inserts only event id, type, status, and attempt count; it does not store raw payload in the current insert.
- Failure update has an inert `attempts` placeholder rather than a real increment.
- Admin retry route resets failed events to `received`, but no worker pickup path was verified in this inventory.
- Legacy `lib/marketplace/webhook-handler.ts` still exists but `app/api/marketplace/webhook/route.ts` uses the idempotent processor.

## Stripe Ticketing Webhook

Paths:

- `app/api/ticketing/webhook/route.ts`
- `lib/ticketing/finalize.ts`
- `supabase/migrations/20260712120000_event_ticketing_foundation.sql`
- `supabase/migrations/20260720181000_tix102_harden_foundation_rls.sql`
- `__tests__/ticketing/integrity.test.ts`
- `__tests__/ticketing/hardening-flows.test.ts`

Signature verification:

- Reads raw body with `request.text()`.
- Requires `stripe-signature`.
- Verifies using `stripe.webhooks.constructEvent`.
- Uses `STRIPE_WEBHOOK_SECRET`.
- Returns `503` when Stripe or endpoint secret is not configured.

Replay protection:

- When `isTicketingV2Enabled()` is true, the route calls `claimWebhookEvent`.
- `claimWebhookEvent` inserts the Stripe event id into `ticket_stripe_webhook_events`.
- Duplicate primary key errors return duplicate `200` responses.
- When ticketing v2 is disabled, `claimWebhookEvent` returns true and the event table is not used.

Event table:

- `id` is the Stripe event id primary key.
- `event_type`
- `order_id`
- `processed_at`
- `payload_summary`

Security:

- RLS is enabled on `ticket_stripe_webhook_events`.
- Policies deny client access; service role writes.

Gaps:

- Replay protection is conditional on the v2 feature flag.
- `processed_at` defaults at insert time and does not distinguish received from processed phases.
- No full provider event timeline shape exists for Commerce Operations.

## Stripe Photo Purchase Webhook

Paths:

- `app/api/photos/purchase/webhook/route.ts`
- `supabase/migrations/20250208000000_photo_album_marketplace_system.sql`

Signature verification:

- Reads raw body with `request.text()`.
- Requires `stripe-signature`.
- Verifies using `stripe.webhooks.constructEvent`.
- Uses `STRIPE_WEBHOOK_SECRET_PHOTOS`.

Replay protection:

- No provider event store or unique Stripe event id claim was found.
- Updates are applied directly to `photo_purchases`.

Current event effects:

- `checkout.session.completed` sets `payment_status = completed`, stores transaction id, and sets download expiration.
- `payment_intent.payment_failed` sets `payment_status = failed` by transaction id.
- `charge.refunded` sets `payment_status = refunded` by transaction id.

Gaps:

- Duplicate webhooks can repeat updates and refresh `download_expires_at`.
- Event id, event type, and payload hash are not persisted.
- No replay queue, duplicate response, or provider event timeline exists.

## Stripe Subscription Webhook

Paths:

- `app/api/subscriptions/webhook/route.ts`
- `supabase/migrations/20260413400000_stripe_connect_and_subscriptions.sql`

Signature verification:

- Reads raw body with `request.text()`.
- Requires `stripe-signature`.
- Verifies using `stripe.webhooks.constructEvent`.
- Uses `STRIPE_WEBHOOK_SECRET`.

Replay protection:

- No provider event store or unique Stripe event id claim was found.
- `customer.subscription.created` and `customer.subscription.updated` upsert by `stripe_subscription_id`.
- Other subscription events update rows by `stripe_subscription_id`.

Gaps:

- Idempotence is row-shape dependent, not event-claim based.
- Duplicate `invoice.paid` and `invoice.payment_failed` events can repeat status updates.
- No event timeline, payload hash, replay status, or duplicate event response exists.

## Music Royalty Payout Webhook

Paths:

- `app/api/webhooks/music-royalty-payouts/route.ts`
- `supabase/migrations/20260717241000_music_royalties_allocations_payouts_statements.sql`

Signature verification:

- Uses Stripe `constructEvent` when a webhook secret and signature are present.
- Secret preference is `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES`, then `STRIPE_WEBHOOK_SECRET`.
- Allows unsigned JSON only when `MUSIC_ROYALTY_PAYOUTS_WEBHOOK_ALLOW_UNSIGNED === "true"`.

Replay protection:

- Upserts event rows on `(provider, event_id)`.
- Event table has unique `(provider, event_id)`.
- The route stores payload and `processed_at`.

Event table:

- `provider`
- `event_id`
- `event_type`
- `payout_instruction_id`
- `payload`
- `processed_at`

Gaps:

- Upsert means duplicates are absorbed, but the route does not explicitly return `duplicate: true`.
- The unsigned mode is configuration-controlled; production rollout should ensure it is disabled in live environments.

## Marketplace Integration Webhooks

### Printful

Paths:

- `app/api/marketplace/integrations/printful/webhook/route.ts`
- `lib/marketplace/printful-webhook.ts`
- `supabase/migrations/20260704224927_marketplace_integrations_hardening.sql`
- `lib/marketplace/__tests__/printful-webhook.test.ts`

Signature verification:

- Requires `x-printful-signature`.
- Requires `PRINTFUL_WEBHOOK_SECRET`.
- Computes HMAC SHA-256 over raw payload.
- Uses `crypto.timingSafeEqual`.

Replay protection:

- Derives an external event id from `body.id`, `body.event_id`, `body.eventId`, or `externalOrderId:eventType`.
- Inserts into `marketplace_provider_webhook_events`.
- Unique `(provider, external_event_id)` prevents duplicates.
- Duplicate insert returns `200` with `duplicate: true`.

Gap:

- If no external event id can be derived, the route still processes updates without event-store replay protection.

### Shopify

Paths:

- `app/api/marketplace/integrations/shopify/webhook/route.ts`
- `lib/marketplace/shopify-adapter.ts`
- `supabase/migrations/20260704224927_marketplace_integrations_hardening.sql`
- `lib/marketplace/__tests__/shopify-adapter.test.ts`

Signature verification:

- Requires `x-shopify-hmac-sha256`.
- Computes HMAC SHA-256 over raw body with Shopify client secret.
- Uses timing-safe comparison helper.

Replay protection:

- Stores `x-shopify-webhook-id` as the external event id.
- Inserts into `marketplace_provider_webhook_events`.
- Unique `(provider, external_event_id)` prevents duplicates.
- Duplicate insert returns `200` with `duplicate: true`.

Gap:

- If Shopify does not send `x-shopify-webhook-id`, the fallback id includes `Date.now()`, which prevents reliable duplicate detection for replays.

## Music Partner Webhooks

Paths:

- `app/api/webhooks/music-marketplace/[partner]/route.ts`
- `app/api/licensing/partners/webhooks/[provider]/route.ts`
- `app/api/institutional/partners/webhooks/[provider]/route.ts`
- `app/api/rights-admin/partners/webhooks/[provider]/route.ts`
- `lib/music/marketplace/partner-adapters.ts`
- `lib/music/licensing/partner-adapters.ts`
- `lib/music/institutional/partner-adapters.ts`
- `lib/music/rights-admin/partner-adapters.ts`

Signature verification:

- Reads `x-tourify-partner-signature`.
- Looks up provider-specific secret first, then global secret.
- Can allow unsigned events through explicit `*_WEBHOOK_ALLOW_UNSIGNED === "true"` env flags.
- Helper computes `sha256(secret + ":" + rawBody)` and compares with `===`.

Replay protection:

- Music marketplace checks `music_marketplace_partner_event_receipts` by `(partner_id, provider_event_id)`.
- Licensing checks `music_licensing_partner_events` by `(provider, external_event_id)`.
- Institutional checks `music_institutional_partner_events` by `(provider_id, external_event_id)`.
- Rights-admin checks `music_rights_admin_partner_events` by `(provider, external_event_id)`.
- Each backing migration has a unique provider/event constraint.
- Existing rows return idempotent `200` responses.

Gaps:

- Custom signature helper is not HMAC-based.
- Custom signature helper does not use timing-safe comparison.
- Unsigned mode must be constrained by environment policy before these routes become Commerce Operations inputs.
- These routes have provider-specific event stores rather than a unified commerce provider event timeline.

## Supabase Notification Webhook

Path:

- `app/api/webhooks/supabase/notifications/route.ts`

Authentication:

- Requires `NOTIFICATION_INSERT_WEBHOOK_SECRET`.
- Accepts `Authorization: Bearer ...` or `x-notification-webhook-secret`.

Replay protection:

- No event id claim or payload hash was found.
- Delivery is performed directly through `deliverNotificationOutbound`.

Gap:

- Replayed notifications can invoke delivery repeatedly unless downstream delivery is independently idempotent.

## Current Gaps Against Commerce Operations Target

Missing canonical artifacts:

- unified `commerce_provider_events` table,
- normalized provider event DTO,
- signature verification result model,
- replay status model,
- payload hash strategy,
- event timeline per transaction,
- cross-provider duplicate detection,
- dead-letter/retry workflow shared across commerce domains,
- environment policy for unsigned modes,
- standardized structured error envelope and correlation id on all webhook failures.

High-priority hardening candidates:

1. Add provider event claiming to photo purchase webhooks.
2. Add provider event claiming to subscription webhooks.
3. Make ticketing replay protection unconditional for commerce-relevant ticketing flows.
4. Replace custom music partner signature helpers with HMAC and timing-safe comparison.
5. Remove timestamp fallback from Shopify replay identity or classify those events as unclaimable.
6. Require derived external event ids before mutating Printful state, or store a payload hash fallback.
7. Add a shared replay/admin retry contract instead of per-domain exception handling.

## Verification

Commands run:

- `rg --files app/api | rg 'webhook' | sort`
- `rg -n "webhook|signature|replay|idempot|provider event|event id|Stripe|payment_intent|checkout.session|charge.refunded" docs/admin-commerce-ops/02_AUDIT_BASELINE.md docs/admin-commerce-ops/15_PAYOUTS_SETTLEMENTS_AND_RECONCILIATION.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md`
- `sed -n '1,180p' app/api/marketplace/webhook/route.ts`
- `sed -n '1,130p' lib/marketplace/webhook-processor.ts`
- `sed -n '1,160p' app/api/ticketing/webhook/route.ts`
- `sed -n '1,90p' lib/ticketing/finalize.ts`
- `sed -n '333,345p' supabase/migrations/20260712120000_event_ticketing_foundation.sql`
- `sed -n '1,150p' app/api/photos/purchase/webhook/route.ts`
- `sed -n '1,125p' app/api/webhooks/music-royalty-payouts/route.ts`
- `sed -n '1,170p' app/api/marketplace/integrations/printful/webhook/route.ts`
- `sed -n '1,220p' lib/marketplace/printful-webhook.ts`
- `sed -n '1,160p' app/api/marketplace/integrations/shopify/webhook/route.ts`
- `sed -n '95,125p' lib/marketplace/shopify-adapter.ts`
- `sed -n '1,180p' app/api/webhooks/music-marketplace/[partner]/route.ts`
- `sed -n '1,150p' app/api/licensing/partners/webhooks/[provider]/route.ts`
- `sed -n '1,150p' app/api/institutional/partners/webhooks/[provider]/route.ts`
- `sed -n '1,170p' app/api/rights-admin/partners/webhooks/[provider]/route.ts`
- `sed -n '1,170p' app/api/webhooks/supabase/notifications/route.ts`
- `rg -n "STRIPE_WEBHOOK_SECRET|WEBHOOK_SECRET|WEBHOOK_ALLOW_UNSIGNED|PRINTFUL_WEBHOOK_SECRET|NOTIFICATION_INSERT_WEBHOOK_SECRET|stripe-signature|x-tourify-partner-signature|x-printful-signature|x-shopify-hmac-sha256" app/api lib -g '*.{ts,tsx}'`
- `rg -n "marketplace_payment_events|music_royalties_payout_provider_events|ticket_stripe_webhook_events|marketplace_provider_webhook_events|partner_event_receipts|partner_events" lib app __tests__ tests -g '*.{ts,tsx}'`

Tests:

- Not run. COM-017 is documentation-only inventory; existing marketplace, ticketing, Printful, and Shopify signature/replay tests were inspected as evidence.
