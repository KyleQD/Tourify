set client_min_messages = warning;

create extension if not exists "pgcrypto";

alter table public.marketplace_integrations
  add column if not exists provider_scopes text[] not null default '{}',
  add column if not exists token_envelope jsonb,
  add column if not exists refresh_token_envelope jsonb,
  add column if not exists external_shop_domain text,
  add column if not exists connected_at timestamptz,
  add column if not exists disconnected_at timestamptz,
  add column if not exists last_sync_status text,
  add column if not exists last_sync_error text,
  add column if not exists last_error text,
  add column if not exists last_error_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.marketplace_integrations.access_token is 'Deprecated: do not store new provider access tokens in plaintext. Use token_envelope.';
comment on column public.marketplace_integrations.refresh_token is 'Deprecated: do not store new provider refresh tokens in plaintext. Use refresh_token_envelope.';
comment on column public.marketplace_integrations.token_envelope is 'Encrypted provider access token envelope. Never expose to clients.';
comment on column public.marketplace_integrations.refresh_token_envelope is 'Encrypted provider refresh token envelope. Never expose to clients.';

alter table public.marketplace_listings
  add column if not exists integration_id uuid references public.marketplace_integrations(id) on delete set null,
  add column if not exists source_provider text,
  add column if not exists external_product_id text,
  add column if not exists external_variant_id text,
  add column if not exists sync_status text,
  add column if not exists last_external_synced_at timestamptz,
  add column if not exists fulfillment_provider text,
  add column if not exists fulfillment_profile jsonb not null default '{}'::jsonb;

alter table public.marketplace_listing_variants
  add column if not exists integration_id uuid references public.marketplace_integrations(id) on delete set null,
  add column if not exists source_provider text,
  add column if not exists external_product_id text,
  add column if not exists external_variant_id text,
  add column if not exists sync_status text,
  add column if not exists last_external_synced_at timestamptz,
  add column if not exists fulfillment_provider text,
  add column if not exists fulfillment_profile jsonb not null default '{}'::jsonb;

create index if not exists idx_marketplace_listings_integration
  on public.marketplace_listings(integration_id);

create index if not exists idx_marketplace_listings_external_source
  on public.marketplace_listings(seller_user_id, source_provider, external_product_id)
  where external_product_id is not null;

create index if not exists idx_marketplace_listing_variants_external_source
  on public.marketplace_listing_variants(integration_id, external_variant_id)
  where external_variant_id is not null;

create table if not exists public.marketplace_integration_products (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.marketplace_integrations(id) on delete cascade,
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  external_product_id text not null,
  title text not null,
  status text not null default 'pending',
  image_url text,
  product_type text,
  variants_count integer not null default 0,
  imported_listing_id uuid references public.marketplace_listings(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  raw_variants jsonb not null default '[]'::jsonb,
  sync_status text not null default 'pending',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_integration_products_status_check
    check (status in ('pending', 'imported', 'published', 'ignored', 'error')),
  constraint marketplace_integration_products_sync_status_check
    check (sync_status in ('pending', 'synced', 'error', 'skipped')),
  unique (integration_id, external_product_id)
);

create index if not exists idx_marketplace_integration_products_seller
  on public.marketplace_integration_products(seller_user_id, provider, updated_at desc);

create index if not exists idx_marketplace_integration_products_listing
  on public.marketplace_integration_products(imported_listing_id)
  where imported_listing_id is not null;

create table if not exists public.marketplace_integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.marketplace_integrations(id) on delete set null,
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text not null default 'started',
  dry_run boolean not null default false,
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_integration_sync_runs_status_check
    check (status in ('started', 'completed', 'failed'))
);

create index if not exists idx_marketplace_integration_sync_runs_seller
  on public.marketplace_integration_sync_runs(seller_user_id, provider, started_at desc);

create table if not exists public.marketplace_provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_event_id text not null,
  integration_id uuid references public.marketplace_integrations(id) on delete set null,
  seller_user_id uuid references auth.users(id) on delete set null,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create index if not exists idx_marketplace_provider_webhook_events_seller
  on public.marketplace_provider_webhook_events(seller_user_id, provider, created_at desc);

create table if not exists public.marketplace_fulfillment_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  order_item_id uuid not null references public.marketplace_order_items(id) on delete cascade,
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  integration_id uuid references public.marketplace_integrations(id) on delete set null,
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text not null default 'pending',
  external_order_id text,
  external_reference text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_fulfillment_requests_status_check
    check (status in ('pending', 'submitted', 'accepted', 'failed', 'cancelled', 'shipped', 'delivered')),
  unique (order_item_id, provider)
);

create index if not exists idx_marketplace_fulfillment_requests_seller
  on public.marketplace_fulfillment_requests(seller_user_id, provider, created_at desc);

create index if not exists idx_marketplace_fulfillment_requests_order
  on public.marketplace_fulfillment_requests(order_id);

drop trigger if exists marketplace_integration_products_touch_updated_at on public.marketplace_integration_products;
create trigger marketplace_integration_products_touch_updated_at before update on public.marketplace_integration_products
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_integration_sync_runs_touch_updated_at on public.marketplace_integration_sync_runs;
create trigger marketplace_integration_sync_runs_touch_updated_at before update on public.marketplace_integration_sync_runs
for each row execute procedure public.marketplace_touch_updated_at();

drop trigger if exists marketplace_fulfillment_requests_touch_updated_at on public.marketplace_fulfillment_requests;
create trigger marketplace_fulfillment_requests_touch_updated_at before update on public.marketplace_fulfillment_requests
for each row execute procedure public.marketplace_touch_updated_at();

alter table public.marketplace_integration_products enable row level security;
alter table public.marketplace_integration_sync_runs enable row level security;
alter table public.marketplace_provider_webhook_events enable row level security;
alter table public.marketplace_fulfillment_requests enable row level security;

drop policy if exists "marketplace_integration_products_owner_manage" on public.marketplace_integration_products;
create policy "marketplace_integration_products_owner_manage" on public.marketplace_integration_products
for all using (auth.uid() = seller_user_id) with check (auth.uid() = seller_user_id);

drop policy if exists "marketplace_integration_sync_runs_owner_read" on public.marketplace_integration_sync_runs;
create policy "marketplace_integration_sync_runs_owner_read" on public.marketplace_integration_sync_runs
for select using (auth.uid() = seller_user_id);

drop policy if exists "marketplace_provider_webhook_events_owner_read" on public.marketplace_provider_webhook_events;
create policy "marketplace_provider_webhook_events_owner_read" on public.marketplace_provider_webhook_events
for select using (auth.uid() = seller_user_id);

drop policy if exists "marketplace_fulfillment_requests_owner_read" on public.marketplace_fulfillment_requests;
create policy "marketplace_fulfillment_requests_owner_read" on public.marketplace_fulfillment_requests
for select using (auth.uid() = seller_user_id);
