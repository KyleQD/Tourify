-- SEC-108 — Replace legacy ticketing RLS.
-- Explicitly DROP permissive policies (never leave them shadowed).
-- Legacy tables become migration-only / authenticated read-only until retired.

-- ---------------------------------------------------------------------------
-- Registry of legacy ticketing surfaces (documentation + operator queries)
-- ---------------------------------------------------------------------------
create table if not exists public.legacy_ticketing_migration_tables (
  table_name text primary key,
  status text not null default 'read_only_migration'
    check (status in ('read_only_migration', 'retired')),
  notes text,
  recorded_at timestamptz not null default now()
);

comment on table public.legacy_ticketing_migration_tables is
  'SEC-108 registry: legacy ticketing tables are migration-only/read-only until retired.';

alter table public.legacy_ticketing_migration_tables enable row level security;

drop policy if exists legacy_ticketing_migration_tables_deny on public.legacy_ticketing_migration_tables;
create policy legacy_ticketing_migration_tables_deny
  on public.legacy_ticketing_migration_tables
  for all to authenticated
  using (false)
  with check (false);

revoke all on public.legacy_ticketing_migration_tables from anon, authenticated;

insert into public.legacy_ticketing_migration_tables (table_name, status, notes)
values
  ('event_ticket_types', 'read_only_migration', 'Pre-events_v2 ticket tiers; destination is public.ticket_types'),
  ('ticket_purchases', 'read_only_migration', 'Legacy purchase rows if present; destination is public.ticket_sales / tickets')
on conflict (table_name) do update
  set status = excluded.status,
      notes = excluded.notes;

-- ---------------------------------------------------------------------------
-- Explicit DROP of every known permissive / blanket ticketing policy
-- (must DROP, not merely add tighter policies alongside)
-- ---------------------------------------------------------------------------
-- Drop ONLY known blanket / FOR-ALL membership policies.
-- Do not drop capability-based ticket_*_select/insert/update/delete from
-- 20260719230353_admin_ticketing_security.sql (those are the destination policies).
do $$
begin
  if to_regclass('public.ticket_types') is not null then
    drop policy if exists ticket_types_all on public.ticket_types;
  end if;
  if to_regclass('public.ticket_sales') is not null then
    drop policy if exists ticket_sales_all on public.ticket_sales;
  end if;
  if to_regclass('public.ticket_campaigns') is not null then
    drop policy if exists ticket_campaigns_all on public.ticket_campaigns;
    drop policy if exists ticket_campaigns_write on public.ticket_campaigns;
    drop policy if exists "ticket_campaigns_write" on public.ticket_campaigns;
  end if;
  if to_regclass('public.promo_codes') is not null then
    drop policy if exists promo_codes_all on public.promo_codes;
    drop policy if exists promo_codes_write on public.promo_codes;
    drop policy if exists "promo_codes_write" on public.promo_codes;
  end if;
  if to_regclass('public.ticket_shares') is not null then
    drop policy if exists ticket_shares_all on public.ticket_shares;
    drop policy if exists "ticket_shares_all" on public.ticket_shares;
  end if;
  if to_regclass('public.ticket_referrals') is not null then
    drop policy if exists ticket_referrals_all on public.ticket_referrals;
    drop policy if exists "ticket_referrals_all" on public.ticket_referrals;
  end if;
end $$;

-- Defense-in-depth: if a permissive promo_codes_select (using true) somehow
-- coexists, it shares the name with the hardened policy — environments that
-- never applied 20260719230353 still need the blanket removed + hardened.
do $$
begin
  if to_regclass('public.promo_codes') is null then
    return;
  end if;
  -- Recreate hardened select/write split only when insert policy is missing
  -- (indicates pre-hardening environment still on promo_codes_write / using true).
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'promo_codes' and policyname = 'promo_codes_insert'
  ) then
    drop policy if exists promo_codes_select on public.promo_codes;
    drop policy if exists "promo_codes_select" on public.promo_codes;
    create policy promo_codes_select on public.promo_codes
      for select to authenticated
      using (
        exists (
          select 1 from public.events_v2 e
          where e.id = promo_codes.event_id
            and (
              public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
              or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
            )
        )
      );
    create policy promo_codes_insert on public.promo_codes
      for insert to authenticated
      with check (
        exists (
          select 1 from public.events_v2 e
          where e.id = promo_codes.event_id
            and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
      );
    create policy promo_codes_update on public.promo_codes
      for update to authenticated
      using (
        exists (
          select 1 from public.events_v2 e
          where e.id = promo_codes.event_id
            and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
      )
      with check (
        exists (
          select 1 from public.events_v2 e
          where e.id = promo_codes.event_id
            and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
      );
    create policy promo_codes_delete on public.promo_codes
      for delete to authenticated
      using (
        exists (
          select 1 from public.events_v2 e
          where e.id = promo_codes.event_id
            and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Legacy event_ticket_types → authenticated read-only (no writes)
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  if to_regclass('public.event_ticket_types') is null then
    return;
  end if;

  alter table public.event_ticket_types enable row level security;
  alter table public.event_ticket_types force row level security;

  -- Drop any existing policies so nothing permissive remains
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'event_ticket_types'
  loop
    execute format('drop policy if exists %I on public.event_ticket_types', pol.policyname);
  end loop;

  -- Recreate as select-only for org members who can view ticketing on related events_v2
  -- (legacy event_id may not match events_v2; unmatched rows stay invisible to clients)
  drop policy if exists sec108_event_ticket_types_select on public.event_ticket_types;
  create policy sec108_event_ticket_types_select on public.event_ticket_types
    for select to authenticated
    using (
      exists (
        select 1
        from public.events_v2 e
        where e.id = event_ticket_types.event_id
          and e.org_id is not null
          and (
            public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
            or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          )
      )
    );

  -- No insert/update/delete policies for authenticated
  revoke insert, update, delete on public.event_ticket_types from authenticated, anon;
  grant select on public.event_ticket_types to authenticated;
  grant all on public.event_ticket_types to service_role;
end $$;

-- ---------------------------------------------------------------------------
-- Legacy ticket_purchases → read-only for authenticated (if table exists)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.ticket_purchases') is null then
    return;
  end if;

  alter table public.ticket_purchases enable row level security;
  alter table public.ticket_purchases force row level security;

  drop policy if exists ticket_purchases_org_isolation on public.ticket_purchases;
  drop policy if exists "ticket_purchases_org_isolation" on public.ticket_purchases;
  drop policy if exists sec108_ticket_purchases_select on public.ticket_purchases;

  create policy sec108_ticket_purchases_select on public.ticket_purchases
    for select to authenticated
    using (
      exists (
        select 1
        from public.events_v2 e
        where e.id = ticket_purchases.event_id
          and e.org_id is not null
          and (
            public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
            or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          )
      )
    );

  revoke insert, update, delete on public.ticket_purchases from authenticated, anon;
  grant select on public.ticket_purchases to authenticated;
  grant all on public.ticket_purchases to service_role;
end $$;

-- ---------------------------------------------------------------------------
-- Guard: deny reintroduction of FOR ALL authenticated blanket on core tables
-- via restrictive null-org (SEC-105) already present; ensure FORCE RLS on cores
-- ---------------------------------------------------------------------------
alter table if exists public.ticket_types force row level security;
alter table if exists public.ticket_sales force row level security;
alter table if exists public.ticket_campaigns force row level security;
alter table if exists public.promo_codes force row level security;
