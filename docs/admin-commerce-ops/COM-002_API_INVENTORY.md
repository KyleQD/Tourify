# COM-002 — Commerce API Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-002`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: inventory marketplace, ticketing, subscription, promotion, merchandise, service, finance, and payout APIs before changing commerce behavior.

## Inventory Summary

- Commerce-adjacent route handlers found: 77.
- Existing organization-scoped capability patterns are strongest in `app/api/admin/finances/*` and `app/api/admin/ticketing/*`.
- Legacy or broader admin checks remain in `app/api/admin/marketplace/*`, `app/api/admin/store/route.ts`, and `app/api/marketplace/admin/*`.
- Stripe webhooks are present for marketplace, ticketing, and subscriptions.
- Provider-backed financial mutations already exist for ticketing refunds and marketplace/ticketing checkout. Marketplace admin payout retry is currently an internal status transition and must be hardened before expansion.

## Admin Marketplace APIs

| API | Methods | Domain | Auth / safety notes |
| --- | --- | --- | --- |
| `/api/admin/marketplace/orders` | `GET` | Admin marketplace order list | Uses `withAdminAuth`; returns marketplace orders and buyer profile projection. |
| `/api/admin/marketplace/orders/[id]` | `GET` | Admin marketplace order detail | Uses direct `profile.role === "admin"` check; returns full order, items, and payout ledger. |
| `/api/admin/marketplace/moderation` | `GET`, `PATCH` | Admin moderation queue | Uses direct `profile.role === "admin"` check; supports pagination/search/sort and status/resolution update. |
| `/api/admin/marketplace/payouts/[id]/retry` | `POST` | Payout retry scheduling | Uses direct `profile.role === "admin"` check; updates payout status to `scheduled` without provider re-fetch, explicit reason, idempotency header, or audit record. High-risk hardening target. |

## Marketplace Admin Utility APIs

These live under `app/api/marketplace/admin/*` and use `authenticateApiRequest` plus `userHasAdminSurfaceAccess`, often with a service-role client after the access check.

| API | Methods | Domain |
| --- | --- | --- |
| `/api/marketplace/admin/overview` | `GET` | Admin marketplace health counts: moderation, failed webhooks, stuck orders, active listings, fee rules. |
| `/api/marketplace/admin/fee-rules` | `GET`, `POST`, `PATCH` | Fee rule listing/version creation/deactivation. |
| `/api/marketplace/admin/moderation` | `GET`, `PATCH` | Marketplace moderation admin endpoint parallel to `/api/admin/marketplace/moderation`. |
| `/api/marketplace/admin/webhook-events` | `GET`, `PATCH` | Payment webhook event operations. |

## Public / Seller Marketplace APIs

| API | Domain |
| --- | --- |
| `/api/marketplace/checkout` | Native marketplace checkout, Stripe Checkout session creation, checkout attempt idempotency, fee snapshotting, payout ledger initialization. |
| `/api/marketplace/webhook` | Stripe marketplace webhook, signature verification, idempotent processing through `marketplace_payment_events`. |
| `/api/marketplace/orders` | User/seller marketplace order list. |
| `/api/marketplace/order/[token]` | Guest/tokenized order lookup. |
| `/api/marketplace/order/[token]/claim` | Claim guest order. |
| `/api/marketplace/payouts` | Seller payout ledger view. |
| `/api/marketplace/analytics` | Seller analytics from orders and payout ledger. |
| `/api/marketplace/listings` | Listing create/list. |
| `/api/marketplace/listings/[id]` | Listing detail/update. |
| `/api/marketplace/listings/[id]/lifecycle` | Listing lifecycle transitions, including publish readiness. |
| `/api/marketplace/listings/[id]/redirect` | External listing redirect/click tracking. |
| `/api/marketplace/listings/import-external` | External listing import. |
| `/api/marketplace/discover` | Public marketplace discovery. |
| `/api/marketplace/storefront` | Storefront read/update. |
| `/api/marketplace/service-requests` | Service request list/create. |
| `/api/marketplace/service-requests/[id]` | Service request detail. |
| `/api/marketplace/service-requests/[id]/action` | Service request state/action. |
| `/api/marketplace/service-offers` | Service offers. |
| `/api/marketplace/service-orders/[orderItemId]` | Service order item workflow. |
| `/api/marketplace/delivery/[orderItemId]` | Delivery/fulfillment workflow. |
| `/api/marketplace/integrations` | Seller integrations. |
| `/api/marketplace/integrations/shopify` | Shopify integration setup/status. |
| `/api/marketplace/integrations/shopify/callback` | Shopify OAuth callback. |
| `/api/marketplace/integrations/shopify/webhook` | Shopify webhook receiver. |
| `/api/marketplace/integrations/printful` | Printful integration setup/status. |
| `/api/marketplace/integrations/printful/webhook` | Printful webhook receiver. |
| `/api/marketplace/tax/quote` | Tax quote. |
| `/api/marketplace/moderation` | User-facing moderation/reporting. |
| `/api/marketplace/seller-agreement` | Marketplace seller terms acceptance. |
| `/api/marketplace/share-to-feed` | Feed commerce sharing. |
| `/api/marketplace/migrations/backfill-artist-merch` | Backfill utility; production-blocked route family should remain restricted. |
| `/api/marketplace/migrations/backfill-artist-music` | Backfill utility; production-blocked route family should remain restricted. |

