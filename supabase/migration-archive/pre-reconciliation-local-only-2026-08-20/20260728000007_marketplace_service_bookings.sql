set client_min_messages = warning;

-- P2 Migration 007: marketplace_service_bookings
-- Confirmed service booking record with calendar event reference.

create table if not exists public.marketplace_service_bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.marketplace_service_requests(id) on delete restrict,
  offer_id uuid references public.marketplace_service_offers(id) on delete set null,
  order_id uuid references public.marketplace_orders(id) on delete set null,
  confirmed_start_at timestamptz not null,
  confirmed_end_at timestamptz,
  timezone text not null,
  location text,
  calendar_event_id text,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'in_progress', 'completed', 'canceled', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id)
);

create index if not exists idx_marketplace_service_bookings_request
  on public.marketplace_service_bookings (request_id);

create index if not exists idx_marketplace_service_bookings_order
  on public.marketplace_service_bookings (order_id);

alter table public.marketplace_service_bookings enable row level security;

-- Buyer reads their own bookings (via request ownership)
drop policy if exists "marketplace_service_bookings_buyer_read" on public.marketplace_service_bookings;
create policy "marketplace_service_bookings_buyer_read"
  on public.marketplace_service_bookings
  for select
  using (
    exists (
      select 1 from public.marketplace_service_requests r
      where r.id = request_id and r.buyer_user_id = auth.uid()
    )
  );

-- Seller reads bookings for their own listings
drop policy if exists "marketplace_service_bookings_seller_read" on public.marketplace_service_bookings;
create policy "marketplace_service_bookings_seller_read"
  on public.marketplace_service_bookings
  for select
  using (
    exists (
      select 1
      from public.marketplace_service_requests r
      join public.marketplace_listings l on l.id = r.listing_id
      where r.id = request_id and l.seller_user_id = auth.uid()
    )
  );

-- Seller manages bookings for their own listings
drop policy if exists "marketplace_service_bookings_seller_manage" on public.marketplace_service_bookings;
create policy "marketplace_service_bookings_seller_manage"
  on public.marketplace_service_bookings
  for all
  using (
    exists (
      select 1
      from public.marketplace_service_requests r
      join public.marketplace_listings l on l.id = r.listing_id
      where r.id = request_id and l.seller_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.marketplace_service_requests r
      join public.marketplace_listings l on l.id = r.listing_id
      where r.id = request_id and l.seller_user_id = auth.uid()
    )
  );

-- updated_at trigger
drop trigger if exists marketplace_service_bookings_touch_updated_at
  on public.marketplace_service_bookings;
create trigger marketplace_service_bookings_touch_updated_at
  before update on public.marketplace_service_bookings
  for each row execute procedure public.marketplace_touch_updated_at();

comment on table public.marketplace_service_bookings is
  'Confirmed service booking with start/end time, timezone, and optional external calendar event reference.';
comment on column public.marketplace_service_bookings.calendar_event_id is
  'External calendar event ID (e.g. Google Calendar event.id) set after calendar creation';
