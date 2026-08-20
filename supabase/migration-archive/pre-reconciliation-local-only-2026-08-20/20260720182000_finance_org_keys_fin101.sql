-- FIN-101: Validated organization scope for finance/budget/settlement tables.
-- Expand-only. Never invent org_id — inherit from parents; quarantine unresolved.
-- Reuses admin_tenant_key_quarantine from SEC-105.

-- ---------------------------------------------------------------------------
-- 1) Ensure org_id columns + FK where missing
-- ---------------------------------------------------------------------------
alter table if exists public.budgets
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

alter table if exists public.financial_audit_log
  add column if not exists org_id uuid references public.organizations (id) on delete set null;

-- settlements.org_id may pre-exist without FK
do $$
begin
  if to_regclass('public.settlements') is not null then
    if not exists (
      select 1 from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'settlements'
        and constraint_name = 'settlements_org_id_fkey'
    ) then
      begin
        alter table public.settlements
          add constraint settlements_org_id_fkey
          foreign key (org_id) references public.organizations (id) on delete cascade;
      exception when others then
        -- Leave without FK if orphan rows block it; quarantine handles them.
        null;
      end;
    end if;
  end if;
end $$;

-- Optional legacy child (archive-era); add org_id if present
alter table if exists public.event_expenses
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 2) Backfill from parents (never invent)
-- ---------------------------------------------------------------------------
do $$
begin
  -- budgets: event → tour
  if to_regclass('public.budgets') is not null then
    if to_regclass('public.events_v2') is not null then
      update public.budgets b
      set org_id = e.org_id
      from public.events_v2 e
      where b.org_id is null
        and b.event_id = e.id
        and e.org_id is not null;
    end if;
    if to_regclass('public.tours') is not null then
      update public.budgets b
      set org_id = t.org_id
      from public.tours t
      where b.org_id is null
        and b.tour_id = t.id
        and t.org_id is not null;
    end if;
  end if;

  -- financial_audit_log ← financial_transactions
  if to_regclass('public.financial_audit_log') is not null
     and to_regclass('public.financial_transactions') is not null then
    update public.financial_audit_log a
    set org_id = ft.org_id
    from public.financial_transactions ft
    where a.org_id is null
      and a.transaction_id = ft.id
      and ft.org_id is not null;
  end if;

  -- event_expenses ← events_v2
  if to_regclass('public.event_expenses') is not null
     and to_regclass('public.events_v2') is not null then
    update public.event_expenses x
    set org_id = e.org_id
    from public.events_v2 e
    where x.org_id is null
      and x.event_id = e.id
      and e.org_id is not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Quarantine unresolved / orphan / parent-mismatch rows
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  orphan_tables text[] := array[
    'financial_transactions',
    'budgets',
    'settlements',
    'financial_audit_log',
    'event_expenses'
  ];
