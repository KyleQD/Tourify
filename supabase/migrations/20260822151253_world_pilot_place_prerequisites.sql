-- GOVERNED ACTIVATION MIGRATION (local isolated rehearsal)
-- Source artifact: implementation/phase2/generated/pilot_place_seeds.sql
-- Converted per docs/24_G1_to_Detroit_Activation_Runbook.md A1-A4.
-- Preview wrapper lines (begin;/rollback;) removed so migration
-- governance owns atomicity. Local disposable database ONLY.

-- WORLD OF MUSIC PILOT SHARED PLACE SEEDS
-- ISOLATED/STAGING ONLY. REQUIRES GATE G1 SCHEMA.
-- Rows remain draft; public RLS therefore hides them from anon/authenticated.
-- Transaction intentionally defaults to ROLLBACK.


-- us
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('us', 'us', 'United States', 'United States', 'country', null, 'US', null, null, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

-- us/mi
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('mi', 'us/mi', 'Michigan', 'Michigan', 'state_province', (select id from public.geo_places where canonical_path='us'), 'US', 'MI', null, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

-- us/mi/detroit
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('detroit', 'us/mi/detroit', 'Detroit', 'Detroit', 'city', (select id from public.geo_places where canonical_path='us/mi'), 'US', 'MI', extensions.ST_SetSRID(extensions.ST_MakePoint(-83.0475, 42.3316667), 4326)::extensions.geography, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

insert into public.geo_place_aliases (place_id, alias, alias_type, metadata)
select id, 'Detroit, Michigan', 'search', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb from public.geo_places where canonical_path='us/mi/detroit'
on conflict do nothing;

insert into public.geo_place_aliases (place_id, alias, alias_type, metadata)
select id, 'Detroit, MI', 'search', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb from public.geo_places where canonical_path='us/mi/detroit'
on conflict do nothing;

insert into public.geo_external_references (place_id, provider, external_type, external_id, canonical_url, metadata)
select id, 'wikidata', 'place', 'Q12439', 'https://www.wikidata.org/wiki/Q12439', '{"seed_framework":"world-place-seed-v0.1","source_key":"wikidata_geo"}'::jsonb from public.geo_places where canonical_path='us/mi/detroit'
on conflict (provider, external_type, external_id) do update set
  place_id=excluded.place_id, canonical_url=excluded.canonical_url, metadata=excluded.metadata, updated_at=now();

insert into public.geo_external_references (place_id, provider, external_type, external_id, canonical_url, metadata)
select id, 'musicbrainz', 'area', 'b03ff310-d8e2-45cf-9455-769f76641eb2', 'https://musicbrainz.org/area/b03ff310-d8e2-45cf-9455-769f76641eb2', '{"seed_framework":"world-place-seed-v0.1","source_key":"musicbrainz_geo"}'::jsonb from public.geo_places where canonical_path='us/mi/detroit'
on conflict (provider, external_type, external_id) do update set
  place_id=excluded.place_id, canonical_url=excluded.canonical_url, metadata=excluded.metadata, updated_at=now();

-- jm
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('jm', 'jm', 'Jamaica', 'Jamaica', 'country', null, 'JM', null, null, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

-- jm/kingston
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('kingston', 'jm/kingston', 'Kingston', 'Kingston', 'city', (select id from public.geo_places where canonical_path='jm'), 'JM', null, extensions.ST_SetSRID(extensions.ST_MakePoint(-76.7930556, 17.9713889), 4326)::extensions.geography, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

insert into public.geo_place_aliases (place_id, alias, alias_type, metadata)
select id, 'Kingston, Jamaica', 'search', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb from public.geo_places where canonical_path='jm/kingston'
on conflict do nothing;

insert into public.geo_external_references (place_id, provider, external_type, external_id, canonical_url, metadata)
select id, 'wikidata', 'place', 'Q34692', 'https://www.wikidata.org/wiki/Q34692', '{"seed_framework":"world-place-seed-v0.1","source_key":"wikidata_geo"}'::jsonb from public.geo_places where canonical_path='jm/kingston'
on conflict (provider, external_type, external_id) do update set
  place_id=excluded.place_id, canonical_url=excluded.canonical_url, metadata=excluded.metadata, updated_at=now();

-- ng
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('ng', 'ng', 'Nigeria', 'Nigeria', 'country', null, 'NG', null, null, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

-- ng/lagos
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('lagos', 'ng/lagos', 'Lagos', 'Lagos', 'city', (select id from public.geo_places where canonical_path='ng'), 'NG', null, extensions.ST_SetSRID(extensions.ST_MakePoint(3.3936111, 6.4561111), 4326)::extensions.geography, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

insert into public.geo_place_aliases (place_id, alias, alias_type, metadata)
select id, 'Lagos, Nigeria', 'search', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb from public.geo_places where canonical_path='ng/lagos'
on conflict do nothing;

insert into public.geo_external_references (place_id, provider, external_type, external_id, canonical_url, metadata)
select id, 'wikidata', 'place', 'Q8673', 'https://www.wikidata.org/wiki/Q8673', '{"seed_framework":"world-place-seed-v0.1","source_key":"wikidata_geo"}'::jsonb from public.geo_places where canonical_path='ng/lagos'
on conflict (provider, external_type, external_id) do update set
  place_id=excluded.place_id, canonical_url=excluded.canonical_url, metadata=excluded.metadata, updated_at=now();

insert into public.geo_external_references (place_id, provider, external_type, external_id, canonical_url, metadata)
select id, 'musicbrainz', 'area', 'a7771250-45aa-426a-86db-5101f6647b79', 'https://musicbrainz.org/area/a7771250-45aa-426a-86db-5101f6647b79', '{"seed_framework":"world-place-seed-v0.1","source_key":"musicbrainz_geo"}'::jsonb from public.geo_places where canonical_path='ng/lagos'
on conflict (provider, external_type, external_id) do update set
  place_id=excluded.place_id, canonical_url=excluded.canonical_url, metadata=excluded.metadata, updated_at=now();

-- gb
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('gb', 'gb', 'United Kingdom', 'United Kingdom', 'country', null, 'GB', null, null, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

-- gb/eng
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('eng', 'gb/eng', 'England', 'England', 'region', (select id from public.geo_places where canonical_path='gb'), 'GB', 'ENG', null, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

-- gb/eng/london
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('london', 'gb/eng/london', 'London', 'London', 'city', (select id from public.geo_places where canonical_path='gb/eng'), 'GB', 'ENG', extensions.ST_SetSRID(extensions.ST_MakePoint(-0.1275, 51.5072222), 4326)::extensions.geography, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

insert into public.geo_place_aliases (place_id, alias, alias_type, metadata)
select id, 'London, England', 'search', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb from public.geo_places where canonical_path='gb/eng/london'
on conflict do nothing;

insert into public.geo_place_aliases (place_id, alias, alias_type, metadata)
select id, 'London, UK', 'search', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb from public.geo_places where canonical_path='gb/eng/london'
on conflict do nothing;

insert into public.geo_external_references (place_id, provider, external_type, external_id, canonical_url, metadata)
select id, 'wikidata', 'place', 'Q84', 'https://www.wikidata.org/wiki/Q84', '{"seed_framework":"world-place-seed-v0.1","source_key":"wikidata_geo"}'::jsonb from public.geo_places where canonical_path='gb/eng/london'
on conflict (provider, external_type, external_id) do update set
  place_id=excluded.place_id, canonical_url=excluded.canonical_url, metadata=excluded.metadata, updated_at=now();

insert into public.geo_external_references (place_id, provider, external_type, external_id, canonical_url, metadata)
select id, 'musicbrainz', 'area', 'f03d09b3-39dc-4083-afd6-159e3f0d462f', 'https://musicbrainz.org/area/f03d09b3-39dc-4083-afd6-159e3f0d462f', '{"seed_framework":"world-place-seed-v0.1","source_key":"musicbrainz_geo"}'::jsonb from public.geo_places where canonical_path='gb/eng/london'
on conflict (provider, external_type, external_id) do update set
  place_id=excluded.place_id, canonical_url=excluded.canonical_url, metadata=excluded.metadata, updated_at=now();

-- jp
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('jp', 'jp', 'Japan', 'Japan', 'country', null, 'JP', null, null, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

-- jp/tokyo
insert into public.geo_places (slug, canonical_path, name, display_name, place_type, parent_place_id, country_code, admin1_code, center, publication_status, metadata)
values ('tokyo', 'jp/tokyo', 'Tokyo', 'Tokyo', 'city', (select id from public.geo_places where canonical_path='jp'), 'JP', null, extensions.ST_SetSRID(extensions.ST_MakePoint(139.6916667, 35.6894444), 4326)::extensions.geography, 'draft', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb)
on conflict (canonical_path) do update set
  name=excluded.name, display_name=excluded.display_name, place_type=excluded.place_type,
  parent_place_id=excluded.parent_place_id, country_code=excluded.country_code, admin1_code=excluded.admin1_code,
  center=coalesce(excluded.center, public.geo_places.center), publication_status='draft',
  metadata=public.geo_places.metadata || excluded.metadata, updated_at=now();

insert into public.geo_place_aliases (place_id, alias, alias_type, metadata)
select id, 'Tokyo, Japan', 'search', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb from public.geo_places where canonical_path='jp/tokyo'
on conflict do nothing;

insert into public.geo_place_aliases (place_id, alias, alias_type, metadata)
select id, '東京都', 'search', '{"seed_framework":"world-place-seed-v0.1"}'::jsonb from public.geo_places where canonical_path='jp/tokyo'
on conflict do nothing;

insert into public.geo_external_references (place_id, provider, external_type, external_id, canonical_url, metadata)
select id, 'wikidata', 'place', 'Q1490', 'https://www.wikidata.org/wiki/Q1490', '{"seed_framework":"world-place-seed-v0.1","source_key":"wikidata_geo"}'::jsonb from public.geo_places where canonical_path='jp/tokyo'
on conflict (provider, external_type, external_id) do update set
  place_id=excluded.place_id, canonical_url=excluded.canonical_url, metadata=excluded.metadata, updated_at=now();

insert into public.geo_external_references (place_id, provider, external_type, external_id, canonical_url, metadata)
select id, 'musicbrainz', 'area', '8dc97297-ac95-4d33-82bc-e07fab26fb5f', 'https://musicbrainz.org/area/8dc97297-ac95-4d33-82bc-e07fab26fb5f', '{"seed_framework":"world-place-seed-v0.1","source_key":"musicbrainz_geo"}'::jsonb from public.geo_places where canonical_path='jp/tokyo'
on conflict (provider, external_type, external_id) do update set
  place_id=excluded.place_id, canonical_url=excluded.canonical_url, metadata=excluded.metadata, updated_at=now();

-- Remove ROLLBACK only during an explicitly authorized isolated/staging seed run.

