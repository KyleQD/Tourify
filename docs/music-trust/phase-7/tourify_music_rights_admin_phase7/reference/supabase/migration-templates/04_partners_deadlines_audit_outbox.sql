-- REFERENCE ONLY.
create table if not exists public.music_rights_admin_partners (id uuid primary key default gen_random_uuid(), code text unique not null, roles text[] not null, territories text[] not null, capabilities jsonb not null, status text not null, config_secret_ref text, created_at timestamptz not null default now());
create table if not exists public.music_rights_deadlines (id uuid primary key default gen_random_uuid(), case_id uuid references public.music_rights_admin_cases(id), deadline_type text not null, due_at timestamptz not null, source_rule_version text not null, status text not null default 'open', created_at timestamptz not null default now());
create table if not exists public.music_rights_admin_audit_events (id bigint generated always as identity primary key, case_id uuid, actor_user_id uuid, event_type text not null, event_data jsonb not null, created_at timestamptz not null default now());
create table if not exists public.music_rights_admin_outbox (id uuid primary key default gen_random_uuid(), event_type text not null, aggregate_id uuid not null, payload jsonb not null, idempotency_key text unique not null, status text not null default 'pending', attempts integer not null default 0, available_at timestamptz not null default now(), created_at timestamptz not null default now());
alter table public.music_rights_admin_partners enable row level security;
alter table public.music_rights_deadlines enable row level security;
alter table public.music_rights_admin_audit_events enable row level security;
alter table public.music_rights_admin_outbox enable row level security;
