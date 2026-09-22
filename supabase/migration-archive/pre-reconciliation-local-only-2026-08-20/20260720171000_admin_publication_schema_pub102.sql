-- PUB-102: Publication schema (snapshot → audience → delivery → ack → share → access log)
-- Expand-only; org-scoped RLS via membership + tour.view / tour.manage.

create or replace function public.can_publication(uid uuid, oid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select
    uid is not null
    and oid is not null
    and public.is_org_member(uid, oid)
    and public.has_perm(uid, oid, perm);
$$;

revoke all on function public.can_publication(uuid, uuid, text) from public;
grant execute on function public.can_publication(uuid, uuid, text) to authenticated, service_role;

comment on function public.can_publication(uuid, uuid, text) is
  'PUB-102 publication RLS predicate: membership + has_perm for tour.view / tour.manage.';

-- ---------------------------------------------------------------------------
-- Snapshots (immutable once committed)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_publication_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  tour_id uuid null references public.tours (id) on delete set null,
  event_id uuid null,
  publication_type text not null
    check (publication_type in (
      'tour_book',
      'itinerary',
      'advance_request',
      'advance_response',
      'day_sheet',
      'run_of_show',
      'schedule',
      'site_map',
      'contact_sheet',
      'travel_brief',
      'change_notice',
      'emergency_notice'
    )),
  title text not null,
  sequence integer not null default 1,
  version integer not null default 1,
  source_plan_version integer null,
  checksum text not null,
  access_classification text not null
    check (access_classification in (
      'internal',
      'worker',
      'department',
      'vendor',
      'public',
      'financial',
      'personnel',
      'sensitive_traveler'
    )),
  projection_policy jsonb not null default '{}'::jsonb,
  projection_version text not null default 'v1',
  payload jsonb not null default '{}'::jsonb,
  publisher_user_id uuid null,
  approver_user_id uuid null,
  status text not null default 'draft'
    check (status in ('draft', 'committed', 'superseded', 'retracted')),
  superseded_by uuid null references public.admin_publication_snapshots (id) on delete set null,
  retracted_at timestamptz null,
  retracted_reason text null,
  correlation_id text not null,
  idempotency_key text not null,
  domain_transaction_id uuid null references public.admin_domain_transactions (id) on delete set null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, idempotency_key)
);

create index if not exists idx_admin_publication_snapshots_org_created
  on public.admin_publication_snapshots (org_id, created_at desc);

create index if not exists idx_admin_publication_snapshots_tour
  on public.admin_publication_snapshots (org_id, tour_id, created_at desc)
  where tour_id is not null;

create index if not exists idx_admin_publication_snapshots_status
  on public.admin_publication_snapshots (org_id, status);

-- ---------------------------------------------------------------------------
-- Sections
-- ---------------------------------------------------------------------------
create table if not exists public.admin_publication_sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  snapshot_id uuid not null references public.admin_publication_snapshots (id) on delete cascade,
  section_key text not null,
  audience_class text not null
    check (audience_class in (
      'internal',
      'worker',
      'department',
      'vendor',
      'public',
      'financial',
      'personnel',
      'sensitive_traveler'
    )),
  source_ref jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  checksum text not null,
  ordinal integer not null default 0,
  created_at timestamptz not null default now(),
  unique (snapshot_id, section_key)
);

create index if not exists idx_admin_publication_sections_snapshot
  on public.admin_publication_sections (snapshot_id, ordinal);

-- ---------------------------------------------------------------------------
-- Audience definition (snapshotted at send time)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_publication_audiences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  snapshot_id uuid not null references public.admin_publication_snapshots (id) on delete cascade,
  definition jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz null,
  recipient_count integer not null default 0,
  excluded_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (snapshot_id)
);

