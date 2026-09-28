-- Phase 2 P2-G / P2-H / P2-I: protected derivatives, C2PA, watermarks,
-- testnet anchors, disputes, and ops feature flags (additive).
-- Depends on music_rights_passports from 20260717233000.
-- Clean archival masters remain untouched; workers use service_role.

begin;

create table public.music_rights_derivatives (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  artist_music_id uuid not null references public.artist_music(id) on delete cascade,
  source_recording_id uuid references public.music_rights_sound_recordings(id) on delete set null,
  passport_id uuid references public.music_rights_passports(id) on delete set null,
  passport_version_id uuid references public.music_rights_passport_versions(id) on delete set null,
  derivative_type text not null check (derivative_type in (
    'streaming', 'downloadable', 'promotional', 'licensing_delivery', 'preview'
  )),
  status text not null default 'requested' check (status in (
    'requested', 'processing', 'ready', 'failed', 'unpublished', 'frozen'
  )),
  processing_recipe jsonb not null default '{}'::jsonb,
  source_asset_commitment text,
  content_hash text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  watermark_enabled boolean not null default false,
  c2pa_enabled boolean not null default false,
  adversarial_audio_prohibited boolean not null default true,
  error_code text,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, derivative_type, idempotency_key)
);

create index music_rights_derivatives_owner_idx
  on public.music_rights_derivatives (owner_user_id, updated_at desc);
create index music_rights_derivatives_status_idx
  on public.music_rights_derivatives (status, next_attempt_at nulls first, created_at);

