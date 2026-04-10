-- Integrated artist marketplace core schema
create extension if not exists "pgcrypto";

create table if not exists public.marketplace_storefronts (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  slug text unique,
  display_name text not null,
  tagline text,
  theme_config jsonb not null default '{}'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  rating_average numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  response_time_hours integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_user_id)
);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  storefront_id uuid references public.marketplace_storefronts(id) on delete set null,
  title text not null,
  description text,
  product_type text not null,
  category text not null,
  status text not null default 'draft',
  currency text not null default 'USD',
  base_price numeric(10,2),
  compare_at_price numeric(10,2),
  cover_image_url text,
  media_urls text[] not null default '{}',
  tags text[] not null default '{}',
  inventory_count integer,
  has_unlimited_inventory boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  moderation_status text not null default 'approved',
  featured_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_listings_status_check check (status in ('draft', 'published', 'archived')),
  constraint marketplace_listings_moderation_check check (moderation_status in ('approved', 'under_review', 'rejected')),
  constraint marketplace_listings_inventory_check check (inventory_count is null or inventory_count >= 0),
  constraint marketplace_listings_price_check check (base_price is null or base_price >= 0)
);

create index if not exists idx_marketplace_listings_seller_status on public.marketplace_listings(seller_user_id, status);
create index if not exists idx_marketplace_listings_category on public.marketplace_listings(category);
create index if not exists idx_marketplace_listings_product_type on public.marketplace_listings(product_type);

create table if not exists public.marketplace_listing_variants (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  sku text,
  title text not null,
  option_values jsonb not null default '{}'::jsonb,
  price numeric(10,2) not null default 0,
  inventory_count integer,
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_listing_variants_price_check check (price >= 0),
  constraint marketplace_listing_variants_inventory_check check (inventory_count is null or inventory_count >= 0)
);

create index if not exists idx_marketplace_listing_variants_listing on public.marketplace_listing_variants(listing_id);

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid references auth.users(id) on delete set null,
  seller_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  payment_provider text not null default 'stripe',
  payment_reference text,
  stripe_checkout_session_id text,
  currency text not null default 'USD',
  subtotal_amount numeric(10,2) not null default 0,
  platform_fee_amount numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  shipping_address jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_orders_status_check check (status in ('pending', 'confirmed', 'fulfilled', 'cancelled', 'refunded')),
  constraint marketplace_orders_payment_status_check check (payment_status in ('pending', 'processing', 'paid', 'failed', 'refunded'))
);

create index if not exists idx_marketplace_orders_buyer on public.marketplace_orders(buyer_user_id, created_at desc);
create index if not exists idx_marketplace_orders_seller on public.marketplace_orders(seller_user_id, created_at desc);
create index if not exists idx_marketplace_orders_checkout on public.marketplace_orders(stripe_checkout_session_id);

create table if not exists public.marketplace_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings(id) on delete restrict,
  variant_id uuid references public.marketplace_listing_variants(id) on delete set null,
  product_type text not null,
  title text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null,
  fulfillment_status text not null default 'pending',
  fulfillment_provider text,
  fulfillment_reference text,
  service_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_order_items_quantity_check check (quantity > 0),
  constraint marketplace_order_items_line_total_check check (line_total >= 0),
  constraint marketplace_order_items_fulfillment_status_check check (fulfillment_status in ('pending', 'processing', 'shipped', 'delivered', 'digital_ready', 'completed', 'cancelled'))
);

create index if not exists idx_marketplace_order_items_order on public.marketplace_order_items(order_id);
create index if not exists idx_marketplace_order_items_listing on public.marketplace_order_items(listing_id);

create table if not exists public.marketplace_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.marketplace_order_items(id) on delete cascade,
  buyer_user_id uuid references auth.users(id) on delete set null,
  asset_url text not null,
  watermarked_asset_url text,
  signed_url text,
  signed_url_expires_at timestamptz,
  max_downloads integer not null default 5,
  download_count integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_entitlements_status_check check (status in ('active', 'expired', 'revoked'))
);

create index if not exists idx_marketplace_entitlements_buyer on public.marketplace_entitlements(buyer_user_id, created_at desc);