-- ---------------------------------------------------------------------------
-- Recipients
-- ---------------------------------------------------------------------------
create table if not exists public.admin_publication_recipients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  snapshot_id uuid not null references public.admin_publication_snapshots (id) on delete cascade,
  audience_id uuid null references public.admin_publication_audiences (id) on delete set null,
  subject_type text not null
    check (subject_type in ('user', 'email', 'vendor', 'external_contact', 'share_link', 'role_group')),
  subject_key text not null,
  display_name text null,
  channel_hints jsonb not null default '[]'::jsonb,
  exclusion_reason text null,
  projection_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique (snapshot_id, subject_type, subject_key)
);

create index if not exists idx_admin_publication_recipients_snapshot
  on public.admin_publication_recipients (snapshot_id);

-- ---------------------------------------------------------------------------
-- Deliveries (per recipient × channel)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_publication_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  snapshot_id uuid not null references public.admin_publication_snapshots (id) on delete cascade,
  recipient_id uuid not null references public.admin_publication_recipients (id) on delete cascade,
  channel text not null
    check (channel in ('in_app', 'email', 'sms', 'push')),
  status text not null default 'queued'
    check (status in (
      'queued',
      'processing',
      'delivered',
      'opened',
      'acknowledged',
      'failed',
      'suppressed',
      'expired',
      'revoked'
    )),
  attempts integer not null default 0,
  provider_ref text null,
  last_error_class text null,
  last_error text null,
  outbox_id uuid null references public.admin_publication_outbox (id) on delete set null,
  queued_at timestamptz not null default now(),
  processing_at timestamptz null,
  delivered_at timestamptz null,
  opened_at timestamptz null,
  acknowledged_at timestamptz null,
  failed_at timestamptz null,
  suppressed_at timestamptz null,
  expired_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipient_id, channel)
);

create index if not exists idx_admin_publication_deliveries_snapshot_status
  on public.admin_publication_deliveries (snapshot_id, status);

create index if not exists idx_admin_publication_deliveries_outbox
  on public.admin_publication_deliveries (outbox_id)
  where outbox_id is not null;

-- ---------------------------------------------------------------------------
-- Acknowledgements
-- ---------------------------------------------------------------------------
create table if not exists public.admin_publication_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  snapshot_id uuid not null references public.admin_publication_snapshots (id) on delete cascade,
  recipient_id uuid not null references public.admin_publication_recipients (id) on delete cascade,
  snapshot_version integer not null,
  acknowledged_at timestamptz not null default now(),
  actor_user_id uuid null,
  channel text null
    check (channel is null or channel in ('in_app', 'email', 'sms', 'push', 'share_link')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (snapshot_id, recipient_id, snapshot_version)
);

-- ---------------------------------------------------------------------------
-- Share tokens (hashed at rest)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_publication_share_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  snapshot_id uuid not null references public.admin_publication_snapshots (id) on delete cascade,
  token_hash text not null,
  name text not null default 'Share link',
  scope jsonb not null default '{}'::jsonb,
  expires_at timestamptz null,
  passcode_hash text null,
  allow_download boolean not null default false,
  max_uses integer null,
  use_count integer not null default 0,
  revoked_at timestamptz null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  unique (token_hash)
);

create index if not exists idx_admin_publication_share_tokens_snapshot
  on public.admin_publication_share_tokens (snapshot_id)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Access logs
-- ---------------------------------------------------------------------------
create table if not exists public.admin_publication_access_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  snapshot_id uuid null references public.admin_publication_snapshots (id) on delete set null,
  share_token_id uuid null references public.admin_publication_share_tokens (id) on delete set null,
  recipient_id uuid null references public.admin_publication_recipients (id) on delete set null,
  actor_user_id uuid null,
  action text not null
    check (action in (
      'view',
      'download',
      'denied',
      'passcode_failed',
      'revoked_hit',
      'expired_hit',
      'superseded_hit'
    )),
  ip_hash text null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_publication_access_logs_org_created
  on public.admin_publication_access_logs (org_id, created_at desc);

create index if not exists idx_admin_publication_access_logs_snapshot
  on public.admin_publication_access_logs (snapshot_id, created_at desc)
  where snapshot_id is not null;

