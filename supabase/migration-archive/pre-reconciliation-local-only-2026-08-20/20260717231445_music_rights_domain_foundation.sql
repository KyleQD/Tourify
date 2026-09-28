-- Phase 2 P2-B: rights graph foundation (additive).
-- artist_music remains the canonical playable catalog row.

begin;

create table public.music_rights_projects (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  artist_music_id uuid not null references public.artist_music(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in (
    'draft', 'in_progress', 'pending_signatures', 'pending_review', 'issued', 'disputed', 'suspended', 'archived'
  )),
  version integer not null default 1 check (version > 0),
  completion jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_music_id)
);

create index music_rights_projects_owner_idx
  on public.music_rights_projects (owner_user_id, updated_at desc);

create table public.music_rights_musical_works (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  alternate_titles text[] not null default '{}',
  iswc text,
  work_type text not null default 'original' check (work_type in (
    'original', 'adaptation', 'arrangement', 'medley', 'unknown'
  )),
  language_code text,
  lyrics_excerpt text,
  status text not null default 'draft' check (status in ('draft', 'active', 'superseded', 'disputed')),
  version integer not null default 1 check (version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_works_project_idx
  on public.music_rights_musical_works (project_id, updated_at desc);

create table public.music_rights_sound_recordings (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  artist_music_id uuid not null unique references public.artist_music(id) on delete cascade,
  musical_work_id uuid references public.music_rights_musical_works(id) on delete set null,
  title text not null,
  isrc text,
  recording_type text not null default 'original' check (recording_type in (
    'original', 'cover', 'remix', 'live', 'remaster', 'sample_based', 'unknown'
  )),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  original_release_date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'superseded', 'disputed')),
  version integer not null default 1 check (version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_recordings_project_idx
  on public.music_rights_sound_recordings (project_id, updated_at desc);
create index music_rights_recordings_work_idx
  on public.music_rights_sound_recordings (musical_work_id);

create table public.music_rights_releases (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  release_type text not null default 'single' check (release_type in (
    'single', 'ep', 'album', 'mixtape', 'compilation', 'other'
  )),
  upc text,
  release_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_rights_release_tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.music_rights_releases(id) on delete cascade,
  sound_recording_id uuid not null references public.music_rights_sound_recordings(id) on delete cascade,
  track_number integer check (track_number is null or track_number > 0),
  disc_number integer not null default 1 check (disc_number > 0),
  created_at timestamptz not null default now(),
  unique (release_id, sound_recording_id)
);

create table public.music_rights_asset_relationships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  relationship_type text not null check (relationship_type in (
    'cover_of_work', 'remix_of_recording', 'sample_of_recording', 'sample_of_work',
    'adaptation_of_work', 'leased_beat_source', 'interpolation_of_work', 'other'
  )),
  from_subject_type text not null check (from_subject_type in ('musical_work', 'sound_recording', 'release')),
  from_subject_id uuid not null,
  to_subject_type text not null check (to_subject_type in ('musical_work', 'sound_recording', 'release')),
  to_subject_id uuid not null,
  clearance_status text not null default 'unknown' check (clearance_status in (
    'unknown', 'not_required', 'pending', 'cleared', 'denied', 'disputed'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (relationship_type, from_subject_type, from_subject_id, to_subject_type, to_subject_id)
);

create table public.music_rights_parties (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  party_type text not null check (party_type in ('person', 'organization')),
  display_name text not null,
  legal_name text,
  stage_name text,
  email text,
  status text not null default 'invited' check (status in (
    'draft', 'invited', 'active', 'declined', 'revoked'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_parties_project_idx
  on public.music_rights_parties (project_id, status);

create table public.music_rights_party_profiles (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null unique references public.music_rights_parties(id) on delete cascade,
  biography text,
  roles text[] not null default '{}',
  contact jsonb not null default '{}'::jsonb,
  privacy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_rights_party_identifiers (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.music_rights_parties(id) on delete cascade,
  identifier_type text not null check (identifier_type in (
    'ipi', 'ipn', 'isni', 'pro_member', 'publisher_code', 'custom', 'other'
  )),
  identifier_value text not null,
  issuer text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (party_id, identifier_type, identifier_value)
);

create table public.music_rights_party_affiliations (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.music_rights_parties(id) on delete cascade,
  organization_name text not null,
  affiliation_type text not null check (affiliation_type in (
    'pro', 'publisher', 'label', 'distributor', 'collective', 'other'
  )),
  territory_codes text[] not null default '{WORLDWIDE}',
  valid_from date,
  valid_until date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.music_rights_authorities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  party_id uuid not null references public.music_rights_parties(id) on delete cascade,
  authority_type text not null check (authority_type in (
    'owner', 'authorized_representative', 'admin_delegate', 'reviewer', 'signer'
  )),
  scope text not null default 'project' check (scope in ('project', 'work', 'recording', 'agreement')),
  status text not null default 'active' check (status in ('pending', 'active', 'revoked', 'expired')),
  evidence jsonb not null default '{}'::jsonb,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, party_id, authority_type, scope)
);

create table public.music_rights_contributions (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  party_id uuid not null references public.music_rights_parties(id) on delete cascade,
  subject_type text not null check (subject_type in ('musical_work', 'sound_recording')),
  subject_id uuid not null,
  role text not null,
  instruments text[] not null default '{}',
  confirmation_status text not null default 'proposed' check (confirmation_status in (
    'proposed', 'accepted', 'countered', 'rejected', 'disputed', 'withdrawn'
  )),
  is_featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_contributions_project_idx
  on public.music_rights_contributions (project_id, confirmation_status);

create table public.music_rights_credit_preferences (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null unique references public.music_rights_contributions(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'pending')),
  display_name_override text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_rights_claims (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  subject_type text not null check (subject_type in ('musical_work', 'sound_recording', 'release', 'income_stream')),
  subject_id uuid not null,
  claimant_party_id uuid not null references public.music_rights_parties(id) on delete restrict,
  claim_type text not null check (claim_type in (
    'ownership', 'administration', 'collection', 'exclusive_license', 'nonexclusive_license',
    'income_participation', 'approval_right', 'recoupment', 'security_interest', 'unknown_pending'
  )),
  rights_category text not null,
  share_numerator text not null default '0',
  share_denominator text not null default '1',
  share_unknown boolean not null default false,
  original_share_text text,
  original_share_scale text,
  valid_from date,
  valid_until date,
  perpetual boolean not null default true,
  exclusive boolean,
  agreement_version_id uuid,
  status text not null default 'proposed' check (status in (
    'proposed', 'accepted', 'rejected', 'disputed', 'superseded', 'terminated'
  )),
  supersedes_claim_id uuid references public.music_rights_claims(id) on delete set null,
  evidence jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (share_unknown = true or (share_numerator ~ '^[0-9]+$' and share_denominator ~ '^[1-9][0-9]*$')),
  check (perpetual = true or valid_until is not null)
);

create index music_rights_claims_project_idx
  on public.music_rights_claims (project_id, status, claim_type);
create index music_rights_claims_subject_idx
  on public.music_rights_claims (subject_type, subject_id);

create table public.music_rights_claim_territories (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.music_rights_claims(id) on delete cascade,
  territory_code text not null,
  created_at timestamptz not null default now(),
  unique (claim_id, territory_code)
);

create table public.music_rights_income_participations (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique references public.music_rights_claims(id) on delete cascade,
  basis text not null default 'net_receipts',
  deductions jsonb not null default '[]'::jsonb,
  recoupment_priority integer,
  revenue_scope text[] not null default '{}',
  audit_rights boolean not null default false,
  payment_obligation text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_rights_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'system' check (actor_type in ('artist', 'contributor', 'reviewer', 'system')),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index music_rights_audit_project_idx
  on public.music_rights_audit_events (project_id, created_at desc);

create table public.music_rights_outbox_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.music_rights_projects(id) on delete set null,
  event_type text not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'completed', 'failed', 'dead_letter'
  )),
  attempts integer not null default 0 check (attempts >= 0),
  next_retry_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  source_event_id uuid,
  trace_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, dedupe_key)
);

create index music_rights_outbox_status_idx
  on public.music_rights_outbox_events (status, next_retry_at nulls first, created_at);

-- Prevent ordinary mutation of audit events
create or replace function public.music_rights_reject_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'music_rights_audit_events are append-only';
end;
$$;

drop trigger if exists music_rights_audit_no_update on public.music_rights_audit_events;
create trigger music_rights_audit_no_update
before update or delete on public.music_rights_audit_events
for each row execute function public.music_rights_reject_audit_mutation();

-- RLS
alter table public.music_rights_projects enable row level security;
alter table public.music_rights_musical_works enable row level security;
alter table public.music_rights_sound_recordings enable row level security;
alter table public.music_rights_releases enable row level security;
alter table public.music_rights_release_tracks enable row level security;
alter table public.music_rights_asset_relationships enable row level security;
alter table public.music_rights_parties enable row level security;
alter table public.music_rights_party_profiles enable row level security;
alter table public.music_rights_party_identifiers enable row level security;
alter table public.music_rights_party_affiliations enable row level security;
alter table public.music_rights_authorities enable row level security;
alter table public.music_rights_contributions enable row level security;
alter table public.music_rights_credit_preferences enable row level security;
alter table public.music_rights_claims enable row level security;
alter table public.music_rights_claim_territories enable row level security;
alter table public.music_rights_income_participations enable row level security;
alter table public.music_rights_audit_events enable row level security;
alter table public.music_rights_outbox_events enable row level security;

revoke all on
  public.music_rights_projects,
  public.music_rights_musical_works,
  public.music_rights_sound_recordings,
  public.music_rights_releases,
  public.music_rights_release_tracks,
  public.music_rights_asset_relationships,
  public.music_rights_parties,
  public.music_rights_party_profiles,
  public.music_rights_party_identifiers,
  public.music_rights_party_affiliations,
  public.music_rights_authorities,
  public.music_rights_contributions,
  public.music_rights_credit_preferences,
  public.music_rights_claims,
  public.music_rights_claim_territories,
  public.music_rights_income_participations,
  public.music_rights_audit_events,
  public.music_rights_outbox_events
from anon, authenticated;

grant select, insert, update on
  public.music_rights_projects,
  public.music_rights_musical_works,
  public.music_rights_sound_recordings,
  public.music_rights_releases,
  public.music_rights_parties,
  public.music_rights_contributions,
  public.music_rights_claims
to authenticated;

grant select, insert on
  public.music_rights_release_tracks,
  public.music_rights_asset_relationships,
  public.music_rights_party_profiles,
  public.music_rights_party_identifiers,
  public.music_rights_party_affiliations,
  public.music_rights_authorities,
  public.music_rights_credit_preferences,
  public.music_rights_claim_territories,
  public.music_rights_income_participations,
  public.music_rights_audit_events
to authenticated;

grant select on public.music_rights_outbox_events to authenticated;

grant all on
  public.music_rights_projects,
  public.music_rights_musical_works,
  public.music_rights_sound_recordings,
  public.music_rights_releases,
  public.music_rights_release_tracks,
  public.music_rights_asset_relationships,
  public.music_rights_parties,
  public.music_rights_party_profiles,
  public.music_rights_party_identifiers,
  public.music_rights_party_affiliations,
  public.music_rights_authorities,
  public.music_rights_contributions,
  public.music_rights_credit_preferences,
  public.music_rights_claims,
  public.music_rights_claim_territories,
  public.music_rights_income_participations,
  public.music_rights_audit_events,
  public.music_rights_outbox_events
to service_role;

-- Owner policies (project owner via owner_user_id or project join)
create policy music_rights_projects_owner_select on public.music_rights_projects
for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy music_rights_projects_owner_insert on public.music_rights_projects
for insert to authenticated with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.artist_music track
    where track.id = artist_music_id and track.user_id = (select auth.uid())
  )
);
create policy music_rights_projects_owner_update on public.music_rights_projects
for update to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_rights_works_owner_select on public.music_rights_musical_works
for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy music_rights_works_owner_insert on public.music_rights_musical_works
for insert to authenticated with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);
create policy music_rights_works_owner_update on public.music_rights_musical_works
for update to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_rights_recordings_owner_select on public.music_rights_sound_recordings
for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy music_rights_recordings_owner_insert on public.music_rights_sound_recordings
for insert to authenticated with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.artist_music track
    where track.id = artist_music_id and track.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);
