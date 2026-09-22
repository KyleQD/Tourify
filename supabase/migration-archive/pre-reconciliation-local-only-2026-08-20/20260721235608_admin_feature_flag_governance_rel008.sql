-- REL-008 — governed, organization-scoped Admin feature flags.
-- Expand-only: the legacy public.feature_flags table and all existing rows remain
-- untouched. No organization assignment is inferred from legacy target arrays.

create table if not exists public.admin_feature_flag_definitions (
  key text primary key,
  display_name text not null,
  purpose text not null,
  owner text not null,
  environments text[] not null default array['staging']::text[],
  safe_default boolean not null default false,
  metrics_contract jsonb not null default '{}'::jsonb,
  rollback_instructions text not null,
  expires_at timestamptz not null,
  removal_issue text not null,
  state text not null default 'active' check (state in ('active', 'retired')),
  definition_version integer not null default 1 check (definition_version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_feature_flag_key_format check (key ~ '^admin_[a-z0-9]+(?:_[a-z0-9]+)*_v[1-9][0-9]*$'),
  constraint admin_feature_flag_environments_nonempty check (cardinality(environments) > 0),
  constraint admin_feature_flag_metrics_object check (jsonb_typeof(metrics_contract) = 'object')
);

comment on table public.admin_feature_flag_definitions is
  'REL-008 governed feature definitions. Retire definitions; never delete operational evidence.';

create table if not exists public.admin_org_feature_flag_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete restrict,
  flag_key text not null references public.admin_feature_flag_definitions(key) on delete restrict,
  environment text not null,
  enabled boolean not null default false,
  rollout_percentage integer not null default 0 check (rollout_percentage between 0 and 100),
  change_reason text not null check (length(btrim(change_reason)) between 3 and 2000),
  idempotency_key text not null check (length(btrim(idempotency_key)) between 8 and 200),
  assignment_version integer not null default 1 check (assignment_version > 0),
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, flag_key, environment),
  unique (org_id, idempotency_key)
);

create index if not exists admin_org_feature_flags_lookup_idx
  on public.admin_org_feature_flag_assignments (org_id, environment, flag_key);

create table if not exists public.admin_feature_flag_change_history (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.admin_org_feature_flag_assignments(id) on delete restrict,
  org_id uuid not null references public.organizations(id) on delete restrict,
  flag_key text not null references public.admin_feature_flag_definitions(key) on delete restrict,
  environment text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('assigned', 'enabled', 'disabled', 'rollout_changed', 'metadata_changed')),
  reason text not null,
  idempotency_key text not null,
  old_value jsonb,
  new_value jsonb not null,
  created_at timestamptz not null default now(),
  unique (org_id, idempotency_key)
);

create index if not exists admin_feature_flag_history_org_created_idx
  on public.admin_feature_flag_change_history (org_id, created_at desc);

create or replace function public.prevent_admin_feature_flag_history_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'feature flag history is immutable' using errcode = '55000';
end;
$$;

create trigger admin_feature_flag_history_immutable
  before update or delete on public.admin_feature_flag_change_history
  for each row execute function public.prevent_admin_feature_flag_history_mutation();

create or replace function public.record_admin_feature_flag_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'assigned';
  elsif old.enabled is distinct from new.enabled then
    v_action := case when new.enabled then 'enabled' else 'disabled' end;
  elsif old.rollout_percentage is distinct from new.rollout_percentage then
    v_action := 'rollout_changed';
  else
    v_action := 'metadata_changed';
  end if;

  insert into public.admin_feature_flag_change_history (
    assignment_id, org_id, flag_key, environment, actor_user_id, action,
    reason, idempotency_key, old_value, new_value
  ) values (
    new.id, new.org_id, new.flag_key, new.environment, new.updated_by, v_action,
    new.change_reason, new.idempotency_key,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger admin_feature_flag_assignment_history
  after insert or update on public.admin_org_feature_flag_assignments
  for each row execute function public.record_admin_feature_flag_assignment_change();

create or replace function public.touch_admin_feature_flag_definition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.definition_version := old.definition_version + 1;
  end if;
  return new;
end;
$$;

create trigger admin_feature_flag_definition_touch
  before update on public.admin_feature_flag_definitions
  for each row execute function public.touch_admin_feature_flag_definition();

create or replace function public.touch_admin_org_feature_flag_assignment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.assignment_version := old.assignment_version + 1;
  return new;
end;
$$;

create trigger admin_org_feature_flag_assignment_touch
  before update on public.admin_org_feature_flag_assignments
  for each row execute function public.touch_admin_org_feature_flag_assignment();

alter table public.admin_feature_flag_definitions enable row level security;
alter table public.admin_org_feature_flag_assignments enable row level security;
alter table public.admin_feature_flag_change_history enable row level security;

create policy admin_feature_flag_definitions_read
  on public.admin_feature_flag_definitions for select to authenticated
  using (true);

create policy admin_org_feature_flags_read
  on public.admin_org_feature_flag_assignments for select to authenticated
  using (public.is_org_member(auth.uid(), org_id));

create policy admin_org_feature_flags_insert
  on public.admin_org_feature_flag_assignments for insert to authenticated
  with check (
    public.has_perm(auth.uid(), org_id, 'org.settings.manage')
    and updated_by = auth.uid()
  );

create policy admin_org_feature_flags_update
  on public.admin_org_feature_flag_assignments for update to authenticated
  using (public.has_perm(auth.uid(), org_id, 'org.settings.manage'))
  with check (
    public.has_perm(auth.uid(), org_id, 'org.settings.manage')
    and updated_by = auth.uid()
  );

create policy admin_feature_flag_history_read
  on public.admin_feature_flag_change_history for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'audit.view')
    or public.has_perm(auth.uid(), org_id, 'org.settings.manage')
  );

revoke all on public.admin_feature_flag_definitions from anon, authenticated;
revoke all on public.admin_org_feature_flag_assignments from anon, authenticated;
revoke all on public.admin_feature_flag_change_history from anon, authenticated;
grant select on public.admin_feature_flag_definitions to authenticated;
grant select, insert, update on public.admin_org_feature_flag_assignments to authenticated;
grant select on public.admin_feature_flag_change_history to authenticated;
revoke all on function public.record_admin_feature_flag_assignment_change() from public, anon, authenticated;

insert into public.admin_feature_flag_definitions (
  key, display_name, purpose, owner, environments, safe_default,
  metrics_contract, rollback_instructions, expires_at, removal_issue
) values
  (
    'admin_ticketing_canonical_v1',
    'Canonical ticketing',
    'Switch an organization to the reconciled canonical ticketing read/write path.',
    'Ticketing Platform',
    array['staging', 'pilot', 'production'],
    false,
    '{"adoption":"canonical_request_rate","errors":"canonical_error_rate","reconciliation":"inventory_variance"}'::jsonb,
    'Disable the organization assignment; preserve reconciliation evidence and return the explicit unavailable state.',
    '2027-12-31T23:59:59Z'::timestamptz,
    'TIX-204'
  ),
  (
    'admin_publication_outbox_v1',
    'Publication outbox',
    'Enable durable publication delivery for a reconciled organization.',
    'Admin Publishing',
    array['staging', 'pilot', 'production'],
    false,
    '{"adoption":"outbox_delivery_rate","errors":"dead_letter_rate","latency":"delivery_latency_ms"}'::jsonb,
    'Disable the organization assignment; do not delete snapshots, deliveries, or audit history.',
    '2027-12-31T23:59:59Z'::timestamptz,
    'PUB-601'
  )
on conflict (key) do nothing;
