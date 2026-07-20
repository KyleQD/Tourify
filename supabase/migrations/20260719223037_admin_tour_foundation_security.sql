-- Establish the canonical Admin capability catalog and close the blanket
-- authenticated-user policies around organization financial data.

-- Keep legacy permissions that are still referenced by older policies while
-- adding the canonical Admin capabilities consumed by the application.
insert into public.org_role_permissions (role, perms) values
  (
    'owner',
    array[
      'org.manage','org.invite','offer.manage','task.manage','schedule.manage',
      'staff.manage','report.view','storage.read','storage.write',
      'org.roles.manage','org.settings.manage','audit.view',
      'tour.view','tour.manage','tour.publish','tour.archive','tour.delete',
      'event.view','event.manage','event.publish','event.live_ops',
      'routing.manage','advance.manage','logistics.view','logistics.manage',
      'workforce.view','workforce.manage','workforce.publish','hiring.manage',
      'vendor.view','vendor.manage','contract.view','contract.manage','contract.sign',
      'finance.view','finance.manage','finance.approve','finance.pay',
      'ticketing.view','ticketing.manage','ticketing.scan','ticketing.refund',
      'site_map.view','site_map.edit','site_map.share',
      'communications.send','communications.broadcast'
    ]::text[]
  ),
  (
    'admin',
    array[
      'org.manage','org.invite','offer.manage','task.manage','schedule.manage',
      'staff.manage','report.view','storage.read','storage.write',
      'org.roles.manage','org.settings.manage','audit.view',
      'tour.view','tour.manage','tour.publish','tour.archive','tour.delete',
      'event.view','event.manage','event.publish','event.live_ops',
      'routing.manage','advance.manage','logistics.view','logistics.manage',
      'workforce.view','workforce.manage','workforce.publish','hiring.manage',
      'vendor.view','vendor.manage','contract.view','contract.manage',
      'finance.view','finance.manage','finance.approve',
      'ticketing.view','ticketing.manage','ticketing.scan','ticketing.refund',
      'site_map.view','site_map.edit','site_map.share',
      'communications.send','communications.broadcast'
    ]::text[]
  ),
  (
    'tour_manager',
    array[
      'org.invite','offer.manage','task.manage','schedule.manage','staff.manage',
      'report.view','storage.read','storage.write','audit.view',
      'tour.view','tour.manage','tour.publish','tour.archive',
      'event.view','event.manage','event.publish','event.live_ops',
      'routing.manage','advance.manage','logistics.view','logistics.manage',
      'workforce.view','workforce.manage','workforce.publish','hiring.manage',
      'vendor.view','vendor.manage','contract.view','finance.view','ticketing.view',
      'site_map.view','site_map.edit','site_map.share',
      'communications.send','communications.broadcast'
    ]::text[]
  ),
  (
    'production',
    array[
      'event.manage','task.manage','schedule.manage','staff.manage','report.view',
      'storage.read','storage.write','audit.view',
      'tour.view','tour.manage','event.view','event.publish','event.live_ops',
      'routing.manage','advance.manage','logistics.view','logistics.manage',
      'workforce.view','workforce.manage','workforce.publish',
      'vendor.view','vendor.manage','contract.view','finance.view','ticketing.view',
      'site_map.view','site_map.edit','site_map.share',
      'communications.send','communications.broadcast'
    ]::text[]
  ),
  (
    'finance',
    array[
      'finance.manage','report.view','storage.read','audit.view',
      'tour.view','event.view','logistics.view','workforce.view','vendor.view',
      'contract.view','finance.view','finance.approve','finance.pay',
      'ticketing.view','site_map.view'
    ]::text[]
  ),
  (
    'ticketing',
    array[
      'tour.view','event.view','ticketing.view','ticketing.manage',
      'ticketing.scan','ticketing.refund','communications.send'
    ]::text[]
  ),
  (
    'viewer',
    array[
      'tour.view','event.view','logistics.view','workforce.view','vendor.view',
      'contract.view','finance.view','ticketing.view','site_map.view'
    ]::text[]
  )
on conflict (role) do update set perms = excluded.perms;

