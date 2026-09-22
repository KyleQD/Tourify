-- PHASE 2 (SEC / ADM-M-003): profiles elevation guard.
--
-- The admin surface gate now derives access from org_members/organizations/
-- tour_team_members plus the platform-admin flags (profiles.is_admin,
-- profiles.role='admin'). Those flags are the only remaining privilege-bearing
-- profile columns, so this trigger blocks non-service principals from setting
-- or changing them. account_type is intentionally unrestricted: after the gate
-- rewrite it no longer carries privilege, and onboarding legitimately writes
-- it.
--
-- Additive + reversible: single trigger function + trigger; drop to revert
-- (restoring the pre-Phase-2 self-elevation exposure).

set client_min_messages = warning;

create or replace function public.guard_profile_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_principal text := coalesce(current_setting('role', true), '');
begin
  -- service_role / supabase_auth_admin / migrations owner manage privileges;
  -- everyone else may never set them.
  if v_principal in ('service_role', 'supabase_auth_admin', 'postgres') then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    if new.is_admin is true
       or new.role = 'admin'
       or new.admin_level is not null then
      raise exception 'self_elevation_blocked: privilege columns are managed by the platform'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.is_admin is distinct from old.is_admin
     or new.admin_level is distinct from old.admin_level
     or (new.role = 'admin' and old.role <> 'admin') then
    raise exception 'self_elevation_blocked: privilege columns are managed by the platform'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_privilege_guard on public.profiles;
create trigger profiles_privilege_guard
  before insert or update on public.profiles
  for each row
  execute function public.guard_profile_privilege_columns();

-- ROLLBACK NOTE
-- ------------
-- drop trigger if exists profiles_privilege_guard on public.profiles;
-- drop function if exists public.guard_profile_privilege_columns();