create policy music_rights_recordings_owner_update on public.music_rights_sound_recordings
for update to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_rights_releases_owner_all on public.music_rights_releases
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_rights_release_tracks_owner_select on public.music_rights_release_tracks
for select to authenticated using (exists (
  select 1 from public.music_rights_releases r
  where r.id = release_id and r.owner_user_id = (select auth.uid())
));
create policy music_rights_release_tracks_owner_insert on public.music_rights_release_tracks
for insert to authenticated with check (exists (
  select 1 from public.music_rights_releases r
  where r.id = release_id and r.owner_user_id = (select auth.uid())
));

create policy music_rights_asset_rel_owner_select on public.music_rights_asset_relationships
for select to authenticated using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_asset_rel_owner_insert on public.music_rights_asset_relationships
for insert to authenticated with check (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));

create policy music_rights_parties_owner_select on public.music_rights_parties
for select to authenticated using (
  (select auth.uid()) = owner_user_id
  or (select auth.uid()) = linked_user_id
);
create policy music_rights_parties_owner_insert on public.music_rights_parties
for insert to authenticated with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);
create policy music_rights_parties_owner_update on public.music_rights_parties
for update to authenticated
using ((select auth.uid()) = owner_user_id or (select auth.uid()) = linked_user_id)
with check ((select auth.uid()) = owner_user_id or (select auth.uid()) = linked_user_id);

