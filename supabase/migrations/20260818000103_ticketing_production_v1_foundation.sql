-- Ticketing production v1 foundation (additive)
-- Bridges the current ticket_sales/ticket_types flow to canonical movement,
-- delivery, claim, provider, settlement, and scanner read models.

set client_min_messages = warning;
create extension if not exists pgcrypto;

create table if not exists public.ticketing_inventory_ledger (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  event_id uuid not null references public.events_v2(id) on delete cascade,
  ticket_type_id uuid references public.ticket_types(id) on delete set null,
  movement_type text not null check (
    movement_type in (
      'reserve',
      'release',
      'expire',
      'sell',
      'hold',
      'comp',
      'transfer_in',
      'transfer_out',
      'void',
      'refund',
      'provider_adjustment'
    )
  ),
  quantity integer not null check (quantity > 0),
  source_entity_type text,
  source_entity_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ticketing_inventory_ledger_idempotency
  on public.ticketing_inventory_ledger(idempotency_key);
create index if not exists idx_ticketing_inventory_ledger_event_created
  on public.ticketing_inventory_ledger(event_id, created_at desc);
create index if not exists idx_ticketing_inventory_ledger_type_created
  on public.ticketing_inventory_ledger(ticket_type_id, created_at desc);

create table if not exists public.ticket_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  event_id uuid references public.events_v2(id) on delete cascade,
  order_id uuid references public.ticket_sales(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  recipient_email text,
  delivery_channel text not null default 'email'
    check (delivery_channel in ('email', 'download', 'sms', 'wallet', 'claim_link')),
  status text not null check (
    status in ('queued', 'sent', 'failed', 'resent', 'opened', 'claimed', 'expired')
  ),
  provider text,
  provider_message_id text,
  error text,
  manage_url text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ticket_delivery_attempts_idempotency
  on public.ticket_delivery_attempts(idempotency_key)
  where idempotency_key is not null;
create index if not exists idx_ticket_delivery_attempts_event
  on public.ticket_delivery_attempts(event_id, created_at desc);
create index if not exists idx_ticket_delivery_attempts_order
  on public.ticket_delivery_attempts(order_id, created_at desc);

create table if not exists public.ticket_claim_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  event_id uuid not null references public.events_v2(id) on delete cascade,
  order_id uuid references public.ticket_sales(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  recipient_email text,
  token_hash text not null unique,
  purpose text not null default 'claim'
    check (purpose in ('claim', 'transfer_accept', 'manage')),
  status text not null default 'active'
    check (status in ('active', 'claimed', 'expired', 'revoked')),
  expires_at timestamptz not null,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ticket_claim_links_order
  on public.ticket_claim_links(order_id, status);
create index if not exists idx_ticket_claim_links_ticket
  on public.ticket_claim_links(ticket_id, status);
create index if not exists idx_ticket_claim_links_event
  on public.ticket_claim_links(event_id, created_at desc);

create table if not exists public.scanner_devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  event_id uuid references public.events_v2(id) on delete cascade,
  device_name text not null,
  status text not null default 'active'
    check (status in ('active', 'disabled', 'lost', 'retired')),
  gate_assignment text,
  gate_permissions text[] not null default array[]::text[],
  assigned_user_id uuid references auth.users(id) on delete set null,
  is_offline_mode boolean not null default false,
  key_version integer not null default 1,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scanner_devices_org
  on public.scanner_devices(org_id, status);
create index if not exists idx_scanner_devices_event
  on public.scanner_devices(event_id, status);

alter table if exists public.ticket_checkins
  add column if not exists device_id uuid references public.scanner_devices(id) on delete set null,
  add column if not exists idempotency_key text;

create unique index if not exists idx_ticket_checkins_idempotency
  on public.ticket_checkins(idempotency_key)
  where idempotency_key is not null;

create table if not exists public.ticket_offline_scan_packages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  event_id uuid not null references public.events_v2(id) on delete cascade,
  device_id uuid references public.scanner_devices(id) on delete cascade,
  package_version integer not null default 1,
  key_version integer not null default 1,
  credential_hashes jsonb not null default '[]'::jsonb,
  gate_permissions text[] not null default array[]::text[],
  expires_at timestamptz not null,
  generated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admissions_scans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  event_id uuid not null references public.events_v2(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete set null,
  credential_id uuid references public.ticket_credentials(id) on delete set null,
  device_id uuid references public.scanner_devices(id) on delete set null,
  checkpoint text not null default 'main',
  outcome text not null check (
    outcome in (
      'admit',
      'deny',
      'duplicate',
      'offline_queued',
      'admitted',
      'revoked',
      'wrong_event',
      'expired',
      'conflict',
      'invalid',
      'refunded',
      'canceled'
    )
  ),
  source text not null default 'online' check (source in ('online', 'offline')),
  idempotency_key text,
  raw_payload jsonb not null default '{}'::jsonb,
  scanned_by uuid references auth.users(id) on delete set null,
  scanned_at timestamptz not null default now(),
  reconciled_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_admissions_scans_idempotency
  on public.admissions_scans(idempotency_key)
  where idempotency_key is not null;
create index if not exists idx_admissions_scans_event
  on public.admissions_scans(event_id, scanned_at desc);
create index if not exists idx_admissions_scans_device
  on public.admissions_scans(device_id, scanned_at desc);

create table if not exists public.ticket_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  external_event_id text not null,
  event_type text not null,
  order_id uuid references public.ticket_sales(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  event_id uuid references public.events_v2(id) on delete set null,
  raw_payload_ref text,
  raw_payload jsonb not null default '{}'::jsonb,
  signature_status text not null default 'unchecked'
    check (signature_status in ('unchecked', 'valid', 'invalid', 'unavailable')),
  idempotency_key text,
  mapped_order_ids uuid[] not null default array[]::uuid[],
  mapped_ticket_ids uuid[] not null default array[]::uuid[],
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'quarantined', 'failed', 'ignored')),
  quarantine_reason text,
  error text,
  retry_count integer not null default 0,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create unique index if not exists idx_ticket_provider_events_idempotency
  on public.ticket_provider_events(idempotency_key)
  where idempotency_key is not null;
create index if not exists idx_ticket_provider_events_event
  on public.ticket_provider_events(event_id, processing_status, created_at desc);

create table if not exists public.ticket_settlement_packages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  event_id uuid not null references public.events_v2(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'exported', 'paid', 'reopened')),
  gross_amount numeric not null default 0,
  discounts_amount numeric not null default 0,
  platform_fee_amount numeric not null default 0,
  processing_fee_amount numeric not null default 0,
  tax_amount numeric not null default 0,
  refunds_amount numeric not null default 0,
  chargebacks_amount numeric not null default 0,
  comps_count integer not null default 0,
  attendance_count integer not null default 0,
  provider_statement jsonb not null default '{}'::jsonb,
  net_amount numeric not null default 0,
  variance_amount numeric not null default 0,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, version)
);

