-- SEC-106 — Replace finance RLS.
-- Drop blanket authenticated policies; require effective org membership + finance
-- capabilities. Audit log remains append-only via service role / triggers.

-- ---------------------------------------------------------------------------
-- Capability helper: org relationship + named finance permission
-- ---------------------------------------------------------------------------
create or replace function public.can_finance(uid uuid, oid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select
    uid is not null
    and oid is not null
    and public.is_org_member(uid, oid)
    and public.has_perm(uid, oid, perm);
$$;

revoke all on function public.can_finance(uuid, uuid, text) from public;
grant execute on function public.can_finance(uuid, uuid, text) to authenticated, service_role;

comment on function public.can_finance(uuid, uuid, text) is
  'SEC-106 finance RLS predicate: membership + has_perm for a finance.* capability.';

-- ---------------------------------------------------------------------------
-- financial_transactions
-- ---------------------------------------------------------------------------
alter table if exists public.financial_transactions enable row level security;
alter table if exists public.financial_transactions force row level security;

drop policy if exists fin_tx_all on public.financial_transactions;
drop policy if exists financial_transactions_select on public.financial_transactions;
drop policy if exists financial_transactions_insert on public.financial_transactions;
drop policy if exists financial_transactions_update on public.financial_transactions;
drop policy if exists financial_transactions_delete on public.financial_transactions;
drop policy if exists sec106_financial_transactions_select on public.financial_transactions;
drop policy if exists sec106_financial_transactions_insert on public.financial_transactions;
drop policy if exists sec106_financial_transactions_update on public.financial_transactions;
drop policy if exists sec106_financial_transactions_delete on public.financial_transactions;

create policy sec106_financial_transactions_select on public.financial_transactions
  for select to authenticated
  using (
    public.can_finance(auth.uid(), org_id, 'finance.view')
    or public.can_finance(auth.uid(), org_id, 'finance.manage')
  );

create policy sec106_financial_transactions_insert on public.financial_transactions
  for insert to authenticated
  with check (
    public.can_finance(auth.uid(), org_id, 'finance.manage')
    and (
      payment_status not in ('paid', 'refunded')
      or public.can_finance(auth.uid(), org_id, 'finance.pay')
    )
  );

create policy sec106_financial_transactions_update on public.financial_transactions
  for update to authenticated
  using (public.can_finance(auth.uid(), org_id, 'finance.manage'))
  with check (
    public.can_finance(auth.uid(), org_id, 'finance.manage')
    and (
      payment_status not in ('paid', 'refunded')
      or public.can_finance(auth.uid(), org_id, 'finance.pay')
    )
  );

create policy sec106_financial_transactions_delete on public.financial_transactions
  for delete to authenticated
  using (public.can_finance(auth.uid(), org_id, 'finance.manage'));

revoke all on public.financial_transactions from anon;
grant select, insert, update, delete on public.financial_transactions to authenticated;
grant all on public.financial_transactions to service_role;

-- ---------------------------------------------------------------------------
-- budgets
-- ---------------------------------------------------------------------------
alter table if exists public.budgets enable row level security;
alter table if exists public.budgets force row level security;

drop policy if exists budgets_all on public.budgets;
drop policy if exists budgets_select on public.budgets;
drop policy if exists budgets_insert on public.budgets;
drop policy if exists budgets_update on public.budgets;
drop policy if exists budgets_delete on public.budgets;
drop policy if exists sec106_budgets_select on public.budgets;
drop policy if exists sec106_budgets_insert on public.budgets;
drop policy if exists sec106_budgets_update on public.budgets;
drop policy if exists sec106_budgets_delete on public.budgets;

create policy sec106_budgets_select on public.budgets
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_finance(auth.uid(), org_id, 'finance.view')
      or public.can_finance(auth.uid(), org_id, 'finance.manage')
    )
  );

create policy sec106_budgets_insert on public.budgets
  for insert to authenticated
  with check (
    org_id is not null
    and public.can_finance(auth.uid(), org_id, 'finance.manage')
  );

create policy sec106_budgets_update on public.budgets
  for update to authenticated
  using (
    org_id is not null
    and public.can_finance(auth.uid(), org_id, 'finance.manage')
  )
  with check (
    org_id is not null
    and public.can_finance(auth.uid(), org_id, 'finance.manage')
  );

