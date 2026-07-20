-- REFERENCE ONLY.
create table if not exists public.license_conflicts (
  id uuid primary key default gen_random_uuid(), request_id uuid references public.license_requests(id),
  asset_kind text, asset_id uuid, conflict_type text not null, severity text not null, status text not null default 'open',
  restricted_details jsonb not null default '{}', opened_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.licensing_partner_events (
  id uuid primary key default gen_random_uuid(), provider text not null, external_event_id text not null,
  event_type text not null, payload_hash text not null, payload jsonb not null, status text not null default 'received',
  received_at timestamptz not null default now(), processed_at timestamptz, unique(provider, external_event_id)
);
create table if not exists public.licensing_audit_events (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid, actor_role text, entity_type text not null,
  entity_id uuid not null, event_type text not null, prior_version integer, new_version integer, metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
-- Use append-only policies and restricted admin capabilities after auditing existing capability functions.
