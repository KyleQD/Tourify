-- =============================================================================
-- Event ticketing foundation (additive)
-- Extends events_v2 ticketing with config, inventory reservation, individual
-- tickets, credentials, transfers, check-ins, allocations, grants, ledger
-- categories, and Connect-ready fields. Does not drop or rename existing tables.
-- =============================================================================

set client_min_messages = warning;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Event ticketing configuration (explicit ownership + policies)
-- ---------------------------------------------------------------------------
create table if not exists event_ticketing_config (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references events_v2(id) on delete cascade,
  ticketing_enabled boolean not null default false,
  ticketing_owner_type text not null default 'organization'
    check (ticketing_owner_type in ('organization', 'venue', 'artist', 'admin', 'user')),
  ticketing_owner_id uuid,
  sales_visibility text not null default 'public'
    check (sales_visibility in ('public', 'private', 'invite_only', 'unlisted')),
  sale_start timestamptz,
  sale_end timestamptz,
  capacity integer check (capacity is null or capacity >= 0),
  max_per_order integer default 8 check (max_per_order is null or max_per_order >= 1),
  max_per_user integer check (max_per_user is null or max_per_user >= 1),
  currency text not null default 'usd',
  platform_fee_type text not null default 'flat_per_ticket'
    check (platform_fee_type in ('flat_per_ticket', 'percentage', 'flat_per_order', 'none')),
  platform_fee_amount numeric not null default 1.00 check (platform_fee_amount >= 0),
  processing_fee_passthrough boolean not null default true,
  tax_enabled boolean not null default false,
  tax_rate numeric not null default 0 check (tax_rate >= 0),
  refund_policy text not null default 'No refunds within 7 days of event',
  transfer_policy text not null default 'Transfers allowed until check-in',
  resale_enabled boolean not null default false,
  checkin_window_start timestamptz,
  checkin_window_end timestamptz,
  box_office_enabled boolean not null default true,
  terms_text text,
  -- Connect-ready (unused in v1 platform-charge mode)
  payout_destination_account_id text,
  stripe_connect_account_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_ticketing_config_owner
  on event_ticketing_config(ticketing_owner_type, ticketing_owner_id);

-- ---------------------------------------------------------------------------
-- 2. Extend ticket_types for richer product config
-- ---------------------------------------------------------------------------
alter table ticket_types
  add column if not exists visibility text not null default 'public',
  add column if not exists access_level text not null default 'general',
  add column if not exists min_per_order integer default 1,
  add column if not exists is_complimentary boolean not null default false,
  add column if not exists requires_access_code boolean not null default false,
  add column if not exists access_code_hash text,
  add column if not exists allocation_account_type text,
  add column if not exists allocation_account_id uuid,
  add column if not exists image_url text,
  add column if not exists questionnaire jsonb not null default '[]'::jsonb,
  add column if not exists internal_notes text,
  add column if not exists quantity_reserved integer not null default 0;

do $$ begin
  alter table ticket_types
    drop constraint if exists ticket_types_visibility_check;
  alter table ticket_types
    add constraint ticket_types_visibility_check
    check (visibility in ('public', 'private', 'hidden', 'access_code'));
exception when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Inventory reservations (atomic hold during checkout)
-- ---------------------------------------------------------------------------
create table if not exists ticket_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  ticket_type_id uuid not null references ticket_types(id) on delete cascade,
  event_id uuid not null references events_v2(id) on delete cascade,
  order_id uuid,
  quantity integer not null check (quantity >= 1),
  status text not null default 'active'
    check (status in ('active', 'consumed', 'released', 'expired')),
  expires_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ticket_reservations_type_status
  on ticket_inventory_reservations(ticket_type_id, status)
  where status = 'active';

create index if not exists idx_ticket_reservations_expires
  on ticket_inventory_reservations(expires_at)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- 4. Extend ticket_sales (order semantics) with fee / idempotency fields
-- ---------------------------------------------------------------------------
alter table ticket_sales
  add column if not exists order_number text,
  add column if not exists platform_fee_amount numeric not null default 0,
  add column if not exists processing_fee_amount numeric not null default 0,
  add column if not exists tax_amount numeric not null default 0,
  add column if not exists net_amount numeric,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists reservation_id uuid references ticket_inventory_reservations(id) on delete set null,
  add column if not exists finalized_at timestamptz,
  add column if not exists webhook_event_id text,
  add column if not exists issuance_status text not null default 'pending'
    check (issuance_status in ('pending', 'issued', 'failed', 'partial'));

create unique index if not exists idx_ticket_sales_order_number
  on ticket_sales(order_number) where order_number is not null;

create unique index if not exists idx_ticket_sales_stripe_session
  on ticket_sales(stripe_checkout_session_id) where stripe_checkout_session_id is not null;

create unique index if not exists idx_ticket_sales_webhook_event
  on ticket_sales(webhook_event_id) where webhook_event_id is not null;

-- ---------------------------------------------------------------------------
-- 5. Individual admission tickets
-- ---------------------------------------------------------------------------
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references ticket_sales(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id) on delete restrict,
  event_id uuid not null references events_v2(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_email text,
  owner_name text,
  status text not null default 'valid'
    check (status in ('valid', 'assigned', 'transferred', 'checked_in', 'refunded', 'canceled', 'void')),
  is_complimentary boolean not null default false,
  allocation_id uuid,
  unit_price numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tickets_order on tickets(order_id);
create index if not exists idx_tickets_event_status on tickets(event_id, status);
create index if not exists idx_tickets_owner on tickets(owner_user_id) where owner_user_id is not null;
create index if not exists idx_tickets_type on tickets(ticket_type_id);

-- ---------------------------------------------------------------------------
-- 6. Opaque QR credentials (revocable / reissuable)
-- ---------------------------------------------------------------------------
create table if not exists ticket_credentials (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  token text not null,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired', 'superseded')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  superseded_by uuid references ticket_credentials(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ticket_credentials_token
  on ticket_credentials(token);

create unique index if not exists idx_ticket_credentials_one_active
  on ticket_credentials(ticket_id) where status = 'active';

-- ---------------------------------------------------------------------------
-- 7. Ownership history
-- ---------------------------------------------------------------------------
create table if not exists ticket_ownership_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete set null,
  to_user_id uuid references auth.users(id) on delete set null,
  from_email text,
  to_email text,
  event_type text not null
    check (event_type in ('issued', 'assigned', 'transfer_requested', 'transfer_accepted', 'transfer_declined', 'transfer_canceled', 'reissued', 'refunded', 'canceled')),
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ticket_ownership_ticket on ticket_ownership_events(ticket_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 8. Transfers
-- ---------------------------------------------------------------------------
create table if not exists ticket_transfers (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid references auth.users(id) on delete set null,
  to_email text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'canceled', 'expired')),
  message text,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ticket_transfers_ticket on ticket_transfers(ticket_id, status);
create index if not exists idx_ticket_transfers_to_user on ticket_transfers(to_user_id, status);

-- ---------------------------------------------------------------------------
-- 9. Check-ins (append-only)
-- ---------------------------------------------------------------------------
create table if not exists ticket_checkins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  event_id uuid not null references events_v2(id) on delete cascade,
  credential_id uuid references ticket_credentials(id) on delete set null,
  scanned_by uuid references auth.users(id) on delete set null,
  checkpoint text not null default 'main',
  result text not null default 'valid'
    check (result in ('valid', 'already_used', 'invalid', 'refunded', 'canceled', 'transferred', 'wrong_event', 'wrong_date', 'revoked')),
  reversed_at timestamptz,
  reversed_by uuid references auth.users(id) on delete set null,
  reverse_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ticket_checkins_event on ticket_checkins(event_id, created_at desc);
create index if not exists idx_ticket_checkins_ticket on ticket_checkins(ticket_id, created_at desc);

create unique index if not exists idx_ticket_checkins_active_unique
  on ticket_checkins(ticket_id, checkpoint)
  where result = 'valid' and reversed_at is null;

-- ---------------------------------------------------------------------------
-- 10. Guest / allocation pools
-- ---------------------------------------------------------------------------
create table if not exists ticket_allocations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  ticket_type_id uuid references ticket_types(id) on delete set null,
  allocation_type text not null
    check (allocation_type in ('artist', 'venue', 'organization', 'promoter', 'sponsor', 'staff', 'media', 'general')),
  account_type text,
  account_id uuid,
  label text not null,
  quantity_total integer not null check (quantity_total >= 0),
  quantity_issued integer not null default 0 check (quantity_issued >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ticket_allocations_event on ticket_allocations(event_id);

alter table tickets
  drop constraint if exists tickets_allocation_id_fkey;
alter table tickets
  add constraint tickets_allocation_id_fkey
  foreign key (allocation_id) references ticket_allocations(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 11. Revenue allocations (explicit shares; never automatic)
-- ---------------------------------------------------------------------------
create table if not exists ticket_revenue_allocations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  beneficiary_type text not null
    check (beneficiary_type in ('organization', 'venue', 'artist', 'promoter', 'platform')),
  beneficiary_id uuid,
  share_type text not null default 'percentage'
    check (share_type in ('percentage', 'flat', 'remainder')),
  share_value numeric not null default 0 check (share_value >= 0),
  priority integer not null default 100,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ticket_revenue_alloc_event on ticket_revenue_allocations(event_id);

-- ---------------------------------------------------------------------------
-- 12. Event-level ticketing permission grants
-- ---------------------------------------------------------------------------
create table if not exists event_ticketing_grants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null
    check (permission in (
      'view_overview',
      'manage_ticket_types',
      'publish_sales',
      'view_attendees',
      'view_attendee_contact',
      'view_orders',
      'view_full_financials',
      'view_assigned_share',
      'issue_comps',
      'manage_guestlist',
      'transfer_reassign',
      'process_refunds',
      'operate_box_office',
      'scan_tickets',
      'reverse_checkin',
      'export_attendees',
      'export_financials',
      'manage_grants'
    )),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id, permission)
);

create index if not exists idx_event_ticketing_grants_user
  on event_ticketing_grants(user_id, event_id);

-- ---------------------------------------------------------------------------
-- 13. Stripe webhook idempotency store
-- ---------------------------------------------------------------------------
create table if not exists ticket_stripe_webhook_events (
  id text primary key,
  event_type text not null,
  order_id uuid references ticket_sales(id) on delete set null,
  processed_at timestamptz not null default now(),
  payload_summary jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 14. Analytics event log (normalized ticketing events)
-- ---------------------------------------------------------------------------
create table if not exists ticket_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_id uuid references events_v2(id) on delete set null,
  ticket_type_id uuid,
  order_id uuid,
  ticket_id uuid,
  actor_user_id uuid,
  attribution jsonb not null default '{}'::jsonb,
  amounts jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ticket_analytics_events_event
  on ticket_analytics_events(event_id, event_name, created_at desc);

-- ---------------------------------------------------------------------------
-- 15. Expand financial_transactions categories for fees/refunds
-- ---------------------------------------------------------------------------
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'financial_transactions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%ticket_revenue%';

  if con_name is not null then
    execute format('alter table financial_transactions drop constraint %I', con_name);
  end if;

  alter table financial_transactions
    add constraint financial_transactions_category_check
    check (category in (
      'ticket_revenue','merchandise','sponsorship','appearance_fee','other_income',
      'venue_rental','equipment','catering','staff_pay','marketing','travel','insurance','permits','production','other_expense',
      'refund','platform_fee','processing_fee','tax','chargeback'
    ));
exception when others then
  raise notice 'financial_transactions category check update skipped: %', sqlerrm;
end $$;

alter table financial_transactions
  add column if not exists ticket_order_id uuid references ticket_sales(id) on delete set null,
  add column if not exists ticket_id uuid references tickets(id) on delete set null,
  add column if not exists idempotency_key text;

create unique index if not exists idx_fin_tx_idempotency
  on financial_transactions(idempotency_key) where idempotency_key is not null;

-- ---------------------------------------------------------------------------
-- 16. Inventory RPCs (atomic reserve / release / finalize)
-- ---------------------------------------------------------------------------
create or replace function expire_ticket_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
  rec record;
begin
  for rec in
    select id, ticket_type_id, quantity
    from ticket_inventory_reservations
    where status = 'active' and expires_at < now()
    for update skip locked
  loop
    update ticket_inventory_reservations
      set status = 'expired', updated_at = now()
      where id = rec.id;

    update ticket_types
      set quantity_reserved = greatest(0, quantity_reserved - rec.quantity),
          updated_at = now()
      where id = rec.ticket_type_id;

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

create or replace function reserve_ticket_inventory(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_order_id uuid default null,
  p_ttl_seconds integer default 900,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_available integer;
  v_reserved integer;
  v_sold integer;
  v_qty integer;
  v_reservation_id uuid;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be >= 1';
  end if;

  perform expire_ticket_reservations();

  select event_id, quantity_available, quantity_reserved, quantity_sold
    into v_event_id, v_available, v_reserved, v_sold
  from ticket_types
  where id = p_ticket_type_id
  for update;

  if not found then
    raise exception 'ticket type not found';
  end if;

  v_qty := v_available - coalesce(v_sold, 0) - coalesce(v_reserved, 0);
  if v_qty < p_quantity then
    raise exception 'insufficient inventory: % available', greatest(v_qty, 0);
  end if;

  insert into ticket_inventory_reservations (
    ticket_type_id, event_id, order_id, quantity, status, expires_at, created_by
  ) values (
    p_ticket_type_id, v_event_id, p_order_id, p_quantity, 'active',
    now() + make_interval(secs => greatest(p_ttl_seconds, 60)),
    p_created_by
  ) returning id into v_reservation_id;

  update ticket_types
    set quantity_reserved = coalesce(quantity_reserved, 0) + p_quantity,
        updated_at = now()
    where id = p_ticket_type_id;

  return v_reservation_id;
end;
$$;

create or replace function release_ticket_inventory(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  select id, ticket_type_id, quantity, status
    into rec
  from ticket_inventory_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return false;
  end if;

  if rec.status <> 'active' then
    return false;
  end if;

  update ticket_inventory_reservations
    set status = 'released', updated_at = now()
    where id = p_reservation_id;

  update ticket_types
    set quantity_reserved = greatest(0, quantity_reserved - rec.quantity),
        updated_at = now()
    where id = rec.ticket_type_id;

  return true;
end;
$$;

create or replace function finalize_ticket_inventory(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  select id, ticket_type_id, quantity, status
    into rec
  from ticket_inventory_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return false;
  end if;

  if rec.status <> 'active' then
    return rec.status = 'consumed';
  end if;

  update ticket_inventory_reservations
    set status = 'consumed', updated_at = now()
    where id = p_reservation_id;

  update ticket_types
    set quantity_reserved = greatest(0, quantity_reserved - rec.quantity),
        quantity_sold = quantity_sold + rec.quantity,
        updated_at = now()
    where id = rec.ticket_type_id;

  return true;
end;
$$;

-- Safer sold increment that respects capacity
create or replace function increment_ticket_quantity_sold(
  p_ticket_type_id uuid,
  p_quantity integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
  v_sold integer;
  v_reserved integer;
begin
  select quantity_available, quantity_sold, coalesce(quantity_reserved, 0)
    into v_available, v_sold, v_reserved
  from ticket_types
  where id = p_ticket_type_id
  for update;

  if not found then
    raise exception 'ticket type not found';
  end if;

  if (v_sold + p_quantity) > v_available then
    raise exception 'oversell prevented: sold % + % > available %', v_sold, p_quantity, v_available;
  end if;

  update ticket_types
    set quantity_sold = quantity_sold + p_quantity,
        updated_at = now()
    where id = p_ticket_type_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 17. Seed entity RBAC permissions (additive)
-- ---------------------------------------------------------------------------
insert into rbac_permissions(name, display_name, category)
values
  ('SCAN_TICKETS', 'Scan tickets', 'ticketing'),
  ('MANAGE_GUESTLIST', 'Manage guest list', 'ticketing'),
  ('PROCESS_REFUNDS', 'Process ticket refunds', 'ticketing'),
  ('VIEW_TICKET_FINANCE', 'View full ticket financials', 'ticketing'),
  ('VIEW_TICKET_SHARE', 'View assigned ticket revenue share', 'ticketing'),
  ('OPERATE_BOX_OFFICE', 'Operate box office', 'ticketing')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 18. RLS
-- ---------------------------------------------------------------------------
alter table event_ticketing_config enable row level security;
alter table ticket_inventory_reservations enable row level security;
alter table tickets enable row level security;
alter table ticket_credentials enable row level security;
alter table ticket_ownership_events enable row level security;
alter table ticket_transfers enable row level security;
alter table ticket_checkins enable row level security;
alter table ticket_allocations enable row level security;
alter table ticket_revenue_allocations enable row level security;
alter table event_ticketing_grants enable row level security;
alter table ticket_stripe_webhook_events enable row level security;
alter table ticket_analytics_events enable row level security;

-- Helper: org member for events_v2
create or replace function is_event_v2_org_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from events_v2 e
    join org_members m on m.org_id = e.org_id
    where e.id = p_event_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function has_event_ticketing_grant(p_event_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from event_ticketing_grants g
    where g.event_id = p_event_id
      and g.user_id = auth.uid()
      and g.permission = p_permission
  ) or is_event_v2_org_member(p_event_id);
$$;

do $$ begin
  -- Config: org members can read; writes via service/app with manage grants
  drop policy if exists event_ticketing_config_select on event_ticketing_config;
  create policy event_ticketing_config_select on event_ticketing_config
    for select using (
      is_event_v2_org_member(event_id)
      or has_event_ticketing_grant(event_id, 'view_overview')
    );

  drop policy if exists event_ticketing_config_write on event_ticketing_config;
  create policy event_ticketing_config_write on event_ticketing_config
    for all using (
      is_event_v2_org_member(event_id)
      or has_event_ticketing_grant(event_id, 'manage_ticket_types')
    )
    with check (
      is_event_v2_org_member(event_id)
      or has_event_ticketing_grant(event_id, 'manage_ticket_types')
    );

  -- Tickets: owners see own; staff with grants see event tickets
  drop policy if exists tickets_select on tickets;
  create policy tickets_select on tickets
    for select using (
      owner_user_id = auth.uid()
      or is_event_v2_org_member(event_id)
      or has_event_ticketing_grant(event_id, 'view_attendees')
      or has_event_ticketing_grant(event_id, 'scan_tickets')
      or has_event_ticketing_grant(event_id, 'operate_box_office')
    );

  drop policy if exists tickets_owner_update on tickets;
  create policy tickets_owner_update on tickets
    for update using (
      owner_user_id = auth.uid()
      or is_event_v2_org_member(event_id)
      or has_event_ticketing_grant(event_id, 'transfer_reassign')
    );

  -- Credentials: owner or scanners
  drop policy if exists ticket_credentials_select on ticket_credentials;
  create policy ticket_credentials_select on ticket_credentials
    for select using (
      exists (
        select 1 from tickets t
        where t.id = ticket_id
          and (
            t.owner_user_id = auth.uid()
            or is_event_v2_org_member(t.event_id)
            or has_event_ticketing_grant(t.event_id, 'scan_tickets')
            or has_event_ticketing_grant(t.event_id, 'operate_box_office')
          )
      )
    );

  -- Transfers
  drop policy if exists ticket_transfers_select on ticket_transfers;
  create policy ticket_transfers_select on ticket_transfers
    for select using (
      from_user_id = auth.uid()
      or to_user_id = auth.uid()
    );

  drop policy if exists ticket_transfers_insert on ticket_transfers;
  create policy ticket_transfers_insert on ticket_transfers
    for insert with check (from_user_id = auth.uid());

  drop policy if exists ticket_transfers_update on ticket_transfers;
  create policy ticket_transfers_update on ticket_transfers
    for update using (
      from_user_id = auth.uid() or to_user_id = auth.uid()
    );

  -- Check-ins
  drop policy if exists ticket_checkins_select on ticket_checkins;
  create policy ticket_checkins_select on ticket_checkins
    for select using (
      is_event_v2_org_member(event_id)
      or has_event_ticketing_grant(event_id, 'scan_tickets')
      or has_event_ticketing_grant(event_id, 'view_attendees')
    );

  drop policy if exists ticket_checkins_insert on ticket_checkins;
  create policy ticket_checkins_insert on ticket_checkins
    for insert with check (
      is_event_v2_org_member(event_id)
      or has_event_ticketing_grant(event_id, 'scan_tickets')
      or has_event_ticketing_grant(event_id, 'operate_box_office')
    );

  -- Allocations / grants / revenue: org scoped
  drop policy if exists ticket_allocations_all on ticket_allocations;
  create policy ticket_allocations_all on ticket_allocations
    for all using (is_event_v2_org_member(event_id))
    with check (is_event_v2_org_member(event_id));

  drop policy if exists ticket_revenue_allocations_all on ticket_revenue_allocations;
  create policy ticket_revenue_allocations_all on ticket_revenue_allocations
    for all using (is_event_v2_org_member(event_id))
    with check (is_event_v2_org_member(event_id));

  drop policy if exists event_ticketing_grants_select on event_ticketing_grants;
  create policy event_ticketing_grants_select on event_ticketing_grants
    for select using (
      user_id = auth.uid() or is_event_v2_org_member(event_id)
    );

  drop policy if exists event_ticketing_grants_write on event_ticketing_grants;
  create policy event_ticketing_grants_write on event_ticketing_grants
    for all using (
      is_event_v2_org_member(event_id)
      or has_event_ticketing_grant(event_id, 'manage_grants')
    )
    with check (
      is_event_v2_org_member(event_id)
      or has_event_ticketing_grant(event_id, 'manage_grants')
    );

  -- Reservations: creator or org
  drop policy if exists ticket_reservations_select on ticket_inventory_reservations;
  create policy ticket_reservations_select on ticket_inventory_reservations
    for select using (
      created_by = auth.uid() or is_event_v2_org_member(event_id)
    );

  -- Analytics events: org read
  drop policy if exists ticket_analytics_events_select on ticket_analytics_events;
  create policy ticket_analytics_events_select on ticket_analytics_events
    for select using (
      event_id is null or is_event_v2_org_member(event_id)
    );

  drop policy if exists ticket_analytics_events_insert on ticket_analytics_events;
  create policy ticket_analytics_events_insert on ticket_analytics_events
    for insert with check (auth.role() = 'authenticated');

  -- Ownership events: ticket owner or org
  drop policy if exists ticket_ownership_events_select on ticket_ownership_events;
  create policy ticket_ownership_events_select on ticket_ownership_events
    for select using (
      exists (
        select 1 from tickets t
        where t.id = ticket_id
          and (t.owner_user_id = auth.uid() or is_event_v2_org_member(t.event_id))
      )
    );

  -- Webhook events: no client access (service role only)
  drop policy if exists ticket_stripe_webhook_events_deny on ticket_stripe_webhook_events;
  create policy ticket_stripe_webhook_events_deny on ticket_stripe_webhook_events
    for all using (false) with check (false);
end $$;

grant execute on function reserve_ticket_inventory(uuid, integer, uuid, integer, uuid) to authenticated, service_role;
grant execute on function release_ticket_inventory(uuid) to authenticated, service_role;
grant execute on function finalize_ticket_inventory(uuid) to authenticated, service_role;
grant execute on function expire_ticket_reservations() to authenticated, service_role;
grant execute on function increment_ticket_quantity_sold(uuid, integer) to authenticated, service_role;
grant execute on function is_event_v2_org_member(uuid) to authenticated, service_role;
grant execute on function has_event_ticketing_grant(uuid, text) to authenticated, service_role;
