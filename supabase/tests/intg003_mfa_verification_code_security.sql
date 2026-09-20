-- INTG-003 postflight: verification-code storage is service-only and RLS-protected.

do $$
declare
  v_function text;
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'mfa_verification_codes'
      and c.relkind = 'r'
      and c.relrowsecurity
  ) then
    raise exception 'INTG-003 security regression: mfa_verification_codes is missing or RLS is disabled';
  end if;

  if has_table_privilege('anon', 'public.mfa_verification_codes', 'SELECT')
     or has_table_privilege('authenticated', 'public.mfa_verification_codes', 'SELECT')
     or has_table_privilege('anon', 'public.mfa_verification_codes', 'INSERT')
     or has_table_privilege('authenticated', 'public.mfa_verification_codes', 'INSERT')
     or has_table_privilege('anon', 'public.mfa_verification_codes', 'UPDATE')
     or has_table_privilege('authenticated', 'public.mfa_verification_codes', 'UPDATE')
     or has_table_privilege('anon', 'public.mfa_verification_codes', 'DELETE')
     or has_table_privilege('authenticated', 'public.mfa_verification_codes', 'DELETE') then
    raise exception 'INTG-003 security regression: client roles can access mfa_verification_codes';
  end if;

  if not has_table_privilege('service_role', 'public.mfa_verification_codes', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'INTG-003 contract regression: service_role cannot manage mfa_verification_codes';
  end if;

  foreach v_function in array array[
    'public.issue_mfa_verification_code(text,uuid,text,text,timestamptz,timestamptz,integer,integer,integer)',
    'public.begin_mfa_verification_attempt(text,uuid,timestamptz)',
    'public.finish_mfa_verification_attempt(uuid,uuid,integer,boolean,timestamptz)',
    'public.revoke_mfa_verification_code(text,uuid,timestamptz)',
    'public.cleanup_expired_mfa_verification_codes(timestamptz,integer)'
  ] loop
    if has_function_privilege('anon', v_function, 'EXECUTE')
       or has_function_privilege('authenticated', v_function, 'EXECUTE') then
      raise exception 'INTG-003 security regression: client role can execute %', v_function;
    end if;

    if not has_function_privilege('service_role', v_function, 'EXECUTE') then
      raise exception 'INTG-003 contract regression: service_role cannot execute %', v_function;
    end if;
  end loop;
end
$$;