create policy music_rights_party_profiles_owner on public.music_rights_party_profiles
for all to authenticated
using (exists (
  select 1 from public.music_rights_parties party
  where party.id = party_id
    and (party.owner_user_id = (select auth.uid()) or party.linked_user_id = (select auth.uid()))
))
with check (exists (
  select 1 from public.music_rights_parties party
  where party.id = party_id and party.owner_user_id = (select auth.uid())
));

create policy music_rights_party_identifiers_owner on public.music_rights_party_identifiers
for all to authenticated
using (exists (
  select 1 from public.music_rights_parties party
  where party.id = party_id and party.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_rights_parties party
  where party.id = party_id and party.owner_user_id = (select auth.uid())
));

create policy music_rights_party_affiliations_owner on public.music_rights_party_affiliations
for all to authenticated
using (exists (
  select 1 from public.music_rights_parties party
  where party.id = party_id and party.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_rights_parties party
  where party.id = party_id and party.owner_user_id = (select auth.uid())
));

create policy music_rights_authorities_owner on public.music_rights_authorities
for all to authenticated
using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));

create policy music_rights_contributions_owner_select on public.music_rights_contributions
for select to authenticated using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and (
    p.owner_user_id = (select auth.uid())
    or exists (
      select 1 from public.music_rights_parties party
      where party.id = music_rights_contributions.party_id
        and party.linked_user_id = (select auth.uid())
    )
  )
));
create policy music_rights_contributions_owner_insert on public.music_rights_contributions
for insert to authenticated with check (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_contributions_owner_update on public.music_rights_contributions
for update to authenticated
using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and (
    p.owner_user_id = (select auth.uid())
    or exists (
      select 1 from public.music_rights_parties party
      where party.id = music_rights_contributions.party_id
        and party.linked_user_id = (select auth.uid())
    )
  )
))
with check (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and (
    p.owner_user_id = (select auth.uid())
    or exists (
      select 1 from public.music_rights_parties party
      where party.id = music_rights_contributions.party_id
        and party.linked_user_id = (select auth.uid())
    )
  )
));

