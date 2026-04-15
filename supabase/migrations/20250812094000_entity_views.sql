set client_min_messages = warning;

-- =============================================================================
-- Minimal Entity Registry (Compatibility Views)
-- Non-breaking: expose a unified view over existing profile tables
-- =============================================================================

-- Individuals from profiles
create or replace view entities_individuals as
select
  'Individual'::text as entity_type,
  p.id as entity_id,
  coalesce(p.name, p.username, 'User') as display_name
from profiles p;

-- Artists from artist_profiles
create or replace view entities_artists as
select
  'Artist'::text as entity_type,
  a.id as entity_id,
  coalesce(a.artist_name, 'Artist') as display_name
from artist_profiles a;

-- Venues from venue_profiles
create or replace view entities_venues as
select
  'Venue'::text as entity_type,
  v.id as entity_id,
  coalesce(v.venue_name, 'Venue') as display_name
from venue_profiles v;

-- Union
create or replace view entities_all as
select * from entities_individuals
union all
select * from entities_artists
union all
select * from entities_venues;

comment on view entities_all is 'Unified entity listing for Individuals, Artists, Venues';


