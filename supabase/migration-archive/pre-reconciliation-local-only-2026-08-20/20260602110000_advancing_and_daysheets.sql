set client_min_messages = warning;

-- ─── advancing_documents ─────────────────────────────────────────────────────
create table if not exists advancing_documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events_v2(id) on delete cascade,
  tour_id  uuid references tours(id)     on delete set null,
  org_id   uuid not null,

  -- Tech rider
  stage_width_ft        numeric,
  stage_depth_ft        numeric,
  stage_height_ft       numeric,
  backline_provided     boolean default false,
  backline_notes        text,
  sound_system_type     text,
  monitor_type          text,
  monitor_mixes_count   int,
  foh_console           text,
  mon_console           text,
  power_requirements    text,

  -- Hospitality rider
  dressing_rooms_count  int,
  catering_notes        text,
  meal_count            int,
  dietary_restrictions  text[],
  towels_count          int,
  parking_passes_count  int,
  comps_count           int,

  -- Contacts
  venue_contact_name       text,
  venue_contact_phone      text,
  venue_contact_email      text,
  production_manager_name  text,
  production_manager_phone text,
  local_promoter_name      text,
  local_promoter_phone     text,

  -- Settlement
  deal_type             text check (deal_type in ('guarantee','vs_door','percentage') or deal_type is null),
  guarantee_amount      numeric,
  door_percentage       numeric,
  vs_expenses           boolean,
  estimated_expenses    numeric,
  settlement_contact    text,

  -- Meta
  notes       text,
  status      text not null default 'pending'
                check (status in ('pending','sent','confirmed')),
  share_token uuid default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table advancing_documents enable row level security;

drop policy if exists advancing_select on advancing_documents;
create policy advancing_select on advancing_documents
  for select using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

drop policy if exists advancing_write on advancing_documents;
create policy advancing_write on advancing_documents
  for all using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create index if not exists idx_advancing_event on advancing_documents(event_id);
create index if not exists idx_advancing_tour  on advancing_documents(tour_id);

-- ─── day_sheets ───────────────────────────────────────────────────────────────
create table if not exists day_sheets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events_v2(id) on delete cascade,
  org_id   uuid not null,

  -- Schedule
  load_in_time            time,
  production_advance_time time,
  sound_check_time        time,
  doors_open_time         time,
  support_set_time        time,
  headliner_set_time      time,
  curfew_time             time,

  -- Venue info
  venue_name     text,
  venue_address  text,
  venue_city     text,
  venue_phone    text,
  parking_notes  text,

  -- Catering
  catering_location text,
  catering_notes    text,

  -- Notes
  general_notes text,

  -- Distribution
  distributed_at  timestamptz,
  recipients      text[],

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table day_sheets enable row level security;

drop policy if exists day_sheets_select on day_sheets;
create policy day_sheets_select on day_sheets
  for select using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

drop policy if exists day_sheets_write on day_sheets;
create policy day_sheets_write on day_sheets
  for all using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

create index if not exists idx_day_sheets_event on day_sheets(event_id);

-- ─── calendar_token on tours ─────────────────────────────────────────────────
alter table tours add column if not exists calendar_token uuid default gen_random_uuid();
