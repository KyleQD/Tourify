-- Phase 5 S0–S2: organizations, membership, classification, cases, data rooms.
-- Partner-led institutional shell. Tourify is not adviser/BD/ATS/TA/custodian/fund admin.

begin;

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  target_org_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_institutional_organizations (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  legal_name text not null,
  organization_type text not null check (organization_type in (
    'buyer', 'seller', 'label', 'publisher', 'fund', 'adviser', 'family_office',
    'broker_dealer', 'administrator', 'other'
  )),
  jurisdiction text,
  status text not null default 'pending' check (status in (
    'pending', 'active', 'suspended', 'closed'
  )),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_institutional_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in (
    'owner', 'admin', 'deal_lead', 'diligence', 'viewer', 'compliance'
  )),
  status text not null default 'active' check (status in ('active', 'invited', 'revoked')),
  authority_scope jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.music_institutional_eligibility_assertions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  assertion_type text not null,
  provider_id text not null,
  verified boolean not null default false,
  effective_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  permitted_product_classes jsonb not null default '[]'::jsonb,
  maximum_amount_minor bigint,
  payload_hash text not null check (length(payload_hash) = 64),
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_transaction_cases (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  seller_organization_id uuid references public.music_institutional_organizations(id) on delete set null,
  artist_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled institutional case',
  status text not null default 'draft' check (status in (
    'draft', 'classification_review', 'diligence', 'marketing', 'negotiation',
    'closing', 'closed', 'withdrawn', 'blocked'
  )),
  classification_status text not null default 'review_required' check (classification_status in (
    'draft', 'review_required', 'approved', 'expired', 'revoked'
  )),
  approved_path text check (approved_path is null or approved_path in (
    'direct_asset_sale', 'license', 'entity_interest', 'private_security',
    'fund_interest', 'structured_finance', 'readiness_only', 'blocked'
  )),
  current_snapshot_id uuid,
  marketplace_offering_id uuid,
  feature_flag_key text not null default 'music_institutional_deals_enabled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_institutional_classifications (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  path text not null check (path in (
    'direct_asset_sale', 'license', 'entity_interest', 'private_security',
    'fund_interest', 'structured_finance', 'readiness_only', 'blocked'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'review_required', 'approved', 'expired', 'revoked'
  )),
  planning_facts jsonb not null default '{}'::jsonb,
  restrictions jsonb not null default '[]'::jsonb,
  approved_by_provider_id text,
  counsel_approved boolean not null default false,
  partner_approved boolean not null default false,
  effective_at timestamptz,
  expires_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_catalog_snapshots (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  catalog_scope_hash text not null check (length(catalog_scope_hash) = 64),
  artist_music_ids jsonb not null default '[]'::jsonb,
  rights_snapshot_ids jsonb not null default '[]'::jsonb,
  royalty_snapshot_ids jsonb not null default '[]'::jsonb,
  valuation_snapshot_ids jsonb not null default '[]'::jsonb,
  deficiency_codes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.music_institutional_transaction_cases
  drop constraint if exists music_institutional_cases_snapshot_fk;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'music_institutional_cases_snapshot_fk') then
    alter table public.music_institutional_transaction_cases
      add constraint music_institutional_cases_snapshot_fk
      foreign key (current_snapshot_id)
      references public.music_institutional_catalog_snapshots(id)
      on delete set null;
  end if;
  if to_regclass('public.music_marketplace_offerings') is not null
     and not exists (select 1 from pg_constraint where conname = 'music_institutional_cases_marketplace_fk') then
    alter table public.music_institutional_transaction_cases
      add constraint music_institutional_cases_marketplace_fk
      foreign key (marketplace_offering_id)
      references public.music_marketplace_offerings(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.music_institutional_data_rooms (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  status text not null default 'draft' check (status in (
    'draft', 'open', 'frozen', 'closed'
  )),
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_data_room_documents (
  id uuid primary key default gen_random_uuid(),
  data_room_id uuid not null references public.music_institutional_data_rooms(id) on delete cascade,
  document_version integer not null check (document_version > 0),
  storage_bucket text not null default 'music-institutional-datarooms',
  storage_path text not null,
  sha256 text not null check (length(sha256) = 64),
  classification text not null check (classification in (
    'public_summary', 'confidential', 'mnpi', 'counsel_only'
  )),
  created_at timestamptz not null default now(),
  unique (data_room_id, storage_path, document_version)
);

create table if not exists public.music_institutional_data_room_access_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.music_institutional_data_room_documents(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.music_institutional_organizations(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_institutional_orgs_enabled', 'Institutional organizations', 'Org membership and authority.', false, 0),
  ('music_institutional_deals_enabled', 'Institutional deals', 'Transaction cases and classification.', false, 0),
  ('music_institutional_dataroom_enabled', 'Institutional data rooms', 'Private hashed data rooms.', false, 0),
  ('music_institutional_diligence_enabled', 'Institutional diligence', 'Diligence requests and findings.', false, 0),
  ('music_institutional_underwriting_enabled', 'Institutional underwriting', 'Underwriting and IC workflow.', false, 0),
  ('music_institutional_bids_auctions_enabled', 'Institutional bids/auctions', 'IOIs, bids, auctions (direct-sale).', false, 0),
  ('music_institutional_closings_enabled', 'Institutional closings', 'Direct sale/license closing shell.', false, 0),
  ('music_institutional_funds_enabled', 'Institutional funds', 'Fund/SPV commitments via partners.', false, 0),
  ('music_institutional_nav_enabled', 'Institutional NAV', 'Fund-admin NAV sync and waterfalls.', false, 0),
  ('music_institutional_secondaries_enabled', 'Institutional secondaries', 'Partner secondaries/tenders receipts.', false, 0),
  ('music_institutional_tokenization_enabled', 'Institutional tokenization', 'Optional token mirrors; never legal SOT.', false, 0),
  ('music_institutional_cross_border_enabled', 'Institutional cross-border', 'Cross-border modules (separate approval).', false, 0),
  ('music_institutional_admin_ops_enabled', 'Institutional admin ops', 'Admin kill switches and approvals.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.music_institutional_organizations enable row level security;
alter table public.music_institutional_memberships enable row level security;
alter table public.music_institutional_eligibility_assertions enable row level security;
alter table public.music_institutional_transaction_cases enable row level security;
alter table public.music_institutional_classifications enable row level security;
alter table public.music_institutional_catalog_snapshots enable row level security;
alter table public.music_institutional_data_rooms enable row level security;
alter table public.music_institutional_data_room_documents enable row level security;
alter table public.music_institutional_data_room_access_logs enable row level security;

revoke all on
  public.music_institutional_organizations,
  public.music_institutional_memberships,
  public.music_institutional_eligibility_assertions,
  public.music_institutional_transaction_cases,
  public.music_institutional_classifications,
  public.music_institutional_catalog_snapshots,
  public.music_institutional_data_rooms,
  public.music_institutional_data_room_documents,
  public.music_institutional_data_room_access_logs
from anon, authenticated;

grant select, insert, update on public.music_institutional_organizations to authenticated;
grant select, insert, update on public.music_institutional_memberships to authenticated;
grant select on public.music_institutional_eligibility_assertions to authenticated;
grant select, insert, update on public.music_institutional_transaction_cases to authenticated;
grant select, insert on public.music_institutional_classifications to authenticated;
grant select, insert on public.music_institutional_catalog_snapshots to authenticated;
grant select, insert, update on public.music_institutional_data_rooms to authenticated;
grant select, insert on public.music_institutional_data_room_documents to authenticated;
grant select, insert on public.music_institutional_data_room_access_logs to authenticated;

grant all on
  public.music_institutional_organizations,
  public.music_institutional_memberships,
  public.music_institutional_eligibility_assertions,
  public.music_institutional_transaction_cases,
  public.music_institutional_classifications,
  public.music_institutional_catalog_snapshots,
  public.music_institutional_data_rooms,
  public.music_institutional_data_room_documents,
  public.music_institutional_data_room_access_logs
to service_role;

drop policy if exists mi_orgs_owner on public.music_institutional_organizations;
create policy mi_orgs_owner on public.music_institutional_organizations
for all to authenticated using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1 from public.music_institutional_memberships m
    where m.organization_id = id and m.user_id = (select auth.uid()) and m.status = 'active'
  )
) with check (owner_user_id = (select auth.uid()));

drop policy if exists mi_memberships_self on public.music_institutional_memberships;
create policy mi_memberships_self on public.music_institutional_memberships
for all to authenticated using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.music_institutional_organizations o
    where o.id = organization_id and o.owner_user_id = (select auth.uid())
  )
) with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.music_institutional_organizations o
    where o.id = organization_id and o.owner_user_id = (select auth.uid())
  )
);

