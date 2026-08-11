set client_min_messages = warning;

-- P2 Migration 005: marketplace_service_requests
-- State-machine table for booking and quote request workflows.

create table if not exists public.marketplace_service_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete restrict,
  store_id uuid references public.marketplace_storefronts(id) on delete set null,
  buyer_user_id uuid references auth.users(id) on delete set null,
  guest_email text,
  mode text not null check (mode in ('booking_request', 'quote_request')),
  status text not null default 'submitted'
    check (status in (
      'submitted', 'under_review', 'countered', 'accepted', 'declined', 'expired',
      'payment_pending', 'confirmed', 'in_progress', 'completed', 'canceled', 'refunded'
    )),
  optimistic_version integer not null default 1,
  proposed_date timestamptz,
  proposed_end_date timestamptz,
  timezone text,
  location text,
  scope_summary text,
  notes text,
  budget_range_min numeric(10,2),
  budget_range_max numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint service_requests_buyer_or_guest check (
    buyer_user_id is not null or guest_email is not null
  )
);

create index if not exists idx_marketplace_service_requests_listing_status
  on public.marketplace_service_requests (listing_id, status);

create index if not exists idx_marketplace_service_requests_buyer_status
  on public.marketplace_service_requests (buyer_user_id, status);

create index if not exists idx_marketplace_service_requests_store_status
  on public.marketplace_service_requests (store_id, status);

alter table public.marketplace_service_requests enable row level security;

-- Buyer reads their own requests
drop policy if exists "marketplace_service_requests_buyer_read" on public.marketplace_service_requests;
create policy "marketplace_service_requests_buyer_read"
  on public.marketplace_service_requests
  for select
  using (auth.uid() = buyer_user_id);

-- Buyer creates requests (authenticated)
drop policy if exists "marketplace_service_requests_buyer_insert" on public.marketplace_service_requests;
create policy "marketplace_service_requests_buyer_insert"
  on public.marketplace_service_requests
  for insert
  with check (auth.uid() = buyer_user_id);

-- Seller reads requests for their own listings
drop policy if exists "marketplace_service_requests_seller_read" on public.marketplace_service_requests;
create policy "marketplace_service_requests_seller_read"
  on public.marketplace_service_requests
  for select
  using (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.seller_user_id = auth.uid()
    )
  );

-- Seller can update (status transitions, counters) via listing ownership
drop policy if exists "marketplace_service_requests_seller_update" on public.marketplace_service_requests;
create policy "marketplace_service_requests_seller_update"
  on public.marketplace_service_requests
  for update
  using (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id and l.seller_user_id = auth.uid()
    )
  );

-- updated_at trigger
drop trigger if exists marketplace_service_requests_touch_updated_at
  on public.marketplace_service_requests;
create trigger marketplace_service_requests_touch_updated_at
  before update on public.marketplace_service_requests
  for each row execute procedure public.marketplace_touch_updated_at();

comment on table public.marketplace_service_requests is
  'Service booking and quote request state machine. Status transitions are enforced at the application layer.';
