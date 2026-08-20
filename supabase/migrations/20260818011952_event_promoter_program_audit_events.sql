-- Organizer Promoter Program controls (additive)
--
-- Writes remain server-only: the public RPC is SECURITY INVOKER with execute
-- revoked from client roles, and the route verifies organizer authority before
-- calling it through the allowlisted service-role job.

create table if not exists public.event_promotion_program_audit_events (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  event_id uuid not null references public.events_v2(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created', 'updated', 'financial_terms_versioned', 'status_changed')),
  previous_values jsonb not null default '{}'::jsonb,
  next_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists event_promotion_program_audit_events_program_created_idx
  on public.event_promotion_program_audit_events(program_id, created_at desc);

alter table public.event_promotion_ticket_eligibility
  add column if not exists retired_at timestamptz;

alter table public.event_promotion_program_audit_events enable row level security;
revoke all on public.event_promotion_program_audit_events from anon, authenticated;
grant select on public.event_promotion_program_audit_events to authenticated;

drop policy if exists promoter_program_audit_organizer_read on public.event_promotion_program_audit_events;
create policy promoter_program_audit_organizer_read on public.event_promotion_program_audit_events
  for select to authenticated using (private.can_manage_event_promoter_program(event_id));

drop policy if exists promoter_ticket_eligibility_public_read on public.event_promotion_ticket_eligibility;
drop policy if exists promoter_ticket_eligibility_organizer_read on public.event_promotion_ticket_eligibility;
create policy promoter_ticket_eligibility_public_read on public.event_promotion_ticket_eligibility
  for select to anon, authenticated
  using (
    retired_at is null
    and exists (
      select 1 from public.event_promotion_programs p
      where p.id = program_id and p.status = 'open'
        and (p.starts_at is null or p.starts_at <= now())
        and (p.ends_at is null or p.ends_at > now())
    )
  );
create policy promoter_ticket_eligibility_organizer_read on public.event_promotion_ticket_eligibility
  for select to authenticated
  using (exists (
    select 1 from public.event_promotion_programs p
    where p.id = program_id and private.can_manage_event_promoter_program(p.event_id)
  ));

create or replace function public.upsert_event_promoter_program(
  p_event_id uuid,
  p_actor_id uuid,
  p_existing_program_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_program public.event_promotion_programs%rowtype;
  v_before jsonb := '{}'::jsonb;
  v_after jsonb;
  v_existing_eligibility jsonb := '[]'::jsonb;
  v_new_eligibility jsonb := coalesce(p_payload->'eligible_ticket_types', '[]'::jsonb);
  v_financial_changed boolean := false;
  v_status_changed boolean := false;
  v_next_version integer;
  v_action text;
  v_ticket_id uuid;
begin
  if p_actor_id is null then
    raise exception 'actor is required' using errcode = '22023';
  end if;
  if jsonb_typeof(v_new_eligibility) <> 'array' or jsonb_array_length(v_new_eligibility) = 0 then
    raise exception 'at least one eligible ticket type is required' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(v_new_eligibility) item
    where not (item ? 'ticket_type_id')
      or not exists (
        select 1 from public.ticket_types tt
        where tt.id = (item->>'ticket_type_id')::uuid and tt.event_id = p_event_id
      )
  ) then
    raise exception 'every eligible ticket type must belong to this event' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_array_elements(v_new_eligibility))
      <> (select count(distinct item->>'ticket_type_id') from jsonb_array_elements(v_new_eligibility) item) then
    raise exception 'eligible ticket types must be unique' using errcode = '22023';
  end if;

  if p_existing_program_id is null then
    insert into public.event_promotion_programs (
      event_id, organizer_org_id, status, application_mode, commission_type,
      commission_rate_bps, commission_fixed_amount_minor, currency,
      attribution_window_days, starts_at, ends_at, promoter_cap,
      allow_promo_codes, allow_native_post_attribution, allow_external_links,
      terms_markdown, created_by, updated_at
    )
    select
      p_event_id, event.org_id, p_payload->>'status', p_payload->>'application_mode', p_payload->>'commission_type',
      nullif(p_payload->>'commission_rate_bps', '')::integer,
      nullif(p_payload->>'commission_fixed_amount_minor', '')::bigint,
      p_payload->>'currency', (p_payload->>'attribution_window_days')::integer,
      nullif(p_payload->>'starts_at', '')::timestamptz,
      nullif(p_payload->>'ends_at', '')::timestamptz,
      nullif(p_payload->>'promoter_cap', '')::integer,
      coalesce((p_payload->>'allow_promo_codes')::boolean, false),
      coalesce((p_payload->>'allow_native_post_attribution')::boolean, true),
      coalesce((p_payload->>'allow_external_links')::boolean, true),
      nullif(p_payload->>'terms_markdown', ''), p_actor_id, now()
    from public.events_v2 event
    where event.id = p_event_id
    returning * into v_program;
    if v_program.id is null then
      raise exception 'event not found' using errcode = 'P0002';
    end if;
    v_action := 'created';
    v_financial_changed := true;
    v_next_version := 1;
  else
    select * into v_program
    from public.event_promotion_programs
    where id = p_existing_program_id and event_id = p_event_id
    for update;
    if v_program.id is null then
      raise exception 'promoter program not found' using errcode = 'P0002';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'ticket_type_id', e.ticket_type_id,
      'commission_type_override', e.commission_type_override,
      'commission_rate_bps_override', e.commission_rate_bps_override,
      'commission_fixed_amount_minor_override', e.commission_fixed_amount_minor_override
    ) order by e.ticket_type_id), '[]'::jsonb)
    into v_existing_eligibility
    from public.event_promotion_ticket_eligibility e
    where e.program_id = v_program.id and e.retired_at is null;

    v_before := jsonb_build_object(
      'status', v_program.status,
      'application_mode', v_program.application_mode,
      'commission_type', v_program.commission_type,
      'commission_rate_bps', v_program.commission_rate_bps,
      'commission_fixed_amount_minor', v_program.commission_fixed_amount_minor,
      'currency', v_program.currency,
      'attribution_window_days', v_program.attribution_window_days,
      'starts_at', v_program.starts_at,
      'ends_at', v_program.ends_at,
      'promoter_cap', v_program.promoter_cap,
      'allow_promo_codes', v_program.allow_promo_codes,
      'allow_native_post_attribution', v_program.allow_native_post_attribution,
      'allow_external_links', v_program.allow_external_links,
      'terms_markdown', v_program.terms_markdown,
      'eligible_ticket_types', v_existing_eligibility
    );

    v_status_changed := v_program.status is distinct from p_payload->>'status';
    if v_status_changed and not (
      (v_program.status = 'draft' and p_payload->>'status' in ('scheduled', 'open', 'cancelled'))
      or (v_program.status = 'scheduled' and p_payload->>'status' in ('open', 'cancelled'))
      or (v_program.status = 'open' and p_payload->>'status' in ('paused', 'closed'))
      or (v_program.status = 'paused' and p_payload->>'status' in ('open', 'closed'))
    ) then
      raise exception 'invalid promoter program status transition: % -> %', v_program.status, p_payload->>'status'
        using errcode = '22023';
    end if;

    v_financial_changed :=
      v_program.commission_type is distinct from p_payload->>'commission_type'
      or v_program.commission_rate_bps is distinct from nullif(p_payload->>'commission_rate_bps', '')::integer
      or v_program.commission_fixed_amount_minor is distinct from nullif(p_payload->>'commission_fixed_amount_minor', '')::bigint
      or v_program.currency is distinct from p_payload->>'currency'
      or v_program.attribution_window_days is distinct from (p_payload->>'attribution_window_days')::integer
      or v_program.terms_markdown is distinct from nullif(p_payload->>'terms_markdown', '')
      or v_existing_eligibility is distinct from (
        select coalesce(jsonb_agg(jsonb_build_object(
          'ticket_type_id', item->>'ticket_type_id',
          'commission_type_override', nullif(item->>'commission_type_override', ''),
          'commission_rate_bps_override', nullif(item->>'commission_rate_bps', '')::integer,
          'commission_fixed_amount_minor_override', nullif(item->>'commission_fixed_amount_minor_override', '')::bigint
        ) order by item->>'ticket_type_id'), '[]'::jsonb)
        from jsonb_array_elements(v_new_eligibility) item
      );

    update public.event_promotion_programs
    set status = p_payload->>'status',
      application_mode = p_payload->>'application_mode',
      commission_type = p_payload->>'commission_type',
      commission_rate_bps = nullif(p_payload->>'commission_rate_bps', '')::integer,
      commission_fixed_amount_minor = nullif(p_payload->>'commission_fixed_amount_minor', '')::bigint,
      currency = p_payload->>'currency',
      attribution_window_days = (p_payload->>'attribution_window_days')::integer,
      starts_at = nullif(p_payload->>'starts_at', '')::timestamptz,
      ends_at = nullif(p_payload->>'ends_at', '')::timestamptz,
      promoter_cap = nullif(p_payload->>'promoter_cap', '')::integer,
      allow_promo_codes = coalesce((p_payload->>'allow_promo_codes')::boolean, false),
      allow_native_post_attribution = coalesce((p_payload->>'allow_native_post_attribution')::boolean, true),
      allow_external_links = coalesce((p_payload->>'allow_external_links')::boolean, true),
      terms_markdown = nullif(p_payload->>'terms_markdown', ''),
      updated_at = now()
    where id = v_program.id
    returning * into v_program;
    v_next_version := null;
    v_action := case when v_financial_changed then 'financial_terms_versioned'
      when v_status_changed then 'status_changed' else 'updated' end;
  end if;

  update public.event_promotion_ticket_eligibility current_eligibility
  set retired_at = now(), updated_at = now()
  where current_eligibility.program_id = v_program.id
    and current_eligibility.retired_at is null
    and not exists (
      select 1
      from jsonb_array_elements(v_new_eligibility) item
      where (item->>'ticket_type_id')::uuid = current_eligibility.ticket_type_id
    );
  -- migration-validation: scoped-insert-select promoter-program-eligibility-input
  insert into public.event_promotion_ticket_eligibility (
    program_id, ticket_type_id, commission_type_override,
    commission_rate_bps_override, commission_fixed_amount_minor_override, updated_at, retired_at
  )
  select
    v_program.id,
    (item->>'ticket_type_id')::uuid,
    nullif(item->>'commission_type_override', ''),
    nullif(item->>'commission_rate_bps_override', '')::integer,
    nullif(item->>'commission_fixed_amount_minor_override', '')::bigint,
    now(), null
  from jsonb_array_elements(v_new_eligibility) item
  on conflict (program_id, ticket_type_id) do update set
    commission_type_override = excluded.commission_type_override,
    commission_rate_bps_override = excluded.commission_rate_bps_override,
    commission_fixed_amount_minor_override = excluded.commission_fixed_amount_minor_override,
    updated_at = excluded.updated_at,
    retired_at = null;

  if v_financial_changed then
    if v_next_version is null then
      select coalesce(max(version_number), 0) + 1 into v_next_version
      from public.event_promotion_program_versions
      where program_id = v_program.id;
    end if;
    insert into public.event_promotion_program_versions (
      program_id, version_number, commission_type, commission_rate_bps,
      commission_fixed_amount_minor, currency, attribution_window_days,
      eligible_ticket_rules, terms_markdown, effective_at, created_by
    ) values (
      v_program.id, v_next_version, v_program.commission_type, v_program.commission_rate_bps,
      v_program.commission_fixed_amount_minor, v_program.currency, v_program.attribution_window_days,
      v_new_eligibility, v_program.terms_markdown, now(), p_actor_id
    );
  end if;

  v_after := jsonb_build_object(
    'status', v_program.status,
    'application_mode', v_program.application_mode,
    'commission_type', v_program.commission_type,
    'commission_rate_bps', v_program.commission_rate_bps,
    'commission_fixed_amount_minor', v_program.commission_fixed_amount_minor,
    'currency', v_program.currency,
    'attribution_window_days', v_program.attribution_window_days,
    'starts_at', v_program.starts_at,
    'ends_at', v_program.ends_at,
    'promoter_cap', v_program.promoter_cap,
    'allow_promo_codes', v_program.allow_promo_codes,
    'allow_native_post_attribution', v_program.allow_native_post_attribution,
    'allow_external_links', v_program.allow_external_links,
    'terms_markdown', v_program.terms_markdown,
    'eligible_ticket_types', v_new_eligibility
  );

  insert into public.event_promotion_program_audit_events (
    program_id, event_id, actor_user_id, action, previous_values, next_values
  ) values (v_program.id, p_event_id, p_actor_id, v_action, v_before, v_after);

  return jsonb_build_object(
    'program_id', v_program.id,
    'version_created', v_financial_changed,
    'version_number', v_next_version,
    'action', v_action
  );
end;
$$;

revoke all on function public.upsert_event_promoter_program(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_event_promoter_program(uuid, uuid, uuid, jsonb) to service_role;

comment on table public.event_promotion_program_audit_events is 'Append-only organizer audit evidence for promoter program configuration and financial term versions.';
