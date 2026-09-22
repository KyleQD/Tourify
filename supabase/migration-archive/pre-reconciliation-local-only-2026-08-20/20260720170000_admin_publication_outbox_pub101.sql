-- PUB-101: Admin publication outbox infrastructure (expand-only)
-- Atomic domain transaction + outbox; claim/retry/dead-letter/replay RPCs.

create table if not exists public.admin_domain_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  command_name text not null,
  correlation_id text not null,
  actor_user_id uuid null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_domain_transactions_org_created
  on public.admin_domain_transactions (org_id, created_at desc);

create index if not exists idx_admin_domain_transactions_correlation
  on public.admin_domain_transactions (correlation_id);

create table if not exists public.admin_publication_outbox (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  domain_transaction_id uuid null references public.admin_domain_transactions (id) on delete set null,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  correlation_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'delivered', 'failed', 'dead')),
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  available_at timestamptz not null default now(),
  locked_at timestamptz null,
  locked_by text null,
  last_error text null,
  last_error_class text null,
  created_at timestamptz not null default now(),
  processed_at timestamptz null,
  unique (org_id, idempotency_key)
);

create index if not exists idx_admin_publication_outbox_pending
  on public.admin_publication_outbox (status, available_at)
  where status in ('pending', 'failed');

create index if not exists idx_admin_publication_outbox_org_created
  on public.admin_publication_outbox (org_id, created_at desc);

create index if not exists idx_admin_publication_outbox_correlation
  on public.admin_publication_outbox (correlation_id);

create index if not exists idx_admin_publication_outbox_dead
  on public.admin_publication_outbox (status, created_at desc)
  where status = 'dead';

alter table public.admin_domain_transactions enable row level security;
alter table public.admin_publication_outbox enable row level security;

revoke all on public.admin_domain_transactions, public.admin_publication_outbox from anon;
grant select on public.admin_domain_transactions, public.admin_publication_outbox to authenticated;
grant all on public.admin_domain_transactions, public.admin_publication_outbox to service_role;

drop policy if exists admin_domain_transactions_select_org on public.admin_domain_transactions;
create policy admin_domain_transactions_select_org
  on public.admin_domain_transactions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = admin_domain_transactions.org_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists admin_publication_outbox_select_org on public.admin_publication_outbox;
create policy admin_publication_outbox_select_org
  on public.admin_publication_outbox
  for select
  to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = admin_publication_outbox.org_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists admin_domain_transactions_service on public.admin_domain_transactions;
create policy admin_domain_transactions_service
  on public.admin_domain_transactions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists admin_publication_outbox_service on public.admin_publication_outbox;
create policy admin_publication_outbox_service
  on public.admin_publication_outbox
  for all
  to service_role
  using (true)
  with check (true);

-- Atomic domain + outbox commit (idempotent on outbox key).
create or replace function public.admin_commit_domain_with_outbox(
  p_org_id uuid,
  p_command_name text,
  p_correlation_id text,
  p_actor_user_id uuid,
  p_domain_payload jsonb,
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id text,
  p_outbox_payload jsonb,
  p_idempotency_key text,
  p_max_attempts integer default 8
)
returns table (
  transaction_id uuid,
  outbox_id uuid,
  already_existed boolean
)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_tx_id uuid;
  v_outbox_id uuid;
  v_existing_outbox_id uuid;
begin
  if p_org_id is null then
    raise exception 'org_id is required';
  end if;
  if coalesce(nullif(btrim(p_idempotency_key), ''), '') = '' then
    raise exception 'idempotency_key is required';
  end if;

  select o.id into v_existing_outbox_id
  from public.admin_publication_outbox o
  where o.org_id = p_org_id
    and o.idempotency_key = p_idempotency_key
  limit 1;

  if v_existing_outbox_id is not null then
    select o.domain_transaction_id into v_tx_id
    from public.admin_publication_outbox o
    where o.id = v_existing_outbox_id;

    return query select v_tx_id, v_existing_outbox_id, true;
    return;
  end if;

  insert into public.admin_domain_transactions (
    org_id, command_name, correlation_id, actor_user_id, payload
  ) values (
    p_org_id,
    p_command_name,
    coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text),
    p_actor_user_id,
    coalesce(p_domain_payload, '{}'::jsonb)
  )
  returning id into v_tx_id;

  insert into public.admin_publication_outbox (
    org_id,
    domain_transaction_id,
    event_type,
    aggregate_type,
    aggregate_id,
    payload,
    idempotency_key,
    correlation_id,
    max_attempts
  ) values (
    p_org_id,
    v_tx_id,
    p_event_type,
    p_aggregate_type,
    p_aggregate_id,
    coalesce(p_outbox_payload, '{}'::jsonb),
    p_idempotency_key,
    coalesce(nullif(btrim(p_correlation_id), ''), v_tx_id::text),
    greatest(coalesce(p_max_attempts, 8), 1)
  )
  returning id into v_outbox_id;

  return query select v_tx_id, v_outbox_id, false;
