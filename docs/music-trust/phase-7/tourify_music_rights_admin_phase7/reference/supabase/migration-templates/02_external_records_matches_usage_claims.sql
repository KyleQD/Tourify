-- REFERENCE ONLY.
create table if not exists public.music_rights_external_records (id uuid primary key default gen_random_uuid(), provider_code text not null, external_id text, record_type text not null, subject_id uuid, payload_hash text not null, payload jsonb not null, effective_at timestamptz, supersedes_id uuid references public.music_rights_external_records(id), created_at timestamptz not null default now());
create table if not exists public.music_rights_usage_events (id uuid primary key default gen_random_uuid(), source_code text not null, source_event_id text, raw_object_path text, normalized jsonb not null, status text not null, created_at timestamptz not null default now(), unique(source_code,source_event_id));
create table if not exists public.music_rights_claims (id uuid primary key default gen_random_uuid(), case_id uuid references public.music_rights_admin_cases(id), claim_type text not null, amount_minor bigint, currency text, status text not null default 'draft', authority_snapshot jsonb not null, version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.music_rights_external_records enable row level security;
alter table public.music_rights_usage_events enable row level security;
alter table public.music_rights_claims enable row level security;
