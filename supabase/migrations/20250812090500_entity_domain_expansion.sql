set client_min_messages = warning;

-- =============================================================================
-- Entity Domain Expansion (Additive, Non-breaking)
-- Agencies, Companies, Equipment Assets (polymorphic), Locations, Participants, Packages
-- =============================================================================

-- =========================
-- Agencies / Companies
-- =========================

create table if not exists performance_agencies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists staffing_agencies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists rental_companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists production_companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists promoters (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Link: Agencies ↔ Artists
create table if not exists agency_artists (
  agency_id uuid references performance_agencies(id) on delete cascade not null,
  artist_id uuid references artist_profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (agency_id, artist_id)
);

create index if not exists idx_agency_artists_artist on agency_artists(artist_id);

-- Link: Staffing Agency ↔ Individuals (Auth Users)
create table if not exists staffing_agency_staff (
  agency_id uuid references staffing_agencies(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (agency_id, user_id)
);

create index if not exists idx_staffing_agency_staff_user on staffing_agency_staff(user_id);

-- Generic entity managers (for any entity type)
create table if not exists entity_managers (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null,
  entity_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (entity_type, entity_id, user_id)
);

create index if not exists idx_entity_managers_entity on entity_managers(entity_type, entity_id);

-- =========================
-- Equipment Assets (polymorphic owner)
-- =========================

create table if not exists equipment_assets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  description text,
  serial_number text,
  owner_type text not null, -- e.g., 'Venue','Artist','RentalCompany','ProductionCompany'
  owner_id uuid not null,
  is_available boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (serial_number)
);

create index if not exists idx_equipment_assets_owner on equipment_assets(owner_type, owner_id);

-- =========================
-- Locations and Event Multi-place
-- =========================

create table if not exists locations (
  id uuid primary key default uuid_generate_v4(),
  location_type text not null check (location_type in ('Venue','PublicLocation','PrivateLocation','VirtualLocation')),
  name text not null,
  address text,
  coordinates jsonb,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_locations_type on locations(location_type);

create table if not exists event_locations (
  event_id uuid references events(id) on delete cascade not null,
  location_id uuid references locations(id) on delete cascade not null,
  location_type text not null,
  is_primary boolean default false,
  created_at timestamptz default now(),
  primary key (event_id, location_id)
);

create index if not exists idx_event_locations_event on event_locations(event_id);

-- =========================
-- Event Participants & Packages
-- =========================

create table if not exists event_participants (
  event_id uuid references events(id) on delete cascade not null,
  participant_type text not null, -- 'Individual','Artist','PerformanceAgency', etc.
  participant_id uuid not null,
  role text,
  created_at timestamptz default now(),
  primary key (event_id, participant_type, participant_id)
);

create index if not exists idx_event_participants_event on event_participants(event_id);

create table if not exists event_packages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists event_package_assets (
  event_package_id uuid references event_packages(id) on delete cascade not null,
  equipment_asset_id uuid references equipment_assets(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (event_package_id, equipment_asset_id)
);

create index if not exists idx_event_package_assets_asset on event_package_assets(equipment_asset_id);

create table if not exists event_package_services (
  event_package_id uuid references event_packages(id) on delete cascade not null,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz default now(),
  primary key (event_package_id, entity_type, entity_id)
);

create index if not exists idx_event_package_services_entity on event_package_services(entity_type, entity_id);