create table public.music_rights_c2pa_manifests (
  id uuid primary key default gen_random_uuid(),
  derivative_id uuid not null unique references public.music_rights_derivatives(id) on delete cascade,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  status text not null default 'pending' check (status in (
    'pending', 'signed', 'validated', 'failed', 'unsupported', 'missing', 'revoked_issuer'
  )),
  c2pa_spec_version text not null default '2.4',
  assertions jsonb not null default '{}'::jsonb,
  manifest_store_hash text,
  sidecar_storage_bucket text,
  sidecar_storage_path text,
  validation_result jsonb not null default '{}'::jsonb,
  signing_key_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_rights_watermarks (
  id uuid primary key default gen_random_uuid(),
  derivative_id uuid not null unique references public.music_rights_derivatives(id) on delete cascade,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  status text not null default 'pending' check (status in (
    'pending', 'embedded', 'detected', 'failed', 'skipped'
  )),
  algorithm text not null default 'stub',
  algorithm_version text not null default '0.0.0',
  opaque_payload text not null,
  confidence numeric(5,4),
  codec_robustness jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_rights_blockchain_anchors (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid references public.music_rights_projects(id) on delete set null,
  passport_id uuid references public.music_rights_passports(id) on delete set null,
  passport_version_id uuid references public.music_rights_passport_versions(id) on delete set null,
  network text not null default 'sepolia' check (network in ('sepolia', 'local', 'mainnet_disabled')),
  status text not null default 'requested' check (status in (
    'requested', 'pending', 'confirmed', 'failed', 'replaced'
  )),
  passport_public_id_hash text not null,
  passport_version integer not null check (passport_version > 0),
  public_manifest_hash text not null,
  private_manifest_commitment text not null,
  credential_hash text not null,
  schema_version text not null,
  issuer text not null,
  issued_at timestamptz not null,
  on_chain_status text not null default 'active' check (on_chain_status in (
    'active', 'suspended', 'revoked', 'superseded'
  )),
  superseded_by_version integer,
  reason_hash text,
  tx_hash text,
  block_number bigint,
  confirmations integer not null default 0 check (confirmations >= 0),
  contract_address text,
  outbox_event_id uuid references public.music_rights_outbox_events(id) on delete set null,
  dedupe_key text not null,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network, dedupe_key)
);

create index music_rights_anchors_status_idx
  on public.music_rights_blockchain_anchors (status, created_at);
create index music_rights_anchors_passport_idx
  on public.music_rights_blockchain_anchors (passport_id, passport_version);

create table public.music_rights_disputes (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  passport_id uuid references public.music_rights_passports(id) on delete set null,
  opened_by_user_id uuid references auth.users(id) on delete set null,
  assigned_reviewer_id uuid references auth.users(id) on delete set null,
  dispute_type text not null check (dispute_type in (
    'identity', 'public_credit', 'contributor_role', 'composition_share', 'master_ownership',
    'administration', 'license', 'sample_clearance', 'authority', 'signature_validity',
    'ai_disclosure', 'public_display', 'identifier', 'duplicate_upload', 'other'
  )),
  status text not null default 'open' check (status in (
    'open', 'under_review', 'awaiting_evidence', 'resolved', 'appealed', 'closed'
  )),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  summary text not null,
  effects jsonb not null default '{}'::jsonb,
  linked_dmca_case_id uuid,
  resolution_type text check (resolution_type is null or resolution_type in (
    'unanimous_amendment', 'replacement_agreement', 'authority_confirmation',
    'registry_correction', 'withdrawal', 'court_order', 'admin_metadata_correction',
    'legal_escalation', 'dismissed'
  )),
  resolution_notes text,
  freeze_derivatives boolean not null default false,
  suspend_passport boolean not null default false,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  appeal_deadline_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_disputes_status_idx
  on public.music_rights_disputes (status, opened_at);
create index music_rights_disputes_project_idx
  on public.music_rights_disputes (project_id, updated_at desc);

create table public.music_rights_dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.music_rights_disputes(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'system' check (actor_type in (
    'artist', 'contributor', 'reviewer', 'legal', 'support', 'system'
  )),
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  artist_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create index music_rights_dispute_events_dispute_idx
  on public.music_rights_dispute_events (dispute_id, created_at desc);

create or replace function public.music_rights_reject_dispute_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'music_rights_dispute_events are append-only';
end;
$$;

drop trigger if exists music_rights_dispute_events_no_update on public.music_rights_dispute_events;
create trigger music_rights_dispute_events_no_update
before update or delete on public.music_rights_dispute_events
for each row execute function public.music_rights_reject_dispute_event_mutation();

alter table public.music_rights_derivatives enable row level security;
alter table public.music_rights_c2pa_manifests enable row level security;
alter table public.music_rights_watermarks enable row level security;
alter table public.music_rights_blockchain_anchors enable row level security;
alter table public.music_rights_disputes enable row level security;
alter table public.music_rights_dispute_events enable row level security;

revoke all on
  public.music_rights_derivatives,
  public.music_rights_c2pa_manifests,
  public.music_rights_watermarks,
  public.music_rights_blockchain_anchors,
  public.music_rights_disputes,
  public.music_rights_dispute_events
from public, anon, authenticated;

grant select, insert, update on public.music_rights_derivatives to authenticated;
grant select on public.music_rights_c2pa_manifests to authenticated;
grant select on public.music_rights_watermarks to authenticated;
grant select on public.music_rights_blockchain_anchors to authenticated;
grant select on public.music_rights_disputes to authenticated;
grant select on public.music_rights_dispute_events to authenticated;

grant all on
  public.music_rights_derivatives,
  public.music_rights_c2pa_manifests,
  public.music_rights_watermarks,
  public.music_rights_blockchain_anchors,
  public.music_rights_disputes,
  public.music_rights_dispute_events
to service_role;

create policy music_rights_derivatives_owner_select on public.music_rights_derivatives
for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy music_rights_derivatives_owner_insert on public.music_rights_derivatives
for insert to authenticated with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);
create policy music_rights_derivatives_owner_update on public.music_rights_derivatives
for update to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);
create policy music_rights_derivatives_service on public.music_rights_derivatives
for all to service_role using (true) with check (true);

create policy music_rights_c2pa_owner_select on public.music_rights_c2pa_manifests
for select to authenticated using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_c2pa_service on public.music_rights_c2pa_manifests
for all to service_role using (true) with check (true);

create policy music_rights_watermarks_owner_select on public.music_rights_watermarks
for select to authenticated using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_watermarks_service on public.music_rights_watermarks
for all to service_role using (true) with check (true);

create policy music_rights_anchors_owner_select on public.music_rights_blockchain_anchors
for select to authenticated using (
  project_id is not null
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);
create policy music_rights_anchors_service on public.music_rights_blockchain_anchors
for all to service_role using (true) with check (true);

create policy music_rights_disputes_owner_select on public.music_rights_disputes
for select to authenticated using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_disputes_service on public.music_rights_disputes
for all to service_role using (true) with check (true);

create policy music_rights_dispute_events_owner_select on public.music_rights_dispute_events
for select to authenticated using (
  artist_visible = true
  and exists (
    select 1 from public.music_rights_disputes d
    join public.music_rights_projects p on p.id = d.project_id
    where d.id = dispute_id and p.owner_user_id = (select auth.uid())
  )
);
create policy music_rights_dispute_events_service on public.music_rights_dispute_events
for all to service_role using (true) with check (true);

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
  ('music_c2pa_derivatives_enabled', 'Music C2PA derivatives', 'Enable protected derivative generation with optional C2PA manifests.', false, 0),
  ('music_watermark_beta_enabled', 'Music watermark beta', 'Enable opt-in forensic watermark embedding on derivatives.', false, 0),
  ('music_training_reservation_enabled', 'Music training reservation', 'Publish asset-level AI-training reservation signals.', false, 0),
  ('music_testnet_anchor_enabled', 'Music testnet anchors', 'Enable Sepolia/testnet passport attestation anchoring.', false, 0),
  ('music_rights_ops_enabled', 'Music rights operations', 'Enable rights dispute queues and passport suspension controls.', false, 0)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

comment on table public.music_rights_derivatives is 'Protected public derivatives; archival clean master remains untouched.';
comment on table public.music_rights_c2pa_manifests is 'C2PA manifest records for approved derivative formats.';
comment on table public.music_rights_watermarks is 'Opt-in forensic watermark records; never stores PII payloads.';
comment on table public.music_rights_blockchain_anchors is 'Privacy-safe testnet attestation anchors; off-chain passport remains valid if delayed.';
comment on table public.music_rights_disputes is 'Rights Passport disputes; separate from DMCA takedown cases.';
comment on table public.music_rights_dispute_events is 'Append-only dispute audit trail.';

commit;
