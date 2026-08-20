# COM-005 — Payout Provider and Destination Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-005`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: identify all payout providers and destinations.

## Confirmed Payout Providers

Stripe Connect is the only confirmed provider used for provider-directed payouts or seller destinations in current commerce code.

| Provider | Current use | Destination identifier | Evidence |
| --- | --- | --- | --- |
| Stripe Connect | Marketplace seller payout destination for native marketplace checkout. | Resolved seller `acct_...` from `profiles.stripe_connect_v2_account_id` or legacy `profiles.stripe_connect_account_id`. | `app/api/marketplace/checkout/route.ts`, `lib/marketplace/seller-payout-readiness.ts`, `lib/stripe-connect-resolve.ts`. |
| Stripe Connect | Photo marketplace seller payout destination. | Resolved photographer/seller `acct_...` from profile Connect fields. | `app/api/photos/purchase/route.ts`, `lib/stripe-connect-resolve.ts`. |
| Stripe Connect | Music royalty payout instruction provider. | `music_royalties_payout_instructions.provider_recipient_id`, normally sourced from `music_royalties_payee_accounts.provider_account_id`. | `app/api/artist/music/payouts/onboarding/route.ts`, `app/api/artist/music/payouts/batches/route.ts`, `lib/music/royalties/payout-provider.ts`. |

No PayPal, Square, ACH provider, banking API, or tax-disbursement provider was confirmed as a provider-submitted payout integration in this pass.

## Marketplace Seller Payout Destinations

Marketplace checkout requires seller payout readiness before paid listings can be purchased. The readiness check:

- Reads seller profile fields `stripe_connect_account_id`, `stripe_connect_v2_account_id`, and `stripe_connect_account_kind`.
- Resolves the active account with `resolveStripeConnectAccountId`.
- Verifies readiness against Stripe:
  - V2 core account: `stripe.v2.core.accounts.retrieve`.
  - Legacy Express account: `stripe.accounts.retrieve`.
- Requires Connect readiness before checkout proceeds.

The checkout session uses:

- `payment_intent_data.application_fee_amount` for the platform fee.
- `payment_intent_data.transfer_data.destination` set to the resolved seller Stripe Connect account.

The local payout record is `marketplace_payout_ledger`:

| Column | Current role |
| --- | --- |
| `seller_user_id` | Seller/payee user. |
| `payout_provider` | Defaults to `manual`; marketplace checkout writes `stripe_connect`. |
| `payout_reference` | Payment reference populated from Stripe payment events, usually payment intent ID. |
| `payout_status` | `pending`, `scheduled`, `paid`, `failed`, or `on_hold`. |
| `metadata.sellerStripeAccountId` | Destination account captured during checkout creation. |
| `metadata.feeSnapshotId` | Fee rule snapshot linkage. |

Important nuance: current marketplace checkout uses Stripe destination charges/transfers at payment time. The ledger tracks payout state locally, but it is not itself proof that an actual external payout object exists.

## Marketplace Admin Payout Retry

`app/api/admin/marketplace/payouts/[id]/retry/route.ts` currently only reschedules the local payout ledger row:

- Auth uses broad `profile.role === "admin"`.
- Reads `marketplace_payout_ledger`.
- Allows statuses `on_hold`, `failed`, and `pending`.
- Updates status to `scheduled`, shifts `available_at`, and increments metadata retry counters.
- Does not require a reason or idempotency key.
- Does not re-fetch Stripe provider state.
- Does not check for duplicate external payout/transfer attempts.
- Does not write a finance or admin audit event.

This route remains the highest-risk payout action identified so far and must be hardened before broader payout tooling ships.

## Photo Marketplace Seller Payout Destinations

`app/api/photos/purchase/route.ts` resolves the photo seller profile's Stripe Connect account and passes it to Stripe Checkout as `transfer_data.destination` when present.

The photo purchase flow stores purchase amounts in `photo_purchases`, including `platform_fee` and `seller_payout`, but it does not write to `marketplace_payout_ledger`. Commerce canonical read models should treat this as a separate legacy payout source until a shared transaction index exists.

## Music Royalty Payout Destinations

Music royalty payouts have the most explicit payout-instruction model.