-- Link outbox rows to snapshots (expand-only)
alter table public.admin_publication_outbox
  add column if not exists snapshot_id uuid null
    references public.admin_publication_snapshots (id) on delete set null;

create index if not exists idx_admin_publication_outbox_snapshot
  on public.admin_publication_outbox (snapshot_id)
  where snapshot_id is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.admin_publication_snapshots enable row level security;
alter table public.admin_publication_sections enable row level security;
alter table public.admin_publication_audiences enable row level security;
alter table public.admin_publication_recipients enable row level security;
alter table public.admin_publication_deliveries enable row level security;
alter table public.admin_publication_acknowledgements enable row level security;
alter table public.admin_publication_share_tokens enable row level security;
alter table public.admin_publication_access_logs enable row level security;

alter table public.admin_publication_snapshots force row level security;
alter table public.admin_publication_sections force row level security;
alter table public.admin_publication_audiences force row level security;
alter table public.admin_publication_recipients force row level security;
alter table public.admin_publication_deliveries force row level security;
alter table public.admin_publication_acknowledgements force row level security;
alter table public.admin_publication_share_tokens force row level security;
alter table public.admin_publication_access_logs force row level security;

revoke all on
  public.admin_publication_snapshots,
  public.admin_publication_sections,
  public.admin_publication_audiences,
  public.admin_publication_recipients,
  public.admin_publication_deliveries,
  public.admin_publication_acknowledgements,
  public.admin_publication_share_tokens,
  public.admin_publication_access_logs
from anon;

grant select on
  public.admin_publication_snapshots,
  public.admin_publication_sections,
  public.admin_publication_audiences,
  public.admin_publication_recipients,
  public.admin_publication_deliveries,
  public.admin_publication_acknowledgements,
  public.admin_publication_share_tokens,
  public.admin_publication_access_logs
to authenticated;

grant insert, update on
  public.admin_publication_snapshots,
  public.admin_publication_sections,
  public.admin_publication_audiences,
  public.admin_publication_recipients,
  public.admin_publication_deliveries,
  public.admin_publication_acknowledgements,
  public.admin_publication_share_tokens
to authenticated;

grant insert on public.admin_publication_access_logs to authenticated;

grant all on
  public.admin_publication_snapshots,
  public.admin_publication_sections,
  public.admin_publication_audiences,
  public.admin_publication_recipients,
  public.admin_publication_deliveries,
  public.admin_publication_acknowledgements,
  public.admin_publication_share_tokens,
  public.admin_publication_access_logs
to service_role;

-- Snapshots
drop policy if exists pub102_snapshots_select on public.admin_publication_snapshots;
create policy pub102_snapshots_select on public.admin_publication_snapshots
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_snapshots_insert on public.admin_publication_snapshots;
create policy pub102_snapshots_insert on public.admin_publication_snapshots
  for insert to authenticated
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_snapshots_update on public.admin_publication_snapshots;
create policy pub102_snapshots_update on public.admin_publication_snapshots
  for update to authenticated
  using (public.can_publication(auth.uid(), org_id, 'tour.manage'))
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_snapshots_service on public.admin_publication_snapshots;
create policy pub102_snapshots_service on public.admin_publication_snapshots
  for all to service_role using (true) with check (true);

-- Sections
drop policy if exists pub102_sections_select on public.admin_publication_sections;
create policy pub102_sections_select on public.admin_publication_sections
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_sections_insert on public.admin_publication_sections;
create policy pub102_sections_insert on public.admin_publication_sections
  for insert to authenticated
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_sections_update on public.admin_publication_sections;
create policy pub102_sections_update on public.admin_publication_sections
  for update to authenticated
  using (public.can_publication(auth.uid(), org_id, 'tour.manage'))
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_sections_service on public.admin_publication_sections;
create policy pub102_sections_service on public.admin_publication_sections
  for all to service_role using (true) with check (true);

