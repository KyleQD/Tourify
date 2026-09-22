set client_min_messages = warning;

-- P2 Remediation: Add missing FK indexes flagged by performance advisor.
-- Six FK columns on new P2 tables lacked a supporting btree index.

-- marketplace_checkout_attempts.order_id
create index if not exists idx_marketplace_checkout_attempts_order
  on public.marketplace_checkout_attempts (order_id);

-- marketplace_fee_rules.created_by (admin audit trail lookups)
create index if not exists idx_marketplace_fee_rules_created_by
  on public.marketplace_fee_rules (created_by);

-- marketplace_post_attachments.original_seller_user_id + original_store_id
create index if not exists idx_marketplace_post_attachments_seller
  on public.marketplace_post_attachments (original_seller_user_id);

create index if not exists idx_marketplace_post_attachments_original_store
  on public.marketplace_post_attachments (original_store_id)
  where original_store_id is not null;

-- marketplace_service_bookings.offer_id
create index if not exists idx_marketplace_service_bookings_offer
  on public.marketplace_service_bookings (offer_id)
  where offer_id is not null;

-- marketplace_service_offers.created_by
create index if not exists idx_marketplace_service_offers_created_by
  on public.marketplace_service_offers (created_by);
