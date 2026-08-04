-- VEND-102 — Organization vendor master + aliases (identity / deduplication foundation)
-- Additive only. Never reset the database.

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Capability helper
-- ---------------------------------------------------------------------------
create or replace function public.can_vendor(uid uuid, oid uuid, perm text)
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

revoke all on function public.can_vendor(uuid, uuid, text) from public;
grant execute on function public.can_vendor(uuid, uuid, text) to authenticated, service_role;

comment on function public.can_vendor(uuid, uuid, text) is
  'VEND-102 vendor RLS predicate: membership + has_perm for a vendor.* capability.';

-- ---------------------------------------------------------------------------
-- vendors (org master)
-- ---------------------------------------------------------------------------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  legal_name text not null,
  display_name text not null,
  normalized_legal_name text not null,
  category text not null
    check (category in (
      'production', 'catering', 'transport', 'venue',
      'soft_goods', 'security', 'marketing', 'other'
    )),
  status text not null default 'prospective'
    check (status in (
      'prospective', 'invited', 'evaluating', 'approved',
      'preferred', 'restricted', 'inactive'
    )),
  city text,
  region text,
  country text,
  external_accounting_id text,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  merged_into_id uuid references public.vendors (id) on delete restrict,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_legal_name_len check (char_length(legal_name) between 1 and 240),
  constraint vendors_display_name_len check (char_length(display_name) between 1 and 240)
);

create unique index if not exists vendors_org_normalized_legal_uidx
  on public.vendors (org_id, normalized_legal_name)
  where merged_into_id is null and status <> 'inactive';

create unique index if not exists vendors_org_external_accounting_uidx
  on public.vendors (org_id, lower(external_accounting_id))
  where external_accounting_id is not null
    and merged_into_id is null
    and status <> 'inactive';

create index if not exists idx_vendors_org_status on public.vendors (org_id, status);
create index if not exists idx_vendors_org_normalized on public.vendors (org_id, normalized_legal_name);

-- ---------------------------------------------------------------------------
-- vendor_aliases (retained merge / rename history)
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_aliases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  alias_display text not null,
  alias_normalized text not null,
  source text not null
    check (source in ('legal_name', 'display_name', 'merge', 'manual')),
  created_at timestamptz not null default now(),
  constraint vendor_aliases_display_len check (char_length(alias_display) between 1 and 240)
);

create unique index if not exists vendor_aliases_org_vendor_norm_uidx
  on public.vendor_aliases (org_id, vendor_id, alias_normalized);

create index if not exists idx_vendor_aliases_org_norm
  on public.vendor_aliases (org_id, alias_normalized);

-- ---------------------------------------------------------------------------
-- Link tour engagements → master (nullable)
-- ---------------------------------------------------------------------------
alter table if exists public.tour_vendors
  add column if not exists vendor_id uuid;

do $$
begin
  if to_regclass('public.tour_vendors') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'tour_vendors_vendor_id_fk'
     ) then
    alter table public.tour_vendors
      add constraint tour_vendors_vendor_id_fk
      foreign key (vendor_id) references public.vendors (id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_tour_vendors_vendor_id
  on public.tour_vendors (vendor_id)
  where vendor_id is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.vendors enable row level security;
alter table public.vendors force row level security;
alter table public.vendor_aliases enable row level security;
alter table public.vendor_aliases force row level security;

drop policy if exists vend102_vendors_select on public.vendors;
drop policy if exists vend102_vendors_insert on public.vendors;
drop policy if exists vend102_vendors_update on public.vendors;
drop policy if exists vend102_vendors_delete on public.vendors;

create policy vend102_vendors_select on public.vendors
  for select to authenticated
  using (
    public.can_vendor(auth.uid(), org_id, 'vendor.view')
    or public.can_vendor(auth.uid(), org_id, 'vendor.manage')
  );

create policy vend102_vendors_insert on public.vendors
  for insert to authenticated
  with check (public.can_vendor(auth.uid(), org_id, 'vendor.manage'));

create policy vend102_vendors_update on public.vendors
  for update to authenticated
  using (public.can_vendor(auth.uid(), org_id, 'vendor.manage'))
  with check (public.can_vendor(auth.uid(), org_id, 'vendor.manage'));

create policy vend102_vendors_delete on public.vendors
  for delete to authenticated
  using (public.can_vendor(auth.uid(), org_id, 'vendor.manage'));

drop policy if exists vend102_vendor_aliases_select on public.vendor_aliases;
drop policy if exists vend102_vendor_aliases_insert on public.vendor_aliases;
drop policy if exists vend102_vendor_aliases_update on public.vendor_aliases;
drop policy if exists vend102_vendor_aliases_delete on public.vendor_aliases;

create policy vend102_vendor_aliases_select on public.vendor_aliases
  for select to authenticated
  using (
    public.can_vendor(auth.uid(), org_id, 'vendor.view')
    or public.can_vendor(auth.uid(), org_id, 'vendor.manage')
  );

create policy vend102_vendor_aliases_insert on public.vendor_aliases
  for insert to authenticated
  with check (public.can_vendor(auth.uid(), org_id, 'vendor.manage'));

create policy vend102_vendor_aliases_update on public.vendor_aliases
  for update to authenticated
  using (public.can_vendor(auth.uid(), org_id, 'vendor.manage'))
  with check (public.can_vendor(auth.uid(), org_id, 'vendor.manage'));

create policy vend102_vendor_aliases_delete on public.vendor_aliases
  for delete to authenticated
  using (public.can_vendor(auth.uid(), org_id, 'vendor.manage'));

revoke all on public.vendors from anon;
revoke all on public.vendor_aliases from anon;
grant select, insert, update, delete on public.vendors to authenticated;
grant select, insert, update, delete on public.vendor_aliases to authenticated;
grant all on public.vendors to service_role;
grant all on public.vendor_aliases to service_role;

-- ---------------------------------------------------------------------------
-- Verify helper
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_vendor_identity_schema()
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
  select 'vendors_table'::text,
    to_regclass('public.vendors') is not null,
    'org vendor master table'::text;

  return query
  select 'vendor_aliases_table'::text,
    to_regclass('public.vendor_aliases') is not null,
    'alias / merge history table'::text;

  return query
  select 'tour_vendors_vendor_id'::text,
    (
      to_regclass('public.tour_vendors') is null
      or exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'tour_vendors'
          and column_name = 'vendor_id'
      )
    ),
    'tour engagement link to master'::text;

  return query
  select 'can_vendor_fn'::text,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'can_vendor'
    ),
    'vendor capability RLS helper'::text;
end;
$$;

revoke all on function public.admin_verify_vendor_identity_schema() from public;
grant execute on function public.admin_verify_vendor_identity_schema() to authenticated, service_role;
