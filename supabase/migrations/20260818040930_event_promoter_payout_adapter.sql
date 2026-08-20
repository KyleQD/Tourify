-- Phase 9: promoter settlement adapter.
--
-- This deliberately does not create a second payments processor or invoke Stripe
-- transfers. Profiles contain a Connect account identifier, but the promoter
-- domain does not yet have a verified KYC/readiness contract. Until that is
-- proven, batches are finance-controlled manual-review settlements. The source
-- of truth remains the immutable promoter commission ledger; each allocation
-- identifies the precise earned entry it settles.

set client_min_messages = warning;

create table if not exists public.promoter_payout_batches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events_v2(id) on delete restrict,
  org_id uuid references public.organizations(id) on delete restrict,
  provider text not null default 'manual_review'
    check (provider in ('manual_review', 'stripe_connect')),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  status text not null default 'allocated'
    check (status in ('allocated', 'submitted', 'paid', 'failed', 'cancelled')),
  total_minor bigint not null default 0 check (total_minor >= 0),
  allocation_count integer not null default 0 check (allocation_count >= 0),
  idempotency_key text not null unique,
  settlement_reference text,
  provider_reference text,
  failure_reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  submitted_by uuid references auth.users(id) on delete restrict,
  paid_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.promoter_payout_batch_events (
  id uuid primary key default gen_random_uuid(),
  payout_batch_id uuid not null references public.promoter_payout_batches(id) on delete restrict,
  event_type text not null check (event_type in ('allocated', 'submitted', 'paid', 'failed', 'retried', 'cancelled')),
  actor_id uuid references auth.users(id) on delete restrict,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Holds are append-only so finance can explain both the original hold and its
-- release. The latest event decides whether an earned entry is eligible.
create table if not exists public.promoter_commission_hold_events (
  id uuid primary key default gen_random_uuid(),
  commission_ledger_id uuid not null references public.promoter_commission_ledger(id) on delete restrict,
  action text not null check (action in ('hold', 'release')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (length(trim(reason)) >= 3),
  created_at timestamptz not null default now()
);

alter table public.promoter_payout_allocations
  add column if not exists payout_batch_id uuid references public.promoter_payout_batches(id) on delete restrict,
  add column if not exists provider_reference text,
  add column if not exists failure_reason text;

create index if not exists promoter_payout_batches_event_status_idx
  on public.promoter_payout_batches(event_id, status, created_at desc);
create index if not exists promoter_payout_batches_org_status_idx
  on public.promoter_payout_batches(org_id, status, created_at desc)
  where org_id is not null;
create index if not exists promoter_payout_batch_events_batch_created_idx
  on public.promoter_payout_batch_events(payout_batch_id, created_at desc);
create index if not exists promoter_commission_hold_events_ledger_created_idx
  on public.promoter_commission_hold_events(commission_ledger_id, created_at desc);
create index if not exists promoter_payout_allocations_batch_status_idx
  on public.promoter_payout_allocations(payout_batch_id, status, created_at desc)
  where payout_batch_id is not null;

create or replace function public.prevent_promoter_payout_batch_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'promoter_payout_batch_events is append-only';
end;
$$;

drop trigger if exists prevent_promoter_payout_batch_event_update on public.promoter_payout_batch_events;
create trigger prevent_promoter_payout_batch_event_update
  before update or delete on public.promoter_payout_batch_events
  for each row execute function public.prevent_promoter_payout_batch_event_mutation();

create or replace function public.prevent_promoter_commission_hold_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'promoter_commission_hold_events is append-only';
end;
$$;

drop trigger if exists prevent_promoter_commission_hold_event_update on public.promoter_commission_hold_events;
create trigger prevent_promoter_commission_hold_event_update
  before update or delete on public.promoter_commission_hold_events
  for each row execute function public.prevent_promoter_commission_hold_event_mutation();

alter table public.promoter_payout_batches enable row level security;
alter table public.promoter_payout_batch_events enable row level security;
alter table public.promoter_commission_hold_events enable row level security;

revoke all on public.promoter_payout_batches, public.promoter_payout_batch_events,
  public.promoter_commission_hold_events from public;

-- Promoters continue to see their own allocations through the existing RLS
-- policy. Batch, audit, and hold records are served only through scoped RPCs or
-- finance APIs; no client role receives direct mutation permissions.

create or replace function public.create_event_promoter_payout_batch(
  p_event_id uuid,
  p_actor_id uuid,
  p_currency text default 'usd',
  p_hold_days integer default 7,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event public.events_v2%rowtype;
  v_batch public.promoter_payout_batches%rowtype;
  v_candidate record;
  v_allocation_id uuid;
  v_total_minor bigint := 0;
  v_allocation_count integer := 0;
  v_currency text := lower(trim(p_currency));
  v_key text := coalesce(nullif(trim(p_idempotency_key), ''), 'promoter:payout:' || gen_random_uuid()::text);
begin
  if p_hold_days < 0 or p_hold_days > 365 then
    raise exception 'p_hold_days must be between 0 and 365' using errcode = '22023';
  end if;
  if v_currency !~ '^[a-z]{3}$' then
    raise exception 'p_currency must be a three-letter lowercase currency code' using errcode = '22023';
  end if;

  select event.* into v_event
  from public.events_v2 event
  where event.id = p_event_id
  for update;
  if not found then
    raise exception 'event not found' using errcode = 'P0002';
  end if;

  select batch.* into v_batch
  from public.promoter_payout_batches batch
  where batch.idempotency_key = v_key;
  if found then
    return jsonb_build_object(
      'created', false,
      'reason', 'idempotent_replay',
      'batch_id', v_batch.id,
      'status', v_batch.status,
      'total_minor', v_batch.total_minor,
      'allocation_count', v_batch.allocation_count
    );
  end if;

  -- Only the original earned entry may be allocated. Its net amount includes
  -- immutable reversal/reinstatement entries linked to it, which makes a full
  -- reconciliation possible without ever mutating the financial ledger.
  for v_candidate in
    with latest_holds as (
      select distinct on (hold_event.commission_ledger_id)
        hold_event.commission_ledger_id,
        hold_event.action
      from public.promoter_commission_hold_events hold_event
      order by hold_event.commission_ledger_id, hold_event.created_at desc, hold_event.id desc
    )
    select
      earned.id as commission_ledger_id,
      earned.membership_id,
      earned.currency,
      earned.amount_minor
        + coalesce((
          select sum(linked.amount_minor)::bigint
          from public.promoter_commission_ledger linked
          where linked.originating_entry_id = earned.id
            and linked.entry_type in ('refund_reversal', 'chargeback_reversal', 'dispute_reinstatement')
        ), 0)::bigint as net_amount_minor
    from public.promoter_commission_ledger earned
    join public.event_promotion_programs program on program.id = earned.program_id
    left join latest_holds hold on hold.commission_ledger_id = earned.id
    where program.event_id = p_event_id
      and earned.entry_type = 'earned'
      and earned.currency = v_currency
      and coalesce(earned.available_at, earned.occurred_at + make_interval(days => p_hold_days)) <= now()
      and coalesce(hold.action, 'release') <> 'hold'
      and not exists (
        select 1 from public.promoter_payout_allocations allocation
        where allocation.commission_ledger_id = earned.id
      )
      and not exists (
        select 1 from public.promoter_risk_flags risk
        where risk.membership_id = earned.membership_id
          and risk.status in ('open', 'reviewing')
          and risk.severity in ('high', 'critical')
      )
    for update of earned skip locked
  loop
    if v_candidate.net_amount_minor <= 0 then
      continue;
    end if;

    if v_batch.id is null then
      insert into public.promoter_payout_batches (
        event_id, org_id, provider, currency, status, idempotency_key, created_by
      ) values (
        p_event_id, v_event.org_id, 'manual_review', v_currency, 'allocated', v_key, p_actor_id
      ) returning * into v_batch;
    end if;

    insert into public.promoter_payout_allocations (
      membership_id, commission_ledger_id, payout_batch_id, amount_minor, currency, status
    ) values (
      v_candidate.membership_id, v_candidate.commission_ledger_id, v_batch.id,
      v_candidate.net_amount_minor, v_currency, 'allocated'
    ) on conflict (commission_ledger_id) do nothing
    returning id into v_allocation_id;

    if v_allocation_id is not null then
      v_total_minor := v_total_minor + v_candidate.net_amount_minor;
      v_allocation_count := v_allocation_count + 1;
    end if;
  end loop;

  if v_batch.id is null then
    return jsonb_build_object('created', false, 'reason', 'no_available_commissions');
  end if;

  update public.promoter_payout_batches
  set total_minor = v_total_minor,
      allocation_count = v_allocation_count,
      updated_at = now()
  where id = v_batch.id;

  insert into public.promoter_payout_batch_events (
    payout_batch_id, event_type, actor_id, metadata
  ) values (
    v_batch.id, 'allocated', p_actor_id,
    jsonb_build_object('allocation_count', v_allocation_count, 'total_minor', v_total_minor, 'currency', v_currency)
  );

  return jsonb_build_object(
    'created', true,
    'batch_id', v_batch.id,
    'status', 'allocated',
    'total_minor', v_total_minor,
    'allocation_count', v_allocation_count,
    'provider', 'manual_review'
  );
end;
$$;

create or replace function public.transition_event_promoter_payout_batch(
  p_payout_batch_id uuid,
  p_actor_id uuid,
  p_action text,
  p_settlement_reference text default null,
  p_reason text default null,
  p_provider_reference text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch public.promoter_payout_batches%rowtype;
  v_next_status text;
begin
  if p_action not in ('submit', 'confirm', 'fail', 'retry', 'cancel') then
    raise exception 'unsupported payout action' using errcode = '22023';
  end if;

  select batch.* into v_batch
  from public.promoter_payout_batches batch
  where batch.id = p_payout_batch_id
  for update;
  if not found then
    raise exception 'payout batch not found' using errcode = 'P0002';
  end if;

  if p_action = 'submit' and v_batch.status = 'allocated' then
    v_next_status := 'submitted';
    update public.promoter_payout_batches
    set status = v_next_status, submitted_by = p_actor_id, submitted_at = now(),
        settlement_reference = coalesce(nullif(trim(p_settlement_reference), ''), settlement_reference),
        provider_reference = coalesce(nullif(trim(p_provider_reference), ''), provider_reference),
        failure_reason = null, updated_at = now()
    where id = v_batch.id;
    update public.promoter_payout_allocations
    set status = 'allocated', settlement_reference = coalesce(nullif(trim(p_settlement_reference), ''), settlement_reference),
        provider_reference = coalesce(nullif(trim(p_provider_reference), ''), provider_reference),
        failure_reason = null, updated_at = now()
    where payout_batch_id = v_batch.id and status in ('pending', 'failed');
  elsif p_action = 'confirm' and v_batch.status = 'submitted' then
    if nullif(trim(p_settlement_reference), '') is null then
      raise exception 'settlement reference is required before confirmation' using errcode = '22023';
    end if;
    v_next_status := 'paid';
    update public.promoter_payout_batches
    set status = v_next_status, paid_by = p_actor_id, paid_at = now(),
        settlement_reference = trim(p_settlement_reference),
        provider_reference = coalesce(nullif(trim(p_provider_reference), ''), provider_reference),
        failure_reason = null, updated_at = now()
    where id = v_batch.id;
    update public.promoter_payout_allocations
    set status = 'paid', paid_at = now(), settlement_reference = trim(p_settlement_reference),
        provider_reference = coalesce(nullif(trim(p_provider_reference), ''), provider_reference),
        failure_reason = null, updated_at = now()
    where payout_batch_id = v_batch.id and status = 'allocated';
  elsif p_action = 'fail' and v_batch.status = 'submitted' then
    if nullif(trim(p_reason), '') is null then
      raise exception 'failure reason is required' using errcode = '22023';
    end if;
    v_next_status := 'failed';
    update public.promoter_payout_batches
    set status = v_next_status, failure_reason = trim(p_reason), updated_at = now()
    where id = v_batch.id;
    update public.promoter_payout_allocations
    set status = 'failed', failure_reason = trim(p_reason), updated_at = now()
    where payout_batch_id = v_batch.id and status = 'allocated';
  elsif p_action = 'retry' and v_batch.status = 'failed' then
    v_next_status := 'allocated';
    update public.promoter_payout_batches
    set status = v_next_status, failure_reason = null, updated_at = now()
    where id = v_batch.id;
    update public.promoter_payout_allocations
    set status = 'allocated', failure_reason = null, updated_at = now()
    where payout_batch_id = v_batch.id and status = 'failed';
  elsif p_action = 'cancel' and v_batch.status in ('allocated', 'failed') then
    v_next_status := 'cancelled';
    update public.promoter_payout_batches
    set status = v_next_status, failure_reason = coalesce(nullif(trim(p_reason), ''), failure_reason), updated_at = now()
    where id = v_batch.id;
    update public.promoter_payout_allocations
    set status = 'reversed', failure_reason = coalesce(nullif(trim(p_reason), ''), failure_reason), updated_at = now()
    where payout_batch_id = v_batch.id and status in ('allocated', 'failed');
  else
    raise exception 'invalid payout status transition from % with %', v_batch.status, p_action using errcode = '22023';
  end if;

  insert into public.promoter_payout_batch_events (
    payout_batch_id, event_type, actor_id, reason,
    metadata
  ) values (
    v_batch.id,
    case p_action when 'confirm' then 'paid' when 'retry' then 'retried' else p_action end,
    p_actor_id,
    nullif(trim(p_reason), ''),
    jsonb_build_object(
      'previous_status', v_batch.status,
      'next_status', v_next_status,
      'settlement_reference_present', nullif(trim(p_settlement_reference), '') is not null,
      'provider_reference_present', nullif(trim(p_provider_reference), '') is not null
    )
  );

  return jsonb_build_object(
    'batch_id', v_batch.id,
    'event_id', v_batch.event_id,
    'status', v_next_status,
    'provider', v_batch.provider,
    'total_minor', v_batch.total_minor,
    'allocation_count', v_batch.allocation_count
  );
end;
$$;

create or replace function public.set_event_promoter_commission_hold(
  p_commission_ledger_id uuid,
  p_actor_id uuid,
  p_action text,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ledger public.promoter_commission_ledger%rowtype;
begin
  if p_action not in ('hold', 'release') or nullif(trim(p_reason), '') is null then
    raise exception 'hold action and reason are required' using errcode = '22023';
  end if;

  select ledger.* into v_ledger
  from public.promoter_commission_ledger ledger
  where ledger.id = p_commission_ledger_id
    and ledger.entry_type = 'earned'
  for update;
  if not found then
    raise exception 'earned commission entry not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.promoter_payout_allocations allocation
    where allocation.commission_ledger_id = v_ledger.id
      and allocation.status in ('pending', 'allocated', 'paid')
  ) then
    raise exception 'allocated commission entries cannot be held or released' using errcode = '22023';
  end if;

  insert into public.promoter_commission_hold_events (
    commission_ledger_id, action, actor_id, reason
  ) values (
    v_ledger.id, p_action, p_actor_id, trim(p_reason)
  );

  return jsonb_build_object(
    'commission_ledger_id', v_ledger.id,
    'action', p_action,
    'event_id', (select program.event_id from public.event_promotion_programs program where program.id = v_ledger.program_id)
  );
end;
$$;

create or replace function private.get_my_event_promoter_payouts()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'allocation_id', allocation.id,
    'membership_id', allocation.membership_id,
    'commission_ledger_id', allocation.commission_ledger_id,
    'amount_minor', allocation.amount_minor,
    'currency', allocation.currency,
    'status', allocation.status,
    'provider', coalesce(batch.provider, 'manual_review'),
    'batch_status', batch.status,
    'settlement_reference_present', allocation.settlement_reference is not null,
    'created_at', allocation.created_at,
    'paid_at', allocation.paid_at
  ) order by allocation.created_at desc), '[]'::jsonb)
  from public.promoter_payout_allocations allocation
  join public.event_promoter_memberships membership on membership.id = allocation.membership_id
  left join public.promoter_payout_batches batch on batch.id = allocation.payout_batch_id
  where membership.user_id = auth.uid();
$$;

create or replace function public.get_my_event_promoter_payouts()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$ select private.get_my_event_promoter_payouts(); $$;

create or replace function public.get_event_promoter_payout_reconciliation(p_event_id uuid)
returns table (
  membership_id uuid,
  currency text,
  earned_minor bigint,
  reversals_minor bigint,
  reinstated_minor bigint,
  allocated_minor bigint,
  paid_minor bigint,
  unallocated_net_minor bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with base as (
    select ledger.id, ledger.membership_id, ledger.currency, ledger.amount_minor
    from public.promoter_commission_ledger ledger
    join public.event_promotion_programs program on program.id = ledger.program_id
    where program.event_id = p_event_id and ledger.entry_type = 'earned'
  ),
  amounts as (
    select
      base.id,
      base.membership_id,
      base.currency,
      base.amount_minor as earned_minor,
      coalesce(sum(linked.amount_minor) filter (where linked.entry_type in ('refund_reversal', 'chargeback_reversal')), 0)::bigint as reversals_minor,
      coalesce(sum(linked.amount_minor) filter (where linked.entry_type = 'dispute_reinstatement'), 0)::bigint as reinstated_minor,
      coalesce(max(allocation.amount_minor) filter (where allocation.status in ('pending', 'allocated', 'paid')), 0)::bigint as allocated_minor,
      coalesce(max(allocation.amount_minor) filter (where allocation.status = 'paid'), 0)::bigint as paid_minor
    from base
    left join public.promoter_commission_ledger linked on linked.originating_entry_id = base.id
    left join public.promoter_payout_allocations allocation on allocation.commission_ledger_id = base.id
    group by base.id, base.membership_id, base.currency, base.amount_minor
  )
  select
    membership_id,
    currency,
    sum(earned_minor)::bigint,
    sum(-reversals_minor)::bigint,
    sum(reinstated_minor)::bigint,
    sum(allocated_minor)::bigint,
    sum(paid_minor)::bigint,
    sum(greatest(0::bigint, earned_minor + reversals_minor + reinstated_minor - allocated_minor))::bigint
  from amounts
  group by membership_id, currency
  order by membership_id, currency;
$$;

revoke all on function public.create_event_promoter_payout_batch(uuid, uuid, text, integer, text) from public;
revoke all on function public.transition_event_promoter_payout_batch(uuid, uuid, text, text, text, text) from public;
revoke all on function public.set_event_promoter_commission_hold(uuid, uuid, text, text) from public;
revoke all on function public.get_event_promoter_payout_reconciliation(uuid) from public;
revoke all on function private.get_my_event_promoter_payouts() from public;
revoke all on function public.get_my_event_promoter_payouts() from public;
grant execute on function public.create_event_promoter_payout_batch(uuid, uuid, text, integer, text) to service_role;
grant execute on function public.transition_event_promoter_payout_batch(uuid, uuid, text, text, text, text) to service_role;
grant execute on function public.set_event_promoter_commission_hold(uuid, uuid, text, text) to service_role;
grant execute on function public.get_event_promoter_payout_reconciliation(uuid) to service_role;
grant execute on function private.get_my_event_promoter_payouts() to authenticated, service_role;
grant execute on function public.get_my_event_promoter_payouts() to authenticated, service_role;

comment on table public.promoter_payout_batches is 'Finance-controlled promoter settlement batches. Manual review is required until a promoter-specific payout readiness contract exists.';
comment on table public.promoter_payout_batch_events is 'Append-only lifecycle audit for promoter payout batches.';
comment on table public.promoter_commission_hold_events is 'Append-only finance holds/releases for promoter earned commission entries.';

-- Roll back safely by disabling event_promoter_payouts_enabled. Do not delete
-- payout batches, allocation records, holds, or commission evidence.
