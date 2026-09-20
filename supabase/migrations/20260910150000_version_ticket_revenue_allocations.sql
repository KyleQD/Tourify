-- TICKET-002 — preserve settlement allocation revisions before finance handoff.
--
-- Keep the existing table and RPC contract. Active rows are the current
-- revision; prior rows remain queryable as history and are only retired via
-- the existing is_active lifecycle marker. Identical retries are no-ops.

create or replace function public.replace_ticket_revenue_allocations(
  p_event_id uuid,
  p_allocations jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_requested jsonb := coalesce(p_allocations, '[]'::jsonb);
  v_active_count integer := 0;
  v_match_count integer := 0;
  a jsonb;
begin
  if p_event_id is null then
    raise exception 'event_id_required';
  end if;

  if to_regclass('public.ticket_revenue_allocations') is null then
    raise exception 'ticket_revenue_allocations_table_missing';
  end if;

  if (
    select coalesce(sum((el->>'share_value')::numeric), 0)
    from jsonb_array_elements(v_requested) el
    where coalesce(el->>'share_type', 'percentage') = 'percentage'
  ) > 100 then
    raise exception 'percentage_shares_exceed_100';
  end if;

  -- Serialize revisions for an event, including the empty-set case.
  perform 1 from public.events_v2 where id = p_event_id for update;

  select count(*)::integer into v_active_count
  from public.ticket_revenue_allocations
  where event_id = p_event_id and is_active;

  select count(*)::integer into v_match_count
  from public.ticket_revenue_allocations current_row
  join lateral jsonb_array_elements(v_requested) requested_row on true
  where current_row.event_id = p_event_id
    and current_row.is_active
    and current_row.beneficiary_type = requested_row->>'beneficiary_type'
    and current_row.beneficiary_id is not distinct from nullif(requested_row->>'beneficiary_id', '')::uuid
    and current_row.share_type = coalesce(requested_row->>'share_type', 'percentage')
    and current_row.share_value = coalesce((requested_row->>'share_value')::numeric, 0)
    and current_row.priority = coalesce((requested_row->>'priority')::integer, 100)
    and current_row.is_active = coalesce((requested_row->>'is_active')::boolean, true);

  if v_active_count = jsonb_array_length(v_requested) and v_match_count = v_active_count then
    return v_active_count;
  end if;

  update public.ticket_revenue_allocations
  set is_active = false, updated_at = now()
  where event_id = p_event_id and is_active;

  for a in select * from jsonb_array_elements(v_requested) loop
    insert into public.ticket_revenue_allocations (
      event_id, beneficiary_type, beneficiary_id, share_type,
      share_value, priority, is_active
    ) values (
      p_event_id,
      a->>'beneficiary_type',
      nullif(a->>'beneficiary_id', '')::uuid,
      coalesce(a->>'share_type', 'percentage'),
      coalesce((a->>'share_value')::numeric, 0),
      coalesce((a->>'priority')::integer, 100),
      coalesce((a->>'is_active')::boolean, true)
    );
  end loop;

  return jsonb_array_length(v_requested);
end;
$fn$;

grant execute on function public.replace_ticket_revenue_allocations(uuid, jsonb)
  to authenticated, service_role;
