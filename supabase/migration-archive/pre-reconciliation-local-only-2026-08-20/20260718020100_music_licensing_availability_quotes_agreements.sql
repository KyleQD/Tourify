-- Phase 6 S1/S4/S7: availability, clearance, quotes, approvals, agreements.

begin;

create table if not exists public.music_license_availability (
  id uuid primary key default gen_random_uuid(),
  asset_kind text not null check (asset_kind in ('composition', 'recording', 'artwork', 'likeness', 'other')),
  asset_id uuid,
  artist_music_id uuid references public.artist_music(id) on delete cascade,
  right_category text not null,
  authority_record_id uuid,
  version integer not null default 1,
  territories text[] not null default '{}',
  permitted_uses jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  status text not null default 'not_configured' check (status in (
    'not_configured', 'inquiry_only', 'pre_cleared', 'quote_required',
    'approval_required', 'temporarily_unavailable', 'territory_restricted',
    'conflicted', 'expired', 'unavailable', 'manual_clearance'
  )),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_license_clearance_legs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.music_license_requests(id) on delete cascade,
  request_version integer not null,
  asset_kind text not null,
  asset_id uuid,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  right_category text not null,
  required_approvers jsonb not null default '[]'::jsonb,
  authority_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'satisfied', 'not_applicable', 'blocked'
  )),
  blockers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_license_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.music_license_requests(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in (
    'draft', 'issued', 'countered', 'accepted', 'rejected', 'expired', 'superseded', 'withdrawn'
  )),
  currency text not null default 'USD',
  amount_minor bigint,
  terms jsonb not null default '{}'::jsonb,
  valid_until timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, version)
);

create table if not exists public.music_license_approvals (
  id uuid primary key default gen_random_uuid(),
  clearance_leg_id uuid not null references public.music_license_clearance_legs(id) on delete cascade,
  request_version integer not null,
  party_id uuid not null,
  authority_record_id uuid,
  decision text not null check (decision in ('approved', 'rejected', 'conditional', 'deferred')),
  conditions jsonb not null default '[]'::jsonb,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz not null default now(),
  unique (clearance_leg_id, request_version, party_id)
);

create table if not exists public.music_license_agreements (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  request_id uuid not null references public.music_license_requests(id) on delete cascade,
  quote_id uuid references public.music_license_quotes(id) on delete set null,
  current_version integer not null default 1,
  status text not null default 'draft' check (status in (
    'draft', 'pending_signatures', 'executed', 'effective', 'suspended', 'terminated', 'expired', 'amended'
  )),
  signature_provider text,
  signature_envelope_id text,
  effective_at timestamptz,
  expires_at timestamptz,
  terms jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_license_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.music_license_agreements(id) on delete cascade,
  version integer not null,
  document_hash text,
  storage_path text,
  change_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (agreement_id, version)
);

alter table public.music_license_availability enable row level security;
alter table public.music_license_clearance_legs enable row level security;
alter table public.music_license_quotes enable row level security;
alter table public.music_license_approvals enable row level security;
alter table public.music_license_agreements enable row level security;
alter table public.music_license_agreement_versions enable row level security;

revoke all on
  public.music_license_availability,
  public.music_license_clearance_legs,
  public.music_license_quotes,
  public.music_license_approvals,
  public.music_license_agreements,
  public.music_license_agreement_versions
from anon, authenticated;

grant select, insert, update on public.music_license_availability to authenticated;
grant select on public.music_license_clearance_legs to authenticated;
grant select, insert, update on public.music_license_quotes to authenticated;
grant select, insert on public.music_license_approvals to authenticated;
grant select, insert, update on public.music_license_agreements to authenticated;
grant select on public.music_license_agreement_versions to authenticated;

grant all on
  public.music_license_availability,
  public.music_license_clearance_legs,
  public.music_license_quotes,
  public.music_license_approvals,
  public.music_license_agreements,
  public.music_license_agreement_versions
to service_role;

drop policy if exists ml_avail_access on public.music_license_availability;
create policy ml_avail_access on public.music_license_availability
for all to authenticated using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.artist_music am
    where am.id = artist_music_id and am.user_id = (select auth.uid())
  )
) with check (created_by = (select auth.uid()));

drop policy if exists ml_legs_access on public.music_license_clearance_legs;
create policy ml_legs_access on public.music_license_clearance_legs
for select to authenticated using (exists (
  select 1 from public.music_license_requests r
  where r.id = request_id and (
    r.created_by = (select auth.uid())
    or exists (
      select 1 from public.artist_music am
      where am.id = r.artist_music_id and am.user_id = (select auth.uid())
    )
  )
));

drop policy if exists ml_quotes_access on public.music_license_quotes;
create policy ml_quotes_access on public.music_license_quotes
for all to authenticated using (exists (
  select 1 from public.music_license_requests r
  where r.id = request_id and (
    r.created_by = (select auth.uid())
    or exists (
      select 1 from public.artist_music am
      where am.id = r.artist_music_id and am.user_id = (select auth.uid())
    )
  )
)) with check (created_by = (select auth.uid()));

drop policy if exists ml_approvals_access on public.music_license_approvals;
create policy ml_approvals_access on public.music_license_approvals
for all to authenticated using (exists (
  select 1 from public.music_license_clearance_legs l
  join public.music_license_requests r on r.id = l.request_id
  where l.id = clearance_leg_id and (
    r.created_by = (select auth.uid())
    or exists (
      select 1 from public.artist_music am
      where am.id = r.artist_music_id and am.user_id = (select auth.uid())
    )
  )
)) with check (true);

drop policy if exists ml_agreements_access on public.music_license_agreements;
create policy ml_agreements_access on public.music_license_agreements
for all to authenticated using (exists (
  select 1 from public.music_license_requests r
  where r.id = request_id and (
    r.created_by = (select auth.uid())
    or exists (
      select 1 from public.artist_music am
      where am.id = r.artist_music_id and am.user_id = (select auth.uid())
    )
  )
)) with check (created_by = (select auth.uid()));

drop policy if exists ml_agreement_versions_access on public.music_license_agreement_versions;
create policy ml_agreement_versions_access on public.music_license_agreement_versions
for select to authenticated using (exists (
  select 1 from public.music_license_agreements a
  join public.music_license_requests r on r.id = a.request_id
  where a.id = agreement_id and r.created_by = (select auth.uid())
));

drop policy if exists ml_avail_service on public.music_license_availability;
create policy ml_avail_service on public.music_license_availability for all to service_role using (true) with check (true);
drop policy if exists ml_legs_service on public.music_license_clearance_legs;
create policy ml_legs_service on public.music_license_clearance_legs for all to service_role using (true) with check (true);
drop policy if exists ml_quotes_service on public.music_license_quotes;
create policy ml_quotes_service on public.music_license_quotes for all to service_role using (true) with check (true);
drop policy if exists ml_approvals_service on public.music_license_approvals;
create policy ml_approvals_service on public.music_license_approvals for all to service_role using (true) with check (true);
drop policy if exists ml_agreements_service on public.music_license_agreements;
create policy ml_agreements_service on public.music_license_agreements for all to service_role using (true) with check (true);
drop policy if exists ml_agreement_versions_service on public.music_license_agreement_versions;
create policy ml_agreement_versions_service on public.music_license_agreement_versions for all to service_role using (true) with check (true);

comment on table public.music_license_agreements is 'Only executed+effective agreements authorize use; quotes are not licences.';

commit;