create index if not exists idx_ticket_settlement_packages_event
  on public.ticket_settlement_packages(event_id, status, version desc);

create unique index if not exists idx_ticket_transfers_one_pending
  on public.ticket_transfers(ticket_id)
  where status = 'pending';

-- Extend inventory functions so every counter mutation emits a canonical row.
create or replace function public.expire_ticket_reservations()
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
    select r.id, r.ticket_type_id, r.event_id, r.quantity, r.created_by, e.org_id
    from public.ticket_inventory_reservations r
    left join public.events_v2 e on e.id = r.event_id
    where r.status = 'active' and r.expires_at < now()
    for update skip locked
  loop
    update public.ticket_inventory_reservations
      set status = 'expired', updated_at = now()
      where id = rec.id;

    update public.ticket_types
      set quantity_reserved = greatest(0, quantity_reserved - rec.quantity),
          updated_at = now()
      where id = rec.ticket_type_id;

    insert into public.ticketing_inventory_ledger (
      org_id, event_id, ticket_type_id, movement_type, quantity,
      source_entity_type, source_entity_id, actor_user_id, reason, idempotency_key
    ) values (
      rec.org_id, rec.event_id, rec.ticket_type_id, 'expire', rec.quantity,
      'reservation', rec.id, rec.created_by, 'reservation_expired',
      'reservation:' || rec.id::text || ':expire'
    )
    on conflict (idempotency_key) do nothing;

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

