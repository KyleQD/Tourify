begin;

do $$
declare
  request_policy record;
  message_read_policy record;
  message_insert_policy record;
begin
  if not exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'booking_requests'
      and relation.relrowsecurity
  ) then
    raise exception 'booking_requests must have RLS enabled';
  end if;

  if not exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'booking_request_messages'
      and relation.relrowsecurity
  ) then
    raise exception 'booking_request_messages must have RLS enabled';
  end if;

  if has_table_privilege('authenticated', 'public.booking_requests', 'insert')
    or has_table_privilege('authenticated', 'public.booking_requests', 'update')
    or has_table_privilege('authenticated', 'public.booking_requests', 'delete') then
    raise exception 'booking request lifecycle writes must remain server-mediated';
  end if;

  if has_table_privilege('authenticated', 'public.booking_request_messages', 'update')
    or has_table_privilege('authenticated', 'public.booking_request_messages', 'delete') then
    raise exception 'booking messages must be immutable to browser clients';
  end if;

  select * into request_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'booking_requests'
    and policyname = 'booking_requests_participants_read';

  if request_policy.qual is null
    or request_policy.qual not ilike '%artist_id%'
    or request_policy.qual not ilike '%requester_id%'
    or request_policy.qual not ilike '%auth.uid%' then
    raise exception 'booking request reads must be limited to the two participants';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_requests'
      and roles @> array['authenticated']::name[]
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) then
    raise exception 'booking request client mutation policy is exposed';
  end if;

  select * into message_read_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'booking_request_messages'
    and policyname = 'booking_request_messages_participants_read';

  select * into message_insert_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'booking_request_messages'
    and policyname = 'booking_request_messages_participants_insert';

  if message_read_policy.qual is null
    or message_read_policy.qual not ilike '%status%pending%'
    or message_read_policy.qual not ilike '%status%needs_info%'
    or message_read_policy.qual not ilike '%status%accepted%'
    or message_read_policy.qual not ilike '%artist_id%'
    or message_read_policy.qual not ilike '%requester_id%'
    or message_read_policy.qual not ilike '%auth.uid%' then
    raise exception 'booking message reads must require active request participants';
  end if;

  if message_insert_policy.with_check is null
    or message_insert_policy.with_check not ilike '%sender_id%'
    or message_insert_policy.with_check not ilike '%status%pending%'
    or message_insert_policy.with_check not ilike '%status%needs_info%'
    or message_insert_policy.with_check not ilike '%status%accepted%'
    or message_insert_policy.with_check not ilike '%artist_id%'
    or message_insert_policy.with_check not ilike '%requester_id%'
    or message_insert_policy.with_check not ilike '%auth.uid%' then
    raise exception 'booking message inserts must require an active request participant sender';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'booking_requests_artist_scope_status_idx'
  ) or not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'booking_requests_requester_scope_status_idx'
  ) or not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'booking_request_messages_request_created_idx'
  ) then
    raise exception 'booking manager indexes are incomplete';
  end if;
end;
$$;

rollback;
