-- Phase 19: identifier/protocol resolution stubs + sensitive ethics reviews.

begin;

create table if not exists public.creator_treaty_legacy_identifier_resolutions (
  id uuid primary key default gen_random_uuid(),
  legacy_cycle_id uuid references public.creator_treaty_legacy_cycles(id) on delete cascade,
  identifier_ref text not null,
  resolution_target text,
  status text not null default 'draft' check (status in (
    'draft', 'proposed', 'resolved', 'ambiguous', 'revoked'
  )),
  creates_universal_identity boolean not null default false,
  adjudicates_ownership boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_legacy_protocol_resolutions (
  id uuid primary key default gen_random_uuid(),
  legacy_cycle_id uuid references public.creator_treaty_legacy_cycles(id) on delete cascade,
  protocol_ref text not null,
  successor_spec_ref text,
  status text not null default 'draft' check (status in (
    'draft', 'proposed', 'accepted', 'deprecated', 'rejected'
  )),
  open_spec boolean not null default true,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_legacy_ethics_reviews (
  id uuid primary key default gen_random_uuid(),
  legacy_cycle_id uuid references public.creator_treaty_legacy_cycles(id) on delete cascade,
  review_key text not null,
  purpose text not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'approved', 'denied', 'expired'
  )),
  sensitive_reveal_requested boolean not null default false,
  privacy_override_requested boolean not null default false,
  creator_rights_affected boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(legacy_cycle_id, review_key)
);

alter table public.creator_treaty_legacy_identifier_resolutions enable row level security;
alter table public.creator_treaty_legacy_protocol_resolutions enable row level security;
alter table public.creator_treaty_legacy_ethics_reviews enable row level security;

revoke all on
  public.creator_treaty_legacy_identifier_resolutions,
  public.creator_treaty_legacy_protocol_resolutions,
  public.creator_treaty_legacy_ethics_reviews
from anon, authenticated;

grant select on public.creator_treaty_legacy_identifier_resolutions to authenticated;
grant select on public.creator_treaty_legacy_protocol_resolutions to authenticated;
grant select on public.creator_treaty_legacy_ethics_reviews to authenticated;

grant all on
  public.creator_treaty_legacy_identifier_resolutions,
  public.creator_treaty_legacy_protocol_resolutions,
  public.creator_treaty_legacy_ethics_reviews
to service_role;

drop policy if exists p19_identifiers_read on public.creator_treaty_legacy_identifier_resolutions;
create policy p19_identifiers_read on public.creator_treaty_legacy_identifier_resolutions for select to authenticated using (true);
drop policy if exists p19_protocols_read on public.creator_treaty_legacy_protocol_resolutions;
create policy p19_protocols_read on public.creator_treaty_legacy_protocol_resolutions for select to authenticated using (true);
drop policy if exists p19_ethics_read on public.creator_treaty_legacy_ethics_reviews;
create policy p19_ethics_read on public.creator_treaty_legacy_ethics_reviews for select to authenticated using (true);

drop policy if exists p19_identifiers_service on public.creator_treaty_legacy_identifier_resolutions;
create policy p19_identifiers_service on public.creator_treaty_legacy_identifier_resolutions for all to service_role using (true) with check (true);
drop policy if exists p19_protocols_service on public.creator_treaty_legacy_protocol_resolutions;
create policy p19_protocols_service on public.creator_treaty_legacy_protocol_resolutions for all to service_role using (true) with check (true);
drop policy if exists p19_ethics_service on public.creator_treaty_legacy_ethics_reviews;
create policy p19_ethics_service on public.creator_treaty_legacy_ethics_reviews for all to service_role using (true) with check (true);

commit;