| Table / module | Destination role |
| --- | --- |
| `music_royalties_payee_accounts` | Stores owner user, party ID, provider, provider account ID, and onboarding status. |
| `music_royalties_payout_readiness` | Stores tax, KYC, sanctions, and computed readiness blockers. |
| `music_royalties_payout_batches` | Stores maker/checker batch approval state. |
| `music_royalties_payout_instructions` | Stores `provider`, `provider_recipient_id`, amount, currency, idempotency key, and provider transfer ID. |
| `music_royalties_payout_provider_events` | Stores provider webhook events tied back to payout instructions. |

`lib/music/royalties/payout-provider.ts` defines a Stripe Connect adapter that can submit transfers to `providerRecipientId`, but the scan found no current route or worker invoking `submitPayout`. The adapter defaults to dry-run unless `MUSIC_ROYALTY_PAYOUTS_DRY_RUN=false`.

## Ticketing and Finance Settlement Destinations

Ticketing configuration includes Connect-ready fields:

- `event_ticketing_config.payout_destination_account_id`
- `event_ticketing_config.stripe_connect_account_id`

Current ticketing checkout and webhook paths are Stripe payment-processing paths, but no provider-submitted ticketing payout flow was confirmed in this pass. These fields should be treated as destination metadata until a live transfer or payout route is confirmed.

Finance settlements include payout amount fields:

- `settlements.artist_payout`
- `settlements.venue_payout`
- `settlements.promoter_payout`

The settlement domain and admin finance commands update accounting state, approval state, and audit state. No external payout provider call was confirmed for `settlements` in this pass.

## Destination Classes

| Class | Examples | Current confidence |
| --- | --- | --- |
| Provider account destination | Stripe Connect account IDs in profiles and music royalty payee accounts. | Confirmed live destination identifiers. |
| Local payout ledger row | `marketplace_payout_ledger`. | Confirmed local payout read model, but not an external payout object. |
| Payout instruction | `music_royalties_payout_instructions`. | Confirmed instruction model; submit worker not confirmed. |
| Accounting payout amount | `settlements.artist_payout`, `venue_payout`, `promoter_payout`. | Confirmed accounting fields, not provider destinations. |
| Ticketing destination metadata | `event_ticketing_config.payout_destination_account_id`, `stripe_connect_account_id`. | Confirmed metadata fields; no provider-submitted payout flow confirmed. |

## Gaps for Later Phases

- There is no single payout destination registry across marketplace, photos, music royalties, ticketing, and finance settlements.
- Marketplace ledger rows store destination account IDs only in metadata, not first-class indexed columns.
- Photo purchases can use Stripe Connect destinations but do not currently flow into the marketplace payout ledger.
- Music royalty payout submission appears modeled but not wired to a route or worker in the current scan.
- Ticketing destination fields are Connect-ready but not proven active for payout movement.
- Admin payout retry lacks capability scoping, reason capture, provider re-fetch, duplicate provider-attempt detection, idempotency, and audit logging.

## Evidence Commands

- `rg -n "payout|Payout|transfer|destination|stripe_connect|connect_account|stripe_connect_account|providerRecipient|recipient|settlement|disbursement" app lib supabase/migrations -g '*.ts' -g '*.tsx' -g '*.sql'`
- `sed -n '1,220p' lib/marketplace/seller-payout-readiness.ts`
- `sed -n '1,260p' app/api/stripe/connect/route.ts`
- `sed -n '240,460p' app/api/marketplace/checkout/route.ts`
- `sed -n '1,190p' 'app/api/admin/marketplace/payouts/[id]/retry/route.ts'`
- `sed -n '1,240p' lib/stripe-connect-resolve.ts`
- `sed -n '130,180p' supabase/migrations/20260410120000_marketplace_core.sql`
- `sed -n '100,180p' supabase/migrations/20260717241000_music_royalties_allocations_payouts_statements.sql`
- `sed -n '1,220p' app/api/artist/music/payouts/batches/route.ts`
- `sed -n '1,120p' app/api/artist/music/payouts/onboarding/route.ts`
- `sed -n '70,230p' app/api/photos/purchase/route.ts`
- `rg -n "submitPayout|createStripeConnectRoyaltyPayoutProvider|provider_transfer_id|music_royalties_payout_instructions" app lib scripts -g '*.ts' -g '*.tsx'`
- `sed -n '1,120p' supabase/migrations/20260712120000_event_ticketing_foundation.sql`
- `sed -n '1,80p' supabase/migrations/20260602130000_settlements.sql`
