set client_min_messages = warning;

-- Communications Command Center foundation.
-- Expand-only: this migration does not alter or backfill existing messaging tables.
-- It adds normalized operational events, relay records, provider-safe metadata,
-- service-role-only private provider refs, and deterministic automation rules.

create table if not exists public.communication_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  provider text not null
    check (provider in ('email', 'gmail', 'weather', 'whatsapp', 'tourify', 'webhook', 'other')),
  display_name text not null,
  connection_status text not null default 'not_configured'
    check (connection_status in ('not_configured', 'connected', 'needs_auth', 'disabled', 'error')),
  safe_configuration jsonb not null default '{}'::jsonb,
  created_by uuid,
  last_sync_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, provider, display_name)
);

create table if not exists public.communication_source_private_refs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.communication_sources(id) on delete cascade,
  provider_account_ref text,
  provider_thread_ref text,
  provider_message_ref text,
  encrypted_token_ref text,
  private_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  tour_id uuid,
  tour_route_leg_id uuid,
  tour_stop_id uuid,
  event_id uuid,
  venue_id uuid,
  department text,
  source_kind text not null
    check (source_kind in ('native', 'external', 'system')),
  source_table text,
  source_id uuid,
  external_source_id uuid references public.communication_sources(id) on delete set null,
  external_private_ref_id uuid references public.communication_source_private_refs(id) on delete set null,
  external_thread_ref text,
  event_type text not null,
  title text not null,
  summary text,
  approved_excerpt text,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'important', 'urgent', 'critical')),
  severity text
    check (severity is null or severity in ('info', 'watch', 'warning', 'severe', 'emergency')),
  status text not null default 'new'
    check (status in ('new', 'triaged', 'relayed', 'assigned', 'acknowledged', 'resolved', 'dismissed')),
  requires_action boolean not null default false,
  requires_acknowledgement boolean not null default false,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_relays (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  source_event_id uuid references public.communication_events(id) on delete set null,
  source_table text,
  source_id uuid,
  relay_title text not null,
  relay_body text not null,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'important', 'urgent', 'critical')),
  requires_acknowledgement boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_relay_targets (
  id uuid primary key default gen_random_uuid(),
  relay_id uuid not null references public.communication_relays(id) on delete cascade,
  target_type text not null
    check (target_type in ('user', 'group_thread', 'event_group', 'department', 'tour_team', 'event_staff')),
  target_user_id uuid,
  target_thread_id uuid,
  target_event_group_id uuid,
  target_department text,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  delivery_ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (target_type = 'user' and target_user_id is not null)
    or (target_type = 'group_thread' and target_thread_id is not null)
    or (target_type = 'event_group' and target_event_group_id is not null)
    or (target_type = 'department' and target_department is not null)
    or target_type in ('tour_team', 'event_staff')
  )
);

create table if not exists public.communication_event_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  communication_event_id uuid not null references public.communication_events(id) on delete cascade,
  linked_type text not null
    check (linked_type in ('workflow_task', 'logistics_task', 'schedule_item', 'event_bulletin', 'group_message')),
  linked_id uuid not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (communication_event_id, linked_type, linked_id)
);

create table if not exists public.communication_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  enabled boolean not null default false,
  trigger_type text not null,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  schema_version integer not null default 1,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create index if not exists idx_communication_sources_org_provider
  on public.communication_sources (org_id, provider);

create index if not exists idx_communication_private_refs_source
  on public.communication_source_private_refs (source_id);

create index if not exists idx_communication_events_org_received
  on public.communication_events (org_id, received_at desc);

create index if not exists idx_communication_events_tour_received
  on public.communication_events (org_id, tour_id, received_at desc)
  where tour_id is not null;

create index if not exists idx_communication_events_event_received
  on public.communication_events (org_id, event_id, received_at desc)
  where event_id is not null;

create index if not exists idx_communication_events_status_priority
  on public.communication_events (org_id, status, priority, received_at desc);

create index if not exists idx_communication_relays_source_event
  on public.communication_relays (source_event_id, created_at desc)
  where source_event_id is not null;

create index if not exists idx_communication_relay_targets_relay
  on public.communication_relay_targets (relay_id);

create index if not exists idx_communication_relay_targets_user
  on public.communication_relay_targets (target_user_id)
  where target_user_id is not null;

create index if not exists idx_communication_event_links_event
  on public.communication_event_links (communication_event_id);

create index if not exists idx_communication_rules_org_enabled
  on public.communication_rules (org_id, enabled);

create or replace function public.set_communication_command_center_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_communication_sources_updated_at on public.communication_sources;
create trigger trg_communication_sources_updated_at
before update on public.communication_sources
for each row execute function public.set_communication_command_center_updated_at();

drop trigger if exists trg_communication_source_private_refs_updated_at on public.communication_source_private_refs;
create trigger trg_communication_source_private_refs_updated_at
before update on public.communication_source_private_refs
for each row execute function public.set_communication_command_center_updated_at();

drop trigger if exists trg_communication_events_updated_at on public.communication_events;
create trigger trg_communication_events_updated_at
before update on public.communication_events
for each row execute function public.set_communication_command_center_updated_at();

drop trigger if exists trg_communication_relays_updated_at on public.communication_relays;
create trigger trg_communication_relays_updated_at
before update on public.communication_relays
for each row execute function public.set_communication_command_center_updated_at();

drop trigger if exists trg_communication_rules_updated_at on public.communication_rules;
create trigger trg_communication_rules_updated_at
before update on public.communication_rules
for each row execute function public.set_communication_command_center_updated_at();

alter table public.communication_sources enable row level security;
alter table public.communication_source_private_refs enable row level security;
alter table public.communication_events enable row level security;
alter table public.communication_relays enable row level security;
alter table public.communication_relay_targets enable row level security;
alter table public.communication_event_links enable row level security;
alter table public.communication_rules enable row level security;

