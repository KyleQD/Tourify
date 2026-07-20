-- Fix broken triggers on artist_profiles that reference NEW.owner_user_id
-- (column does not exist on artist_profiles; inserts fail with 42703).
-- Drops any such mis-attached triggers so persona creation can succeed again.

set client_min_messages = warning;

do $$
declare
  r record;
begin
  for r in
    select t.tgname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    where n.nspname = 'public'
      and c.relname = 'artist_profiles'
      and not t.tgisinternal
      and pg_get_functiondef(p.oid) ilike '%owner_user_id%'
  loop
    execute format('drop trigger if exists %I on public.artist_profiles', r.tgname);
    raise notice 'Dropped broken artist_profiles trigger %', r.tgname;
  end loop;
end;
$$;
