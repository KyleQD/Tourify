# COM-013 Promotion Payment and Activation Path Inventory

Date: 2026-08-12

Source task: COM-013 — Identify every promotion payment and activation path.

## Scope

This inventory separates:

- paid promotion commerce paths,
- organic promotion post paths,
- artist marketing campaign paths,
- artist event promotion into ticketing,
- ticket discount campaign and promo-code activation paths,
- promo-code use during ticket checkout.

No provider-side payment mutation was performed for this task.

## Suite Requirements

The suite says promotion commerce should track:

- promoter account,
- promoted object,
- campaign,
- budget,
- payment,
- delivery period,
- spend,
- refunds or credits,
- platform revenue,
- campaign state.

Promotion reconciliation rules:

- payment captured but campaign not activated,
- campaign delivered without captured payment,
- campaign cancelled with no refund or credit,
- spend exceeds budget,
- promotion entitlement mismatch.

## Confirmed Paid Promotion Payment Paths

No dedicated paid promotion checkout, payment capture, webhook, refund, credit, or provider-backed activation path was found.

Searches across `app/api/promotions`, artist promotion/event promotion paths, ticketing promotion paths, admin ticketing campaign paths, `lib/artist`, `lib/admin`, and migrations found:

- organic promotion posts,
- artist marketing campaign records with budget/spend fields,
- event promotion into `events_v2`,
- ticket discount campaigns and promo codes,
- ticket checkout paths that consume promo codes.

Those are not paid promotion purchase paths. Later implementation tasks must add the canonical paid promotion transaction adapter and payment-to-activation reconciliation rather than treating the existing campaign tools as complete commerce.

## Organic Promotion Post Path

Path: `app/api/promotions/route.ts`

Authenticated users can create `promotion_posts` with:

- author type,
- title/content/images/tags,
- visibility,
- status `draft`, `scheduled`, or `published`,
- publish time,
- optional event/tour links,
- optional collaborators.

Database path: `supabase/migrations/20250813130000_promotion_core.sql`

Tables:

- `promotion_posts`,
- `post_collaborators`,
- `organizer_pages`,
- follows/feed-related tables.

This path publishes or schedules organic promotional content. It does not require payment, does not create a checkout, does not record spend, and does not create a promotion commerce transaction.

## Artist Marketing Campaign Path

Paths:

- `app/artist/features/promotions/page.tsx`
- `app/artist/business/marketing/page.tsx`
- `app/artist/business/analytics/page.tsx`
- `lib/services/artist-business.service.ts`
- `supabase/migrations/20250814120000_artist_business_core.sql`

Artists can create and manage `artist_marketing_campaigns` rows with:

- campaign name,
- type,
- status `draft`, `active`, `paused`, `completed`, or `cancelled`,
- budget,
- spent,
- start/end dates,
- platforms,
- objectives,
- content types,
- metrics.

Activation behavior:

- the artist promotions page inserts campaigns as `draft`,
- the same page can toggle status between `active` and `paused`,
- analytics and marketing pages read budget, spent, status, and metrics.

Payment behavior:

- no Stripe checkout/payment route was found for these campaigns,
- no financial transaction write was found for campaign spend or budget,
- no provider webhook updates `spent`,
- no refund/credit workflow was found.

Compatibility note:

- `app/artist/events/actions/marketing.ts` writes `artist_marketing_campaigns` using fields like `event_id`, `artist_id`, `promo_code`, and `discount_percent`, while the current core migration defines `user_id`, `budget`, `spent`, and campaign metadata fields. This client-side action appears schema-drifted and should be reconciled before paid promotion workflows rely on it.

## Artist Event Promotion Into Ticketing

Paths:

- `app/api/artist/events/[id]/promote/route.ts`
- `lib/artist/artist-event-promote.service.ts`
- `supabase/migrations/20260711020000_artist_event_producer.sql`

Authenticated artists can promote an artist event into the newer event/ticketing model:

- create an `events_v2` row,
- copy event title, venue, dates, ticket URL, ticket price range, and other producer settings,
- link the original `events.promoted_event_v2_id`,
- store `promoted_at`, `promote_reason`, and `promoted_org_id` in producer settings.

This is an operational event-promotion path and a ticketing enablement bridge. It does not charge a promotion fee, create a paid campaign, or activate ad delivery.