create policy music_rights_credit_prefs_owner on public.music_rights_credit_preferences
for all to authenticated
using (exists (
  select 1 from public.music_rights_contributions c
  join public.music_rights_projects p on p.id = c.project_id
  where c.id = contribution_id and p.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_rights_contributions c
  join public.music_rights_projects p on p.id = c.project_id
  where c.id = contribution_id and p.owner_user_id = (select auth.uid())
));

create policy music_rights_claims_owner_select on public.music_rights_claims
for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy music_rights_claims_owner_insert on public.music_rights_claims
for insert to authenticated with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);
create policy music_rights_claims_owner_update on public.music_rights_claims
for update to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_rights_claim_territories_owner on public.music_rights_claim_territories
for all to authenticated
using (exists (
  select 1 from public.music_rights_claims c
  where c.id = claim_id and c.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_rights_claims c
  where c.id = claim_id and c.owner_user_id = (select auth.uid())
));

create policy music_rights_income_owner on public.music_rights_income_participations
for all to authenticated
using (exists (
  select 1 from public.music_rights_claims c
  where c.id = claim_id and c.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_rights_claims c
  where c.id = claim_id and c.owner_user_id = (select auth.uid())
));

create policy music_rights_audit_owner_select on public.music_rights_audit_events
for select to authenticated using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_audit_owner_insert on public.music_rights_audit_events
for insert to authenticated with check (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));

