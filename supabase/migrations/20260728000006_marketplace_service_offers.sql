set client_min_messages = warning;

-- P2 Migration 006: marketplace_service_offers
-- Versioned offer rows for booking/quote workflows.
-- Each revision is immutable once created; status transitions are append-only.

create table if not exists public.marketplace_service_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.marketplace_service_requests(id) on delete cascade,
  revision_number integer not null default 1,
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired', 'superseded')),
  line_items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  terms text,
  expires_at timestamptz,
  deposit_percentage numeric(5,2),
  deposit_amount numeric(10,2),
  full_payment_due_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, revision_number)
);

create index if not exists idx_marketplace_service_offers_request
  on public.marketplace_service_offers (request_id, revision_number desc);

alter table public.marketplace_service_offers enable row level security;

-- Buyer can read offers on their own requests
drop policy if exists "marketplace_service_offers_buyer_read" on public.marketplace_service_offers;
create policy "marketplace_service_offers_buyer_read"
  on public.marketplace_service_offers
  for select
  using (
    exists (
      select 1 from public.marketplace_service_requests r
      where r.id = request_id and r.buyer_user_id = auth.uid()
    )
  );

-- Seller can read and insert offers on requests for their own listings
drop policy if exists "marketplace_service_offers_seller_read" on public.marketplace_service_offers;
create policy "marketplace_service_offers_seller_read"
  on public.marketplace_service_offers
  for select
  using (
    exists (
      select 1
      from public.marketplace_service_requests r
      join public.marketplace_listings l on l.id = r.listing_id
      where r.id = request_id and l.seller_user_id = auth.uid()
    )
  );

drop policy if exists "marketplace_service_offers_seller_insert" on public.marketplace_service_offers;
create policy "marketplace_service_offers_seller_insert"
  on public.marketplace_service_offers
  for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1
      from public.marketplace_service_requests r
      join public.marketplace_listings l on l.id = r.listing_id
      where r.id = request_id and l.seller_user_id = auth.uid()
    )
  );

-- Status-only update allowed (e.g. buyer accepts/declines) — seller manages via application layer
drop policy if exists "marketplace_service_offers_participant_update" on public.marketplace_service_offers;
create policy "marketplace_service_offers_participant_update"
  on public.marketplace_service_offers
  for update
  using (
    exists (
      select 1 from public.marketplace_service_requests r
      where r.id = request_id
        and (
          r.buyer_user_id = auth.uid()
          or exists (
            select 1 from public.marketplace_listings l
            where l.id = r.listing_id and l.seller_user_id = auth.uid()
          )
        )
    )
  );

-- updated_at trigger
drop trigger if exists marketplace_service_offers_touch_updated_at
  on public.marketplace_service_offers;
create trigger marketplace_service_offers_touch_updated_at
  before update on public.marketplace_service_offers
  for each row execute procedure public.marketplace_touch_updated_at();

comment on table public.marketplace_service_offers is
  'Versioned offer revisions for service booking/quote requests. One row per revision; (request_id, revision_number) is unique.';
comment on column public.marketplace_service_offers.line_items is
  'JSON array of {title, quantity, unit_price, total} line item objects';