## Admin Finance APIs

These already use `withAdminCapability` and should be reused by Commerce Operations instead of bypassed.

| API | Methods / domain |
| --- | --- |
| `/api/admin/finances` | `GET` overview/transactions/budgets; `POST`, `PATCH`, `DELETE` compatibility finance commands with idempotency header support. |
| `/api/admin/finances/commands` | Command endpoint using org command pattern. |
| `/api/admin/finances/settlements` | Settlement list and mutations with capability checks and idempotency support. |
| `/api/admin/finances/reconciliation` | Finance reconciliation. |
| `/api/admin/finances/budget-rollup` | Budget rollup. |
| `/api/admin/finances/budget-workspace` | Budget workspace. |
| `/api/admin/finances/commitments` | Purchase/commitment operations. |
| `/api/admin/finances/expenses` | Expense operations. |
| `/api/admin/finances/scope-search` | Scoped finance entity search. |

## Admin Ticketing APIs

These mostly use `withAdminCapability` and are a model for commerce API migration.

| API | Methods / domain |
| --- | --- |
| `/api/admin/ticketing/enhanced` | Ticketing overview, ticket types, sales, campaigns, promo codes, social performance, and mutations through command service. |
| `/api/admin/ticketing/commands` | Ticketing command endpoint with idempotency support. |
| `/api/admin/ticketing/refund` | Provider-backed refund workflow using `ticketing.refund`, `executeServiceRoleJob`, Stripe refund idempotency, ticket inventory updates, ledger writes, and audit logging. |
| `/api/admin/ticketing/read-model` | Dual-read ticketing canonical comparison. |
| `/api/admin/ticketing/setup` | Ticketing setup state. |
| `/api/admin/ticketing/allocations` | Ticket allocation operations. |
| `/api/admin/ticketing/inventory` | Ticket inventory ledger. |
| `/api/admin/ticketing/admissions` | Admissions/devices. |
| `/api/admin/ticketing/guest-approvals` | Guest approval queue. |
| `/api/admin/organization/ticketing-settings` | Organization-level ticketing settings. |

## Public / Operational Ticketing APIs

| API | Domain |
| --- | --- |
| `/api/ticketing/webhook` | Stripe ticketing webhook; verifies signature and can claim webhook events when ticketing v2 is enabled. |
| `/api/ticketing/enhanced` | Public/event ticketing sales and Stripe checkout creation. |
| `/api/ticketing/box-office` | Box-office checkout/refund actions. |
| `/api/ticketing/config` | Event ticketing configuration. |
| `/api/ticketing/reports` | Ticketing reports. |
| `/api/ticketing/settlements` | Event ticket settlements. |
| `/api/ticketing/allocations` | Public/ops allocations. |
| `/api/ticketing/transfers` | Ticket transfer flow. |
| `/api/ticketing/wallet` | User wallet/tickets. |
| `/api/ticketing/delivery` | Ticket delivery. |
| `/api/ticketing/check-in` | Door check-in. |
| `/api/ticketing/verify` | Ticket verification. |
| `/api/ticketing` | Base ticketing route. |

