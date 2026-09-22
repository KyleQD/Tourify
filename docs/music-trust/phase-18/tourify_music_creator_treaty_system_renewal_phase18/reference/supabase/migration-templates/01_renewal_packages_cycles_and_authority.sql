-- Reference outline only. Audit deployed schema before creating a real migration.
create table if not exists public.future_phase18_approval_packages (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  state text not null,
  policy_version text not null,
  schema_version text not null,
  jurisdiction text not null,
  effective_at timestamptz,
  expires_at timestamptz,
  source_manifest_id uuid not null,
  actor_authority_id uuid not null,
  idempotency_key text not null unique,
  audit_event_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Enable RLS and add exact entity/role/state policies in the audited migration.
