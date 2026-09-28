set client_min_messages = warning;

-- The quick-start transaction performs its own target-aware authorization.
-- Move the implementation out of the exposed schema so it can create the
-- event and tour assignment atomically without being rejected between those
-- two writes by the existing events_v2 INSERT policy.
do $$
begin
  if to_regprocedure('private.create_tour_quick_start_events(uuid,integer,uuid)') is null then
    alter function public.create_tour_quick_start_events(uuid, integer, uuid)
      set schema private;
  end if;
end;
$$;

alter function private.create_tour_quick_start_events(uuid, integer, uuid)
  security definer;
alter function private.create_tour_quick_start_events(uuid, integer, uuid)
  set search_path = pg_catalog, public;

revoke all on function private.create_tour_quick_start_events(uuid, integer, uuid)
  from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.create_tour_quick_start_events(uuid, integer, uuid)
  to authenticated;

-- Preserve the existing Data API signature with a security-invoker wrapper.
create or replace function public.create_tour_quick_start_events(
  p_tour_id uuid,
  p_count integer,
  p_batch_id uuid
)
returns table (
  event_id uuid,
  label text,
  ordinal integer,
  created boolean
)
language sql
security invoker
set search_path = pg_catalog
as $$
  select *
  from private.create_tour_quick_start_events(p_tour_id, p_count, p_batch_id);
$$;

revoke all on function public.create_tour_quick_start_events(uuid, integer, uuid)
  from public, anon;
grant execute on function public.create_tour_quick_start_events(uuid, integer, uuid)
  to authenticated;
