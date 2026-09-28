-- PUB-101 corrective hardening (expand-only, no row deletion).
-- Scopes worker mutations to an organization, recovers expired claims, resets
-- replay attempt budgets, and rejects conflicting idempotency-key reuse.

begin;

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
  v_outbox public.admin_publication_outbox;
  v_transaction public.admin_domain_transactions;
  v_required_capability text;
  v_uid uuid := auth.uid();
  v_is_service boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if p_org_id is null then
    raise exception 'org_id is required' using errcode = '22023';
  end if;
  if coalesce(nullif(btrim(p_idempotency_key), ''), '') = '' then
    raise exception 'idempotency_key is required' using errcode = '22023';
  end if;
  if coalesce(nullif(btrim(p_command_name), ''), '') = ''
    or coalesce(nullif(btrim(p_event_type), ''), '') = ''
    or coalesce(nullif(btrim(p_aggregate_type), ''), '') = ''
    or coalesce(nullif(btrim(p_aggregate_id), ''), '') = '' then
    raise exception 'command, event, aggregate type, and aggregate id are required'
      using errcode = '22023';
  end if;

  if not v_is_service then
    if v_uid is null or p_actor_user_id is distinct from v_uid then
      raise exception 'actor does not match authenticated user' using errcode = '42501';
    end if;

    v_required_capability := case
      when p_command_name like 'publication.%' then 'tour.publish'
      when p_command_name like 'event.%' then 'event.manage'
      else 'tour.manage'
    end;
    if not public.has_perm(v_uid, p_org_id, v_required_capability) then
      raise exception 'missing capability % for organization', v_required_capability
        using errcode = '42501';
    end if;
  end if;

  -- Serialize a natural command key so concurrent duplicates cannot create an
  -- orphan transaction marker before the unique outbox constraint is observed.
  perform pg_advisory_xact_lock(
    hashtextextended(p_org_id::text || ':' || btrim(p_idempotency_key), 0)
  );

  select o.* into v_outbox
  from public.admin_publication_outbox o
  where o.org_id = p_org_id
    and o.idempotency_key = btrim(p_idempotency_key)
  limit 1;

  if v_outbox.id is not null then
    select t.* into v_transaction
    from public.admin_domain_transactions t
    where t.id = v_outbox.domain_transaction_id
      and t.org_id = p_org_id;

    if v_outbox.event_type is distinct from btrim(p_event_type)
      or v_outbox.aggregate_type is distinct from btrim(p_aggregate_type)
      or v_outbox.aggregate_id is distinct from btrim(p_aggregate_id)
      or (v_outbox.payload - 'correlationId') is distinct from (coalesce(p_outbox_payload, '{}'::jsonb) - 'correlationId')
      or v_transaction.command_name is distinct from btrim(p_command_name)
      or v_transaction.payload is distinct from coalesce(p_domain_payload, '{}'::jsonb) then
      raise exception 'idempotency key already exists with a different command payload'
        using errcode = '23505';
    end if;

    return query select v_outbox.domain_transaction_id, v_outbox.id, true;
    return;
  end if;

  insert into public.admin_domain_transactions (
    org_id, command_name, correlation_id, actor_user_id, payload
  ) values (
    p_org_id,
    btrim(p_command_name),
    coalesce(nullif(btrim(p_correlation_id), ''), gen_random_uuid()::text),
    p_actor_user_id,
    coalesce(p_domain_payload, '{}'::jsonb)
  ) returning id into v_tx_id;

  insert into public.admin_publication_outbox (
    org_id, domain_transaction_id, event_type, aggregate_type, aggregate_id,
    payload, idempotency_key, correlation_id, max_attempts
  ) values (
    p_org_id,
    v_tx_id,
    btrim(p_event_type),
    btrim(p_aggregate_type),
    btrim(p_aggregate_id),
    coalesce(p_outbox_payload, '{}'::jsonb),
    btrim(p_idempotency_key),
    coalesce(nullif(btrim(p_correlation_id), ''), v_tx_id::text),
    greatest(coalesce(p_max_attempts, 8), 1)
  ) returning * into v_outbox;

  return query select v_tx_id, v_outbox.id, false;
end;
$$;