-- Service role owns provider ingestion/private refs and migration/backfill work.
drop policy if exists communication_sources_service_all on public.communication_sources;
create policy communication_sources_service_all
  on public.communication_sources for all to service_role
  using (true) with check (true);

drop policy if exists communication_source_private_refs_service_all on public.communication_source_private_refs;
create policy communication_source_private_refs_service_all
  on public.communication_source_private_refs for all to service_role
  using (true) with check (true);

drop policy if exists communication_events_service_all on public.communication_events;
create policy communication_events_service_all
  on public.communication_events for all to service_role
  using (true) with check (true);

drop policy if exists communication_relays_service_all on public.communication_relays;
create policy communication_relays_service_all
  on public.communication_relays for all to service_role
  using (true) with check (true);

drop policy if exists communication_relay_targets_service_all on public.communication_relay_targets;
create policy communication_relay_targets_service_all
  on public.communication_relay_targets for all to service_role
  using (true) with check (true);

drop policy if exists communication_event_links_service_all on public.communication_event_links;
create policy communication_event_links_service_all
  on public.communication_event_links for all to service_role
  using (true) with check (true);

drop policy if exists communication_rules_service_all on public.communication_rules;
create policy communication_rules_service_all
  on public.communication_rules for all to service_role
  using (true) with check (true);

-- Authenticated admin reads are org/capability scoped.
drop policy if exists communication_sources_select_org on public.communication_sources;
create policy communication_sources_select_org
  on public.communication_sources for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.view')
    or public.has_perm(auth.uid(), org_id, 'logistics.view')
  );

drop policy if exists communication_sources_manage_org on public.communication_sources;
create policy communication_sources_manage_org
  on public.communication_sources for all to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.broadcast')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  )
  with check (
    public.has_perm(auth.uid(), org_id, 'communications.broadcast')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  );

-- No authenticated policy exists for communication_source_private_refs by design.

drop policy if exists communication_events_select_org on public.communication_events;
create policy communication_events_select_org
  on public.communication_events for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.view')
    or public.has_perm(auth.uid(), org_id, 'logistics.view')
  );

drop policy if exists communication_events_insert_org on public.communication_events;
create policy communication_events_insert_org
  on public.communication_events for insert to authenticated
  with check (
    public.has_perm(auth.uid(), org_id, 'communications.send')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  );

drop policy if exists communication_events_update_org on public.communication_events;
create policy communication_events_update_org
  on public.communication_events for update to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.send')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  )
  with check (
    public.has_perm(auth.uid(), org_id, 'communications.send')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  );

drop policy if exists communication_relays_select_org on public.communication_relays;
create policy communication_relays_select_org
  on public.communication_relays for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.view')
    or public.has_perm(auth.uid(), org_id, 'logistics.view')
  );

drop policy if exists communication_relays_insert_org on public.communication_relays;
create policy communication_relays_insert_org
  on public.communication_relays for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.has_perm(auth.uid(), org_id, 'communications.broadcast')
      or public.has_perm(auth.uid(), org_id, 'logistics.manage')
    )
  );

drop policy if exists communication_relays_update_org on public.communication_relays;
create policy communication_relays_update_org
  on public.communication_relays for update to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.broadcast')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  )
  with check (
    public.has_perm(auth.uid(), org_id, 'communications.broadcast')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  );

drop policy if exists communication_relay_targets_select_org_or_self on public.communication_relay_targets;
create policy communication_relay_targets_select_org_or_self
  on public.communication_relay_targets for select to authenticated
  using (
    target_user_id = auth.uid()
    or exists (
      select 1
      from public.communication_relays relay
      where relay.id = communication_relay_targets.relay_id
        and (
          public.has_perm(auth.uid(), relay.org_id, 'communications.view')
          or public.has_perm(auth.uid(), relay.org_id, 'logistics.view')
        )
    )
  );

drop policy if exists communication_relay_targets_manage_org on public.communication_relay_targets;
create policy communication_relay_targets_manage_org
  on public.communication_relay_targets for all to authenticated
  using (
    exists (
      select 1
      from public.communication_relays relay
      where relay.id = communication_relay_targets.relay_id
        and (
          public.has_perm(auth.uid(), relay.org_id, 'communications.broadcast')
          or public.has_perm(auth.uid(), relay.org_id, 'logistics.manage')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.communication_relays relay
      where relay.id = communication_relay_targets.relay_id
        and (
          public.has_perm(auth.uid(), relay.org_id, 'communications.broadcast')
          or public.has_perm(auth.uid(), relay.org_id, 'logistics.manage')
        )
    )
  );

drop policy if exists communication_event_links_select_org on public.communication_event_links;
create policy communication_event_links_select_org
  on public.communication_event_links for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.view')
    or public.has_perm(auth.uid(), org_id, 'logistics.view')
  );

drop policy if exists communication_event_links_manage_org on public.communication_event_links;
create policy communication_event_links_manage_org
  on public.communication_event_links for all to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.send')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  )
  with check (
    public.has_perm(auth.uid(), org_id, 'communications.send')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  );

drop policy if exists communication_rules_select_org on public.communication_rules;
create policy communication_rules_select_org
  on public.communication_rules for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.view')
    or public.has_perm(auth.uid(), org_id, 'logistics.view')
  );

drop policy if exists communication_rules_manage_org on public.communication_rules;
create policy communication_rules_manage_org
  on public.communication_rules for all to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'communications.broadcast')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  )
  with check (
    public.has_perm(auth.uid(), org_id, 'communications.broadcast')
    or public.has_perm(auth.uid(), org_id, 'logistics.manage')
  );