## Subscription and Promotion APIs

| API | Domain | Safety notes |
| --- | --- | --- |
| `/api/subscriptions/checkout` | Stripe subscription checkout creation. | Authenticated user route; creates Stripe customer as needed. |
| `/api/subscriptions/portal` | Billing portal. | Included in later subscription inventory. |
| `/api/subscriptions/tiers/sync` | Subscription tier sync. | Needs provider and permission classification. |
| `/api/subscriptions/webhook` | Stripe subscription webhook. | Verifies signature and upserts subscription state with service-role client. |
| `/api/promotions` | Promotion post creation. | Authenticated user route; not yet commerce-reconciled with payment/activation. |

## Store, Merchandise, Venue, Event, and Adjacent APIs

| API | Domain |
| --- | --- |
| `/api/admin/store` | Admin merch/listing management; uses `withAdminAuth` and seller scoped to current user. |
| `/api/photos/marketplace` | Photo marketplace adjacency. |
| `/api/venue/finances` | Venue finance route using service-role client. |
| `/api/venue/ticketing` | Venue ticketing route using service-role client. |
| `/api/events/[id]/finances` | Event finance route consumed by event admin details. |
| `/api/artist/events/[id]/promote` | Artist event promotion. |
| `/api/artist/music/payouts/status` | Artist music payout status. |
| `/api/artist/music/payouts/onboarding` | Artist music payout onboarding. |
| `/api/artist/music/payouts/batches` | Artist music payout batches. |

## Music Marketplace APIs

| API family | Domain |
| --- | --- |
| `/api/music-marketplace/*` | Music marketplace offerings, orders, subscriptions, transfers, issuer/investor account, portfolio, market data, documents, disclosures, flags, and catalog links. |
| `/api/webhooks/music-marketplace/[partner]` | Partner webhook receiver for music marketplace. |
| `/api/admin/music-marketplace/ops` | Admin music marketplace operations panel endpoint. |

## Migration Targets for Later Phases

- Replace direct `profile.role === "admin"` checks in admin marketplace routes with explicit commerce capabilities.
- Replace marketplace admin utility `userHasAdminSurfaceAccess` checks with scoped CommerceContext and capability checks.
- Split support/moderation/finance permissions so broad admin access is not enough for PII, refunds, payout retry, settlements, fee rules, or exports.
- Add structured commerce error envelopes and correlation IDs to new `/api/admin/commerce/*` routes.
- Make marketplace payout retry provider-aware, idempotent, reason-required, and audited before exposing it in Commerce HQ.
- Reconcile duplicate admin marketplace moderation API families before deciding the canonical endpoint.

## Evidence Commands

- `find app/api -type f -name 'route.ts' | rg '(/admin/marketplace|/admin/finances|/admin/ticketing|/admin/store|/marketplace|/ticketing|/subscriptions|/promotions|/venue/finances|/venue/ticketing|/events/\[id\]/finances|/photos/marketplace|/music-marketplace|/webhooks/music-marketplace|/artist/.*/payout|/artist/events/.*/promote)' | sort`
- `find app/api/admin/marketplace app/api/marketplace app/api/admin/ticketing app/api/ticketing app/api/admin/finances app/api/subscriptions app/api/promotions app/api/admin/store -type f -name 'route.ts' -maxdepth 8 | sort | wc -l`
- `rg -n "withAdminCapability|withAdminAuth|profile\?\.role|profile\.role|createServiceRoleClient|executeServiceRoleJob|stripe\.webhooks|constructEvent|idempotency|refunds\.create|checkout\.sessions\.create|payout" app/api/admin/marketplace app/api/admin/finances app/api/admin/ticketing app/api/admin/store app/api/marketplace app/api/ticketing app/api/subscriptions app/api/promotions app/api/music-marketplace app/api/webhooks/music-marketplace app/api/venue/finances app/api/venue/ticketing 'app/api/events/[id]/finances' app/api/photos/marketplace -g 'route.ts'`
