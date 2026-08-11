set client_min_messages = warning;

-- P2 Migration 004: marketplace_external_clicks
-- Attribution/analytics table for outbound clicks on external listings.

create table if not exists public.marketplace_external_clicks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  source_surface text not null default 'unknown'
    check (source_surface in ('hub', 'storefront', 'profile', 'feed', 'direct', 'unknown')),
  session_fingerprint text,
  clicked_at timestamptz not null default now()
);

create index if not exists idx_marketplace_external_clicks_listing_time
  on public.marketplace_external_clicks (listing_id, clicked_at desc);

alter table public.marketplace_external_clicks enable row level security;

-- No direct public read — analytics only through aggregation.
-- Seller can read their own click events via listing ownership.
drop policy if exists "marketplace_external_clicks_seller_read" on public.marketplace_external_clicks;
create policy "marketplace_external_clicks_seller_read"
  on public.marketplace_external_clicks
  for select
  using (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.seller_user_id = auth.uid()
    )
  );

-- Service role inserts clicks via the redirect endpoint; no direct user INSERT policy.

comment on table public.marketplace_external_clicks is
  'Attribution log for outbound clicks on external listings. No PII stored — session_fingerprint is a hashed session id.';
