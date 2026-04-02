-- Event core: calendars, holds, events, audit logs
create extension if not exists pgcrypto;

-- Referenced by calendars/events_v2; full definition also in admin_staffing_core migration
create table if not exists venues_v2 (
  id uuid primary key default gen_random_uuid(),
  name text,
  slug text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists calendars (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  venue_id uuid references venues_v2(id) on delete set null,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists holds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  calendar_id uuid not null references calendars(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null check (status in ('soft','hard','confirmed')),
  color text,
  note text,
  contact_id uuid,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists events_v2 (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  venue_id uuid references venues_v2(id) on delete set null,
  title text not null,
  slug text not null,
  status text not null check (status in ('inquiry','hold','offer','confirmed','advancing','onsite','settled','archived')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null default 'UTC',
  age_restrictions text,
  capacity integer,
  settings jsonb not null default '{}',
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, slug)
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_kind text not null,
  entity_id uuid not null,
  action text not null,
  diff jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_holds_calendar_time on holds(calendar_id, start_at, end_at);
create index if not exists idx_events_org_time on events_v2(org_id, start_at desc);
create index if not exists idx_events_status on events_v2(status);

-- RLS
alter table calendars enable row level security;
alter table holds enable row level security;
alter table events_v2 enable row level security;
alter table audit_log enable row level security;

-- Policies: members can read within org; writes require permissions
drop policy if exists cal_select on calendars;
create policy cal_select on calendars for select using (public.is_org_member(auth.uid(), org_id));
drop policy if exists cal_insert on calendars;
create policy cal_insert on calendars for insert with check (public.has_perm(auth.uid(), org_id, 'event.manage'));
drop policy if exists cal_update on calendars;
create policy cal_update on calendars for update using (public.has_perm(auth.uid(), org_id, 'event.manage'));

drop policy if exists holds_select on holds;
create policy holds_select on holds for select using (public.is_org_member(auth.uid(), org_id));
drop policy if exists holds_insert on holds;
create policy holds_insert on holds for insert with check (public.has_perm(auth.uid(), org_id, 'event.manage'));
drop policy if exists holds_update on holds;
create policy holds_update on holds for update using (public.has_perm(auth.uid(), org_id, 'event.manage'));
drop policy if exists holds_delete on holds;
create policy holds_delete on holds for delete using (public.has_perm(auth.uid(), org_id, 'event.manage'));

drop policy if exists events_select on events_v2;
create policy events_select on events_v2 for select using (public.is_org_member(auth.uid(), org_id));
drop policy if exists events_insert on events_v2;
create policy events_insert on events_v2 for insert with check (public.has_perm(auth.uid(), org_id, 'event.manage'));
drop policy if exists events_update on events_v2;
create policy events_update on events_v2 for update using (public.has_perm(auth.uid(), org_id, 'event.manage'));

drop policy if exists audit_select on audit_log;
create policy audit_select on audit_log for select using (public.is_org_member(auth.uid(), org_id));

-- Triggers to set updated_at and write audit logs
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_events_touch on events_v2;
create trigger trg_events_touch before update on events_v2 for each row execute function touch_updated_at();

create or replace function audit_event_update() returns trigger language plpgsql as $$
begin
  insert into audit_log(org_id, actor_id, entity_kind, entity_id, action, diff)
  values (new.org_id, auth.uid(), 'event', new.id, TG_OP, jsonb_build_object('old', row_to_json(old), 'new', row_to_json(new)));
  return new;
end $$;

drop trigger if exists trg_events_audit on events_v2;
create trigger trg_events_audit after insert or update on events_v2 for each row execute function audit_event_update();


