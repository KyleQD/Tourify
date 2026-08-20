-- Phase 4: promoter-owned assets resolve through existing Ticketing, post, and
-- share records. Browser clients never write attribution evidence directly.

create table if not exists public.promoter_promo_code_bindings (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  membership_id uuid not null references public.event_promoter_memberships(id) on delete restrict,
  event_id uuid not null references public.events_v2(id) on delete restrict,
  promo_code_id uuid not null references public.promo_codes(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (promo_code_id),
  unique (membership_id, promo_code_id)
);

create table if not exists public.promoter_social_sources (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  membership_id uuid not null references public.event_promoter_memberships(id) on delete restrict,
  event_id uuid not null references public.events_v2(id) on delete restrict,
  source_type text not null check (source_type in ('tourify_post', 'tourify_share')),
  source_id uuid not null,
  originating_source_id uuid,
  tracking_link_id uuid references public.promoter_tracking_links(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists promoter_promo_code_bindings_membership_idx
  on public.promoter_promo_code_bindings (membership_id, status, created_at desc);
create index if not exists promoter_promo_code_bindings_event_idx
  on public.promoter_promo_code_bindings (event_id, promo_code_id)
  where status = 'active';
create index if not exists promoter_social_sources_membership_idx
  on public.promoter_social_sources (membership_id, source_type, created_at desc);
create index if not exists promoter_social_sources_event_source_idx
  on public.promoter_social_sources (event_id, source_type, source_id);

alter table public.promoter_promo_code_bindings enable row level security;
alter table public.promoter_social_sources enable row level security;

revoke all on table public.promoter_promo_code_bindings from anon, authenticated;
revoke all on table public.promoter_social_sources from anon, authenticated;
grant select on table public.promoter_promo_code_bindings to authenticated;
grant select on table public.promoter_social_sources to authenticated;

drop policy if exists promoter_promo_code_bindings_member_select on public.promoter_promo_code_bindings;
create policy promoter_promo_code_bindings_member_select
  on public.promoter_promo_code_bindings for select to authenticated
  using (
    exists (
      select 1 from public.event_promoter_memberships membership
      where membership.id = promoter_promo_code_bindings.membership_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists promoter_social_sources_member_select on public.promoter_social_sources;
create policy promoter_social_sources_member_select
  on public.promoter_social_sources for select to authenticated
  using (
    exists (
      select 1 from public.event_promoter_memberships membership
      where membership.id = promoter_social_sources.membership_id
        and membership.user_id = auth.uid()
    )
  );

create or replace function public.create_event_promoter_tracking_link(
  p_actor_id uuid,
  p_membership_id uuid,
  p_token_hash text,
  p_label text default null,
  p_destination_path text default '/tickets/purchase',
  p_expires_at timestamptz default null,
  p_channel text default 'external'
)
returns table (
  id uuid,
  program_id uuid,
  event_id uuid,
  destination_path text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_program_id uuid;
  v_event_id uuid;
  v_membership_user_id uuid;
  v_membership_status text;
  v_program_status text;
  v_allow_external_links boolean;
  v_allow_native_post_attribution boolean;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'tracking token hash is invalid' using errcode = '22023';
  end if;
  if p_destination_path !~ '^/[^\\\\]*$' or p_destination_path like '//%' then
    raise exception 'tracking destination must be a safe relative path' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'tracking link expiry must be in the future' using errcode = '22023';
  end if;
  if p_channel not in ('external', 'native_post') then
    raise exception 'tracking link channel is invalid' using errcode = '22023';
  end if;

  select membership.program_id, membership.user_id, membership.status,
    program.event_id, program.status, program.allow_external_links, program.allow_native_post_attribution
  into v_program_id, v_membership_user_id, v_membership_status,
    v_event_id, v_program_status, v_allow_external_links, v_allow_native_post_attribution
  from public.event_promoter_memberships membership
  join public.event_promotion_programs program on program.id = membership.program_id
  where membership.id = p_membership_id
  for update of membership;

  if not found then
    raise exception 'promoter membership not found' using errcode = 'P0002';
  end if;
  if v_membership_user_id <> p_actor_id then
    raise exception 'tracking links can only be created by the approved promoter' using errcode = '42501';
  end if;
  if v_membership_status <> 'approved' or v_program_status <> 'open'
    or (p_channel = 'external' and not v_allow_external_links)
    or (p_channel = 'native_post' and not v_allow_native_post_attribution) then
    raise exception 'promoter tracking links are not available for this membership' using errcode = '42501';
  end if;

  return query
  insert into public.promoter_tracking_links (
    membership_id, program_id, event_id, token_hash, label, destination_path, expires_at
  ) values (
    p_membership_id, v_program_id, v_event_id, p_token_hash, nullif(trim(p_label), ''), p_destination_path, p_expires_at
  )
  returning promoter_tracking_links.id, promoter_tracking_links.program_id,
    promoter_tracking_links.event_id, promoter_tracking_links.destination_path,
    promoter_tracking_links.expires_at, promoter_tracking_links.created_at;
end;
$$;

create or replace function public.bind_event_promoter_promo_code(
  p_actor_id uuid,
  p_membership_id uuid,
  p_promo_code_id uuid
)
returns table (
  id uuid,
  program_id uuid,
  membership_id uuid,
  event_id uuid,
  promo_code_id uuid,
  status text,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_program_id uuid;
  v_event_id uuid;
  v_membership_user_id uuid;
  v_membership_status text;
  v_program_status text;
  v_allow_promo_codes boolean;
  v_promo_event_id uuid;
begin
  select membership.program_id, membership.user_id, membership.status,
    program.event_id, program.status, program.allow_promo_codes
  into v_program_id, v_membership_user_id, v_membership_status,
    v_event_id, v_program_status, v_allow_promo_codes
  from public.event_promoter_memberships membership
  join public.event_promotion_programs program on program.id = membership.program_id
  where membership.id = p_membership_id
  for update of membership;

  if not found then
    raise exception 'promoter membership not found' using errcode = 'P0002';
  end if;
  if v_membership_user_id <> p_actor_id then
    raise exception 'promo codes can only be bound by the approved promoter' using errcode = '42501';
  end if;
  if v_membership_status <> 'approved' or v_program_status <> 'open' or not v_allow_promo_codes then
    raise exception 'promo codes are not available for this membership' using errcode = '42501';
  end if;

  select event_id into v_promo_event_id
  from public.promo_codes
  where id = p_promo_code_id and is_active = true;
  if v_promo_event_id is null or v_promo_event_id <> v_event_id then
    raise exception 'promo code must be active and belong to this event' using errcode = '22023';
  end if;

  return query
  insert into public.promoter_promo_code_bindings (
    program_id, membership_id, event_id, promo_code_id, created_by
  ) values (
    v_program_id, p_membership_id, v_event_id, p_promo_code_id, p_actor_id
  )
  on conflict (promo_code_id) do update
    set status = 'active', revoked_at = null, updated_at = now()
  where promoter_promo_code_bindings.membership_id = excluded.membership_id
  returning promoter_promo_code_bindings.id, promoter_promo_code_bindings.program_id,
    promoter_promo_code_bindings.membership_id, promoter_promo_code_bindings.event_id,
    promoter_promo_code_bindings.promo_code_id, promoter_promo_code_bindings.status,
    promoter_promo_code_bindings.created_at;

  if not found then
    raise exception 'promo code is already bound to another promoter' using errcode = '23505';
  end if;
end;
$$;

create or replace function public.bind_event_promoter_social_source(
  p_actor_id uuid,
  p_membership_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_originating_source_id uuid default null,
  p_tracking_link_id uuid default null
)
returns table (
  id uuid,
  program_id uuid,
  membership_id uuid,
  event_id uuid,
  source_type text,
  source_id uuid,
  originating_source_id uuid,
  tracking_link_id uuid,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_program_id uuid;
  v_event_id uuid;
  v_membership_user_id uuid;
  v_membership_status text;
  v_program_status text;
  v_allow_native_post_attribution boolean;
  v_tracking_link_membership_id uuid;
begin
  if p_source_type not in ('tourify_post', 'tourify_share') then
    raise exception 'unsupported promoter social source' using errcode = '22023';
  end if;

  select membership.program_id, membership.user_id, membership.status,
    program.event_id, program.status, program.allow_native_post_attribution
  into v_program_id, v_membership_user_id, v_membership_status,
    v_event_id, v_program_status, v_allow_native_post_attribution
  from public.event_promoter_memberships membership
  join public.event_promotion_programs program on program.id = membership.program_id
  where membership.id = p_membership_id
  for update of membership;

  if not found then
    raise exception 'promoter membership not found' using errcode = 'P0002';
  end if;
  if v_membership_user_id <> p_actor_id then
    raise exception 'social sources can only be bound by the approved promoter' using errcode = '42501';
  end if;
  if v_membership_status <> 'approved' or v_program_status <> 'open' or not v_allow_native_post_attribution then
    raise exception 'native post attribution is not available for this membership' using errcode = '42501';
  end if;

  if p_tracking_link_id is not null then
    select membership_id into v_tracking_link_membership_id
    from public.promoter_tracking_links
    where id = p_tracking_link_id and status = 'active';
    if v_tracking_link_membership_id is distinct from p_membership_id then
      raise exception 'tracking link must belong to this promoter membership' using errcode = '22023';
    end if;
  end if;

  return query
  insert into public.promoter_social_sources (
    program_id, membership_id, event_id, source_type, source_id, originating_source_id, tracking_link_id, created_by
  ) values (
    v_program_id, p_membership_id, v_event_id, p_source_type, p_source_id, p_originating_source_id, p_tracking_link_id, p_actor_id
  )
  on conflict (source_type, source_id) do nothing
  returning promoter_social_sources.id, promoter_social_sources.program_id,
    promoter_social_sources.membership_id, promoter_social_sources.event_id,
    promoter_social_sources.source_type, promoter_social_sources.source_id,
    promoter_social_sources.originating_source_id, promoter_social_sources.tracking_link_id,
    promoter_social_sources.created_at;

  if not found then
    raise exception 'social source is already bound to a promoter' using errcode = '23505';
  end if;
end;
$$;

create or replace function public.resolve_event_promoter_tracking_link(
  p_token_hash text,
  p_anonymous_session_id text default null,
  p_buyer_user_id uuid default null,
  p_ip_hash text default null
)
returns table (
  destination_path text,
  event_id uuid,
  program_id uuid,
  membership_id uuid,
  touchpoint_id uuid,
  recorded boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_link record;
  v_touchpoint_id uuid;
  v_should_record boolean := true;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  select link.id, link.destination_path, link.event_id, link.program_id, link.membership_id,
    program.attribution_window_days
  into v_link
  from public.promoter_tracking_links link
  join public.event_promoter_memberships membership on membership.id = link.membership_id
  join public.event_promotion_programs program on program.id = link.program_id
  where link.token_hash = p_token_hash
    and link.status = 'active'
    and (link.expires_at is null or link.expires_at > now())
    and membership.status = 'approved'
    and program.status = 'open';
  if not found then
    return;
  end if;

  if p_anonymous_session_id is not null and exists (
    select 1
    from public.promoter_attribution_touchpoints touchpoint
    where touchpoint.source_type = 'tracking_link'
      and touchpoint.source_id = v_link.id
      and touchpoint.anonymous_session_id = p_anonymous_session_id
      and touchpoint.occurred_at > now() - interval '30 seconds'
  ) then
    v_should_record := false;
  end if;

  if v_should_record then
    insert into public.promoter_attribution_touchpoints (
      program_id, membership_id, event_id, source_type, source_id,
      anonymous_session_id, buyer_user_id, expires_at, metadata
    ) values (
      v_link.program_id, v_link.membership_id, v_link.event_id, 'tracking_link', v_link.id,
      nullif(trim(p_anonymous_session_id), ''), p_buyer_user_id,
      now() + make_interval(days => v_link.attribution_window_days),
      jsonb_strip_nulls(jsonb_build_object('ip_hash', nullif(trim(p_ip_hash), ''), 'channel', 'external_link'))
    ) returning id into v_touchpoint_id;
  end if;

  return query select v_link.destination_path, v_link.event_id, v_link.program_id,
    v_link.membership_id, v_touchpoint_id, v_should_record;
end;
$$;

revoke all on function public.create_event_promoter_tracking_link(uuid, uuid, text, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.bind_event_promoter_promo_code(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.bind_event_promoter_social_source(uuid, uuid, text, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.resolve_event_promoter_tracking_link(text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_event_promoter_tracking_link(uuid, uuid, text, text, text, timestamptz, text) to service_role;
grant execute on function public.bind_event_promoter_promo_code(uuid, uuid, uuid) to service_role;
grant execute on function public.bind_event_promoter_social_source(uuid, uuid, text, uuid, uuid, uuid) to service_role;
grant execute on function public.resolve_event_promoter_tracking_link(text, text, uuid, text) to service_role;
