set client_min_messages = warning;

create unique index if not exists idx_tours_calendar_token_unique
  on public.tours(calendar_token)
  where calendar_token is not null;

-- Align the collaboration tables with the Admin tour UI's canonical payloads.
alter table if exists public.tour_teams
  add column if not exists team_type text,
  add column if not exists role text,
  add column if not exists description text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.tour_teams
set role = coalesce(nullif(role, ''), nullif(team_type, ''), 'general'),
    team_type = coalesce(nullif(team_type, ''), nullif(role, ''), 'general')
where role is null or btrim(role) = '' or team_type is null or btrim(team_type) = '';

alter table public.tour_teams alter column role set not null;
alter table public.tour_teams alter column team_type set not null;

alter table if exists public.tour_team_members
  add column if not exists tour_id uuid references public.tours(id) on delete cascade,
  add column if not exists team_id uuid references public.tour_teams(id) on delete cascade,
  add column if not exists profile jsonb,
  add column if not exists role text,
  add column if not exists role_in_team text,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists status text default 'pending',
  add column if not exists arrival_date text,
  add column if not exists departure_date text,
  add column if not exists responsibilities text,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz default now(),
  add column if not exists is_active boolean default true,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.tour_team_members alter column user_id drop not null;
alter table if exists public.tour_team_members alter column assigned_by drop not null;

update public.tour_team_members member
set tour_id = team.tour_id
from public.tour_teams team
where member.team_id = team.id
  and member.tour_id is null;

update public.tour_team_members
set role = coalesce(nullif(role, ''), nullif(role_in_team, ''), 'member'),
    role_in_team = coalesce(nullif(role_in_team, ''), nullif(role, ''), 'member'),
    status = case when status in ('confirmed', 'pending', 'declined') then status else 'pending' end,
    is_active = case when status = 'declined' then false else coalesce(is_active, true) end
where role is null
   or btrim(role) = ''
   or role_in_team is null
   or btrim(role_in_team) = ''
   or status is null
   or status not in ('confirmed', 'pending', 'declined')
   or is_active is null;

alter table public.tour_team_members alter column status set not null;
alter table public.tour_team_members alter column is_active set not null;
alter table public.tour_team_members drop constraint if exists tour_team_members_status_check;
alter table public.tour_team_members
  add constraint tour_team_members_status_check check (status in ('confirmed', 'pending', 'declined'));

alter table if exists public.tour_vendors
  add column if not exists status text not null default 'pending',
  add column if not exists services text[] not null default '{}'::text[],
  add column if not exists contract_amount numeric,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists notes text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.tour_vendors
set status = case when status in ('confirmed', 'pending', 'declined') then status else 'pending' end,
    payment_status = case when payment_status in ('paid', 'partial', 'pending') then payment_status else 'pending' end,
    services = coalesce(services, '{}'::text[]);

alter table public.tour_vendors drop constraint if exists tour_vendors_status_check;
alter table public.tour_vendors
  add constraint tour_vendors_status_check check (status in ('confirmed', 'pending', 'declined'));
alter table public.tour_vendors drop constraint if exists tour_vendors_payment_status_check;
alter table public.tour_vendors
  add constraint tour_vendors_payment_status_check check (payment_status in ('paid', 'partial', 'pending'));
alter table public.tour_vendors drop constraint if exists tour_vendors_contract_amount_check;
alter table public.tour_vendors
  add constraint tour_vendors_contract_amount_check check (contract_amount is null or contract_amount >= 0);

create index if not exists idx_tour_artists_tour_id on public.tour_artists(tour_id);
create index if not exists idx_tour_vendors_tour_id on public.tour_vendors(tour_id);
create index if not exists idx_tour_teams_tour_id on public.tour_teams(tour_id);
create index if not exists idx_tour_team_members_tour_id on public.tour_team_members(tour_id);
create index if not exists idx_tour_team_members_team_id on public.tour_team_members(team_id);

alter table public.tour_artists enable row level security;
alter table public.tour_vendors enable row level security;
alter table public.tour_teams enable row level security;
alter table public.tour_team_members enable row level security;

-- Remove every known beta/owner/org overlay before installing one capability model.
drop policy if exists tour_artists_all on public.tour_artists;
drop policy if exists tour_artists_select on public.tour_artists;
drop policy if exists tour_artists_insert on public.tour_artists;
drop policy if exists tour_artists_update on public.tour_artists;
drop policy if exists tour_artists_delete on public.tour_artists;

