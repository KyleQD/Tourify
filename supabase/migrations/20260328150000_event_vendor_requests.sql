-- Event vendor requests: track vendor engagement per event
create extension if not exists pgcrypto;

create table if not exists event_vendor_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  vendor_name text not null,
  service_type text not null,
  contact_email text,
  contact_phone text,
  budget_estimate numeric,
  actual_cost numeric,
  notes text,
  status text not null default 'pending' check (status in ('pending','confirmed','declined','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_req_event on event_vendor_requests(event_id);
create index if not exists idx_vendor_req_org on event_vendor_requests(org_id);

alter table event_vendor_requests enable row level security;

do $$ begin
  drop policy if exists evr_all on event_vendor_requests;
  create policy evr_all on event_vendor_requests for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');
end $$;
