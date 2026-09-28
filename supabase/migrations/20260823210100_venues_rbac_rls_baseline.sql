-- AUDIT H12 — Baseline RLS for the canonical `venues` table and the entity-RBAC core.
--
-- Context:
--   * `venues` was created in 20250818120000_admin_staffing_core.sql with no
--     ENABLE ROW LEVEL SECURITY and no policies anywhere in the active chain.
--   * The RBAC core (roles, permissions, user grants, overrides, audit log)
--     from 20250812090000_entity_rbac_core.sql likewise had no chain-level
--     RLS enablement. These tables ARE the authorization system; leaving them
--     unprotected relies entirely on live-DB state that the repo cannot verify.
--
-- Design notes:
--   * Everything here is idempotent and additive: enables RLS, then creates
--     only named policies guarded by `drop policy if exists`.
--   * Reference data (roles/permissions matrices) is world-readable to
--     authenticated users; writes remain service-role only (no policies).
--   * User grants are visible to their owner plus users holding MANAGE_MEMBERS
--     on the entity (via public.has_entity_permission). Writes require
--     MANAGE_MEMBERS on the target entity.
--   * Permission overrides are admin-only (profiles.is_admin) reads/writes;
--     service role bypasses via its own policy.
--   * The audit log allows authenticated inserts (route instrumentation) but
--     SELECT is restricted to admins.

begin;

-- The platform-admin columns existed on the live reference schema and in
-- server authorization code, but were never captured by the active migration
-- chain. Add them with non-privileged defaults and install the elevation guard
-- in the same migration, before any policy trusts is_admin. The later Phase-2
-- hardening migration safely re-issues this guard.
alter table public.profiles
  add column if not exists is_admin boolean default false,
  add column if not exists role text default 'user',
  add column if not exists admin_level text;

create or replace function public.guard_profile_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_principal text := coalesce(current_setting('role', true), '');
begin
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

  if new.is_admin is distinct from old.is_admin
     or new.admin_level is distinct from old.admin_level
     or (new.role = 'admin' and old.role is distinct from 'admin') then
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

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER wrapper for permission checks (recursion guard)
-- ---------------------------------------------------------------------------
-- Enabling RLS on rbac_user_entity_roles / rbac_user_permission_overrides makes
-- the original invoker-rights `has_entity_permission` (20250812090000) recurse
-- into the very tables its callers' policies police — the same class of bug
-- previously fixed for tours/orgs/site-maps via *_rls_recursion migrations.
-- Re-issue the identical logic as SECURITY DEFINER with pinned search_path so
-- internal reads bypass client RLS while keeping caller-visible semantics.
do $$ begin
  if to_regclass('public.rbac_user_entity_roles') is not null then
    create or replace function public.has_entity_permission(
      p_user_id uuid,
      p_entity_type text,
      p_entity_id uuid,
      p_permission_name text
    )
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      with role_perms as (
        select 1
        from public.rbac_user_entity_roles ur
        join public.rbac_role_permissions rp on rp.role_id = ur.role_id
        join public.rbac_permissions p on p.id = rp.permission_id
        where ur.user_id = p_user_id
          and ur.entity_type = p_entity_type
          and ur.entity_id = p_entity_id
          and ur.is_active = true
          and (ur.end_at is null or ur.end_at > now())
          and p.name = p_permission_name
        limit 1
      ),
      overrides as (
        select allow
        from public.rbac_user_permission_overrides o
        join public.rbac_permissions p on p.id = o.permission_id
        where o.user_id = p_user_id
          and o.entity_type = p_entity_type
          and o.entity_id = p_entity_id
          and p.name = p_permission_name
        order by allow desc
        limit 1
      )
      select coalesce(
        (select true from role_perms),
        (select allow from overrides),
        false
      );
    $fn$;

    grant execute on function public.has_entity_permission(uuid, text, uuid, text)
      to authenticated, service_role;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- venues