drop policy if exists tour_vendors_all on public.tour_vendors;
drop policy if exists tour_vendors_select on public.tour_vendors;
drop policy if exists tour_vendors_insert on public.tour_vendors;
drop policy if exists tour_vendors_update on public.tour_vendors;
drop policy if exists tour_vendors_delete on public.tour_vendors;
drop policy if exists vendors_read_owner_or_team on public.tour_vendors;
drop policy if exists vendors_write_owner_only on public.tour_vendors;

drop policy if exists tour_teams_all on public.tour_teams;
drop policy if exists tour_teams_select on public.tour_teams;
drop policy if exists tour_teams_insert on public.tour_teams;
drop policy if exists tour_teams_update on public.tour_teams;
drop policy if exists tour_teams_delete on public.tour_teams;
drop policy if exists "Beta access - users can view teams" on public.tour_teams;
drop policy if exists "Beta access - users can manage teams" on public.tour_teams;

drop policy if exists tour_team_members_all on public.tour_team_members;
drop policy if exists tour_team_members_select on public.tour_team_members;
drop policy if exists tour_team_members_insert on public.tour_team_members;
drop policy if exists tour_team_members_update on public.tour_team_members;
drop policy if exists tour_team_members_delete on public.tour_team_members;
drop policy if exists tour_team_members_select_org on public.tour_team_members;
drop policy if exists tour_team_members_insert_org on public.tour_team_members;
drop policy if exists tour_team_members_update_org on public.tour_team_members;
drop policy if exists tour_team_members_delete_org on public.tour_team_members;
drop policy if exists team_read_owner_or_team on public.tour_team_members;
drop policy if exists team_write_owner_only on public.tour_team_members;
drop policy if exists "Beta access - users can view team members" on public.tour_team_members;
drop policy if exists "Beta access - users can manage team members" on public.tour_team_members;

create policy tour_artists_select on public.tour_artists for select to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'tour.view'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_artists_insert on public.tour_artists for insert to authenticated
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'tour.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_artists_update on public.tour_artists for update to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'tour.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
))
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'tour.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_artists_delete on public.tour_artists for delete to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'tour.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));

create policy tour_vendors_select on public.tour_vendors for select to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'vendor.view'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_vendors_insert on public.tour_vendors for insert to authenticated
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'vendor.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_vendors_update on public.tour_vendors for update to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'vendor.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
))
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'vendor.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_vendors_delete on public.tour_vendors for delete to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'vendor.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));

create policy tour_teams_select on public.tour_teams for select to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.view'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_teams_insert on public.tour_teams for insert to authenticated
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_teams_update on public.tour_teams for update to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
))
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_teams_delete on public.tour_teams for delete to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));

create policy tour_team_members_select on public.tour_team_members for select to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.view'))
      or (tour.org_id is null and (public.is_tour_owner(tour.id) or user_id = auth.uid())))
));
create policy tour_team_members_insert on public.tour_team_members for insert to authenticated
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_team_members_update on public.tour_team_members for update to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
))
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy tour_team_members_delete on public.tour_team_members for delete to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));

revoke all on public.tour_artists, public.tour_vendors, public.tour_teams, public.tour_team_members from anon;
grant select, insert, update, delete on public.tour_artists, public.tour_vendors, public.tour_teams, public.tour_team_members to authenticated;

-- Tour invitations share the hiring table; add a narrow tour-capability path
-- without disturbing employer-scoped or token-onboarding policies.
drop policy if exists staff_invitations_tour_select on public.staff_invitations;
drop policy if exists staff_invitations_tour_insert on public.staff_invitations;
drop policy if exists staff_invitations_tour_update on public.staff_invitations;
drop policy if exists staff_invitations_tour_delete on public.staff_invitations;

create policy staff_invitations_tour_select on public.staff_invitations for select to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.view'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy staff_invitations_tour_insert on public.staff_invitations for insert to authenticated
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy staff_invitations_tour_update on public.staff_invitations for update to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
))
with check (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));
create policy staff_invitations_tour_delete on public.staff_invitations for delete to authenticated
using (exists (
  select 1 from public.tours tour
  where tour.id = tour_id
    and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'workforce.manage'))
      or (tour.org_id is null and public.is_tour_owner(tour.id)))
));

grant select, insert, update, delete on public.staff_invitations to authenticated;

-- Tour hiring uses the public artist job board, but the historical schema did
-- not persist a canonical tour link and allowed a poster to attach their job to
-- any tour UUID. Align the schema and bind tour jobs to hiring.manage.
alter table if exists public.artist_jobs
  add column if not exists tour_id uuid references public.tours(id) on delete set null,
  add column if not exists tour_name text;