-- Ensure finance satellite tables exist on environments that predate
-- 20260602130000_settlements before hardening their policies.
create table if not exists public.settlements (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid references public.events_v2(id) on delete set null,
  tour_id             uuid references public.tours(id) on delete set null,
  org_id              uuid not null,
  total_gross_revenue numeric not null default 0,
  total_expenses      numeric not null default 0,
  net_profit          numeric generated always as (total_gross_revenue - total_expenses) stored,
  artist_payout       numeric default 0,
  venue_payout        numeric default 0,
  promoter_payout     numeric default 0,
  deal_type           text check (deal_type in ('guarantee','vs_door','percentage') or deal_type is null),
  guarantee_amount    numeric,
  door_percentage     numeric,
  status              text not null default 'draft'
                        check (status in ('draft','finalized','paid')),
  settled_by          uuid references public.profiles(id) on delete set null,
  settled_at          timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.financial_audit_log (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references public.profiles(id) on delete set null,
  org_id         uuid,
  action         text not null,
  transaction_id uuid,
  diff_json      jsonb,
  created_at     timestamptz not null default now()
);

-- Align legacy budgets rows with the Admin finance contract used by get_finance_overview.
alter table public.budgets add column if not exists org_id uuid;
alter table public.budgets add column if not exists category text;
alter table public.budgets add column if not exists allocated_amount numeric not null default 0;
alter table public.budgets add column if not exists spent_amount numeric not null default 0;
alter table public.budgets add column if not exists notes text;
alter table public.budgets add column if not exists created_by uuid references auth.users(id) on delete set null;

update public.budgets b
set org_id = coalesce(
  b.org_id,
  (select t.org_id from public.tours t where t.id = b.tour_id),
  (select e.org_id from public.events_v2 e where e.id = b.event_id)
)
where b.org_id is null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'budgets' and column_name = 'total_amount'
  ) then
    execute $sql$
      update public.budgets
      set allocated_amount = coalesce(nullif(allocated_amount, 0), total_amount, 0)
      where allocated_amount = 0 and total_amount is not null
    $sql$;
  end if;
end $$;

alter table public.financial_transactions enable row level security;
alter table public.budgets enable row level security;
alter table if exists public.settlements enable row level security;
alter table if exists public.financial_audit_log enable row level security;

drop policy if exists fin_tx_all on public.financial_transactions;
drop policy if exists financial_transactions_select on public.financial_transactions;
drop policy if exists financial_transactions_insert on public.financial_transactions;
drop policy if exists financial_transactions_update on public.financial_transactions;
drop policy if exists financial_transactions_delete on public.financial_transactions;

create policy financial_transactions_select on public.financial_transactions
  for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'finance.view')
    or public.has_perm(auth.uid(), org_id, 'finance.manage')
  );

create policy financial_transactions_insert on public.financial_transactions
  for insert to authenticated
  with check (
    public.has_perm(auth.uid(), org_id, 'finance.manage')
    and (
      payment_status not in ('paid', 'refunded')
      or public.has_perm(auth.uid(), org_id, 'finance.pay')
    )
  );

create policy financial_transactions_update on public.financial_transactions
  for update to authenticated
  using (public.has_perm(auth.uid(), org_id, 'finance.manage'))
  with check (
    public.has_perm(auth.uid(), org_id, 'finance.manage')
    and (
      payment_status not in ('paid', 'refunded')
      or public.has_perm(auth.uid(), org_id, 'finance.pay')
    )
  );

create policy financial_transactions_delete on public.financial_transactions
  for delete to authenticated
  using (public.has_perm(auth.uid(), org_id, 'finance.manage'));

drop policy if exists budgets_all on public.budgets;
drop policy if exists budgets_select on public.budgets;
drop policy if exists budgets_insert on public.budgets;
drop policy if exists budgets_update on public.budgets;
drop policy if exists budgets_delete on public.budgets;

create policy budgets_select on public.budgets
  for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'finance.view')
    or public.has_perm(auth.uid(), org_id, 'finance.manage')
  );

create policy budgets_insert on public.budgets
  for insert to authenticated
  with check (public.has_perm(auth.uid(), org_id, 'finance.manage'));

create policy budgets_update on public.budgets
  for update to authenticated
  using (public.has_perm(auth.uid(), org_id, 'finance.manage'))
  with check (public.has_perm(auth.uid(), org_id, 'finance.manage'));

create policy budgets_delete on public.budgets
  for delete to authenticated
  using (public.has_perm(auth.uid(), org_id, 'finance.manage'));

drop policy if exists settlements_select on public.settlements;
drop policy if exists settlements_write on public.settlements;
drop policy if exists settlements_org_isolation on public.settlements;
drop policy if exists settlements_insert on public.settlements;
drop policy if exists settlements_update on public.settlements;
drop policy if exists settlements_delete on public.settlements;

create policy settlements_select on public.settlements
  for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'finance.view')
    or public.has_perm(auth.uid(), org_id, 'finance.manage')
  );

create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (
    status = 'draft'
    and public.has_perm(auth.uid(), org_id, 'finance.manage')
  );

create policy settlements_update on public.settlements
  for update to authenticated
  using (public.has_perm(auth.uid(), org_id, 'finance.manage'))
  with check (
    public.has_perm(auth.uid(), org_id, 'finance.manage')
    and (status <> 'finalized' or public.has_perm(auth.uid(), org_id, 'finance.approve'))
    and (status <> 'paid' or public.has_perm(auth.uid(), org_id, 'finance.pay'))
  );