drop policy if exists mi_eligibility_member on public.music_institutional_eligibility_assertions;
create policy mi_eligibility_member on public.music_institutional_eligibility_assertions
for select to authenticated using (exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
) or exists (
  select 1 from public.music_institutional_organizations o
  where o.id = organization_id and o.owner_user_id = (select auth.uid())
));

drop policy if exists mi_cases_access on public.music_institutional_transaction_cases;
create policy mi_cases_access on public.music_institutional_transaction_cases
for all to authenticated using (
  artist_user_id = (select auth.uid())
  or exists (
    select 1 from public.music_institutional_memberships m
    where m.organization_id = seller_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
  )
) with check (
  artist_user_id = (select auth.uid())
  or exists (
    select 1 from public.music_institutional_memberships m
    where m.organization_id = seller_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
  )
);

drop policy if exists mi_classifications_access on public.music_institutional_classifications;
create policy mi_classifications_access on public.music_institutional_classifications
for all to authenticated using (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and (
    c.artist_user_id = (select auth.uid())
    or exists (
      select 1 from public.music_institutional_memberships m
      where m.organization_id = c.seller_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  )
)) with check (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
));

drop policy if exists mi_snapshots_access on public.music_institutional_catalog_snapshots;
create policy mi_snapshots_access on public.music_institutional_catalog_snapshots
for all to authenticated using (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
));

