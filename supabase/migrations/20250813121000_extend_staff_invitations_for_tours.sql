set client_min_messages = warning;

-- Extend staff_invitations to support tour-scoped invites and roles.
-- Table may be created later by 20250813123000_create_staff_invitations_if_missing.sql — skip if absent.

do $body$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'staff_invitations'
  ) then
    return;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_invitations' and column_name = 'tour_id'
  ) then
    alter table public.staff_invitations add column tour_id uuid;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_invitations' and column_name = 'role'
  ) then
    alter table public.staff_invitations add column role text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_invitations' and column_name = 'origin'
  ) then
    alter table public.staff_invitations add column origin text default 'tour';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_invitations' and column_name = 'created_by'
  ) then
    alter table public.staff_invitations add column created_by uuid;
  end if;
end $body$;

do $body$
begin
  if to_regclass('public.staff_invitations') is null then
    return;
  end if;
  execute 'create index if not exists idx_staff_invitations_tour on public.staff_invitations(tour_id)';
  execute 'create index if not exists idx_staff_invitations_role on public.staff_invitations(role)';
end $body$;
