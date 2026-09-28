-- Minimal Supabase-shaped bootstrap for the db011 local emulation.
--
-- This is NOT Supabase and NOT a hosted target. It creates only what the
-- marketplace core migration and the new DB-011 migrations actually resolve
-- against: the auth schema with auth.users and auth.uid(), and the three roles
-- RLS is written against. Anything else the chain needs is out of scope for
-- these three migrations, and the harness asserts that assertion rather than
-- assuming it.
create schema if not exists auth;

do $$
begin
  if to_regclass('auth.users') is null then
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text
    );
  end if;
  if to_regprocedure('auth.uid()') is null then
    create function auth.uid() returns uuid
    language sql stable
    as $fn$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $fn$;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
end $$;

grant usage on schema public to anon, authenticated;
