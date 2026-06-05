set client_min_messages = warning;

create table if not exists settlements (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid references events_v2(id) on delete set null,
  tour_id             uuid references tours(id)     on delete set null,
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
  settled_by          uuid references profiles(id) on delete set null,
  settled_at          timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table settlements enable row level security;

drop policy if exists settlements_select on settlements;
create policy settlements_select on settlements
  for select using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

drop policy if exists settlements_write on settlements;
create policy settlements_write on settlements
  for all using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create index if not exists idx_settlements_event  on settlements(event_id);
create index if not exists idx_settlements_tour   on settlements(tour_id);
create index if not exists idx_settlements_status on settlements(status);

-- Financial audit log
create table if not exists financial_audit_log (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references profiles(id) on delete set null,
  org_id         uuid,
  action         text not null,          -- 'create', 'update', 'delete'
  transaction_id uuid,
  diff_json      jsonb,
  created_at     timestamptz not null default now()
);

alter table financial_audit_log enable row level security;

drop policy if exists audit_log_select on financial_audit_log;
create policy audit_log_select on financial_audit_log
  for select using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create index if not exists idx_fin_audit_org on financial_audit_log(org_id, created_at desc);
