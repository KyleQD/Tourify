-- Agent service identities
--
-- Engineering agents are service principals, not shared human accounts. This
-- directory is intentionally separate from profiles and organization
-- membership. A provisioning workflow may link an identity to a Supabase auth
-- user, but this migration never creates credentials or grants platform access.

set client_min_messages = warning;
create extension if not exists pgcrypto;

create table if not exists public.agent_identities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  agent_role text not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'revoked')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  scopes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(scopes) = 'array'),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists idx_agent_identities_status
  on public.agent_identities(status);

create table if not exists public.agent_credentials (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_identities(id) on delete cascade,
  key_prefix text not null unique,
  secret_hash text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  check (length(secret_hash) = 64),
  check (revoked_at is null or revoked_at >= created_at)
);

create index if not exists idx_agent_credentials_agent_active
  on public.agent_credentials(agent_id, revoked_at, expires_at);

create table if not exists public.agent_audit_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent_identities(id) on delete restrict,
  auth_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_audit_events_agent_time
  on public.agent_audit_events(agent_id, created_at desc);

create index if not exists idx_agent_audit_events_resource
  on public.agent_audit_events(resource_type, resource_id, created_at desc);

alter table public.agent_identities enable row level security;
alter table public.agent_credentials enable row level security;
alter table public.agent_audit_events enable row level security;

-- Agent credentials and audit events are server-only. No browser role may
-- enumerate principals, verify secrets, or forge an activity record.
revoke all on public.agent_identities from public, anon, authenticated;
revoke all on public.agent_credentials from public, anon, authenticated;
revoke all on public.agent_audit_events from public, anon, authenticated;

comment on table public.agent_identities is
  'Non-human engineering service principals; pending identities have no platform access.';
comment on table public.agent_credentials is
  'One-way hashes of revocable agent API credentials; raw secrets are never stored.';
comment on table public.agent_audit_events is
  'Server-written attribution for actions performed by an agent service principal.';

insert into public.agent_identities (slug, display_name, agent_role, scopes)
values
  ('orchestrator', 'Orchestrator agent', 'orchestrator', '["control_plane:read","tasks:route"]'::jsonb),
  ('admin', 'Admin agent', 'admin', '["admin:read","admin:write"]'::jsonb),
  ('artist', 'Artist agent', 'artist', '["artist:read","artist:write"]'::jsonb),
  ('venue', 'Venue agent', 'venue', '["venue:read","venue:write"]'::jsonb),
  ('organization', 'Organization agent', 'organization', '["organization:read","organization:write"]'::jsonb),
  ('general-user', 'General user agent', 'general-user', '["user:read","user:write"]'::jsonb),
  ('work', 'Work agent', 'work', '["work:read","work:write"]'::jsonb),
  ('discover', 'Discover agent', 'discover', '["discover:read","discover:write"]'::jsonb),
  ('music', 'Music agent', 'music', '["music:read","music:write"]'::jsonb),
  ('marketplace', 'Marketplace agent', 'marketplace', '["marketplace:read","marketplace:write"]'::jsonb),
  ('ticketing', 'Ticketing agent', 'ticketing', '["ticketing:read","ticketing:write"]'::jsonb),
  ('social', 'Social agent', 'social', '["social:read","social:write"]'::jsonb),
  ('database', 'Database agent', 'database', '["database:read","database:migrate"]'::jsonb),
  ('design-system', 'Design system agent', 'design-system', '["design:read","design:write"]'::jsonb),
  ('integrations', 'Integrations agent', 'integrations', '["integrations:read","integrations:write"]'::jsonb),
  ('qa', 'QA agent', 'qa', '["qa:read","qa:write"]'::jsonb),
  ('release', 'Release agent', 'release', '["release:read","release:write"]'::jsonb)
on conflict (slug) do nothing;
