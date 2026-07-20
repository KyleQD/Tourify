-- REFERENCE ONLY. Adapt after legal, partner, schema, RLS, and retention audit.

create table if not exists music_marketplace.disclosure_documents (
  id uuid primary key default gen_random_uuid(),
  offering_version_id uuid not null references music_marketplace.offering_versions(id),
  document_type text not null,
  storage_bucket text not null,
  storage_path text not null,
  sha256 text not null,
  visibility text not null,
  created_at timestamptz not null default now()
);

create table if not exists music_marketplace.partner_event_receipts (
  id uuid primary key default gen_random_uuid(),
  partner_id text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  payload_hash text not null,
  signature_verified boolean not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(partner_id, provider_event_id)
);

create table if not exists music_marketplace.compliance_holds (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  hold_type text not null,
  status text not null,
  reason_code text not null,
  opened_by uuid,
  opened_at timestamptz not null default now(),
  released_at timestamptz
);

create table if not exists music_marketplace.surveillance_alerts (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  alert_type text not null,
  severity text not null,
  subject_refs jsonb not null,
  evidence jsonb not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists music_marketplace.outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
