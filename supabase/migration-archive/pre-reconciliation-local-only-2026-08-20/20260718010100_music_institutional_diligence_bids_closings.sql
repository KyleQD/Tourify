-- Phase 5 S3–S5: diligence, underwriting, IC, IOIs, bids, auctions, closings.

begin;

do $$
begin
  if to_regclass('public.music_institutional_transaction_cases') is null then
    raise exception 'Apply 20260718010000_music_institutional_participants_deals_dataroom.sql first.';
  end if;
end $$;

create table if not exists public.music_institutional_diligence_requests (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  requester_organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  status text not null default 'open' check (status in (
    'open', 'answered', 'waived', 'escalated', 'closed'
  )),
  severity text not null default 'normal' check (severity in ('low', 'normal', 'high', 'critical')),
  request_text text not null,
  finding_text text,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_underwriting_cases (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  buyer_organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot_id uuid not null references public.music_institutional_catalog_snapshots(id) on delete restrict,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'ic_pending', 'approved', 'rejected', 'superseded'
  )),
  model_version text,
  score_basis_points integer,
  confidence_basis_points integer,
  score_trace jsonb not null default '[]'::jsonb,
  disclaimer text not null default 'Tourify underwriting scores are analytical estimates, not NAV, appraisals, or investment recommendations.',
  created_at timestamptz not null default now(),
  unique (transaction_case_id, buyer_organization_id, version)
);

create table if not exists public.music_institutional_ic_decisions (
  id uuid primary key default gen_random_uuid(),
  underwriting_case_id uuid not null references public.music_institutional_underwriting_cases(id) on delete cascade,
  decision text not null check (decision in ('approve', 'reject', 'defer', 'request_changes')),
  decided_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_iois (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  status text not null default 'submitted' check (status in (
    'draft', 'submitted', 'withdrawn', 'expired'
  )),
  indicative_amount_minor bigint,
  currency text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_auctions (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  status text not null default 'draft' check (status in (
    'draft', 'scheduled', 'open', 'closed', 'selection_pending', 'selected', 'canceled'
  )),
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_bids (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  bidder_organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  auction_id uuid references public.music_institutional_auctions(id) on delete set null,
  version integer not null check (version > 0),
  amount_minor bigint,
  currency text,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'withdrawn', 'accepted', 'rejected', 'expired'
  )),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (transaction_case_id, bidder_organization_id, version)
);

create table if not exists public.music_institutional_negotiation_versions (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  version integer not null check (version > 0),
  terms jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (transaction_case_id, version)
);

create table if not exists public.music_institutional_transaction_closings (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.music_institutional_transaction_cases(id) on delete cascade,
  status text not null default 'pending' check (status in (
    'pending', 'partner_confirmed', 'effective', 'reconciled', 'failed', 'canceled'
  )),
  effective_at timestamptz,
  official_provider_reference text,
  revenue_cutover_at timestamptz,
  post_close_notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.music_institutional_diligence_requests enable row level security;
alter table public.music_institutional_underwriting_cases enable row level security;
alter table public.music_institutional_ic_decisions enable row level security;
alter table public.music_institutional_iois enable row level security;
alter table public.music_institutional_auctions enable row level security;
alter table public.music_institutional_bids enable row level security;
alter table public.music_institutional_negotiation_versions enable row level security;
alter table public.music_institutional_transaction_closings enable row level security;

revoke all on
  public.music_institutional_diligence_requests,
  public.music_institutional_underwriting_cases,
  public.music_institutional_ic_decisions,
  public.music_institutional_iois,
  public.music_institutional_auctions,
  public.music_institutional_bids,
  public.music_institutional_negotiation_versions,
  public.music_institutional_transaction_closings
from anon, authenticated;

grant select, insert, update on public.music_institutional_diligence_requests to authenticated;
grant select, insert, update on public.music_institutional_underwriting_cases to authenticated;
grant select, insert on public.music_institutional_ic_decisions to authenticated;
grant select, insert, update on public.music_institutional_iois to authenticated;
grant select, insert, update on public.music_institutional_auctions to authenticated;
grant select, insert, update on public.music_institutional_bids to authenticated;
grant select, insert on public.music_institutional_negotiation_versions to authenticated;
grant select, insert, update on public.music_institutional_transaction_closings to authenticated;

grant all on
  public.music_institutional_diligence_requests,
  public.music_institutional_underwriting_cases,
  public.music_institutional_ic_decisions,
  public.music_institutional_iois,
  public.music_institutional_auctions,
  public.music_institutional_bids,
  public.music_institutional_negotiation_versions,
  public.music_institutional_transaction_closings
to service_role;

drop policy if exists mi_diligence_access on public.music_institutional_diligence_requests;
create policy mi_diligence_access on public.music_institutional_diligence_requests
for all to authenticated using (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
) or exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = requester_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
)) with check (true);

