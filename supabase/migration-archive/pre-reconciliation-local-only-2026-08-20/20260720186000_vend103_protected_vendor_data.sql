-- VEND-103 — Protected vendor tax/payment/contact/compliance fields + capability
-- Additive only. Never reset the database.

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Grant vendor.sensitive to owner / admin / finance role defaults
-- ---------------------------------------------------------------------------
update public.org_role_permissions
set perms = (
  select array_agg(distinct p order by p)
  from unnest(coalesce(perms, '{}'::text[]) || array['vendor.sensitive']::text[]) as p
)
where role in ('owner', 'admin', 'finance')
  and not ('vendor.sensitive' = any (coalesce(perms, '{}'::text[])));

-- ---------------------------------------------------------------------------
-- Protected columns on vendor master (nullable; projected in app)
-- ---------------------------------------------------------------------------
alter table if exists public.vendors
  add column if not exists tax_id_last4 text,
  add column if not exists payment_account_last4 text,
  add column if not exists payment_method text,
  add column if not exists w9_on_file boolean not null default false,
  add column if not exists compliance_notes text,
  add column if not exists insurance_expires_on date,
  add column if not exists sensitive_retention_hold boolean not null default false;

do $$
begin
  if to_regclass('public.vendors') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'vendors_tax_id_last4_check'
     ) then
    alter table public.vendors
      add constraint vendors_tax_id_last4_check
      check (tax_id_last4 is null or tax_id_last4 ~ '^[0-9]{4}$');
  end if;

  if to_regclass('public.vendors') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'vendors_payment_account_last4_check'
     ) then
    alter table public.vendors
      add constraint vendors_payment_account_last4_check
      check (payment_account_last4 is null or payment_account_last4 ~ '^[0-9]{4}$');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- vendor_documents (compliance artifacts; RLS requires vendor.sensitive)
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  doc_type text not null
    check (doc_type in (
      'insurance', 'permit', 'certification', 'tax_form', 'w9', 'coi', 'other'
    )),
  title text not null,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'expired')),
  issued_on date,
  expires_on date,
  storage_path text,
  checksum text,
  verification_notes text,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_documents_title_len check (char_length(title) between 1 and 240)
);

create index if not exists idx_vendor_documents_org_vendor
  on public.vendor_documents (org_id, vendor_id);
create index if not exists idx_vendor_documents_expires
  on public.vendor_documents (org_id, expires_on)
  where expires_on is not null;

alter table public.vendor_documents enable row level security;
alter table public.vendor_documents force row level security;

drop policy if exists vend103_vendor_documents_select on public.vendor_documents;
drop policy if exists vend103_vendor_documents_insert on public.vendor_documents;
drop policy if exists vend103_vendor_documents_update on public.vendor_documents;
drop policy if exists vend103_vendor_documents_delete on public.vendor_documents;

-- Full document rows (including storage_path) require vendor.sensitive
create policy vend103_vendor_documents_select on public.vendor_documents
  for select to authenticated
  using (public.can_vendor(auth.uid(), org_id, 'vendor.sensitive'));

create policy vend103_vendor_documents_insert on public.vendor_documents
  for insert to authenticated
  with check (public.can_vendor(auth.uid(), org_id, 'vendor.sensitive'));

create policy vend103_vendor_documents_update on public.vendor_documents
  for update to authenticated
  using (public.can_vendor(auth.uid(), org_id, 'vendor.sensitive'))
  with check (public.can_vendor(auth.uid(), org_id, 'vendor.sensitive'));

create policy vend103_vendor_documents_delete on public.vendor_documents
  for delete to authenticated
  using (public.can_vendor(auth.uid(), org_id, 'vendor.sensitive'));

revoke all on public.vendor_documents from anon;
grant select, insert, update, delete on public.vendor_documents to authenticated;
grant all on public.vendor_documents to service_role;

-- ---------------------------------------------------------------------------
-- Verify helper
-- ---------------------------------------------------------------------------
create or replace function public.admin_verify_vendor_protected_data()
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
  select 'vendor_sensitive_on_owner'::text,
    exists (
      select 1 from public.org_role_permissions
      where role = 'owner' and 'vendor.sensitive' = any (perms)
    ),
    'owner role includes vendor.sensitive'::text;

  return query
  select 'vendor_documents_table'::text,
    to_regclass('public.vendor_documents') is not null,
    'compliance documents table'::text;

  return query
  select 'vendors_tax_columns'::text,
    (
      to_regclass('public.vendors') is null
      or exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'vendors'
          and column_name = 'tax_id_last4'
      )
    ),
    'tax/payment columns on vendors'::text;
end;
$$;

revoke all on function public.admin_verify_vendor_protected_data() from public;
grant execute on function public.admin_verify_vendor_protected_data() to authenticated, service_role;
