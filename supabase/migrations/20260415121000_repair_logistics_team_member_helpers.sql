set client_min_messages = warning;

-- Idempotent repair: tour_team_members shape differs between tours_core (no tour_id
-- on members, no is_active) and tour_teams migrations. Ensures helpers match DBs that
-- already recorded 20260413220500 before the join/column fixes.

do $body$
begin
  if to_regclass('public.tour_team_members') is not null
    and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'tour_team_members'
        and column_name = 'is_active'
    )
  then
    alter table public.tour_team_members add column is_active boolean default true;
  end if;
end;
$body$;

CREATE OR REPLACE FUNCTION public.is_event_team_member(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tour_team_members ttm
    INNER JOIN tour_teams tt ON tt.id = ttm.team_id
    INNER JOIN tour_events te ON te.tour_id = tt.tour_id
    WHERE te.event_id = p_event_id
      AND ttm.user_id = auth.uid()
      AND coalesce(ttm.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tour_team_member(p_tour_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tour_team_members ttm
    INNER JOIN tour_teams tt ON tt.id = ttm.team_id
    WHERE tt.tour_id = p_tour_id
      AND ttm.user_id = auth.uid()
      AND coalesce(ttm.is_active, true) = true
  );
$$;
