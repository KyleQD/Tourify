-- admin_tour_collaboration_security applied via adaptive execute_sql chunks.
select to_regprocedure('public.has_admin_logistics_scope(uuid,uuid,text)') is not null as logistics_scope_ready,
       to_regprocedure('public.reserve_admin_logistics_equipment(uuid,uuid,uuid,timestamptz,timestamptz,integer,uuid)') is not null as reserve_ready;;