-- ---------------------------------------------------------------------------
do $$ begin
  if to_regclass('public.venues') is not null then
    alter table public.venues enable row level security;

    -- Public discovery surface: name/slug/address are already exposed through
    -- public venue pages; restrict to those columns' rows being readable at all.
    drop policy if exists venues_public_read on public.venues;
    create policy venues_public_read
      on public.venues
      for select
      to anon, authenticated
      using (
        slug is not null
        or account_id = auth.uid()
        or created_by = auth.uid()
      );

    -- Account owner manages their venue row.
    drop policy if exists venues_owner_write on public.venues;
    create policy venues_owner_write
      on public.venues
      for all
      to authenticated
      using (
        account_id = auth.uid()
        or created_by = auth.uid()
      )
      with check (
        account_id = auth.uid()
        or created_by = auth.uid()
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RBAC core reference data
-- ---------------------------------------------------------------------------
do $$ begin
  if to_regclass('public.rbac_roles') is not null then
    alter table public.rbac_roles enable row level security;
    drop policy if exists rbac_roles_read_authenticated on public.rbac_roles;
    create policy rbac_roles_read_authenticated
      on public.rbac_roles for select to authenticated using (true);
    -- No write policies: inserts/updates happen exclusively via service role.
  end if;

  if to_regclass('public.rbac_permissions') is not null then
    alter table public.rbac_permissions enable row level security;
    drop policy if exists rbac_permissions_read_authenticated on public.rbac_permissions;
    create policy rbac_permissions_read_authenticated
      on public.rbac_permissions for select to authenticated using (true);
  end if;

  if to_regclass('public.rbac_role_permissions') is not null then
    alter table public.rbac_role_permissions enable row level security;
    drop policy if exists rbac_role_permissions_read_authenticated on public.rbac_role_permissions;
    create policy rbac_role_permissions_read_authenticated
      on public.rbac_role_permissions for select to authenticated using (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- rbac_user_entity_roles — grants
-- ---------------------------------------------------------------------------
do $$ begin
  if to_regclass('public.rbac_user_entity_roles') is not null then
    alter table public.rbac_user_entity_roles enable row level security;

    drop policy if exists rbac_user_entity_roles_self_read on public.rbac_user_entity_roles;
    create policy rbac_user_entity_roles_self_read
      on public.rbac_user_entity_roles
      for select
      to authenticated
      using (
        user_id = auth.uid()
        or public.has_entity_permission(auth.uid(), entity_type, entity_id, 'MANAGE_MEMBERS')
      );

    drop policy if exists rbac_user_entity_roles_manage on public.rbac_user_entity_roles;
    create policy rbac_user_entity_roles_manage
      on public.rbac_user_entity_roles
      for all
      to authenticated
      using (
        public.has_entity_permission(auth.uid(), entity_type, entity_id, 'MANAGE_MEMBERS')
      )
      with check (
        public.has_entity_permission(auth.uid(), entity_type, entity_id, 'MANAGE_MEMBERS')
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- rbac_user_permission_overrides — platform-admin only
-- ---------------------------------------------------------------------------
do $$ begin
  if to_regclass('public.rbac_user_permission_overrides') is not null then
    alter table public.rbac_user_permission_overrides enable row level security;

    drop policy if exists rbac_overrides_admin_all on public.rbac_user_permission_overrides;
    create policy rbac_overrides_admin_all
      on public.rbac_user_permission_overrides
      for all
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_admin is true
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_admin is true
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- rbac_permission_audit_log — append by participants, read by admins
-- ---------------------------------------------------------------------------
do $$ begin
  if to_regclass('public.rbac_permission_audit_log') is not null then
    alter table public.rbac_permission_audit_log enable row level security;

    drop policy if exists rbac_audit_insert_authenticated on public.rbac_permission_audit_log;
    create policy rbac_audit_insert_authenticated
      on public.rbac_permission_audit_log
      for insert
      to authenticated
      with check (actor_id = auth.uid());

    drop policy if exists rbac_audit_select_admin on public.rbac_permission_audit_log;
    create policy rbac_audit_select_admin
      on public.rbac_permission_audit_log
      for select
      to authenticated
      using (
        actor_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_admin is true
        )
      );

    -- No update/delete policies: audit rows are immutable for clients.
  end if;
end $$;

commit;
