-- Minimal Supabase-shaped bootstrap for the db011 money-path emulation.
--
-- This is NOT Supabase and NOT a hosted target. It creates only what
-- 20260926140100_marketplace_money_path_tables.sql actually resolves against:
--
--   auth.users                       the FK target of marketplace_fee_rules.created_by
--   auth.uid()                       the identity the admin gate compares to
--   public.profiles                  the gate reads profiles.role = 'admin'
--   public.marketplace_touch_updated_at()   the BEFORE UPDATE trigger function
--   anon / authenticated / service_role     the three RLS roles
--
-- `public.marketplace_touch_updated_at()` is copied from the ACTIVE CHAIN
-- (20260410120000_marketplace_core.sql:210-213) rather than invented, because a
-- different trigger body would make the harness prove something the deployment
-- does not do. The harness asserts the function exists before applying the
-- migration, so a fixture that failed to build is a failure and not a pass.
--
-- `service_role` carries BYPASSRLS, as in a real Supabase project. The harness
-- never uses it to assert a pass; it exists so the "only a role that bypasses
-- RLS can reach marketplace_payment_events" claim is a statement about a real
-- capability rather than about an empty role list.
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
  if to_regclass('public.profiles') is null then
    create table public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      full_name text,
      username text,
      role text
    );
  end if;
  if to_regprocedure('public.marketplace_touch_updated_at()') is null then
    -- verbatim from 20260410120000_marketplace_core.sql
    create or replace function public.marketplace_touch_updated_at()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at := now();
      return new;
    end;
    $fn$;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant select on public.profiles to anon, authenticated, service_role;

-- Two fixture identities: one ordinary user and one admin. The harness promotes
-- the first to admin mid-run so the "non-admin is denied, admin is allowed"
-- pair is measured on the SAME row rather than on two different fixtures.
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'member@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'shopper@example.test')
on conflict do nothing;

insert into public.profiles (id, full_name, username, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Member', 'member', 'user'),
  ('22222222-2222-2222-2222-222222222222', 'Shopper', 'shopper', 'user')
on conflict do nothing;
