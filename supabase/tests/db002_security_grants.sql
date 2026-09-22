-- DB-002 postflight: SECURITY DEFINER helpers must not be callable by anon.

do $$
declare
  v_function text;
  v_is_security_definer boolean;
  v_has_pinned_search_path boolean;
  v_public_execute boolean;
begin
  foreach v_function in array array[
    'public.can_view_hiring_pii(uuid,text,uuid)',
    'public.replace_ticket_revenue_allocations(uuid,jsonb)',
    'public.delete_tour_cascade(uuid)',
    'public.has_entity_permission(uuid,text,uuid,text)'
  ] loop
    select
      p.prosecdef,
      coalesce(p.proconfig @> array['search_path=public'], false),
      exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      )
    into
      v_is_security_definer,
      v_has_pinned_search_path,
      v_public_execute
    from pg_proc p
    where p.oid = v_function::regprocedure;

    if not v_is_security_definer then
      raise exception 'DB-002 security regression: % is not SECURITY DEFINER', v_function;
    end if;

    if not v_has_pinned_search_path then
      raise exception 'DB-002 security regression: % does not pin search_path=public', v_function;
    end if;

    if v_public_execute then
      raise exception 'DB-002 security regression: PUBLIC can execute %', v_function;
    end if;

    if has_function_privilege('anon', v_function, 'EXECUTE') then
      raise exception 'DB-002 security regression: anon can execute %', v_function;
    end if;

    if not has_function_privilege('authenticated', v_function, 'EXECUTE') then
      raise exception 'DB-002 authorization regression: authenticated cannot execute %', v_function;
    end if;

    if not has_function_privilege('service_role', v_function, 'EXECUTE') then
      raise exception 'DB-002 authorization regression: service_role cannot execute %', v_function;
    end if;
  end loop;
end
$$;