create index if not exists idx_artist_jobs_tour_id on public.artist_jobs(tour_id);

insert into public.artist_job_categories(name, description, icon, color, is_active)
values
  ('Musicians', 'Instrumental performers for live touring productions', 'Music', '#8B5CF6', true),
  ('Vocalists', 'Lead and background vocalists for touring productions', 'Mic', '#EC4899', true),
  ('Sound Engineers', 'Front-of-house, monitor, and systems audio engineers', 'Speaker', '#6366F1', true),
  ('Lighting Technicians', 'Lighting programmers, designers, and technicians', 'Lightbulb', '#F59E0B', true),
  ('Stage Crew', 'Stagehands, production crew, and local labor', 'Users', '#10B981', true),
  ('Photographers', 'Tour and live-event photographers', 'Camera', '#14B8A6', true),
  ('Videographers', 'Touring video, content, and live capture roles', 'Video', '#06B6D4', true),
  ('Transportation', 'Drivers and transportation coordinators', 'Truck', '#64748B', true),
  ('Security', 'Tour and event security roles', 'Shield', '#EF4444', true),
  ('Catering', 'Tour catering and hospitality roles', 'Utensils', '#F97316', true),
  ('Tour Management', 'Tour managers and operational leads', 'Route', '#7C3AED', true),
  ('Accommodation', 'Travel and lodging coordinators', 'Hotel', '#0EA5E9', true)
on conflict (name) do update
set description = excluded.description,
    icon = excluded.icon,
    color = excluded.color,
    is_active = true;

drop policy if exists "Authenticated users can create jobs" on public.artist_jobs;
drop policy if exists "Artists can create collaboration jobs" on public.artist_jobs;
drop policy if exists "Users can update their own jobs" on public.artist_jobs;
drop policy if exists "Users can delete their own jobs" on public.artist_jobs;
drop policy if exists artist_jobs_tour_private_select on public.artist_jobs;
drop policy if exists artist_jobs_create on public.artist_jobs;
drop policy if exists artist_jobs_update on public.artist_jobs;
drop policy if exists artist_jobs_delete on public.artist_jobs;

create policy artist_jobs_tour_private_select on public.artist_jobs for select to authenticated
using (
  tour_id is not null
  and exists (
    select 1 from public.tours tour
    where tour.id = tour_id
      and tour.org_id is not null
      and public.has_perm(auth.uid(), tour.org_id, 'hiring.manage')
  )
);

create policy artist_jobs_create on public.artist_jobs for insert to authenticated
with check (
  posted_by = auth.uid()
  and (
    tour_id is null
    or exists (
      select 1 from public.tours tour
      where tour.id = tour_id
        and (
          (tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'hiring.manage'))
          or (tour.org_id is null and public.is_tour_owner(tour.id))
        )
    )
  )
  and (
    job_type <> 'collaboration'
    or exists (select 1 from public.artist_profiles artist where artist.user_id = auth.uid())
  )
);

create policy artist_jobs_update on public.artist_jobs for update to authenticated
using (
  (tour_id is null and posted_by = auth.uid())
  or (
    tour_id is not null
    and exists (
      select 1 from public.tours tour
      where tour.id = tour_id
        and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'hiring.manage'))
          or (tour.org_id is null and public.is_tour_owner(tour.id)))
    )
  )
)
with check (
  (tour_id is null and posted_by = auth.uid())
  or (
    tour_id is not null
    and exists (
      select 1 from public.tours tour
      where tour.id = tour_id
        and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'hiring.manage'))
          or (tour.org_id is null and public.is_tour_owner(tour.id)))
    )
  )
);

create policy artist_jobs_delete on public.artist_jobs for delete to authenticated
using (
  (tour_id is null and posted_by = auth.uid())
  or (
    tour_id is not null
    and exists (
      select 1 from public.tours tour
      where tour.id = tour_id
        and ((tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'hiring.manage'))
          or (tour.org_id is null and public.is_tour_owner(tour.id)))
    )
  )
);