create policy sec106_budgets_delete on public.budgets
  for delete to authenticated
  using (
    org_id is not null
    and public.can_finance(auth.uid(), org_id, 'finance.manage')
  );

revoke all on public.budgets from anon;
grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;

-- ---------------------------------------------------------------------------
-- settlements
-- ---------------------------------------------------------------------------
alter table if exists public.settlements enable row level security;
alter table if exists public.settlements force row level security;

drop policy if exists settlements_select on public.settlements;
drop policy if exists settlements_write on public.settlements;
drop policy if exists settlements_org_isolation on public.settlements;
drop policy if exists settlements_insert on public.settlements;
drop policy if exists settlements_update on public.settlements;
drop policy if exists settlements_delete on public.settlements;
drop policy if exists sec106_settlements_select on public.settlements;
drop policy if exists sec106_settlements_insert on public.settlements;
drop policy if exists sec106_settlements_update on public.settlements;
drop policy if exists sec106_settlements_delete on public.settlements;

create policy sec106_settlements_select on public.settlements
  for select to authenticated
  using (
    public.can_finance(auth.uid(), org_id, 'finance.view')
    or public.can_finance(auth.uid(), org_id, 'finance.manage')
  );

create policy sec106_settlements_insert on public.settlements
  for insert to authenticated
  with check (
    status = 'draft'
    and public.can_finance(auth.uid(), org_id, 'finance.manage')
  );

create policy sec106_settlements_update on public.settlements
  for update to authenticated
  using (public.can_finance(auth.uid(), org_id, 'finance.manage'))
  with check (
    public.can_finance(auth.uid(), org_id, 'finance.manage')
    and (status <> 'finalized' or public.can_finance(auth.uid(), org_id, 'finance.approve'))
    and (status <> 'paid' or public.can_finance(auth.uid(), org_id, 'finance.pay'))
  );

create policy sec106_settlements_delete on public.settlements
  for delete to authenticated
  using (
    status = 'draft'
    and public.can_finance(auth.uid(), org_id, 'finance.manage')
  );

revoke all on public.settlements from anon;
grant select, insert, update, delete on public.settlements to authenticated;
grant all on public.settlements to service_role;

-- ---------------------------------------------------------------------------
-- financial_audit_log — privileged read only; no authenticated writes
-- ---------------------------------------------------------------------------
alter table if exists public.financial_audit_log enable row level security;
alter table if exists public.financial_audit_log force row level security;

drop policy if exists audit_log_select on public.financial_audit_log;
drop policy if exists financial_audit_log_select on public.financial_audit_log;
drop policy if exists financial_audit_log_insert on public.financial_audit_log;
drop policy if exists financial_audit_log_update on public.financial_audit_log;
drop policy if exists financial_audit_log_delete on public.financial_audit_log;
drop policy if exists sec106_financial_audit_log_select on public.financial_audit_log;

create policy sec106_financial_audit_log_select on public.financial_audit_log
  for select to authenticated
  using (
    org_id is not null
    and (
      public.can_finance(auth.uid(), org_id, 'audit.view')
      or public.can_finance(auth.uid(), org_id, 'finance.view')
      or public.can_finance(auth.uid(), org_id, 'finance.manage')
    )
  );

-- No insert/update/delete policies for authenticated → deny by default
revoke all on public.financial_audit_log from anon, authenticated;
grant select on public.financial_audit_log to authenticated;
grant all on public.financial_audit_log to service_role;

-- ---------------------------------------------------------------------------
-- Overview RPC: fail closed when caller lacks finance.view/manage
-- ---------------------------------------------------------------------------
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
language plpgsql
stable
security invoker
set search_path to 'public', 'extensions'
as $$
begin
  if not (
    public.can_finance(auth.uid(), p_org_id, 'finance.view')
    or public.can_finance(auth.uid(), p_org_id, 'finance.manage')
  ) then
    raise exception 'finance overview denied' using errcode = '42501';
  end if;

  return query
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
end;
$$;

revoke all on function public.get_finance_overview(uuid, uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_finance_overview(uuid, uuid, uuid, timestamptz, timestamptz)
  to authenticated, service_role;