create policy settlements_delete on public.settlements
  for delete to authenticated
  using (public.has_perm(auth.uid(), org_id, 'finance.manage'));

drop policy if exists audit_log_select on public.financial_audit_log;
drop policy if exists financial_audit_log_select on public.financial_audit_log;

create policy financial_audit_log_select on public.financial_audit_log
  for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'audit.view')
    or public.has_perm(auth.uid(), org_id, 'finance.view')
  );

create or replace function public.enforce_settlement_status_transition()
returns trigger
language plpgsql
security invoker
set search_path to 'public', 'extensions'
as $$
begin
  if old.status = 'paid' and new is distinct from old then
    raise exception 'Paid settlements are immutable.' using errcode = '23514';
  end if;

  if old.status = 'draft' and new.status = 'paid' then
    raise exception 'A settlement must be finalized before payment.' using errcode = '23514';
  end if;

  if old.status = 'finalized' and new.status = 'draft' then
    raise exception 'A finalized settlement cannot return to draft.' using errcode = '23514';
  end if;

  if old.status = 'finalized' and new.status <> 'paid' and new is distinct from old then
    raise exception 'Finalized settlements can only transition to paid.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_settlement_status_transition on public.settlements;
create trigger enforce_settlement_status_transition
  before update on public.settlements
  for each row execute function public.enforce_settlement_status_transition();

revoke all on function public.enforce_settlement_status_transition() from public;

-- Exact aggregates keep the Admin dashboard correct when an organization has
-- more rows than the recent-activity list returned alongside the totals.
create or replace function public.get_finance_overview(
  p_org_id uuid,
  p_event_id uuid default null,
  p_tour_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  total_income numeric,
  total_expenses numeric,
  total_allocated numeric,
  total_spent numeric,
  pending_payments bigint,
  overdue_payments bigint,
  transaction_count bigint
)
language sql
stable
security invoker
set search_path to 'public', 'extensions'
as $$
  select
    coalesce((
      select sum(ft.amount)
      from public.financial_transactions ft
      where ft.org_id = p_org_id
        and ft.type = 'income'
        and (p_event_id is null or ft.event_id = p_event_id)
        and (p_tour_id is null or ft.tour_id = p_tour_id)
        and (p_from is null or ft.created_at >= p_from)
        and (p_to is null or ft.created_at <= p_to)
    ), 0),
    coalesce((
      select sum(ft.amount)
      from public.financial_transactions ft
      where ft.org_id = p_org_id
        and ft.type = 'expense'
        and (p_event_id is null or ft.event_id = p_event_id)
        and (p_tour_id is null or ft.tour_id = p_tour_id)
        and (p_from is null or ft.created_at >= p_from)
        and (p_to is null or ft.created_at <= p_to)
    ), 0),
    coalesce((
      select sum(b.allocated_amount)
      from public.budgets b
      where b.org_id = p_org_id
        and (p_event_id is null or b.event_id = p_event_id)
        and (p_tour_id is null or b.tour_id = p_tour_id)
    ), 0),
    coalesce((
      select sum(b.spent_amount)
      from public.budgets b
      where b.org_id = p_org_id
        and (p_event_id is null or b.event_id = p_event_id)
        and (p_tour_id is null or b.tour_id = p_tour_id)
    ), 0),
    (
      select count(*)
      from public.financial_transactions ft
      where ft.org_id = p_org_id
        and ft.payment_status = 'pending'
        and (p_event_id is null or ft.event_id = p_event_id)
        and (p_tour_id is null or ft.tour_id = p_tour_id)
        and (p_from is null or ft.created_at >= p_from)
        and (p_to is null or ft.created_at <= p_to)
    ),
    (
      select count(*)
      from public.financial_transactions ft
      where ft.org_id = p_org_id
        and ft.payment_status = 'overdue'
        and (p_event_id is null or ft.event_id = p_event_id)
        and (p_tour_id is null or ft.tour_id = p_tour_id)
        and (p_from is null or ft.created_at >= p_from)
        and (p_to is null or ft.created_at <= p_to)
    ),
    (
      select count(*)
      from public.financial_transactions ft
      where ft.org_id = p_org_id
        and (p_event_id is null or ft.event_id = p_event_id)
        and (p_tour_id is null or ft.tour_id = p_tour_id)
        and (p_from is null or ft.created_at >= p_from)
        and (p_to is null or ft.created_at <= p_to)
    );
$$;

revoke all on function public.get_finance_overview(uuid, uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_finance_overview(uuid, uuid, uuid, timestamptz, timestamptz)
  to authenticated, service_role;