## Ticket Discount Campaign and Promo-Code Activation Paths

### Admin Ticketing Campaign Creation

Paths:

- `app/api/admin/ticketing/enhanced/route.ts`
- `lib/admin/ticketing-command.service.ts`
- `lib/admin/ticketing-validation.ts`
- `supabase/migrations/20260328130000_ticketing_v2.sql`
- `supabase/migrations/20260602100000_ticketing_extended_tables.sql`
- `supabase/migrations/20260719230353_admin_ticketing_security.sql`

Admin ticketing commands can create `ticket_campaigns` with:

- event id,
- name,
- campaign type,
- discount type/value,
- start/end dates,
- max uses,
- applicable ticket types,
- target audience,
- `is_active: true`,
- created-by actor.

The command validates event scope, date order, discount constraints, and ticket type scope. It logs an admin audit event.

This is discount campaign activation, not paid promotion activation.

### Admin Ticketing Promo Code Creation

Paths:

- `app/api/admin/ticketing/enhanced/route.ts`
- `lib/admin/ticketing-command.service.ts`
- `lib/admin/ticketing-validation.ts`

Admin ticketing commands can create `promo_codes` with:

- optional campaign id,
- event id,
- code,
- discount type/value,
- minimum purchase amount,
- max discount amount,
- max uses,
- applicable ticket types,
- start/end dates,
- `is_active: true`,
- created-by actor.

The command enforces event scope, campaign scope, ticket type scope, date ordering, code uniqueness per event, and audit logging.

This is discount-code activation, not paid promotion purchase.

### Ticketing Read Paths

Paths:

- `app/api/ticketing/enhanced/route.ts`
- `app/api/admin/ticketing/enhanced/route.ts`

Public/enhanced ticketing reads active `ticket_campaigns` for an event and returns them with ticket availability. Admin ticketing can list campaigns and promo codes under org/event scope.

These are read paths.

## Promo-Code Use During Ticket Checkout

Paths:

- `app/api/ticketing/enhanced/route.ts`
- `lib/ticketing/orders.ts`
- `lib/ticketing/finalize.ts`
- `supabase/migrations/20260719230353_admin_ticketing_security.sql`

During ticket checkout:

- `getActivePromoCode` loads active promo codes by event/code/date/status,
- checkout validates usage limits,
- discount amount is calculated,
- a pending ticket order stores `promo_code_id` and discount amount,
- Stripe checkout is created for non-free totals,
- free/complimentary checkout completes immediately.

Promo-code usage is not incremented during validation.

Usage activation:

- for free checkout, `app/api/ticketing/enhanced/route.ts` calls `increment_promo_code_usage` after successful immediate completion,
- for paid checkout, `lib/ticketing/finalize.ts` calls `increment_promo_code_usage` only after successful payment/finalization and emits `promo_code_used`.

The database function `increment_promo_code_usage` atomically increments `promo_codes.current_uses` only when the promo code is active, in date range, scoped to the event, and under max use count. Execution is granted to service role.

This is discount redemption tied to ticket payment, not promotion payment or ad activation.

## Database Targets

Organic promotion:

- `promotion_posts`
- `post_collaborators`
- `organizer_pages`

Artist marketing:

- `artist_marketing_campaigns`
- `artist_social_posts`
- `artist_financial_transactions`

Artist event promotion bridge:

- `events`
- `events_v2`
- `org_members`
- `ticket_types`

Ticket discount/promo:

- `ticket_campaigns`
- `promo_codes`
- `ticket_sales`
- `ticket_referrals`
- `ticket_shares`
- `ticket_analytics_events`

## Provider Targets

Confirmed:

- Stripe checkout/payment for ticket purchases that may use promo codes.

Not found:

- Stripe checkout/payment for paid promotion campaigns,
- provider webhook for promotion payment capture,
- provider refund/credit path for promotion spend,
- external ad network activation provider.

## Gaps for Later Phases

