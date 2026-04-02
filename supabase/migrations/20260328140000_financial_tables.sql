-- Financial tracking: transactions and budgets for organizer operations
create extension if not exists pgcrypto;

create table if not exists financial_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  event_id uuid references events_v2(id) on delete set null,
  tour_id uuid references tours(id) on delete set null,
  type text not null check (type in ('income','expense')),
  category text not null check (category in (
    'ticket_revenue','merchandise','sponsorship','appearance_fee','other_income',
    'venue_rental','equipment','catering','staff_pay','marketing','travel','insurance','permits','production','other_expense'
  )),
  amount numeric not null check (amount >= 0),
  description text,
  vendor_name text,
  receipt_url text,
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','overdue','cancelled','refunded')),
  payment_method text,
  payment_reference text,
  due_date date,
  paid_at timestamptz,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  event_id uuid references events_v2(id) on delete cascade,
  tour_id uuid references tours(id) on delete cascade,
  category text not null,
  allocated_amount numeric not null default 0 check (allocated_amount >= 0),
  spent_amount numeric not null default 0 check (spent_amount >= 0),
  notes text,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_scope check (event_id is not null or tour_id is not null)
);

-- Indexes
create index if not exists idx_fin_tx_org on financial_transactions(org_id);
create index if not exists idx_fin_tx_event on financial_transactions(event_id);
create index if not exists idx_fin_tx_tour on financial_transactions(tour_id);
create index if not exists idx_fin_tx_type on financial_transactions(type);
create index if not exists idx_fin_tx_status on financial_transactions(payment_status);
create index if not exists idx_budgets_event on budgets(event_id);
create index if not exists idx_budgets_tour on budgets(tour_id);

-- RLS
alter table financial_transactions enable row level security;
alter table budgets enable row level security;

do $$ begin
  drop policy if exists fin_tx_all on financial_transactions;
  create policy fin_tx_all on financial_transactions for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

  drop policy if exists budgets_all on budgets;
  create policy budgets_all on budgets for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');
end $$;
