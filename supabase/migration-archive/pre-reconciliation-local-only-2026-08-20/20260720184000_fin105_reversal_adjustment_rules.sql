-- FIN-105 — Reversal/adjustment links + posted immutability helpers
-- Additive only. Never reset the database.

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- financial_transactions: link columns + posted_at
-- ---------------------------------------------------------------------------
alter table if exists public.financial_transactions
  add column if not exists posted_at timestamptz,
  add column if not exists reverses_transaction_id uuid,
  add column if not exists adjusts_transaction_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'financial_transactions_reverses_fk'
  ) then
    alter table public.financial_transactions
      add constraint financial_transactions_reverses_fk
      foreign key (reverses_transaction_id)
      references public.financial_transactions (id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'financial_transactions_adjusts_fk'
  ) then
    alter table public.financial_transactions
      add constraint financial_transactions_adjusts_fk
      foreign key (adjusts_transaction_id)
      references public.financial_transactions (id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'financial_transactions_single_link_check'
  ) then
    alter table public.financial_transactions
      add constraint financial_transactions_single_link_check
      check (
        reverses_transaction_id is null
        or adjusts_transaction_id is null
      );
  end if;
end $$;

create index if not exists idx_fin_tx_reverses
  on public.financial_transactions (reverses_transaction_id)
  where reverses_transaction_id is not null;

create index if not exists idx_fin_tx_adjusts
  on public.financial_transactions (adjusts_transaction_id)
  where adjusts_transaction_id is not null;

-- Backfill posted_at for already-paid rows
update public.financial_transactions
set posted_at = coalesce(paid_at, updated_at, created_at)
where payment_status in ('paid', 'refunded')
  and posted_at is null;

-- ---------------------------------------------------------------------------
-- settlements: adjustment/reversal link (new settlement version, not overwrite)
-- ---------------------------------------------------------------------------
alter table if exists public.settlements
  add column if not exists adjusts_settlement_id uuid,
  add column if not exists reverses_settlement_id uuid;

do $$
begin
  if to_regclass('public.settlements') is null then
    return;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'settlements_adjusts_fk'
  ) then
    alter table public.settlements
      add constraint settlements_adjusts_fk
      foreign key (adjusts_settlement_id)
      references public.settlements (id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'settlements_reverses_fk'
  ) then
    alter table public.settlements
      add constraint settlements_reverses_fk
      foreign key (reverses_settlement_id)
      references public.settlements (id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'settlements_single_link_check'
  ) then
    alter table public.settlements
      add constraint settlements_single_link_check
      check (
        adjusts_settlement_id is null
        or reverses_settlement_id is null
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Verify helper (contract for tests / ops)
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_finance_reversal_rules()
returns table (
  check_name text,
  ok boolean,
  detail text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 'tx_link_columns'::text,
    (
      select count(*) = 3
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'financial_transactions'
        and column_name in ('posted_at', 'reverses_transaction_id', 'adjusts_transaction_id')
    ),
    'posted_at + reverse/adjust FKs present'::text;

  return query
  select 'tx_single_link_check'::text,
    exists (
      select 1 from pg_constraint
      where conname = 'financial_transactions_single_link_check'
    ),
    'cannot set both reverses and adjusts'::text;

  return query
  select 'settlement_link_columns'::text,
    (
      to_regclass('public.settlements') is null
      or (
        select count(*) = 2
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'settlements'
          and column_name in ('adjusts_settlement_id', 'reverses_settlement_id')
      )
    ),
    'settlement reverse/adjust columns present (or table absent)'::text;
end;
$$;

revoke all on function public.admin_verify_finance_reversal_rules() from public;
grant execute on function public.admin_verify_finance_reversal_rules() to authenticated, service_role;
