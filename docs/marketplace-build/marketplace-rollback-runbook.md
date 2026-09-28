# Marketplace Rollback and Migration Runbook

**Owner:** Platform Engineering  
**Spec reference:** `docs/marketplace-build/tourify-marketplace-handoff/06-implementation-roadmap.md` §8  

---

## Emergency Rollback

### 1. Disable all marketplace feature flags (instant — no DB change)

Set the following environment variables to `false` (or remove them) and redeploy:

```bash
# Server-side flags
FEATURE_MARKETPLACE_ENABLED=false
FEATURE_MARKETPLACE_NATIVE_GOODS_ENABLED=false
FEATURE_MARKETPLACE_SERVICES_ENABLED=false
FEATURE_MARKETPLACE_EXTERNAL_LISTINGS_ENABLED=false
FEATURE_MARKETPLACE_FEED_COMMERCE_ENABLED=false

# Client-side flags
NEXT_PUBLIC_FEATURE_MARKETPLACE_ENABLED=false
NEXT_PUBLIC_FEATURE_MARKETPLACE_DISCOVERY_ENABLED=false
```

**Effect:** All marketplace API routes return `503 feature_disabled`. Public discovery routes return disabled state. No marketplace data is deleted. Existing systems (feed, profiles, ticketing) continue unaffected.

---

## Migration Status

| File | Target DB | Description |
|---|---|---|
| `20260728000001_marketplace_listing_kinds.sql` | ✅ Applied | listing_kind, service_mode columns |
| `20260728000002_marketplace_service_definitions.sql` | ✅ Applied | service pricing type |
| `20260728000003_marketplace_external_listings.sql` | ✅ Applied | external listing columns |
| `20260728000004_marketplace_external_clicks.sql` | ✅ Applied | click attribution table |
| `20260728000005_marketplace_service_requests.sql` | ✅ Applied | service request state machine |
| `20260728000006_marketplace_service_offers.sql` | ✅ Applied | versioned quote/offer rows |
| `20260728000007_marketplace_service_bookings.sql` | ✅ Applied | confirmed booking records |
| `20260728000008_marketplace_post_attachments.sql` | ✅ Applied | feed post attachments |
| `20260728000009_marketplace_ticket_collections.sql` | ✅ Applied | org ticket collections |
| `20260728000010_marketplace_fee_rules.sql` | ✅ Applied | fee rule versioning |
| `20260728000011_marketplace_checkout_attempts.sql` | ✅ Applied | checkout idempotency + webhook events |
| `20260728000012_marketplace_p2_fk_index_remediation.sql` | ✅ Applied | FK + index cleanup |
| `20260728000013_marketplace_listings_search_vector.sql` | ✅ Applied | FTS trigger |
| `20260728000014_marketplace_orders_p6_guest_checkout.sql` | ⏳ Pending push | guest checkout columns on orders |
| `20260728000015_marketplace_admin_moderation_columns.sql` | ⏳ Pending push | admin moderation columns |

### Apply pending migrations

```bash
supabase db push --linked
```

Or targeted:

```bash
supabase migration up --version 20260728000014
supabase migration up --version 20260728000015
```

---

## Support Runbook

### Stuck orders (payment_status = 'processing' > 2 hours)

1. Check `app/api/marketplace/admin/overview` for stuck order count.
2. Query: `SELECT id, created_at, metadata FROM marketplace_orders WHERE payment_status = 'processing' AND created_at < NOW() - INTERVAL '2 hours';`
3. If Stripe shows payment succeeded → manually trigger webhook replay from Stripe dashboard.
4. If Stripe shows payment failed → update order to `payment_status = 'failed'` and release checkout_attempt status.

### Refund escalation

1. Admin calls `app/api/marketplace/admin/moderation` (or Stripe dashboard directly).
2. Refund via Stripe dashboard. The `charge.refunded` webhook will automatically update `marketplace_orders.payment_status = 'refunded'` and `marketplace_payout_ledger`.
3. Log the refund reason in the moderation queue record.

### Webhook replay

1. Go to Stripe Dashboard → Webhooks → marketplace endpoint.
2. Find the failed event by event ID (visible in `marketplace_payment_events.provider_event_id`).
3. Click "Resend" in the Stripe dashboard.
4. Alternatively, call `POST /api/marketplace/admin/webhook-events` with `{ action: "retry", eventId: "<uuid>" }` to reset the event status to `received`.

### Seller payout issues

1. Check `marketplace_payout_ledger` for the order's `payout_status`.
2. Verify seller's Stripe Connect account is active: `getSellerPayoutReadiness(supabase, sellerUserId)`.
3. If `payout_restricted`: direct seller to Stripe Connect dashboard to resolve identity verification.
4. Payouts are automatic from Stripe once the `available_at` timestamp passes and Connect is unrestricted.

### Guest access token expired

1. The buyer can contact support with their order number.
2. Admin queries: `SELECT id FROM marketplace_orders WHERE order_number = 'TFY-YYYYMMDD-XXXXXXXX';`
3. Admin can generate a new guest_access_token with longer expiry (no UI yet — use psql as service role).

---

## Staged Rollout Order

1. **Internal cohort** — enable `FEATURE_MARKETPLACE_ENABLED=true` for internal test accounts only. Test all flows: listing creation, checkout, guest checkout, service requests.
2. **Beta sellers** — enable for a manually curated list of sellers. Monitor for webhook failures and payout issues.
3. **Account type cohorts** — enable per account type using `FEATURE_MARKETPLACE_NATIVE_GOODS_ENABLED` and `FEATURE_MARKETPLACE_SERVICES_ENABLED`.
4. **Public discovery** — enable `NEXT_PUBLIC_FEATURE_MARKETPLACE_DISCOVERY_ENABLED=true` to surface the hub and public listing pages.

---

## Monitoring Alerts (to configure)

| Signal | Threshold | Action |
|---|---|---|
| `marketplace_payment_events` where `processing_status = 'failed'` | > 3 in 1h | Alert on-call |
| `marketplace_orders` where `payment_status = 'processing'` AND `created_at < NOW() - 2h` | > 0 | Alert |
| `marketplace_listings` where `inventory_count < 0` | Any | Critical alert |
| `marketplace_payout_ledger` where `payout_status = 'restricted'` | Any | Alert platform team |

---

## Non-Destructive Policy

- **Never** run `DROP TABLE`, `TRUNCATE`, or `DELETE` on marketplace tables without explicit engineering review.
- **Never** run `supabase db reset --linked` in production.
- Rollback = disable feature flags + write forward corrective migration.
- All schema changes must be `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`.