-- Canonical Logistics authorization. Every non-null scope on a task must belong
-- to an entity where the actor has the requested Admin capability.
create or replace function public.has_admin_logistics_scope(
  p_event_id uuid,
  p_tour_id uuid,
  p_capability text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    (p_event_id is not null or p_tour_id is not null)
    and (
      p_event_id is null
      or exists (
        select 1 from public.events_v2 event
        where event.id = p_event_id
          and event.org_id is not null
          and public.has_perm(auth.uid(), event.org_id, p_capability)
      )
    )
    and (
      p_tour_id is null
      or exists (
        select 1 from public.tours tour
        where tour.id = p_tour_id
          and (
            (tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, p_capability))
            or (tour.org_id is null and (tour.created_by = auth.uid() or tour.user_id = auth.uid()))
          )
      )
    );
$$;

revoke all on function public.has_admin_logistics_scope(uuid, uuid, text) from public, anon;
grant execute on function public.has_admin_logistics_scope(uuid, uuid, text) to authenticated, service_role;

drop policy if exists "log_tasks_read_all_auth" on public.logistics_tasks;
drop policy if exists "log_tasks_write_creator_or_admin" on public.logistics_tasks;
drop policy if exists "log_tasks_select_rbacs" on public.logistics_tasks;
drop policy if exists "log_tasks_insert_rbacs" on public.logistics_tasks;
drop policy if exists "log_tasks_update_rbacs" on public.logistics_tasks;
drop policy if exists "log_tasks_delete_rbacs" on public.logistics_tasks;
drop policy if exists admin_logistics_tasks_select on public.logistics_tasks;
drop policy if exists admin_logistics_tasks_insert on public.logistics_tasks;
drop policy if exists admin_logistics_tasks_update on public.logistics_tasks;
drop policy if exists admin_logistics_tasks_delete on public.logistics_tasks;

create policy admin_logistics_tasks_select on public.logistics_tasks for select to authenticated
using (
  public.has_admin_logistics_scope(event_id, tour_id, 'logistics.view')
  or public.has_admin_logistics_scope(event_id, tour_id, 'logistics.manage')
  or (event_id is null and tour_id is null and created_by = auth.uid())
);
create policy admin_logistics_tasks_insert on public.logistics_tasks for insert to authenticated
with check (
  public.has_admin_logistics_scope(event_id, tour_id, 'logistics.manage')
  and created_by = auth.uid()
);
create policy admin_logistics_tasks_update on public.logistics_tasks for update to authenticated
using (public.has_admin_logistics_scope(event_id, tour_id, 'logistics.manage'))
with check (public.has_admin_logistics_scope(event_id, tour_id, 'logistics.manage'));
create policy admin_logistics_tasks_delete on public.logistics_tasks for delete to authenticated
using (public.has_admin_logistics_scope(event_id, tour_id, 'logistics.manage'));

drop policy if exists "log_task_equipment_read_auth" on public.logistics_task_equipment;
drop policy if exists "log_task_equipment_write_auth" on public.logistics_task_equipment;
drop policy if exists "log_task_equipment_select_rbacs" on public.logistics_task_equipment;
drop policy if exists "log_task_equipment_cud_rbacs" on public.logistics_task_equipment;
drop policy if exists admin_logistics_equipment_select on public.logistics_task_equipment;
drop policy if exists admin_logistics_equipment_mutate on public.logistics_task_equipment;

create policy admin_logistics_equipment_select on public.logistics_task_equipment for select to authenticated
using (exists (
  select 1 from public.logistics_tasks task
  where task.id = task_id
    and (
      public.has_admin_logistics_scope(task.event_id, task.tour_id, 'logistics.view')
      or public.has_admin_logistics_scope(task.event_id, task.tour_id, 'logistics.manage')
    )
));
create policy admin_logistics_equipment_mutate on public.logistics_task_equipment for all to authenticated
using (exists (
  select 1 from public.logistics_tasks task
  where task.id = task_id
    and public.has_admin_logistics_scope(task.event_id, task.tour_id, 'logistics.manage')
))
with check (exists (
  select 1 from public.logistics_tasks task
  where task.id = task_id
    and public.has_admin_logistics_scope(task.event_id, task.tour_id, 'logistics.manage')
));

drop policy if exists "log_act_read_linked_task" on public.logistics_activity;
drop policy if exists "log_act_insert_linked_task" on public.logistics_activity;
drop policy if exists admin_logistics_activity_select on public.logistics_activity;
drop policy if exists admin_logistics_activity_insert on public.logistics_activity;
create policy admin_logistics_activity_select on public.logistics_activity for select to authenticated
using (exists (
  select 1 from public.logistics_tasks task
  where task.id = task_id
    and (
      public.has_admin_logistics_scope(task.event_id, task.tour_id, 'logistics.view')
      or public.has_admin_logistics_scope(task.event_id, task.tour_id, 'logistics.manage')
    )
));
create policy admin_logistics_activity_insert on public.logistics_activity for insert to authenticated
with check (exists (
  select 1 from public.logistics_tasks task
  where task.id = task_id
    and public.has_admin_logistics_scope(task.event_id, task.tour_id, 'logistics.manage')
));