create or replace function public.reserve_ticket_inventory(
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
  v_org_id uuid;
  v_available integer;
  v_reserved integer;
  v_sold integer;
  v_qty integer;
  v_reservation_id uuid;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be >= 1';
  end if;

  perform public.expire_ticket_reservations();

  select tt.event_id, e.org_id, tt.quantity_available, tt.quantity_reserved, tt.quantity_sold
    into v_event_id, v_org_id, v_available, v_reserved, v_sold
  from public.ticket_types tt
  left join public.events_v2 e on e.id = tt.event_id
  where tt.id = p_ticket_type_id
  for update;

  if not found then
    raise exception 'ticket type not found';
  end if;

  v_qty := v_available - coalesce(v_sold, 0) - coalesce(v_reserved, 0);
  if v_qty < p_quantity then
    raise exception 'insufficient inventory: % available', greatest(v_qty, 0);
  end if;

  insert into public.ticket_inventory_reservations (
    ticket_type_id, event_id, order_id, quantity, status, expires_at, created_by
  ) values (
    p_ticket_type_id, v_event_id, p_order_id, p_quantity, 'active',
    now() + make_interval(secs => greatest(p_ttl_seconds, 60)),
    p_created_by
  ) returning id into v_reservation_id;

  update public.ticket_types
    set quantity_reserved = coalesce(quantity_reserved, 0) + p_quantity,
        updated_at = now()
    where id = p_ticket_type_id;

  insert into public.ticketing_inventory_ledger (
    org_id, event_id, ticket_type_id, movement_type, quantity,
    source_entity_type, source_entity_id, actor_user_id, reason, idempotency_key
  ) values (
    v_org_id, v_event_id, p_ticket_type_id, 'reserve', p_quantity,
    'reservation', v_reservation_id, p_created_by, 'checkout_reservation',
    'reservation:' || v_reservation_id::text || ':reserve'
  )
  on conflict (idempotency_key) do nothing;

  return v_reservation_id;
end;
$$;

create or replace function public.release_ticket_inventory(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  select r.id, r.ticket_type_id, r.event_id, r.quantity, r.status, r.created_by, e.org_id
    into rec
  from public.ticket_inventory_reservations r
  left join public.events_v2 e on e.id = r.event_id
  where r.id = p_reservation_id
  for update;

  if not found then
    return false;
  end if;

  if rec.status <> 'active' then
    return false;
  end if;

  update public.ticket_inventory_reservations
    set status = 'released', updated_at = now()
    where id = p_reservation_id;

  update public.ticket_types
    set quantity_reserved = greatest(0, quantity_reserved - rec.quantity),
        updated_at = now()
    where id = rec.ticket_type_id;

  insert into public.ticketing_inventory_ledger (
    org_id, event_id, ticket_type_id, movement_type, quantity,
    source_entity_type, source_entity_id, actor_user_id, reason, idempotency_key
  ) values (
    rec.org_id, rec.event_id, rec.ticket_type_id, 'release', rec.quantity,
    'reservation', rec.id, rec.created_by, 'reservation_released',
    'reservation:' || rec.id::text || ':release'
  )
  on conflict (idempotency_key) do nothing;

  return true;
end;
$$;

create or replace function public.finalize_ticket_inventory(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  select r.id, r.ticket_type_id, r.event_id, r.order_id, r.quantity, r.status, r.created_by, e.org_id
    into rec
  from public.ticket_inventory_reservations r
  left join public.events_v2 e on e.id = r.event_id
  where r.id = p_reservation_id
  for update;

  if not found then
    return false;
  end if;

  if rec.status <> 'active' then
    return rec.status = 'consumed';
  end if;

  update public.ticket_inventory_reservations
    set status = 'consumed', updated_at = now()
    where id = p_reservation_id;

  update public.ticket_types
    set quantity_reserved = greatest(0, quantity_reserved - rec.quantity),
        quantity_sold = quantity_sold + rec.quantity,
        updated_at = now()
    where id = rec.ticket_type_id;

  insert into public.ticketing_inventory_ledger (
    org_id, event_id, ticket_type_id, movement_type, quantity,
    source_entity_type, source_entity_id, actor_user_id, reason, idempotency_key
  ) values (
    rec.org_id, rec.event_id, rec.ticket_type_id, 'sell', rec.quantity,
    case when rec.order_id is null then 'reservation' else 'order' end,
    coalesce(rec.order_id, rec.id), rec.created_by, 'sale_finalized',
    'reservation:' || rec.id::text || ':finalize'
  )
  on conflict (idempotency_key) do nothing;

  return true;
end;
$$;

create or replace function public.apply_ticket_refund(
  p_order_id uuid,
  p_actor_user_id uuid,
  p_refund_amount numeric,
  p_ticket_ids uuid[] default null
)
returns table (
  event_id uuid,
  ticket_type_id uuid,
  buyer_user_id uuid,
  restored_quantity integer,
  payment_reference text,
  org_id uuid
)
language plpgsql
security invoker
set search_path to 'public', 'extensions'
as $$
declare
  v_order public.ticket_sales%rowtype;
  v_requested_ids uuid[];
  v_target_ids uuid[];
  v_restore_quantity integer;
  v_is_partial boolean;
  v_actor_user_id uuid;
  v_org_id uuid;
begin
  if p_refund_amount is null or p_refund_amount <= 0 then
    raise exception 'Refund amount must be greater than zero';
  end if;

  select ts.*
  into v_order
  from public.ticket_sales ts
  where ts.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.payment_status not in ('completed', 'paid') then
    raise exception 'Order is not refundable';
  end if;
  if coalesce(v_order.metadata, '{}'::jsonb) ? 'refund' then
    raise exception 'Order has already been refunded';
  end if;
  if p_refund_amount > v_order.total_amount then
    raise exception 'Refund amount exceeds order total';
  end if;

  if p_ticket_ids is not null and cardinality(p_ticket_ids) > 0 then
    select coalesce(array_agg(distinct requested.id), '{}'::uuid[])
    into v_requested_ids
    from unnest(p_ticket_ids) as requested(id);

    if cardinality(v_requested_ids) <> cardinality(p_ticket_ids) then
      raise exception 'Duplicate ticket IDs are not allowed';
    end if;

    select coalesce(array_agg(t.id order by t.id), '{}'::uuid[])
    into v_target_ids
    from public.tickets t
    where t.order_id = p_order_id
      and t.id = any(v_requested_ids)
      and t.status not in ('refunded', 'canceled', 'void');

    if cardinality(v_target_ids) <> cardinality(v_requested_ids) then
      raise exception 'One or more tickets are not refundable for this order';
    end if;
  else
    select coalesce(array_agg(t.id order by t.id), '{}'::uuid[])
    into v_target_ids
    from public.tickets t
    where t.order_id = p_order_id
      and t.status not in ('refunded', 'canceled', 'void');
  end if;

  v_restore_quantity := case
    when cardinality(v_target_ids) > 0 then cardinality(v_target_ids)
    else v_order.quantity
  end;
  if v_restore_quantity <= 0 then
    raise exception 'Order has no refundable admissions';
  end if;

  v_is_partial := p_ticket_ids is not null
    and cardinality(p_ticket_ids) > 0
    and v_restore_quantity < v_order.quantity;

  select u.id into v_actor_user_id
  from auth.users u
  where u.id = p_actor_user_id;

  if cardinality(v_target_ids) > 0 then
    update public.tickets t
    set status = 'refunded', updated_at = now()
    where t.id = any(v_target_ids);

    update public.ticket_credentials tc
    set status = 'revoked',
        revoked_at = now(),
        revoke_reason = 'refunded'
    where tc.ticket_id = any(v_target_ids)
      and tc.status = 'active';

    -- migration-validation: scoped-insert-select TIXV1-001
    insert into public.ticket_ownership_events (
      ticket_id,
      event_type,
      actor_user_id,
      metadata
    )
    select
      target.id,
      'refunded',
      v_actor_user_id,
      jsonb_build_object('refund_amount', p_refund_amount, 'order_id', p_order_id)
    from unnest(v_target_ids) as target(id);
  end if;

  update public.ticket_sales ts
  set payment_status = case when v_is_partial then 'completed' else 'refunded' end,
      metadata = coalesce(ts.metadata, '{}'::jsonb) || jsonb_build_object(
        'refund', jsonb_build_object(
          'amount', p_refund_amount,
          'partial', v_is_partial,
          'ticket_ids', to_jsonb(v_target_ids),
          'actor_user_id', v_actor_user_id,
          'at', now()
        )
      ),
      updated_at = now()
  where ts.id = p_order_id;

  update public.ticket_types tt
  set quantity_sold = greatest(0, tt.quantity_sold - v_restore_quantity),
      updated_at = now()
  where tt.id = v_order.ticket_type_id;

  select e.org_id into v_org_id
  from public.events_v2 e
  where e.id = v_order.event_id;

  insert into public.ticketing_inventory_ledger (
    org_id, event_id, ticket_type_id, movement_type, quantity,
    source_entity_type, source_entity_id, actor_user_id, reason, idempotency_key,
    metadata
  ) values (
    v_org_id, v_order.event_id, v_order.ticket_type_id, 'refund', v_restore_quantity,
    'order', p_order_id, v_actor_user_id, 'refund_processed',
    'order:' || p_order_id::text || ':refund:' || md5(coalesce(array_to_string(v_target_ids, ','), 'full')),
    jsonb_build_object('ticket_ids', to_jsonb(v_target_ids), 'refund_amount', p_refund_amount)
  )
  on conflict (idempotency_key) do nothing;

  return query
  select
    v_order.event_id,
    v_order.ticket_type_id,
    v_order.buyer_user_id,
    v_restore_quantity,
    v_order.payment_reference,
    v_org_id;
end;
$$;

alter table public.ticketing_inventory_ledger enable row level security;
alter table public.ticket_delivery_attempts enable row level security;
alter table public.ticket_claim_links enable row level security;
alter table public.scanner_devices enable row level security;
alter table public.ticket_offline_scan_packages enable row level security;
alter table public.admissions_scans enable row level security;
alter table public.ticket_provider_events enable row level security;
alter table public.ticket_settlement_packages enable row level security;

do $$ begin
  drop policy if exists ticketing_inventory_ledger_select on public.ticketing_inventory_ledger;
  create policy ticketing_inventory_ledger_select on public.ticketing_inventory_ledger
    for select using (
      public.is_event_v2_org_member(event_id)
      or public.has_event_ticketing_grant(event_id, 'view_orders')
      or public.has_event_ticketing_grant(event_id, 'view_full_financials')
    );

  drop policy if exists ticketing_inventory_ledger_insert_service_only on public.ticketing_inventory_ledger;
  create policy ticketing_inventory_ledger_insert_service_only on public.ticketing_inventory_ledger
    for insert with check (auth.role() = 'service_role');

  drop policy if exists ticket_delivery_attempts_select on public.ticket_delivery_attempts;
  create policy ticket_delivery_attempts_select on public.ticket_delivery_attempts
    for select using (
      public.is_event_v2_org_member(event_id)
      or exists (
        select 1
        from public.tickets t
        where t.id = ticket_id
          and t.owner_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.ticket_sales s
        where s.id = order_id
          and s.buyer_user_id = auth.uid()
      )
    );

  drop policy if exists ticket_delivery_attempts_insert_service_only on public.ticket_delivery_attempts;
  create policy ticket_delivery_attempts_insert_service_only on public.ticket_delivery_attempts
    for insert with check (auth.role() = 'service_role');

  drop policy if exists ticket_claim_links_service_only on public.ticket_claim_links;
  create policy ticket_claim_links_service_only on public.ticket_claim_links
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

  drop policy if exists scanner_devices_select on public.scanner_devices;
  create policy scanner_devices_select on public.scanner_devices
    for select using (
      assigned_user_id = auth.uid()
      or (event_id is not null and public.is_event_v2_org_member(event_id))
      or (event_id is not null and public.has_event_ticketing_grant(event_id, 'scan_tickets'))
    );

  drop policy if exists scanner_devices_write on public.scanner_devices;
  create policy scanner_devices_write on public.scanner_devices
    for all using (
      auth.role() = 'service_role'
      or (event_id is not null and public.is_event_v2_org_member(event_id))
    )
    with check (
      auth.role() = 'service_role'
      or (event_id is not null and public.is_event_v2_org_member(event_id))
    );

  drop policy if exists ticket_offline_scan_packages_select on public.ticket_offline_scan_packages;
  create policy ticket_offline_scan_packages_select on public.ticket_offline_scan_packages
    for select using (
      public.is_event_v2_org_member(event_id)
      or public.has_event_ticketing_grant(event_id, 'scan_tickets')
    );

  drop policy if exists ticket_offline_scan_packages_insert_service_only on public.ticket_offline_scan_packages;
  create policy ticket_offline_scan_packages_insert_service_only on public.ticket_offline_scan_packages
    for insert with check (auth.role() = 'service_role');

  drop policy if exists admissions_scans_select on public.admissions_scans;
  create policy admissions_scans_select on public.admissions_scans
    for select using (
      public.is_event_v2_org_member(event_id)
      or public.has_event_ticketing_grant(event_id, 'scan_tickets')
      or public.has_event_ticketing_grant(event_id, 'view_attendees')
    );

  drop policy if exists admissions_scans_insert_service_only on public.admissions_scans;
  create policy admissions_scans_insert_service_only on public.admissions_scans
    for insert with check (auth.role() = 'service_role');

  drop policy if exists ticket_provider_events_select on public.ticket_provider_events;
  create policy ticket_provider_events_select on public.ticket_provider_events
    for select using (
      event_id is not null
      and (
        public.is_event_v2_org_member(event_id)
        or public.has_event_ticketing_grant(event_id, 'view_full_financials')
      )
    );

  drop policy if exists ticket_provider_events_service_only on public.ticket_provider_events;
  create policy ticket_provider_events_service_only on public.ticket_provider_events
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');

  drop policy if exists ticket_settlement_packages_select on public.ticket_settlement_packages;
  create policy ticket_settlement_packages_select on public.ticket_settlement_packages
    for select using (
      public.is_event_v2_org_member(event_id)
      or public.has_event_ticketing_grant(event_id, 'view_full_financials')
    );

  drop policy if exists ticket_settlement_packages_write on public.ticket_settlement_packages;
  create policy ticket_settlement_packages_write on public.ticket_settlement_packages
    for all using (
      auth.role() = 'service_role'
      or public.is_event_v2_org_member(event_id)
    )
    with check (
      auth.role() = 'service_role'
      or public.is_event_v2_org_member(event_id)
    );
end $$;

grant select on public.ticketing_inventory_ledger to authenticated;
grant select on public.ticket_delivery_attempts to authenticated;
grant select on public.scanner_devices to authenticated;
grant select on public.ticket_offline_scan_packages to authenticated;
grant select on public.admissions_scans to authenticated;
grant select on public.ticket_provider_events to authenticated;
grant select on public.ticket_settlement_packages to authenticated;

grant all on public.ticketing_inventory_ledger to service_role;
grant all on public.ticket_delivery_attempts to service_role;
grant all on public.ticket_claim_links to service_role;
grant all on public.scanner_devices to service_role;
grant all on public.ticket_offline_scan_packages to service_role;
grant all on public.admissions_scans to service_role;
grant all on public.ticket_provider_events to service_role;
grant all on public.ticket_settlement_packages to service_role;

grant execute on function public.reserve_ticket_inventory(uuid, integer, uuid, integer, uuid) to authenticated, service_role;
grant execute on function public.release_ticket_inventory(uuid) to authenticated, service_role;
grant execute on function public.finalize_ticket_inventory(uuid) to authenticated, service_role;
grant execute on function public.expire_ticket_reservations() to authenticated, service_role;
grant execute on function public.apply_ticket_refund(uuid, uuid, numeric, uuid[]) to service_role;
