-- Logistics vendors table for tracking event/tour service providers
create table if not exists logistics_vendors (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  name        text not null,
  vendor_type text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  website     text,
  notes       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_logistics_vendors_org on logistics_vendors(org_id);
create index if not exists idx_logistics_vendors_name on logistics_vendors(name);

-- RLS
alter table logistics_vendors enable row level security;

-- Members of the org can read vendors
create policy "org members can read vendors"
  on logistics_vendors for select
  using (
    org_id in (
      select org_id from org_members where user_id = auth.uid()
    )
    or org_id is null
  );

-- Admins can insert
create policy "admins can insert vendors"
  on logistics_vendors for insert
  with check (
    org_id in (
      select org_id from org_members where user_id = auth.uid()
    )
    or org_id is null
  );

-- Admins can update their org's vendors
create policy "admins can update vendors"
  on logistics_vendors for update
  using (
    org_id in (
      select org_id from org_members where user_id = auth.uid()
    )
    or org_id is null
  );

-- Admins can delete
create policy "admins can delete vendors"
  on logistics_vendors for delete
  using (
    org_id in (
      select org_id from org_members where user_id = auth.uid()
    )
    or org_id is null
  );

-- Auto-update updated_at
create or replace function touch_logistics_vendors_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_logistics_vendors_touch on logistics_vendors;
create trigger trg_logistics_vendors_touch
  before update on logistics_vendors
  for each row execute function touch_logistics_vendors_updated_at();