drop policy if exists mi_uw_access on public.music_institutional_underwriting_cases;
create policy mi_uw_access on public.music_institutional_underwriting_cases
for all to authenticated using (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
) or exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = buyer_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
)) with check (true);

drop policy if exists mi_ic_access on public.music_institutional_ic_decisions;
create policy mi_ic_access on public.music_institutional_ic_decisions
for all to authenticated using (exists (
  select 1 from public.music_institutional_underwriting_cases u
  join public.music_institutional_memberships m on m.organization_id = u.buyer_organization_id
  where u.id = underwriting_case_id and m.user_id = (select auth.uid()) and m.status = 'active'
)) with check (true);

drop policy if exists mi_iois_access on public.music_institutional_iois;
create policy mi_iois_access on public.music_institutional_iois
for all to authenticated using (exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
) or exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
)) with check (true);

drop policy if exists mi_auctions_access on public.music_institutional_auctions;
create policy mi_auctions_access on public.music_institutional_auctions
for all to authenticated using (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
));

drop policy if exists mi_bids_access on public.music_institutional_bids;
create policy mi_bids_access on public.music_institutional_bids
for all to authenticated using (exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = bidder_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
) or exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
)) with check (true);

drop policy if exists mi_nego_access on public.music_institutional_negotiation_versions;
create policy mi_nego_access on public.music_institutional_negotiation_versions
for all to authenticated using (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
)) with check (true);

drop policy if exists mi_closings_access on public.music_institutional_transaction_closings;
create policy mi_closings_access on public.music_institutional_transaction_closings
for all to authenticated using (exists (
  select 1 from public.music_institutional_transaction_cases c
  where c.id = transaction_case_id and c.artist_user_id = (select auth.uid())
)) with check (true);

drop policy if exists mi_diligence_service on public.music_institutional_diligence_requests;
create policy mi_diligence_service on public.music_institutional_diligence_requests for all to service_role using (true) with check (true);
drop policy if exists mi_uw_service on public.music_institutional_underwriting_cases;
create policy mi_uw_service on public.music_institutional_underwriting_cases for all to service_role using (true) with check (true);
drop policy if exists mi_ic_service on public.music_institutional_ic_decisions;
create policy mi_ic_service on public.music_institutional_ic_decisions for all to service_role using (true) with check (true);
drop policy if exists mi_iois_service on public.music_institutional_iois;
create policy mi_iois_service on public.music_institutional_iois for all to service_role using (true) with check (true);
drop policy if exists mi_auctions_service on public.music_institutional_auctions;
create policy mi_auctions_service on public.music_institutional_auctions for all to service_role using (true) with check (true);
drop policy if exists mi_bids_service on public.music_institutional_bids;
create policy mi_bids_service on public.music_institutional_bids for all to service_role using (true) with check (true);
drop policy if exists mi_nego_service on public.music_institutional_negotiation_versions;
create policy mi_nego_service on public.music_institutional_negotiation_versions for all to service_role using (true) with check (true);
drop policy if exists mi_closings_service on public.music_institutional_transaction_closings;
create policy mi_closings_service on public.music_institutional_transaction_closings for all to service_role using (true) with check (true);

comment on table public.music_institutional_bids is 'Direct-sale bids only when classification approved; securities use Phase 4 partners.';
comment on table public.music_institutional_underwriting_cases is 'Analytical underwriting; never NAV or investment advice.';

commit;
