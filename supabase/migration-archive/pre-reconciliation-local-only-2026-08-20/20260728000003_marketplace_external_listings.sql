set client_min_messages = warning;

-- P2 Migration 003: marketplace_external_listings
-- Stores canonical destination URL, provider metadata, safety status,
-- and link-health check state for external listing type.

create table if not exists public.marketplace_external_listings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  canonical_url text not null,
  provider_name text,
  provider_domain text,
  metadata_snapshot jsonb not null default '{}',
  displayed_price text,
  displayed_currency text,
  safety_status text not null default 'pending_review'
    check (safety_status in ('pending_review', 'approved', 'flagged', 'blocked')),
  seller_confirmed_at timestamptz,
  last_health_check_at timestamptz,
  health_check_status text
    check (health_check_status in ('ok', 'unreachable', 'redirected', 'unsafe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id)
);

create index if not exists idx_marketplace_external_listings_listing
  on public.marketplace_external_listings (listing_id);

create index if not exists idx_marketplace_external_listings_domain_safety
  on public.marketplace_external_listings (provider_domain, safety_status);

alter table public.marketplace_external_listings enable row level security;

-- Seller manages their own external listings
drop policy if exists "marketplace_external_listings_owner_manage" on public.marketplace_external_listings;
create policy "marketplace_external_listings_owner_manage"
  on public.marketplace_external_listings
  for all
  using (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.seller_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.seller_user_id = auth.uid()
    )
  );

-- Public can read provider_name and provider_domain only for approved external listings.
-- canonical_url is intentionally excluded — always access via the redirect endpoint.
drop policy if exists "marketplace_external_listings_public_read_safe_fields" on public.marketplace_external_listings;
create policy "marketplace_external_listings_public_read_safe_fields"
  on public.marketplace_external_listings
  for select
  using (
    safety_status = 'approved'
    and exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id
        and l.status = 'published'
        and l.moderation_status = 'approved'
    )
  );

-- updated_at trigger
drop trigger if exists marketplace_external_listings_touch_updated_at
  on public.marketplace_external_listings;
create trigger marketplace_external_listings_touch_updated_at
  before update on public.marketplace_external_listings
  for each row execute procedure public.marketplace_touch_updated_at();

comment on table public.marketplace_external_listings is
  'External listing destination URL, provider metadata, and safety/health state. canonical_url is never exposed directly to clients — use the redirect endpoint.';
comment on column public.marketplace_external_listings.canonical_url is
  'HTTPS destination URL stored server-side only. Access via /api/marketplace/listings/[id]/redirect';
