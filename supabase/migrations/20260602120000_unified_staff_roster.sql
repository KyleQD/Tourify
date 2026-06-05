set client_min_messages = warning;

-- ─── Extend staff_members for multi-entity support ───────────────────────────
alter table staff_members
  add column if not exists entity_type text
    check (entity_type in ('event','venue','tour','org') or entity_type is null),
  add column if not exists entity_id   uuid;

-- Backfill venue_team_members into staff_members
insert into staff_members (
  id, user_id, venue_id, entity_type, entity_id,
  full_name, email, role, status, created_at, updated_at
)
select
  gen_random_uuid(),
  vtm.user_id,
  vtm.venue_id,
  'venue',
  vtm.venue_id,
  coalesce(p.full_name, p.username, vtm.user_id::text) as full_name,
  coalesce(p.email, '') as email,
  vtm.role,
  coalesce(vtm.status, 'active'),
  vtm.created_at,
  vtm.updated_at
from venue_team_members vtm
left join profiles p on p.id = vtm.user_id
where vtm.user_id is not null
  and not exists (
    select 1 from staff_members sm
    where sm.user_id = vtm.user_id
      and sm.entity_type = 'venue'
      and sm.entity_id = vtm.venue_id
  )
on conflict do nothing;

-- ─── Unified view ────────────────────────────────────────────────────────────
drop view if exists unified_staff_roster;
create view unified_staff_roster as
select
  id,
  user_id,
  full_name,
  email,
  role,
  status,
  entity_type,
  entity_id,
  venue_id,
  created_at,
  updated_at
from staff_members;

comment on table venue_team_members is 'DEPRECATED: use staff_members with entity_type=venue instead';

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_staff_members_entity on staff_members(entity_type, entity_id);
create index if not exists idx_staff_members_user on staff_members(user_id);