begin
  -- Null org after backfill
  if to_regclass('public.budgets') is not null then
    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'budgets', b.id, 'unresolvable_org_id_after_parent_backfill'
    from public.budgets b
    where b.org_id is null
    on conflict (table_name, record_id) do nothing;
  end if;

  if to_regclass('public.financial_audit_log') is not null then
    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'financial_audit_log', a.id, 'unresolvable_org_id_after_parent_backfill'
    from public.financial_audit_log a
    where a.org_id is null
    on conflict (table_name, record_id) do nothing;
  end if;

  if to_regclass('public.event_expenses') is not null then
    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'event_expenses', x.id, 'unresolvable_org_id_after_parent_backfill'
    from public.event_expenses x
    where x.org_id is null
    on conflict (table_name, record_id) do nothing;
  end if;

  -- Orphan organization references
  foreach t in array orphan_tables
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format(
      $sql$
        insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
        select %L, r.id, 'org_id_missing_organization_row'
        from public.%I r
        where r.org_id is not null
          and not exists (select 1 from public.organizations o where o.id = r.org_id)
        on conflict (table_name, record_id) do nothing
      $sql$,
      t,
      t
    );
  end loop;

  -- Parent org mismatch: event_id / tour_id org ≠ row.org_id
  if to_regclass('public.financial_transactions') is not null then
    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'financial_transactions', ft.id, 'parent_org_mismatch'
    from public.financial_transactions ft
    left join public.events_v2 e on e.id = ft.event_id
    left join public.tours t on t.id = ft.tour_id
    where ft.org_id is not null
      and (
        (ft.event_id is not null and e.org_id is not null and e.org_id is distinct from ft.org_id)
        or (ft.tour_id is not null and t.org_id is not null and t.org_id is distinct from ft.org_id)
      )
    on conflict (table_name, record_id) do nothing;
  end if;

  if to_regclass('public.budgets') is not null then
    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'budgets', b.id, 'parent_org_mismatch'
    from public.budgets b
    left join public.events_v2 e on e.id = b.event_id
    left join public.tours t on t.id = b.tour_id
    where b.org_id is not null
      and (
        (b.event_id is not null and e.org_id is not null and e.org_id is distinct from b.org_id)
        or (b.tour_id is not null and t.org_id is not null and t.org_id is distinct from b.org_id)
      )
    on conflict (table_name, record_id) do nothing;
  end if;

  if to_regclass('public.settlements') is not null then
    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'settlements', s.id, 'parent_org_mismatch'
    from public.settlements s
    left join public.events_v2 e on e.id = s.event_id
    left join public.tours t on t.id = s.tour_id
    where s.org_id is not null
      and (
        (s.event_id is not null and e.org_id is not null and e.org_id is distinct from s.org_id)
        or (s.tour_id is not null and t.org_id is not null and t.org_id is distinct from s.org_id)
      )
    on conflict (table_name, record_id) do nothing;
  end if;

  -- Audit child: parent transaction org mismatch
  if to_regclass('public.financial_audit_log') is not null
     and to_regclass('public.financial_transactions') is not null then
    insert into public.admin_tenant_key_quarantine (table_name, record_id, reason)
    select 'financial_audit_log', a.id, 'parent_org_mismatch'
    from public.financial_audit_log a
    join public.financial_transactions ft on ft.id = a.transaction_id
    where a.org_id is not null
      and ft.org_id is not null
      and a.org_id is distinct from ft.org_id
    on conflict (table_name, record_id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Restrictive RLS — null org deny + quarantined deny
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'financial_transactions',
    'budgets',
    'settlements',
    'financial_audit_log',
    'event_expenses'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists fin101_require_org_id on public.%I', t);
    execute format(
      'create policy fin101_require_org_id on public.%I as restrictive for all to authenticated using (org_id is not null) with check (org_id is not null)',
      t
    );

    execute format('drop policy if exists fin101_deny_quarantined on public.%I', t);
    execute format(
      $sql$
        create policy fin101_deny_quarantined on public.%I
          as restrictive for all to authenticated
          using (
            not exists (
              select 1
              from public.admin_tenant_key_quarantine q
              where q.table_name = %L
                and q.record_id = id
                and q.resolved_at is null
            )
          )
          with check (
            not exists (
              select 1
              from public.admin_tenant_key_quarantine q
              where q.table_name = %L
                and q.record_id = id
                and q.resolved_at is null
            )
          )
      $sql$,
      t,
      t,
      t
    );

    execute format(
      'create index if not exists idx_%s_org_id on public.%I (org_id) where org_id is not null',
      t,
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5) Verification RPC
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_finance_org_keys()
returns table (
  table_name text,
  total_rows bigint,
  keyed_rows bigint,
  null_org_rows bigint,
  quarantine_open bigint,
  parent_mismatch_rows bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'extensions'
as $$
begin
  return query
  with checks as (
    select 'financial_transactions'::text as table_name,
      (select count(*) from public.financial_transactions) as total_rows,
      (select count(*) from public.financial_transactions where org_id is not null) as keyed_rows,
      (select count(*) from public.financial_transactions where org_id is null) as null_org_rows,
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'financial_transactions' and q.resolved_at is null) as quarantine_open,
      (select count(*) from public.financial_transactions ft
        left join public.events_v2 e on e.id = ft.event_id
        left join public.tours t on t.id = ft.tour_id
        where ft.org_id is not null
          and (
            (ft.event_id is not null and e.org_id is not null and e.org_id is distinct from ft.org_id)
            or (ft.tour_id is not null and t.org_id is not null and t.org_id is distinct from ft.org_id)
          )) as parent_mismatch_rows
    where to_regclass('public.financial_transactions') is not null

    union all
    select 'budgets',
      (select count(*) from public.budgets),
      (select count(*) from public.budgets where org_id is not null),
      (select count(*) from public.budgets where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'budgets' and q.resolved_at is null),
      (select count(*) from public.budgets b
        left join public.events_v2 e on e.id = b.event_id
        left join public.tours t on t.id = b.tour_id
        where b.org_id is not null
          and (
            (b.event_id is not null and e.org_id is not null and e.org_id is distinct from b.org_id)
            or (b.tour_id is not null and t.org_id is not null and t.org_id is distinct from b.org_id)
          ))
    where to_regclass('public.budgets') is not null

    union all
    select 'settlements',
      (select count(*) from public.settlements),
      (select count(*) from public.settlements where org_id is not null),
      (select count(*) from public.settlements where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'settlements' and q.resolved_at is null),
      (select count(*) from public.settlements s
        left join public.events_v2 e on e.id = s.event_id
        left join public.tours t on t.id = s.tour_id
        where s.org_id is not null
          and (
            (s.event_id is not null and e.org_id is not null and e.org_id is distinct from s.org_id)
            or (s.tour_id is not null and t.org_id is not null and t.org_id is distinct from s.org_id)
          ))
    where to_regclass('public.settlements') is not null

    union all
    select 'financial_audit_log',
      (select count(*) from public.financial_audit_log),
      (select count(*) from public.financial_audit_log where org_id is not null),
      (select count(*) from public.financial_audit_log where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'financial_audit_log' and q.resolved_at is null),
      (select count(*) from public.financial_audit_log a
        join public.financial_transactions ft on ft.id = a.transaction_id
        where a.org_id is not null and ft.org_id is not null and a.org_id is distinct from ft.org_id)
    where to_regclass('public.financial_audit_log') is not null

    union all
    select 'event_expenses',
      (select count(*) from public.event_expenses),
      (select count(*) from public.event_expenses where org_id is not null),
      (select count(*) from public.event_expenses where org_id is null),
      (select count(*) from public.admin_tenant_key_quarantine q
        where q.table_name = 'event_expenses' and q.resolved_at is null),
      (select count(*) from public.event_expenses x
        join public.events_v2 e on e.id = x.event_id
        where x.org_id is not null and e.org_id is not null and x.org_id is distinct from e.org_id)
    where to_regclass('public.event_expenses') is not null
  )
  select c.table_name, c.total_rows, c.keyed_rows, c.null_org_rows, c.quarantine_open, c.parent_mismatch_rows
  from checks c;
end;
$$;

revoke all on function public.admin_verify_finance_org_keys() from public;
grant execute on function public.admin_verify_finance_org_keys() to service_role;

comment on function public.admin_verify_finance_org_keys() is
  'FIN-101 verification: keyed/null/quarantine counts and parent org mismatches for finance tables.';