revoke all on public.logistics_tasks, public.logistics_task_equipment, public.logistics_activity from anon;
grant select, insert, update, delete on public.logistics_tasks, public.logistics_task_equipment to authenticated;
grant select, insert on public.logistics_activity to authenticated;

create or replace function public.reserve_admin_logistics_equipment(
  p_org_id uuid,
  p_task_id uuid,
  p_equipment_asset_id uuid,
  p_start_time timestamptz default null,
  p_end_time timestamptz default null,
  p_quantity integer default 1,
  p_actor_user_id uuid default auth.uid()
)
returns public.logistics_task_equipment
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.logistics_tasks%rowtype;
  v_asset public.equipment_assets%rowtype;
  v_link public.logistics_task_equipment%rowtype;
begin
  if auth.uid() is null or p_actor_user_id is distinct from auth.uid() then
    raise exception 'Actor does not match the authenticated user' using errcode = '42501';
  end if;
  if p_quantity < 1 or p_quantity > 1000 then
    raise exception 'Reservation quantity is invalid' using errcode = '22023';
  end if;
  if (p_start_time is null) <> (p_end_time is null) or (p_start_time is not null and p_end_time <= p_start_time) then
    raise exception 'Reservation time window is invalid' using errcode = '22023';
  end if;

  select * into v_task from public.logistics_tasks where id = p_task_id for update;
  if not found then raise exception 'Logistics task not found' using errcode = 'P0002'; end if;
  if not public.has_admin_logistics_scope(v_task.event_id, v_task.tour_id, 'logistics.manage') then
    raise exception 'Logistics task is not available to the acting organization' using errcode = '42501';
  end if;
  if (v_task.tour_id is not null and not exists (select 1 from public.tours tour where tour.id = v_task.tour_id and tour.org_id = p_org_id))
    or (v_task.event_id is not null and not exists (select 1 from public.events_v2 event where event.id = v_task.event_id and event.org_id = p_org_id)) then
    raise exception 'Logistics task does not belong to the acting organization' using errcode = '42501';
  end if;

  select * into v_asset from public.equipment_assets where id = p_equipment_asset_id for update;
  if not found then raise exception 'Equipment asset not found' using errcode = 'P0002'; end if;
  if coalesce(v_asset.is_available, false) = false then
    raise exception 'Equipment asset is unavailable' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.rbac_user_entity_roles role
    where role.user_id = auth.uid()
      and role.entity_type = v_asset.owner_type
      and role.entity_id = v_asset.owner_id
      and role.is_active = true
  ) then
    raise exception 'Equipment asset is not available to this account' using errcode = '42501';
  end if;

  if p_start_time is not null and exists (
    select 1 from public.logistics_task_equipment reservation
    where reservation.equipment_asset_id = p_equipment_asset_id
      and reservation.task_id <> p_task_id
      and reservation.start_time is not null
      and reservation.end_time is not null
      and reservation.start_time < p_end_time
      and reservation.end_time > p_start_time
  ) then
    raise exception 'Equipment reservation conflicts with another task' using errcode = '23P01';
  end if;

  insert into public.logistics_task_equipment(task_id, equipment_asset_id, start_time, end_time, quantity)
  values (p_task_id, p_equipment_asset_id, p_start_time, p_end_time, p_quantity)
  on conflict (task_id, equipment_asset_id) do update
  set start_time = excluded.start_time,
      end_time = excluded.end_time,
      quantity = excluded.quantity
  returning * into v_link;

  insert into public.logistics_activity(task_id, actor_id, action, metadata)
  values (p_task_id, auth.uid(), 'equipment_attached', jsonb_build_object(
    'equipment_asset_id', p_equipment_asset_id,
    'start_time', p_start_time,
    'end_time', p_end_time,
    'quantity', p_quantity
  ));
  return v_link;
end;
$$;

revoke all on function public.reserve_admin_logistics_equipment(uuid, uuid, uuid, timestamptz, timestamptz, integer, uuid) from public, anon;
grant execute on function public.reserve_admin_logistics_equipment(uuid, uuid, uuid, timestamptz, timestamptz, integer, uuid) to authenticated, service_role;