end;
$$;

revoke all on function public.admin_commit_domain_with_outbox(
  uuid, text, text, uuid, jsonb, text, text, text, jsonb, text, integer
) from public;
grant execute on function public.admin_commit_domain_with_outbox(
  uuid, text, text, uuid, jsonb, text, text, text, jsonb, text, integer
) to authenticated, service_role;

-- Claim a batch for a worker (skip locked).
create or replace function public.admin_publication_outbox_claim(
  p_worker_id text,
  p_limit integer default 25
)
returns setof public.admin_publication_outbox
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
begin
  return query
  with claimed as (
    select o.id
    from public.admin_publication_outbox o
    where o.status in ('pending', 'failed')
      and o.available_at <= now()
    order by o.available_at asc
    for update skip locked
    limit greatest(coalesce(p_limit, 25), 1)
  )
  update public.admin_publication_outbox o
  set status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id,
      attempts = o.attempts + 1
  from claimed
  where o.id = claimed.id
  returning o.*;
end;
$$;

revoke all on function public.admin_publication_outbox_claim(text, integer) from public;
grant execute on function public.admin_publication_outbox_claim(text, integer) to service_role;

create or replace function public.admin_publication_outbox_mark_delivered(
  p_outbox_id uuid,
  p_worker_id text
)
returns public.admin_publication_outbox
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_row public.admin_publication_outbox;
begin
  update public.admin_publication_outbox
  set status = 'delivered',
      processed_at = now(),
      locked_at = null,
      locked_by = null,
      last_error = null,
      last_error_class = null
  where id = p_outbox_id
    and status = 'processing'
    and (locked_by = p_worker_id or locked_by is null)
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Outbox row not claimable for delivery';
  end if;
  return v_row;
end;
$$;

revoke all on function public.admin_publication_outbox_mark_delivered(uuid, text) from public;
grant execute on function public.admin_publication_outbox_mark_delivered(uuid, text) to service_role;

create or replace function public.admin_publication_outbox_mark_failed(
  p_outbox_id uuid,
  p_worker_id text,
  p_error text,
  p_error_class text default 'retryable',
  p_backoff_seconds integer default null
)
returns public.admin_publication_outbox
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_row public.admin_publication_outbox;
  v_backoff integer;
  v_next_status text;
begin
  select * into v_row
  from public.admin_publication_outbox
  where id = p_outbox_id
  for update;

  if v_row.id is null then
    raise exception 'Outbox row not found';
  end if;

  if v_row.status = 'processing' and v_row.locked_by is not null and v_row.locked_by <> p_worker_id then
    raise exception 'Outbox row locked by another worker';
  end if;

  if coalesce(p_error_class, 'retryable') = 'fatal' or v_row.attempts >= v_row.max_attempts then
    v_next_status := 'dead';
    v_backoff := 0;
  else
    v_next_status := 'failed';
    v_backoff := coalesce(
      p_backoff_seconds,
      least(3600, cast(power(2, greatest(v_row.attempts - 1, 0)) * 5 as integer))
    );
  end if;

  update public.admin_publication_outbox
  set status = v_next_status,
      available_at = case when v_next_status = 'dead' then available_at else now() + make_interval(secs => v_backoff) end,
      locked_at = null,
      locked_by = null,
      last_error = left(coalesce(p_error, 'unknown'), 2000),
      last_error_class = coalesce(p_error_class, 'retryable'),
      processed_at = case when v_next_status = 'dead' then now() else processed_at end
  where id = p_outbox_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_publication_outbox_mark_failed(uuid, text, text, text, integer) from public;
grant execute on function public.admin_publication_outbox_mark_failed(uuid, text, text, text, integer) to service_role;

-- Replay a dead-letter item back to pending (manual ops).
create or replace function public.admin_publication_outbox_replay(
  p_outbox_id uuid,
  p_correlation_id text default null
)
returns public.admin_publication_outbox
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_row public.admin_publication_outbox;
begin
  update public.admin_publication_outbox
  set status = 'pending',
      available_at = now(),
      locked_at = null,
      locked_by = null,
      last_error = null,
      last_error_class = null,
      processed_at = null,
      correlation_id = coalesce(nullif(btrim(p_correlation_id), ''), correlation_id)
  where id = p_outbox_id
    and status = 'dead'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Only dead-letter outbox rows can be replayed';
  end if;
  return v_row;
end;
$$;

revoke all on function public.admin_publication_outbox_replay(uuid, text) from public;
grant execute on function public.admin_publication_outbox_replay(uuid, text) to service_role;