revoke all on function public.admin_commit_domain_with_outbox(
  uuid, text, text, uuid, jsonb, text, text, text, jsonb, text, integer
) from public;
grant execute on function public.admin_commit_domain_with_outbox(
  uuid, text, text, uuid, jsonb, text, text, text, jsonb, text, integer
) to authenticated, service_role;

-- A crashed worker's processing claim becomes eligible after a bounded lease.
create or replace function public.admin_publication_outbox_claim_for_org(
  p_org_id uuid,
  p_worker_id text,
  p_limit integer default 25
)
returns setof public.admin_publication_outbox
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
begin
  if p_org_id is null then
    raise exception 'org_id is required' using errcode = '22023';
  end if;
  if coalesce(nullif(btrim(p_worker_id), ''), '') = '' then
    raise exception 'worker_id is required' using errcode = '22023';
  end if;

  return query
  with claimed as (
    select o.id
    from public.admin_publication_outbox o
    where o.org_id = p_org_id
      and (
        (o.status in ('pending', 'failed') and o.available_at <= now())
        or (o.status = 'processing' and o.locked_at < now() - interval '15 minutes')
      )
    order by coalesce(o.locked_at, o.available_at) asc
    for update skip locked
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
  )
  update public.admin_publication_outbox o
  set status = 'processing',
      locked_at = now(),
      locked_by = btrim(p_worker_id),
      attempts = o.attempts + 1
  from claimed
  where o.id = claimed.id
    and o.org_id = p_org_id
  returning o.*;
end;
$$;

revoke all on function public.admin_publication_outbox_claim_for_org(uuid, text, integer) from public;
grant execute on function public.admin_publication_outbox_claim_for_org(uuid, text, integer) to service_role;

create or replace function public.admin_publication_outbox_mark_delivered_for_org(
  p_org_id uuid,
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
  set status = 'delivered', processed_at = now(), locked_at = null, locked_by = null,
      last_error = null, last_error_class = null
  where id = p_outbox_id
    and org_id = p_org_id
    and status = 'processing'
    and locked_by = btrim(p_worker_id)
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Outbox row not owned by organization/worker or not processing'
      using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

revoke all on function public.admin_publication_outbox_mark_delivered_for_org(uuid, uuid, text) from public;
grant execute on function public.admin_publication_outbox_mark_delivered_for_org(uuid, uuid, text) to service_role;

create or replace function public.admin_publication_outbox_mark_failed_for_org(
  p_org_id uuid,
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
    and org_id = p_org_id
    and status = 'processing'
    and locked_by = btrim(p_worker_id)
  for update;

  if v_row.id is null then
    raise exception 'Outbox row not owned by organization/worker or not processing'
      using errcode = 'P0002';
  end if;

  if coalesce(p_error_class, 'retryable') in ('fatal', 'suppressed')
    or v_row.attempts >= v_row.max_attempts then
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
      available_at = case when v_next_status = 'dead' then available_at else now() + make_interval(secs => greatest(v_backoff, 0)) end,
      locked_at = null,
      locked_by = null,
      last_error = left(coalesce(p_error, 'unknown'), 2000),
      last_error_class = coalesce(p_error_class, 'retryable'),
      processed_at = case when v_next_status = 'dead' then now() else null end
  where id = p_outbox_id and org_id = p_org_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_publication_outbox_mark_failed_for_org(uuid, uuid, text, text, text, integer) from public;
grant execute on function public.admin_publication_outbox_mark_failed_for_org(uuid, uuid, text, text, text, integer) to service_role;

create or replace function public.admin_publication_outbox_replay_for_org(
  p_org_id uuid,
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
  set status = 'pending', available_at = now(), locked_at = null, locked_by = null,
      attempts = 0, last_error = null, last_error_class = null, processed_at = null,
      correlation_id = coalesce(nullif(btrim(p_correlation_id), ''), correlation_id)
  where id = p_outbox_id
    and org_id = p_org_id
    and status = 'dead'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Only an organization-owned dead-letter row can be replayed'
      using errcode = 'P0002';
  end if;
  return v_row;
end;
$$;

revoke all on function public.admin_publication_outbox_replay_for_org(uuid, uuid, text) from public;
grant execute on function public.admin_publication_outbox_replay_for_org(uuid, uuid, text) to service_role;

commit;