drop policy if exists mi_datarooms_access on public.music_institutional_data_rooms;
create policy mi_datarooms_access on public.music_institutional_data_rooms
for all to authenticated using (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
));

drop policy if exists mi_dataroom_docs_access on public.music_institutional_data_room_documents;
create policy mi_dataroom_docs_access on public.music_institutional_data_room_documents
for all to authenticated using (exists (
  select 1 from public.music_institutional_data_rooms r
  join public.music_institutional_transaction_cases c on c.id = r.transaction_case_id
  where r.id = data_room_id and c.artist_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_institutional_data_rooms r
  join public.music_institutional_transaction_cases c on c.id = r.transaction_case_id
  where r.id = data_room_id and c.artist_user_id = (select auth.uid())
));

drop policy if exists mi_dataroom_logs_insert on public.music_institutional_data_room_access_logs;
create policy mi_dataroom_logs_insert on public.music_institutional_data_room_access_logs
for insert to authenticated with check (actor_user_id = (select auth.uid()));
drop policy if exists mi_dataroom_logs_select on public.music_institutional_data_room_access_logs;
create policy mi_dataroom_logs_select on public.music_institutional_data_room_access_logs
for select to authenticated using (actor_user_id = (select auth.uid()));

drop policy if exists mi_orgs_service on public.music_institutional_organizations;
create policy mi_orgs_service on public.music_institutional_organizations for all to service_role using (true) with check (true);
drop policy if exists mi_memberships_service on public.music_institutional_memberships;
create policy mi_memberships_service on public.music_institutional_memberships for all to service_role using (true) with check (true);
drop policy if exists mi_eligibility_service on public.music_institutional_eligibility_assertions;
create policy mi_eligibility_service on public.music_institutional_eligibility_assertions for all to service_role using (true) with check (true);
drop policy if exists mi_cases_service on public.music_institutional_transaction_cases;
create policy mi_cases_service on public.music_institutional_transaction_cases for all to service_role using (true) with check (true);
drop policy if exists mi_classifications_service on public.music_institutional_classifications;
create policy mi_classifications_service on public.music_institutional_classifications for all to service_role using (true) with check (true);
drop policy if exists mi_snapshots_service on public.music_institutional_catalog_snapshots;
create policy mi_snapshots_service on public.music_institutional_catalog_snapshots for all to service_role using (true) with check (true);
drop policy if exists mi_datarooms_service on public.music_institutional_data_rooms;
create policy mi_datarooms_service on public.music_institutional_data_rooms for all to service_role using (true) with check (true);
drop policy if exists mi_dataroom_docs_service on public.music_institutional_data_room_documents;
create policy mi_dataroom_docs_service on public.music_institutional_data_room_documents for all to service_role using (true) with check (true);
drop policy if exists mi_dataroom_logs_service on public.music_institutional_data_room_access_logs;
create policy mi_dataroom_logs_service on public.music_institutional_data_room_access_logs for all to service_role using (true) with check (true);

comment on table public.music_institutional_transaction_cases is 'Institutional deal cases; bids/closing require approved classification.';
comment on table public.music_institutional_eligibility_assertions is 'Provider-sourced eligibility; Tourify does not store raw QP/QIB docs.';

commit;