-- Audiences
drop policy if exists pub102_audiences_select on public.admin_publication_audiences;
create policy pub102_audiences_select on public.admin_publication_audiences
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_audiences_insert on public.admin_publication_audiences;
create policy pub102_audiences_insert on public.admin_publication_audiences
  for insert to authenticated
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_audiences_update on public.admin_publication_audiences;
create policy pub102_audiences_update on public.admin_publication_audiences
  for update to authenticated
  using (public.can_publication(auth.uid(), org_id, 'tour.manage'))
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_audiences_service on public.admin_publication_audiences;
create policy pub102_audiences_service on public.admin_publication_audiences
  for all to service_role using (true) with check (true);

-- Recipients
drop policy if exists pub102_recipients_select on public.admin_publication_recipients;
create policy pub102_recipients_select on public.admin_publication_recipients
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_recipients_insert on public.admin_publication_recipients;
create policy pub102_recipients_insert on public.admin_publication_recipients
  for insert to authenticated
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_recipients_update on public.admin_publication_recipients;
create policy pub102_recipients_update on public.admin_publication_recipients
  for update to authenticated
  using (public.can_publication(auth.uid(), org_id, 'tour.manage'))
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_recipients_service on public.admin_publication_recipients;
create policy pub102_recipients_service on public.admin_publication_recipients
  for all to service_role using (true) with check (true);

-- Deliveries
drop policy if exists pub102_deliveries_select on public.admin_publication_deliveries;
create policy pub102_deliveries_select on public.admin_publication_deliveries
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_deliveries_insert on public.admin_publication_deliveries;
create policy pub102_deliveries_insert on public.admin_publication_deliveries
  for insert to authenticated
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_deliveries_update on public.admin_publication_deliveries;
create policy pub102_deliveries_update on public.admin_publication_deliveries
  for update to authenticated
  using (public.can_publication(auth.uid(), org_id, 'tour.manage'))
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_deliveries_service on public.admin_publication_deliveries;
create policy pub102_deliveries_service on public.admin_publication_deliveries
  for all to service_role using (true) with check (true);

-- Acknowledgements
drop policy if exists pub102_acks_select on public.admin_publication_acknowledgements;
create policy pub102_acks_select on public.admin_publication_acknowledgements
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_acks_insert on public.admin_publication_acknowledgements;
create policy pub102_acks_insert on public.admin_publication_acknowledgements
  for insert to authenticated
  with check (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_acks_service on public.admin_publication_acknowledgements;
create policy pub102_acks_service on public.admin_publication_acknowledgements
  for all to service_role using (true) with check (true);

-- Share tokens
drop policy if exists pub102_share_tokens_select on public.admin_publication_share_tokens;
create policy pub102_share_tokens_select on public.admin_publication_share_tokens
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_share_tokens_insert on public.admin_publication_share_tokens;
create policy pub102_share_tokens_insert on public.admin_publication_share_tokens
  for insert to authenticated
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_share_tokens_update on public.admin_publication_share_tokens;
create policy pub102_share_tokens_update on public.admin_publication_share_tokens
  for update to authenticated
  using (public.can_publication(auth.uid(), org_id, 'tour.manage'))
  with check (public.can_publication(auth.uid(), org_id, 'tour.manage'));

drop policy if exists pub102_share_tokens_service on public.admin_publication_share_tokens;
create policy pub102_share_tokens_service on public.admin_publication_share_tokens
  for all to service_role using (true) with check (true);

-- Access logs (append-oriented; no update/delete for authenticated)
drop policy if exists pub102_access_logs_select on public.admin_publication_access_logs;
create policy pub102_access_logs_select on public.admin_publication_access_logs
  for select to authenticated
  using (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_access_logs_insert on public.admin_publication_access_logs;
create policy pub102_access_logs_insert on public.admin_publication_access_logs
  for insert to authenticated
  with check (
    public.can_publication(auth.uid(), org_id, 'tour.view')
    or public.can_publication(auth.uid(), org_id, 'tour.manage')
  );

drop policy if exists pub102_access_logs_service on public.admin_publication_access_logs;
create policy pub102_access_logs_service on public.admin_publication_access_logs
  for all to service_role using (true) with check (true);