create policy music_rights_outbox_owner_select on public.music_rights_outbox_events
for select to authenticated using (
  project_id is null
  or exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);

-- service_role bypass policies
create policy music_rights_projects_service on public.music_rights_projects
for all to service_role using (true) with check (true);
create policy music_rights_works_service on public.music_rights_musical_works
for all to service_role using (true) with check (true);
create policy music_rights_recordings_service on public.music_rights_sound_recordings
for all to service_role using (true) with check (true);
create policy music_rights_releases_service on public.music_rights_releases
for all to service_role using (true) with check (true);
create policy music_rights_release_tracks_service on public.music_rights_release_tracks
for all to service_role using (true) with check (true);
create policy music_rights_asset_rel_service on public.music_rights_asset_relationships
for all to service_role using (true) with check (true);
create policy music_rights_parties_service on public.music_rights_parties
for all to service_role using (true) with check (true);
create policy music_rights_party_profiles_service on public.music_rights_party_profiles
for all to service_role using (true) with check (true);
create policy music_rights_party_identifiers_service on public.music_rights_party_identifiers
for all to service_role using (true) with check (true);
create policy music_rights_party_affiliations_service on public.music_rights_party_affiliations
for all to service_role using (true) with check (true);
create policy music_rights_authorities_service on public.music_rights_authorities
for all to service_role using (true) with check (true);
create policy music_rights_contributions_service on public.music_rights_contributions
for all to service_role using (true) with check (true);
create policy music_rights_credit_prefs_service on public.music_rights_credit_preferences
for all to service_role using (true) with check (true);
create policy music_rights_claims_service on public.music_rights_claims
for all to service_role using (true) with check (true);
create policy music_rights_claim_territories_service on public.music_rights_claim_territories
for all to service_role using (true) with check (true);
create policy music_rights_income_service on public.music_rights_income_participations
for all to service_role using (true) with check (true);
create policy music_rights_audit_service on public.music_rights_audit_events
for all to service_role using (true) with check (true);
create policy music_rights_outbox_service on public.music_rights_outbox_events
for all to service_role using (true) with check (true);

-- Ensure feature_flags exists when this migration is applied outside full history
-- (canonical create: 20260604100000_content_moderation.sql).
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
alter table public.feature_flags enable row level security;

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_rights_workspace_enabled', 'Music rights workspace', 'Enable artist rights graph workspace for works, parties, credits, and claims.', false, 0)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

comment on table public.music_rights_projects is 'Phase 2 rights workspace linked 1:1 to artist_music; not a parallel catalog.';
comment on table public.music_rights_sound_recordings is 'Sound recording rights entity linked to canonical artist_music.';
comment on table public.music_rights_musical_works is 'Underlying musical work / composition entity.';
comment on table public.music_rights_claims is 'Asserted rights interests; not legal adjudication of ownership.';
comment on table public.music_rights_audit_events is 'Append-only rights domain audit trail.';

commit;
