# Existing Data Model — Event Domain

Extracted from `supabase/migrations/` (source of truth while the live project is paused).

## `public.events` — canonical public event (artist pipeline)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| artist_id | uuid → auth.users | owner; RLS write key; NOT NULL when data clean |
| user_id | uuid → auth.users | legacy, backfilled into artist_id |
| creator_account_type | text | `artist`/`venue`/`manager`/`organizer` |
| title / name | text | dual naming; `name` is artist-pipeline field |
| description | text | added 20260711153000 |
| type / event_type | text | e.g. concert |
| date / event_date | timestamptz / date | dual; artist pipeline uses `event_date` |
| time, doors_open, start_time, end_time | text/time | |
| location, venue_name, address, city, state, country | text | denormalized venue |
| latitude, longitude | float8 | btree idx `idx_events_geo` |
| capacity | int | |
| tags, genre_tags, setlist | jsonb | |
| slug | text | **globally unique** (`idx_events_slug_unique`) |
| status | text | `draft`/`published`/`cancelled` |
| tour_id | uuid → tours | existing tour link (20250813122000) |
| venue_id | uuid | (20250813120000) |
| is_public | boolean | (20260711153000) |
| created_at / updated_at | timestamptz | |

Indexes: `(status, event_date)`, `city`, `artist_id`, `country`, unique `slug`, `(latitude, longitude)`.

RLS: select = owner or `status='published'`; insert/update = `auth.uid() = artist_id`; earlier broad policies from 2024 migration may coexist (verified in conflict doc).

## `public.events_v2` — org operational event

`id, org_id→organizations, venue_id→venues_v2, title, slug (unique per org), status (inquiry|hold|offer|confirmed|advancing|onsite|settled|archived), start_at, end_at, timezone, age_restrictions, capacity, settings jsonb, created_by, created_at, updated_at`.

Public-facing fields (description, venue name/address, poster, ticket url/price, event_type) live inside `settings`. Public listability decided in app code (`isEventsV2PubliclyListable`); RLS is org-members-only.

## `public.artist_events` — legacy, still read

`id, user_id, artist_profile_id, title, description, type, venue_name, venue_address, venue_city, venue_state, venue_country, venue_coordinates jsonb, event_date, start_time, end_time, doors_open, ticket_url, ticket_price_min/max, capacity, expected_attendance, status ('upcoming' default; 'published' used by discover), is_public, poster_url, setlist text[], notes`.

## Ticketing

`event_ticketing_config`, `event_ticketing_grants`, `event_ticket_types`, `event_attendance`, `event_guestlist` — native ticketing (flag `FEATURE_TICKETING_V2`, default false).

## Tours

`tours` (20250130000001 / 20250818121000) — `events.tour_id` FK already links canonical events to tours.

## New tables planned (additive, Phase 1–6)

`event_external_sources`, `event_ticket_offers`, `event_discovery_index`, `event_provider_connections`, `event_sync_jobs`, `event_sync_runs`, `event_merge_candidates`, `event_merge_decisions`, `event_slug_redirects`, `event_claims`, `event_field_overrides`, `user_event_discovery_preferences`. All in `public`, RLS on, service-role writes for sync paths.

## Extensions

No PostGIS today. Phase 2 adds `postgis` + `geography(Point,4326)` on the discovery index only (native tables keep float8 lat/lng; index builders translate).
