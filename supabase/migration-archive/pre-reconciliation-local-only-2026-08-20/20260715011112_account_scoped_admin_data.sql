-- Account-scoped admin data support.
-- Add only nullable operational org scope columns; do not change account,
-- roster, manager, or relationship tables.

alter table if exists public.logistics_tasks
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table if exists public.staff_members
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

alter table if exists public.staff_shifts
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

do $$
begin
  if to_regclass('public.logistics_tasks') is not null
     and to_regclass('public.events_v2') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'logistics_tasks' and column_name = 'event_id'
     ) then
    update public.logistics_tasks lt
    set org_id = e.org_id
    from public.events_v2 e
    where lt.org_id is null
      and lt.event_id = e.id
      and e.org_id is not null;
  end if;

  if to_regclass('public.logistics_tasks') is not null
     and to_regclass('public.tours') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'logistics_tasks' and column_name = 'tour_id'
     ) then
    update public.logistics_tasks lt
    set org_id = t.org_id
    from public.tours t
    where lt.org_id is null
      and lt.tour_id = t.id
      and t.org_id is not null;
  end if;

  if to_regclass('public.staff_members') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'staff_members' and column_name = 'entity_type'
     )
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'staff_members' and column_name = 'entity_id'
     ) then
    update public.staff_members sm
    set org_id = sm.entity_id
    where sm.org_id is null
      and sm.entity_type = 'org'
      and exists (
        select 1
        from public.organizations o
        where o.id = sm.entity_id
      );

    if to_regclass('public.events_v2') is not null then
      update public.staff_members sm
      set org_id = e.org_id
      from public.events_v2 e
      where sm.org_id is null
        and sm.entity_type = 'event'
        and sm.entity_id = e.id
        and e.org_id is not null;
    end if;
  end if;

  if to_regclass('public.staff_shifts') is not null
     and to_regclass('public.events_v2') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'staff_shifts' and column_name = 'event_id'
     ) then
    update public.staff_shifts ss
    set org_id = e.org_id
    from public.events_v2 e
    where ss.org_id is null
      and ss.event_id = e.id
      and e.org_id is not null;
  end if;
end $$;

do $$
begin
  if to_regclass('public.logistics_tasks') is not null then
    create index if not exists logistics_tasks_org_idx
      on public.logistics_tasks(org_id)
      where org_id is not null;
  end if;

  if to_regclass('public.staff_members') is not null then
    create index if not exists staff_members_org_idx
      on public.staff_members(org_id)
      where org_id is not null;
  end if;

  if to_regclass('public.staff_shifts') is not null then
    create index if not exists staff_shifts_org_idx
      on public.staff_shifts(org_id)
      where org_id is not null;
  end if;
end $$;

do $$
begin
  if to_regclass('public.logistics_tasks') is not null then
    alter table public.logistics_tasks enable row level security;

    drop policy if exists "log_tasks_read_all_auth" on public.logistics_tasks;
    drop policy if exists "log_tasks_write_creator_or_admin" on public.logistics_tasks;
    drop policy if exists logistics_tasks_select_account_scope on public.logistics_tasks;
    drop policy if exists logistics_tasks_insert_account_scope on public.logistics_tasks;
    drop policy if exists logistics_tasks_update_account_scope on public.logistics_tasks;
    drop policy if exists logistics_tasks_delete_account_scope on public.logistics_tasks;

    create policy logistics_tasks_select_account_scope on public.logistics_tasks
      for select
      using (
        (org_id is not null and public.is_org_member(auth.uid(), org_id))
        or (org_id is null and created_by = auth.uid())
      );

    create policy logistics_tasks_insert_account_scope on public.logistics_tasks
      for insert
      with check (
        (org_id is not null and public.has_perm(auth.uid(), org_id, 'event.manage'))
        or (org_id is null and created_by = auth.uid())
      );

    create policy logistics_tasks_update_account_scope on public.logistics_tasks
      for update
      using (
        (org_id is not null and public.has_perm(auth.uid(), org_id, 'event.manage'))
        or (org_id is null and created_by = auth.uid())
      )
      with check (
        (org_id is not null and public.has_perm(auth.uid(), org_id, 'event.manage'))
        or (org_id is null and created_by = auth.uid())
      );

    create policy logistics_tasks_delete_account_scope on public.logistics_tasks
      for delete
      using (
        (org_id is not null and public.has_perm(auth.uid(), org_id, 'event.manage'))
        or (org_id is null and created_by = auth.uid())
      );
  end if;
end $$;
