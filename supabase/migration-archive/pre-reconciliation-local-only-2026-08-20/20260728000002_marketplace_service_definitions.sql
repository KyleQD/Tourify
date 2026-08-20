set client_min_messages = warning;

-- P2 Migration 002: marketplace_service_definitions
-- One row per service listing; holds all service-specific configuration.

create table if not exists public.marketplace_service_definitions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  transaction_mode text not null
    check (transaction_mode in ('fixed_price', 'booking_request', 'quote_request')),
  lead_time_days integer,
  duration_minutes integer,
  duration_max_minutes integer,
  service_area text,
  is_remote boolean not null default false,
  deposit_percentage numeric(5,2),
  deposit_required boolean not null default false,
  cancellation_terms text,
  availability_ref_id uuid,
  request_schema jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id)
);

create index if not exists idx_marketplace_service_definitions_listing
  on public.marketplace_service_definitions (listing_id);

alter table public.marketplace_service_definitions enable row level security;

-- Seller can manage their own service definitions (via listing ownership)
drop policy if exists "marketplace_service_definitions_owner_manage" on public.marketplace_service_definitions;
create policy "marketplace_service_definitions_owner_manage"
  on public.marketplace_service_definitions
  for all
  using (
    exists (
      select 1
      from public.marketplace_listings l
      where l.id = listing_id
        and l.seller_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.marketplace_listings l
      where l.id = listing_id
        and l.seller_user_id = auth.uid()
    )
  );

-- Public can read service definitions only for published + approved listings
drop policy if exists "marketplace_service_definitions_public_read" on public.marketplace_service_definitions;
create policy "marketplace_service_definitions_public_read"
  on public.marketplace_service_definitions
  for select
  using (
    exists (
      select 1
      from public.marketplace_listings l
      where l.id = listing_id
        and l.status = 'published'
        and l.moderation_status = 'approved'
    )
  );

-- updated_at trigger
drop trigger if exists marketplace_service_definitions_touch_updated_at
  on public.marketplace_service_definitions;
create trigger marketplace_service_definitions_touch_updated_at
  before update on public.marketplace_service_definitions
  for each row execute procedure public.marketplace_touch_updated_at();

comment on table public.marketplace_service_definitions is
  'Service-specific configuration for listings with listing_kind = service';
