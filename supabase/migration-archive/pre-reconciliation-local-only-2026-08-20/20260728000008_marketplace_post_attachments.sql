set client_min_messages = warning;

-- P2 Migration 008: marketplace_post_attachments
-- Join table linking feed posts to marketplace listings or storefronts,
-- providing rich attribution metadata for commerce-in-feed cards.

create table if not exists public.marketplace_post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  store_id uuid references public.marketplace_storefronts(id) on delete set null,
  original_seller_user_id uuid not null references auth.users(id) on delete restrict,
  original_store_id uuid references public.marketplace_storefronts(id) on delete set null,
  source_surface text not null default 'unknown'
    check (source_surface in ('feed_share', 'reshare', 'unknown')),
  created_at timestamptz not null default now(),
  constraint post_attachments_one_target check (
    (listing_id is not null and store_id is null) or
    (listing_id is null and store_id is not null)
  )
);

create index if not exists idx_marketplace_post_attachments_post
  on public.marketplace_post_attachments (post_id);

create index if not exists idx_marketplace_post_attachments_listing
  on public.marketplace_post_attachments (listing_id);

create index if not exists idx_marketplace_post_attachments_store
  on public.marketplace_post_attachments (store_id);

alter table public.marketplace_post_attachments enable row level security;

-- Authenticated users can read post attachments (same visibility as posts)
drop policy if exists "marketplace_post_attachments_authenticated_read" on public.marketplace_post_attachments;
create policy "marketplace_post_attachments_authenticated_read"
  on public.marketplace_post_attachments
  for select
  using (auth.uid() is not null);

-- Owner (original seller) can insert
drop policy if exists "marketplace_post_attachments_seller_insert" on public.marketplace_post_attachments;
create policy "marketplace_post_attachments_seller_insert"
  on public.marketplace_post_attachments
  for insert
  with check (auth.uid() = original_seller_user_id);

comment on table public.marketplace_post_attachments is
  'Links feed posts to a marketplace listing or storefront for rich commerce-card rendering. Exactly one of listing_id or store_id must be set.';
comment on column public.marketplace_post_attachments.post_id is
  'References posts.id — no FK to avoid cross-schema coupling; referential integrity maintained at application layer';
comment on column public.marketplace_post_attachments.original_seller_user_id is
  'Auth user who originally shared the listing/store; preserved on reshare for attribution';
