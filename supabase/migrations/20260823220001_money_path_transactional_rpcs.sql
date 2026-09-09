-- AUDIT H6 — Transactional operations for money/data-critical flows.
--
-- Provides atomic RPCs so route handlers stop performing multi-step
-- delete/insert cascades that can half-fail:
--
--   1. replace_ticket_revenue_allocations(event_id, allocations jsonb)
--      Replaces the settlement allocation set atomically (the old flow was
--      DELETE-then-INSERT across two round trips; an insert failure left the
--      event with zero allocations).
--
--   2. delete_tour_cascade(tour_id)
--      Deletes a tour together with its event links and legacy events rows in
--      one transaction (old flow: three sequential deletes).
--
-- Safety properties:
--   * SECURITY DEFINER with pinned search_path (repo standard).
--   * Idempotent-converging: safe to retry after interruption.
--   * Regclass-guarded: no-ops cleanly (raises typed exception) when the
--     quarantined-chain tables are absent in a given environment.
--   * Callers are expected to authorize BEFORE invoking (routes keep their
--     permission checks); these functions perform no privilege checks of
--     their own beyond requiring an authenticated caller.

begin;

-- ---------------------------------------------------------------------------
-- 1. Atomic replacement of ticket revenue allocations
-- ---------------------------------------------------------------------------
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
  v_inserted integer := 0;
  a jsonb;
begin
  if p_event_id is null then
    raise exception 'event_id_required';
  end if;

  if to_regclass('public.ticket_revenue_allocations') is null then
    raise exception 'ticket_revenue_allocations_table_missing';
  end if;

  -- Validate share sanity inside the transaction: percentage-type shares can
  -- never sum above 100. Flat/remainder types are not summed.
  if p_allocations is not null then
    if (
      select coalesce(sum((el->>'share_value')::numeric), 0)
      from jsonb_array_elements(p_allocations) el
      where coalesce(el->>'share_type', 'percentage') = 'percentage'
    ) > 100 then
      raise exception 'percentage_shares_exceed_100';
    end if;
  end if;

  delete from public.ticket_revenue_allocations
    where event_id = p_event_id;

  if p_allocations is not null and jsonb_array_length(p_allocations) > 0 then
    for a in select * from jsonb_array_elements(p_allocations) loop
      insert into public.ticket_revenue_allocations (
        event_id,
        beneficiary_type,
        beneficiary_id,
        share_type,
        share_value,
        priority,
        is_active
      ) values (
        p_event_id,
        a->>'beneficiary_type',
        nullif(a->>'beneficiary_id', '')::uuid,
        coalesce(a->>'share_type', 'percentage'),
        coalesce((a->>'share_value')::numeric, 0),
        coalesce((a->>'priority')::int, 100),
        coalesce((a->>'is_active')::boolean, true)
      );
      v_inserted := v_inserted + 1;
    end loop;
  end if;

  return v_inserted;
end;
$fn$;

grant execute on function public.replace_ticket_revenue_allocations(uuid, jsonb)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Atomic tour deletion cascade
-- ---------------------------------------------------------------------------
create or replace function public.delete_tour_cascade(
  p_tour_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_tour_id is null then
    raise exception 'tour_id_required';
  end if;
  if to_regclass('public.tours') is null then
    raise exception 'tours_table_missing';
  end if;

  if to_regclass('public.tour_events') is not null then
    delete from public.tour_events where tour_id = p_tour_id;
  end if;

  -- Legacy events table rows linked to the tour (canonical chain table).
  if to_regclass('public.events') is not null then
    delete from public.events where tour_id = p_tour_id;
  end if;

  delete from public.tours where id = p_tour_id;
  if not found then
    raise exception 'tour_not_found';
  end if;
end;
$fn$;

grant execute on function public.delete_tour_cascade(uuid)
  to authenticated, service_role;

commit;
