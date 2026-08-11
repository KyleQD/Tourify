set client_min_messages = warning;

-- P2 Migration 009: marketplace_ticket_collections
-- Links an organization storefront to existing ticketing domain events/ticket types.
-- Read-only adapter: no writes to ticketing tables.

create table if not exists public.marketplace_ticket_collections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.marketplace_storefronts(id) on delete cascade,
  event_id uuid,
  ticket_type_id uuid,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_collections_event_or_type check (
    event_id is not null or ticket_type_id is not null
  )
);

create index if not exists idx_marketplace_ticket_collections_store_order
  on public.marketplace_ticket_collections (store_id, display_order);

alter table public.marketplace_ticket_collections enable row level security;

-- Org owner manages via store ownership
drop policy if exists "marketplace_ticket_collections_owner_manage" on public.marketplace_ticket_collections;
create policy "marketplace_ticket_collections_owner_manage"
  on public.marketplace_ticket_collections
  for all
  using (
    exists (
      select 1 from public.marketplace_storefronts s
      where s.id = store_id and s.seller_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.marketplace_storefronts s
      where s.id = store_id and s.seller_user_id = auth.uid()
    )
  );

-- Public can read collections for active storefronts
drop policy if exists "marketplace_ticket_collections_public_read" on public.marketplace_ticket_collections;
create policy "marketplace_ticket_collections_public_read"
  on public.marketplace_ticket_collections
  for select
  using (
    exists (
      select 1 from public.marketplace_storefronts s
      where s.id = store_id and s.is_active = true
    )
  );

-- updated_at trigger
drop trigger if exists marketplace_ticket_collections_touch_updated_at
  on public.marketplace_ticket_collections;
create trigger marketplace_ticket_collections_touch_updated_at
  before update on public.marketplace_ticket_collections
  for each row execute procedure public.marketplace_touch_updated_at();

comment on table public.marketplace_ticket_collections is
  'Links an organization storefront to existing event/ticket_type rows in the ticketing domain. Read-only adapter — never writes to ticketing tables.';
comment on column public.marketplace_ticket_collections.event_id is
  'References events_v2.id — no FK to avoid cross-domain coupling';
comment on column public.marketplace_ticket_collections.ticket_type_id is
  'References ticket_types.id — no FK to avoid cross-domain coupling';