create table if not exists public.marketplace_payout_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  seller_user_id uuid not null references auth.users(id) on delete restrict,
  gross_amount numeric(10,2) not null,
  platform_fee_amount numeric(10,2) not null,
  net_amount numeric(10,2) not null,
  payout_status text not null default 'pending',
  payout_reference text,
  payout_provider text not null default 'manual',
  available_at timestamptz,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_payout_status_check check (payout_status in ('pending', 'scheduled', 'paid', 'failed', 'on_hold'))
);

create index if not exists idx_marketplace_payout_ledger_seller on public.marketplace_payout_ledger(seller_user_id, created_at desc);
create unique index if not exists idx_marketplace_payout_ledger_order on public.marketplace_payout_ledger(order_id);

create table if not exists public.marketplace_moderation_queue (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.marketplace_listings(id) on delete cascade,
  order_id uuid references public.marketplace_orders(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  assigned_admin_id uuid references auth.users(id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_moderation_status_check check (status in ('open', 'in_review', 'resolved', 'dismissed'))
);

create index if not exists idx_marketplace_moderation_status on public.marketplace_moderation_queue(status, created_at desc);

create table if not exists public.marketplace_service_milestones (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.marketplace_order_items(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'pending',
  revision_limit integer not null default 1,
  revision_count integer not null default 0,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_service_milestones_status_check check (status in ('pending', 'in_progress', 'delivered', 'accepted', 'needs_revision'))
);

create table if not exists public.marketplace_integrations (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  external_account_id text,
  access_token text,
  refresh_token text,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'inactive',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_integrations_status_check check (status in ('inactive', 'active', 'error')),
  unique (seller_user_id, provider)
);

create or replace function public.marketplace_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marketplace_storefronts_touch_updated_at on public.marketplace_storefronts;
create trigger marketplace_storefronts_touch_updated_at before update on public.marketplace_storefronts
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_listings_touch_updated_at on public.marketplace_listings;
create trigger marketplace_listings_touch_updated_at before update on public.marketplace_listings
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_listing_variants_touch_updated_at on public.marketplace_listing_variants;
create trigger marketplace_listing_variants_touch_updated_at before update on public.marketplace_listing_variants
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_orders_touch_updated_at on public.marketplace_orders;
create trigger marketplace_orders_touch_updated_at before update on public.marketplace_orders
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_order_items_touch_updated_at on public.marketplace_order_items;
create trigger marketplace_order_items_touch_updated_at before update on public.marketplace_order_items
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_entitlements_touch_updated_at on public.marketplace_entitlements;
create trigger marketplace_entitlements_touch_updated_at before update on public.marketplace_entitlements
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_payout_ledger_touch_updated_at on public.marketplace_payout_ledger;
create trigger marketplace_payout_ledger_touch_updated_at before update on public.marketplace_payout_ledger
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_moderation_queue_touch_updated_at on public.marketplace_moderation_queue;
create trigger marketplace_moderation_queue_touch_updated_at before update on public.marketplace_moderation_queue
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_service_milestones_touch_updated_at on public.marketplace_service_milestones;
create trigger marketplace_service_milestones_touch_updated_at before update on public.marketplace_service_milestones
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_integrations_touch_updated_at on public.marketplace_integrations;
create trigger marketplace_integrations_touch_updated_at before update on public.marketplace_integrations
for each row execute procedure public.marketplace_touch_updated_at();

alter table public.marketplace_storefronts enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_listing_variants enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.marketplace_order_items enable row level security;
alter table public.marketplace_entitlements enable row level security;
alter table public.marketplace_payout_ledger enable row level security;
alter table public.marketplace_moderation_queue enable row level security;
alter table public.marketplace_service_milestones enable row level security;
alter table public.marketplace_integrations enable row level security;

drop policy if exists "marketplace_storefronts_public_read" on public.marketplace_storefronts;
create policy "marketplace_storefronts_public_read" on public.marketplace_storefronts
for select using (is_active = true);

drop policy if exists "marketplace_storefronts_owner_manage" on public.marketplace_storefronts;
create policy "marketplace_storefronts_owner_manage" on public.marketplace_storefronts
for all using (auth.uid() = seller_user_id) with check (auth.uid() = seller_user_id);

drop policy if exists "marketplace_listings_public_read" on public.marketplace_listings;
create policy "marketplace_listings_public_read" on public.marketplace_listings
for select using (status = 'published' and moderation_status = 'approved');

drop policy if exists "marketplace_listings_owner_manage" on public.marketplace_listings;
create policy "marketplace_listings_owner_manage" on public.marketplace_listings
for all using (auth.uid() = seller_user_id) with check (auth.uid() = seller_user_id);

drop policy if exists "marketplace_variants_public_read" on public.marketplace_listing_variants;
create policy "marketplace_variants_public_read" on public.marketplace_listing_variants
for select using (
  exists (
    select 1
    from public.marketplace_listings listings
    where listings.id = listing_id
      and listings.status = 'published'
      and listings.moderation_status = 'approved'
  )
);

drop policy if exists "marketplace_variants_owner_manage" on public.marketplace_listing_variants;
create policy "marketplace_variants_owner_manage" on public.marketplace_listing_variants
for all using (
  exists (
    select 1
    from public.marketplace_listings listings
    where listings.id = listing_id and listings.seller_user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.marketplace_listings listings
    where listings.id = listing_id and listings.seller_user_id = auth.uid()
  )
);

drop policy if exists "marketplace_orders_participant_read" on public.marketplace_orders;
create policy "marketplace_orders_participant_read" on public.marketplace_orders
for select using (auth.uid() = buyer_user_id or auth.uid() = seller_user_id);

drop policy if exists "marketplace_orders_buyer_create" on public.marketplace_orders;
create policy "marketplace_orders_buyer_create" on public.marketplace_orders
for insert with check (auth.uid() = buyer_user_id);

drop policy if exists "marketplace_orders_seller_update" on public.marketplace_orders;
create policy "marketplace_orders_seller_update" on public.marketplace_orders
for update using (auth.uid() = seller_user_id);

drop policy if exists "marketplace_order_items_participant_read" on public.marketplace_order_items;
create policy "marketplace_order_items_participant_read" on public.marketplace_order_items
for select using (
  exists (
    select 1
    from public.marketplace_orders orders
    where orders.id = order_id
      and (orders.buyer_user_id = auth.uid() or orders.seller_user_id = auth.uid())
  )
);

drop policy if exists "marketplace_order_items_buyer_create" on public.marketplace_order_items;
create policy "marketplace_order_items_buyer_create" on public.marketplace_order_items
for insert with check (
  exists (
    select 1
    from public.marketplace_orders orders
    where orders.id = order_id and orders.buyer_user_id = auth.uid()
  )
);

drop policy if exists "marketplace_entitlements_buyer_read" on public.marketplace_entitlements;
create policy "marketplace_entitlements_buyer_read" on public.marketplace_entitlements
for select using (auth.uid() = buyer_user_id);

drop policy if exists "marketplace_entitlements_seller_manage" on public.marketplace_entitlements;
create policy "marketplace_entitlements_seller_manage" on public.marketplace_entitlements
for all using (
  exists (
    select 1
    from public.marketplace_order_items items
    join public.marketplace_orders orders on orders.id = items.order_id
    where items.id = order_item_id and orders.seller_user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.marketplace_order_items items
    join public.marketplace_orders orders on orders.id = items.order_id
    where items.id = order_item_id and orders.seller_user_id = auth.uid()
  )
);

drop policy if exists "marketplace_payout_seller_read" on public.marketplace_payout_ledger;
create policy "marketplace_payout_seller_read" on public.marketplace_payout_ledger
for select using (auth.uid() = seller_user_id);

drop policy if exists "marketplace_integrations_owner_manage" on public.marketplace_integrations;
create policy "marketplace_integrations_owner_manage" on public.marketplace_integrations
for all using (auth.uid() = seller_user_id) with check (auth.uid() = seller_user_id);

drop policy if exists "marketplace_service_items_participant" on public.marketplace_service_milestones;
create policy "marketplace_service_items_participant" on public.marketplace_service_milestones
for select using (
  exists (
    select 1
    from public.marketplace_order_items items
    join public.marketplace_orders orders on orders.id = items.order_id
    where items.id = order_item_id
      and (orders.buyer_user_id = auth.uid() or orders.seller_user_id = auth.uid())
  )
);

drop policy if exists "marketplace_service_items_seller_manage" on public.marketplace_service_milestones;
create policy "marketplace_service_items_seller_manage" on public.marketplace_service_milestones
for all using (
  exists (
    select 1
    from public.marketplace_order_items items
    join public.marketplace_orders orders on orders.id = items.order_id
    where items.id = order_item_id and orders.seller_user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.marketplace_order_items items
    join public.marketplace_orders orders on orders.id = items.order_id
    where items.id = order_item_id and orders.seller_user_id = auth.uid()
  )
);