1. No canonical paid promotion transaction model exists.
2. No paid promotion checkout route was found.
3. No promotion payment webhook or payment capture trace was found.
4. No payment-to-campaign-activation gate was found.
5. No promotion refund or credit workflow was found.
6. No spend ledger or platform revenue ledger exists for paid promotions.
7. Artist marketing campaign `budget` and `spent` are decimal fields without payment/provider reconciliation.
8. Existing promotion posts can be published/scheduled without payment, which is correct for organic posts but insufficient for paid promotion commerce.
9. Ticket campaigns/promo codes are discount mechanics and must stay separate from paid promotion campaigns in the canonical model.
10. Artist event promotion into `events_v2` is operational publishing/ticketing enablement, not paid promotion commerce.
11. `app/artist/events/actions/marketing.ts` appears schema-drifted against `artist_marketing_campaigns` and needs repair before broader promotion tooling relies on it.
12. Commerce HQ needs a promotion read model that can flag payment captured but campaign not activated, campaign delivered without payment, cancellation without refund/credit, and spend over budget.

## Verification Commands

Commands run for this inventory:

```bash
rg -n "COM-013|promotion|promoted|campaign|activation|budget|spend|payment captured|campaign not activated" docs/admin-commerce-ops/18_SUBSCRIPTIONS_FEES_AND_PROMOTIONS.md docs/admin-commerce-ops/20_BACKEND_APIS_SERVICES_EVENTS_AND_WEBHOOKS.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md docs/admin-commerce-ops/02_AUDIT_BASELINE.md
find app/api app/admin app/artist -path '*promot*' -o -path '*campaign*' | sort
rg -n "promotion|promoted|campaign|ad spend|spend|budget|activate|activated|approval|stripe.*promotion|checkout.*promotion|promotions" app lib supabase/migrations -g '*.ts' -g '*.tsx' -g '*.sql'
rg -n "create table.*promotion|promotion_.*table|promotions|artist_promotions|campaign" supabase/migrations -g '*.sql'
sed -n '1,240p' app/api/promotions/route.ts
sed -n '1,220p' 'app/api/artist/events/[id]/promote/route.ts'
sed -n '1,120p' supabase/migrations/20250814120000_artist_business_core.sql
sed -n '1,120p' supabase/migrations/20250813130000_promotion_core.sql
sed -n '1,260p' lib/artist/artist-event-promote.service.ts
sed -n '1,380p' app/artist/features/promotions/page.tsx
sed -n '120,210p' app/api/ticketing/enhanced/route.ts
sed -n '75,112p' supabase/migrations/20260328130000_ticketing_v2.sql
sed -n '29,62p' supabase/migrations/20260602100000_ticketing_extended_tables.sql
sed -n '176,205p' app/api/admin/ticketing/enhanced/route.ts
sed -n '320,355p' app/api/admin/ticketing/enhanced/route.ts
rg -n "ticket_campaign|promo_code|create_campaign|campaigns|promo_codes" lib/admin lib/ticketing app/api/admin/ticketing app/api/ticketing -g '*.ts'
rg -n "artist_marketing_campaigns|promotion_posts|ticket_campaigns|promo_codes" app/api app/artist app/admin lib -g '*.ts' -g '*.tsx'
rg -n "checkout\\.sessions\\.create|payment_intent|stripe|financial_transactions|artist_financial_transactions" app/api/promotions 'app/api/artist/events/[id]/promote/route.ts' app/artist/features/promotions/page.tsx lib/artist/artist-event-promote.service.ts app/api/ticketing app/api/admin/ticketing -g '*.ts' -g '*.tsx'
sed -n '1,120p' lib/services/artist-business.service.ts
sed -n '340,470p' lib/admin/ticketing-command.service.ts
sed -n '100,150p' lib/admin/ticketing-validation.ts
sed -n '1,80p' app/api/ticketing/enhanced/route.ts
sed -n '360,620p' app/api/ticketing/enhanced/route.ts
sed -n '108,140p' lib/ticketing/finalize.ts
sed -n '130,155p' lib/ticketing/orders.ts
rg -n "increment_promo_code_usage|promo_code_used" supabase/migrations lib app -g '*.sql' -g '*.ts'
sed -n '645,675p' supabase/migrations/20260719230353_admin_ticketing_security.sql
sed -n '1,130p' app/artist/events/actions/marketing.ts
sed -n '130,190p' app/artist/business/analytics/page.tsx
sed -n '160,230p' app/artist/business/marketing/page.tsx
```

## COM-013 Result

COM-013 is complete as an inventory task. The implementation risk remains open: existing promotion tools are mostly organic posting, artist marketing management, event promotion, and ticket discount mechanics. Dedicated paid promotion payment, activation, refund/credit, spend, and reconciliation workflows are not yet built.
