-- admin_ticketing_security applied via execute_sql chunks (RLS policies + RPCs).
-- Marker only; schema objects already created.
select to_regprocedure('public.get_admin_ticketing_overview(uuid,uuid)') is not null as ticketing_overview_ready;;
