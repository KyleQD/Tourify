-- GOVERNED ACTIVATION MIGRATION (local isolated rehearsal)
-- Source artifact: implementation/phase2/generated/tokyo_canonical_promotion_preview.sql
-- Compiled by compile_pilot_canonical_preview.py (validated 27 checks).
-- Preview wrapper lines removed so migration governance owns atomicity.

-- Tourify World of Music — Tokyo canonical promotion preview v0.1
-- G1-BLOCKED / REVIEW ONLY / DO NOT APPLY TO TOURIFY DEMO
-- Promotes reviewed seed structure into canonical DRAFT rows only.
-- This transaction ALWAYS ends with ROLLBACK.
-- Expected entities: 21
-- Expected cultural-place edges: 21
-- Expected cultural relationships: 11
-- Expected claims: 54


do $$
declare
  v_missing integer;
begin
  if to_regclass('public.geo_places') is null or to_regclass('public.world_cultural_entities') is null then
    raise exception 'G1 World tables are not present';
  end if;
  if not exists (select 1 from public.geo_places where canonical_path = 'jp/tokyo') then
    raise exception 'Tokyo canonical geo place is missing';
  end if;
  select count(*) into v_missing from (values
    ('japan_culture_plastic_love'),
    ('japan_embassy_city_pop'),
    ('jpf_city_pop'),
    ('musicbrainz_artist_identity'),
    ('musicbrainz_recording_identity'),
    ('nippon_city_pop'),
    ('roland_ymo_808'),
    ('sony_ymo_1979'),
    ('sony_ymo_archive'),
    ('utada_automatic'),
    ('utada_profile'),
    ('wikidata_identity'),
    ('wmg_plastic_love'),
    ('yamaha_jpop_synth'),
    ('yamaha_sakamoto_synth')
  ) required(source_key)
  where not exists (select 1 from public.world_sources s where s.source_key = required.source_key);
  if v_missing > 0 then raise exception '% Tokyo source registry rows are missing', v_missing; end if;

  select count(*) into v_missing from (values
    ('cultural_place', 'associated_with'),
    ('cultural_place', 'historically_significant_in'),
    ('cultural_graph', 'credited_to'),
    ('cultural_graph', 'related_to'),
    ('cultural_graph', 'uses_instrument')
  ) required(domain, relation_key)
  where not exists (select 1 from public.world_relation_types r where r.domain=required.domain and r.relation_key=required.relation_key);
  if v_missing > 0 then raise exception '% required relation types are missing', v_missing; end if;
end $$;

-- Resolve the canonical Tokyo place once for claim/edge construction.
create temporary table _world_tokyo_place on commit drop as
select id, canonical_path from public.geo_places where canonical_path = 'jp/tokyo';

-- ENTITY tokyo_city_pop
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'tokyo-city-pop', 'City pop', 'A Japanese pop style that arose in the late 1970s and peaked in the 1980s, blending disco, soul, R&B, funk and other influences with an urban consumer/technology context.',
  1970, 1989, '{"seed_id":"tokyo_city_pop","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_city_pop_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'tokyo-city-pop-sound-signature', 'City pop listening frame', 'A broad listening frame based on Japan Foundation’s historical description of the style.',
  null, null, '{"listen_for":["polished studio production","disco/funk groove","soul and R&B influence","synth and electric-instrument textures","urban leisure atmosphere"],"techniques":[],"context":["City pop is a broad retrospective label; not every Japanese urban pop recording of the era fits the same formula."],"audio_policy":"description_only_until_rights_cleared","seed_id":"tokyo_city_pop_sound_signature","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_mobile_listening_city_pop
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'historical_milestone', 'tokyo-mobile-listening-city-pop', 'Mobile listening and the city-pop era', 'Japan Foundation links city pop’s urban identity with rapid consumer-technology change, including the Walkman and in-car cassette listening.',
  1979, 1989, '{"seed_id":"tokyo_mobile_listening_city_pop","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_plastic_love
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'tokyo-plastic-love', 'Plastic Love', 'A 1984 city-pop recording that gained a large international second life through internet circulation decades later.',
  1984, 1984, '{"artist_name":"Mariya Takeuchi","title":"Plastic Love","release_year":1984,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Mariya Takeuchi Plastic Love"},"credit_components":[{"artist_seed_id":"tokyo_artist_mariya_takeuchi","role":"primary_artist"}],"seed_id":"tokyo_plastic_love","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_city_pop_internet_revival
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'historical_milestone', 'tokyo-city-pop-internet-revival', 'City pop’s internet-era global revival', 'Online circulation in the 2010s helped reintroduce city pop internationally, with “Plastic Love” becoming a prominent example.',
  2010, null, '{"seed_id":"tokyo_city_pop_internet_revival","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_ymo_electronic_pop
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'scene', 'tokyo-ymo-electronic-pop', 'Yellow Magic Orchestra and Japanese electronic pop', 'YMO’s late-1970s work and international touring made Japanese electronic pop highly visible beyond Japan.',
  1978, null, '{"seed_id":"tokyo_ymo_electronic_pop","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_ymo_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'tokyo-ymo-sound-signature', 'YMO electronic listening frame', 'A listening frame for YMO’s late-1970s electronic repertoire based on first-party archive documentation.',
  null, null, '{"listen_for":["synthesizer-led arrangements","electronic rhythm","precise ensemble programming/performance","futurist pop presentation"],"techniques":[],"context":["This is a listening frame for the seed, not a claim that all Tokyo electronic music shares these traits."],"audio_policy":"description_only_until_rights_cleared","seed_id":"tokyo_ymo_sound_signature","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_rydeen_ymo
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'tokyo-rydeen-ymo', 'Rydeen', 'A widely documented YMO repertoire piece from the 1979 Solid State Survivor era and international live set.',
  1979, 1979, '{"artist_name":"Yellow Magic Orchestra","title":"Rydeen","release_year":1979,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Yellow Magic Orchestra Rydeen"},"credit_components":[{"artist_seed_id":"tokyo_artist_ymo","role":"primary_artist"}],"seed_id":"tokyo_rydeen_ymo","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_technopolis_ymo
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'tokyo-technopolis-ymo', 'Technopolis', 'A YMO electronic-pop landmark documented in 1979-era live/archive materials.',
  1979, 1979, '{"artist_name":"Yellow Magic Orchestra","title":"Technopolis","release_year":1979,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Yellow Magic Orchestra Technopolis"},"credit_components":[{"artist_seed_id":"tokyo_artist_ymo","role":"primary_artist"}],"seed_id":"tokyo_technopolis_ymo","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_automatic_utada
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'tokyo-automatic-utada', 'Automatic', 'Hikaru Utada’s debut single, released December 9, 1998, and a major late-1990s Japanese pop landmark.',
  1998, 1998, '{"artist_name":"Hikaru Utada","title":"Automatic","release_year":1998,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Hikaru Utada Automatic"},"credit_components":[{"artist_seed_id":"tokyo_artist_hikaru_utada","role":"primary_artist"}],"seed_id":"tokyo_automatic_utada","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_jpop_late_1990s
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'educational_topic', 'tokyo-jpop-late-1990s', 'Late-1990s Japanese pop transition', 'A pilot educational node for connecting city-pop/electronic precedents to the late-1990s J-pop era without claiming a single direct genre lineage.',
  1998, null, '{"seed_id":"tokyo_jpop_late_1990s","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_ymo_synthesizer
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'synthesizer-ymo-japanese-electronic-pop', 'Synthesizer — YMO and Japanese electronic pop', 'Yellow Magic Orchestra’s electronic palette relied heavily on synthesizers; Ryuichi Sakamoto later became closely associated with advanced synthesizer programming and Yamaha digital synthesis.',
  1978, null, '{"instrument_family":"electronic","sound_role":"synthetic melody, bass, harmony and timbral design","listen_for":["precise synthetic timbres","layered electronic bass and lead lines"],"audio_policy":"description_only_until_rights_cleared","seed_id":"tokyo_ymo_synthesizer","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_ymo_tr808
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'roland-tr-808-ymo', 'Roland TR-808 rhythm machine', 'YMO were among the early high-profile experimental users of the Roland TR-808, exploiting its deliberately electronic kick, clap and programmable rhythm character.',
  1980, null, '{"instrument_family":"electronic_percussion","sound_role":"programmable drum-machine rhythm","listen_for":["electronic kick and clap timbres","machine rhythm used as an expressive texture"],"audio_policy":"description_only_until_rights_cleared","seed_id":"tokyo_ymo_tr808","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_ymo_mc8
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'roland-mc-8-ymo', 'Roland MC-8 Microcomposer', 'YMO and Ryuichi Sakamoto used the Roland MC-8 microprocessor sequencer as part of early computer-controlled electronic production.',
  1978, null, '{"instrument_family":"sequencer","sound_role":"computer-controlled sequencing of electronic parts","listen_for":["precisely sequenced multi-part electronic arrangements"],"audio_policy":"description_only_until_rights_cleared","seed_id":"tokyo_ymo_mc8","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_dx7_jpop
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'yamaha-dx7-japanese-pop', 'Yamaha DX7 and 1980s Japanese pop production', 'The DX7 arrived in 1983 as MIDI and digital synthesis were reshaping Japanese pop production; Sakamoto adopted it extensively in his post-YMO solo work.',
  1983, null, '{"instrument_family":"digital_synthesizer","sound_role":"FM-synthesis timbres and programmable digital keyboard textures","listen_for":["bright digital FM timbres","precisely programmed keyboard textures"],"audio_policy":"description_only_until_rights_cleared","seed_id":"tokyo_dx7_jpop","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_1000_knives
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'tokyo-1000-knives-ryuichi-sakamoto', '1000 Knives', 'Roland documents “1000 Knives” as an early example of YMO/Sakamoto-era experimentation with programmable electronic rhythm and sequencing.',
  1978, null, '{"artist_name":"Ryuichi Sakamoto","title":"1000 Knives","release_year":1978,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Ryuichi Sakamoto 1000 Knives"},"credit_components":[{"artist_seed_id":"tokyo_artist_ryuichi_sakamoto","role":"primary_artist"}],"seed_id":"tokyo_1000_knives","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_yamaha_rd_tokyo
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'studio_landmark', 'yamaha-rd-tokyo-shibuya', 'Yamaha R&D Tokyo', 'Yamaha established an R&D facility in Shibuya in 1985, linking Tokyo directly to the development and artist adoption of later Japanese synthesizer technologies.',
  1985, null, '{"landmark_type":"music_technology_research_facility","address_text":"Dogenzaka district, Shibuya, Tokyo, Japan","media_policy":"link_only_until_cleared","geocoding_precision":"district_only","do_not_invent_street_address":true,"seed_id":"tokyo_yamaha_rd_tokyo","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_artist_mariya_takeuchi
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'mariya-takeuchi', 'Mariya Takeuchi', 'External knowledge-graph identity for Mariya Takeuchi; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"02bdc7ec-d102-4698-85e2-789a42d40b9c","wikidata_qid":"Q1143704","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"tokyo_artist_mariya_takeuchi","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_artist_ymo
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'yellow-magic-orchestra', 'Yellow Magic Orchestra', 'External knowledge-graph identity for Yellow Magic Orchestra; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"ac5af671-1df0-4312-8b7b-e61992ecc883","wikidata_qid":"Q854590","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"tokyo_artist_ymo","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_artist_ryuichi_sakamoto
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'ryuichi-sakamoto', 'Ryuichi Sakamoto', 'External knowledge-graph identity for Ryuichi Sakamoto; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"a7f7df4a-77d8-4f12-8acd-5c60c93f4de8","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"tokyo_artist_ryuichi_sakamoto","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- ENTITY tokyo_artist_hikaru_utada
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'hikaru-utada', 'Hikaru Utada', 'External knowledge-graph identity for Hikaru Utada; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"b539e453-c4fe-47e3-8a07-8517eac74429","wikidata_qid":"Q234598","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"tokyo_artist_hikaru_utada","pilot_key":"tokyo","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    short_description = excluded.short_description,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    metadata = public.world_cultural_entities.metadata || excluded.metadata,
    updated_at = now()
where public.world_cultural_entities.publication_status = 'draft'
  and public.world_cultural_entities.review_status in ('candidate','needs_review');

-- CLAIM seed:tokyo:overview:musical_identity
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'place',
    subject_id = (select id::text from _world_tokyo_place),
    predicate = 'musical_identity',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Tokyo’s pilot seed connects late-1970s/1980s city pop and electronic pop to internet-era rediscovery and a later J-pop landmark, while avoiding a false single-line genealogy."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.910,
    metadata = metadata || '{"place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:overview:musical_identity'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'place', (select id::text from _world_tokyo_place), 'musical_identity',
  null, null, '{"text":"Tokyo’s pilot seed connects late-1970s/1980s city pop and electronic pop to internet-era rediscovery and a later J-pop landmark, while avoiding a false single-line genealogy."}'::jsonb,
  null, null, 0.910, 'agent_candidate', 'needs_review', 'draft', '{"place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:overview:musical_identity');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_culture_plastic_love', 'jpf_city_pop', 'sony_ymo_1979', 'utada_profile')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:overview:musical_identity'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_city_pop:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-city-pop'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A Japanese pop style that arose in the late 1970s and peaked in the 1980s, blending disco, soul, R&B, funk and other influences with an urban consumer/technology context."}'::jsonb,
    temporal_start_year = 1970,
    temporal_end_year = 1989,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"tokyo_city_pop","entity_slug":"tokyo-city-pop","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-city-pop'), 'summary',
  null, null, '{"text":"A Japanese pop style that arose in the late 1970s and peaked in the 1980s, blending disco, soul, R&B, funk and other influences with an urban consumer/technology context."}'::jsonb,
  1970, 1989, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_city_pop","entity_slug":"tokyo-city-pop","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_embassy_city_pop', 'jpf_city_pop', 'nippon_city_pop')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_city_pop:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-city-pop'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1970,
    temporal_end_year = 1989,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"tokyo_city_pop","entity_slug":"tokyo-city-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-city-pop'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1970, 1989, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_city_pop","entity_slug":"tokyo-city-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_embassy_city_pop', 'jpf_city_pop', 'nippon_city_pop')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_city_pop
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1970, 1989, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_city_pop:place:associated_with'
where ce.slug='tokyo-city-pop'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1970,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_city_pop_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A broad listening frame based on Japan Foundation’s historical description of the style."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"tokyo_city_pop_sound_signature","entity_slug":"tokyo-city-pop-sound-signature","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-sound-signature'), 'summary',
  null, null, '{"text":"A broad listening frame based on Japan Foundation’s historical description of the style."}'::jsonb,
  null, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_city_pop_sound_signature","entity_slug":"tokyo-city-pop-sound-signature","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jpf_city_pop')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_city_pop_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"tokyo_city_pop_sound_signature","entity_slug":"tokyo-city-pop-sound-signature","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-sound-signature'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  null, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_city_pop_sound_signature","entity_slug":"tokyo-city-pop-sound-signature","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jpf_city_pop')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_city_pop_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_city_pop_sound_signature:place:associated_with'
where ce.slug='tokyo-city-pop-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_mobile_listening_city_pop:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-mobile-listening-city-pop'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Japan Foundation links city pop’s urban identity with rapid consumer-technology change, including the Walkman and in-car cassette listening."}'::jsonb,
    temporal_start_year = 1979,
    temporal_end_year = 1989,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"tokyo_mobile_listening_city_pop","entity_slug":"tokyo-mobile-listening-city-pop","seed_claim_key":"seed:tokyo:entity:tokyo_mobile_listening_city_pop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_mobile_listening_city_pop:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-mobile-listening-city-pop'), 'summary',
  null, null, '{"text":"Japan Foundation links city pop’s urban identity with rapid consumer-technology change, including the Walkman and in-car cassette listening."}'::jsonb,
  1979, 1989, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_mobile_listening_city_pop","entity_slug":"tokyo-mobile-listening-city-pop","seed_claim_key":"seed:tokyo:entity:tokyo_mobile_listening_city_pop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_mobile_listening_city_pop:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jpf_city_pop')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_mobile_listening_city_pop:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_mobile_listening_city_pop:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-mobile-listening-city-pop'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1979,
    temporal_end_year = 1989,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"tokyo_mobile_listening_city_pop","entity_slug":"tokyo-mobile-listening-city-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_mobile_listening_city_pop:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_mobile_listening_city_pop:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-mobile-listening-city-pop'), 'historically_significant_in',
  'place', (select id::text from _world_tokyo_place), null,
  1979, 1989, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_mobile_listening_city_pop","entity_slug":"tokyo-mobile-listening-city-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_mobile_listening_city_pop:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_mobile_listening_city_pop:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jpf_city_pop')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_mobile_listening_city_pop:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_mobile_listening_city_pop
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1979, 1989, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_mobile_listening_city_pop:place:historically_significant_in'
where ce.slug='tokyo-mobile-listening-city-pop'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1979,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_plastic_love:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-plastic-love'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A 1984 city-pop recording that gained a large international second life through internet circulation decades later."}'::jsonb,
    temporal_start_year = 1984,
    temporal_end_year = 1984,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"tokyo_plastic_love","entity_slug":"tokyo-plastic-love","seed_claim_key":"seed:tokyo:entity:tokyo_plastic_love:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_plastic_love:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-plastic-love'), 'summary',
  null, null, '{"text":"A 1984 city-pop recording that gained a large international second life through internet circulation decades later."}'::jsonb,
  1984, 1984, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_plastic_love","entity_slug":"tokyo-plastic-love","seed_claim_key":"seed:tokyo:entity:tokyo_plastic_love:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_plastic_love:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_culture_plastic_love', 'musicbrainz_artist_identity', 'wmg_plastic_love')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_plastic_love:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_plastic_love:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-plastic-love'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1984,
    temporal_end_year = 1984,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"tokyo_plastic_love","entity_slug":"tokyo-plastic-love","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_plastic_love:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_plastic_love:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-plastic-love'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1984, 1984, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_plastic_love","entity_slug":"tokyo-plastic-love","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_plastic_love:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_plastic_love:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_culture_plastic_love', 'musicbrainz_artist_identity', 'wmg_plastic_love')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_plastic_love:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_plastic_love
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1984, 1984, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_plastic_love:place:associated_with'
where ce.slug='tokyo-plastic-love'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1984,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_city_pop_internet_revival:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-internet-revival'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Online circulation in the 2010s helped reintroduce city pop internationally, with “Plastic Love” becoming a prominent example."}'::jsonb,
    temporal_start_year = 2010,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"tokyo_city_pop_internet_revival","entity_slug":"tokyo-city-pop-internet-revival","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop_internet_revival:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_internet_revival:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-internet-revival'), 'summary',
  null, null, '{"text":"Online circulation in the 2010s helped reintroduce city pop internationally, with “Plastic Love” becoming a prominent example."}'::jsonb,
  2010, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_city_pop_internet_revival","entity_slug":"tokyo-city-pop-internet-revival","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop_internet_revival:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_internet_revival:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_culture_plastic_love', 'jpf_city_pop')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_internet_revival:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_city_pop_internet_revival:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-internet-revival'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 2010,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"tokyo_city_pop_internet_revival","entity_slug":"tokyo-city-pop-internet-revival","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop_internet_revival:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_internet_revival:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-internet-revival'), 'historically_significant_in',
  'place', (select id::text from _world_tokyo_place), null,
  2010, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_city_pop_internet_revival","entity_slug":"tokyo-city-pop-internet-revival","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_city_pop_internet_revival:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_internet_revival:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_culture_plastic_love', 'jpf_city_pop')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_city_pop_internet_revival:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_city_pop_internet_revival
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2010, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_city_pop_internet_revival:place:historically_significant_in'
where ce.slug='tokyo-city-pop-internet-revival'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2010,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_electronic_pop:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"YMO’s late-1970s work and international touring made Japanese electronic pop highly visible beyond Japan."}'::jsonb,
    temporal_start_year = 1978,
    temporal_end_year = null,
    confidence = 0.910,
    metadata = metadata || '{"seed_id":"tokyo_ymo_electronic_pop","entity_slug":"tokyo-ymo-electronic-pop","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_electronic_pop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_electronic_pop:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'), 'summary',
  null, null, '{"text":"YMO’s late-1970s work and international touring made Japanese electronic pop highly visible beyond Japan."}'::jsonb,
  1978, null, 0.910, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_electronic_pop","entity_slug":"tokyo-ymo-electronic-pop","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_electronic_pop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_electronic_pop:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('sony_ymo_1979', 'sony_ymo_archive')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_electronic_pop:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_electronic_pop:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1978,
    temporal_end_year = null,
    confidence = 0.910,
    metadata = metadata || '{"seed_id":"tokyo_ymo_electronic_pop","entity_slug":"tokyo-ymo-electronic-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_electronic_pop:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_electronic_pop:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1978, null, 0.910, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_electronic_pop","entity_slug":"tokyo-ymo-electronic-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_electronic_pop:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_electronic_pop:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('sony_ymo_1979', 'sony_ymo_archive')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_electronic_pop:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_ymo_electronic_pop
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1978, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_ymo_electronic_pop:place:associated_with'
where ce.slug='tokyo-ymo-electronic-pop'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1978,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-ymo-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening frame for YMO’s late-1970s electronic repertoire based on first-party archive documentation."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.840,
    metadata = metadata || '{"seed_id":"tokyo_ymo_sound_signature","entity_slug":"tokyo-ymo-sound-signature","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-ymo-sound-signature'), 'summary',
  null, null, '{"text":"A listening frame for YMO’s late-1970s electronic repertoire based on first-party archive documentation."}'::jsonb,
  null, null, 0.840, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_sound_signature","entity_slug":"tokyo-ymo-sound-signature","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('sony_ymo_1979', 'sony_ymo_archive')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-ymo-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.840,
    metadata = metadata || '{"seed_id":"tokyo_ymo_sound_signature","entity_slug":"tokyo-ymo-sound-signature","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-ymo-sound-signature'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  null, null, 0.840, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_sound_signature","entity_slug":"tokyo-ymo-sound-signature","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('sony_ymo_1979', 'sony_ymo_archive')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_ymo_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_ymo_sound_signature:place:associated_with'
where ce.slug='tokyo-ymo-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_rydeen_ymo:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-rydeen-ymo'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A widely documented YMO repertoire piece from the 1979 Solid State Survivor era and international live set."}'::jsonb,
    temporal_start_year = 1979,
    temporal_end_year = 1979,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"tokyo_rydeen_ymo","entity_slug":"tokyo-rydeen-ymo","seed_claim_key":"seed:tokyo:entity:tokyo_rydeen_ymo:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_rydeen_ymo:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-rydeen-ymo'), 'summary',
  null, null, '{"text":"A widely documented YMO repertoire piece from the 1979 Solid State Survivor era and international live set."}'::jsonb,
  1979, 1979, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_rydeen_ymo","entity_slug":"tokyo-rydeen-ymo","seed_claim_key":"seed:tokyo:entity:tokyo_rydeen_ymo:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_rydeen_ymo:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'sony_ymo_1979', 'sony_ymo_archive')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_rydeen_ymo:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_rydeen_ymo:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-rydeen-ymo'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1979,
    temporal_end_year = 1979,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"tokyo_rydeen_ymo","entity_slug":"tokyo-rydeen-ymo","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_rydeen_ymo:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_rydeen_ymo:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-rydeen-ymo'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1979, 1979, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_rydeen_ymo","entity_slug":"tokyo-rydeen-ymo","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_rydeen_ymo:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_rydeen_ymo:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'sony_ymo_1979', 'sony_ymo_archive')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_rydeen_ymo:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_rydeen_ymo
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1979, 1979, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_rydeen_ymo:place:associated_with'
where ce.slug='tokyo-rydeen-ymo'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1979,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_technopolis_ymo:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-technopolis-ymo'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A YMO electronic-pop landmark documented in 1979-era live/archive materials."}'::jsonb,
    temporal_start_year = 1979,
    temporal_end_year = 1979,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"tokyo_technopolis_ymo","entity_slug":"tokyo-technopolis-ymo","seed_claim_key":"seed:tokyo:entity:tokyo_technopolis_ymo:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_technopolis_ymo:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-technopolis-ymo'), 'summary',
  null, null, '{"text":"A YMO electronic-pop landmark documented in 1979-era live/archive materials."}'::jsonb,
  1979, 1979, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_technopolis_ymo","entity_slug":"tokyo-technopolis-ymo","seed_claim_key":"seed:tokyo:entity:tokyo_technopolis_ymo:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_technopolis_ymo:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'sony_ymo_1979', 'sony_ymo_archive')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_technopolis_ymo:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_technopolis_ymo:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-technopolis-ymo'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1979,
    temporal_end_year = 1979,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"tokyo_technopolis_ymo","entity_slug":"tokyo-technopolis-ymo","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_technopolis_ymo:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_technopolis_ymo:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-technopolis-ymo'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1979, 1979, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_technopolis_ymo","entity_slug":"tokyo-technopolis-ymo","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_technopolis_ymo:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_technopolis_ymo:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'sony_ymo_1979', 'sony_ymo_archive')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_technopolis_ymo:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_technopolis_ymo
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1979, 1979, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_technopolis_ymo:place:associated_with'
where ce.slug='tokyo-technopolis-ymo'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1979,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_automatic_utada:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-automatic-utada'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Hikaru Utada’s debut single, released December 9, 1998, and a major late-1990s Japanese pop landmark."}'::jsonb,
    temporal_start_year = 1998,
    temporal_end_year = 1998,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"tokyo_automatic_utada","entity_slug":"tokyo-automatic-utada","seed_claim_key":"seed:tokyo:entity:tokyo_automatic_utada:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_automatic_utada:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-automatic-utada'), 'summary',
  null, null, '{"text":"Hikaru Utada’s debut single, released December 9, 1998, and a major late-1990s Japanese pop landmark."}'::jsonb,
  1998, 1998, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_automatic_utada","entity_slug":"tokyo-automatic-utada","seed_claim_key":"seed:tokyo:entity:tokyo_automatic_utada:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_automatic_utada:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_recording_identity', 'utada_automatic', 'utada_profile')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_automatic_utada:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_automatic_utada:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-automatic-utada'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1998,
    temporal_end_year = 1998,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"tokyo_automatic_utada","entity_slug":"tokyo-automatic-utada","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_automatic_utada:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_automatic_utada:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-automatic-utada'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1998, 1998, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_automatic_utada","entity_slug":"tokyo-automatic-utada","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_automatic_utada:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_automatic_utada:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_recording_identity', 'utada_automatic', 'utada_profile')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_automatic_utada:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_automatic_utada
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1998, 1998, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_automatic_utada:place:associated_with'
where ce.slug='tokyo-automatic-utada'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1998,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_jpop_late_1990s:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-jpop-late-1990s'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A pilot educational node for connecting city-pop/electronic precedents to the late-1990s J-pop era without claiming a single direct genre lineage."}'::jsonb,
    temporal_start_year = 1998,
    temporal_end_year = null,
    confidence = 0.800,
    metadata = metadata || '{"seed_id":"tokyo_jpop_late_1990s","entity_slug":"tokyo-jpop-late-1990s","seed_claim_key":"seed:tokyo:entity:tokyo_jpop_late_1990s:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_jpop_late_1990s:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-jpop-late-1990s'), 'summary',
  null, null, '{"text":"A pilot educational node for connecting city-pop/electronic precedents to the late-1990s J-pop era without claiming a single direct genre lineage."}'::jsonb,
  1998, null, 0.800, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_jpop_late_1990s","entity_slug":"tokyo-jpop-late-1990s","seed_claim_key":"seed:tokyo:entity:tokyo_jpop_late_1990s:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_jpop_late_1990s:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('utada_profile')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_jpop_late_1990s:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_jpop_late_1990s:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-jpop-late-1990s'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1998,
    temporal_end_year = null,
    confidence = 0.800,
    metadata = metadata || '{"seed_id":"tokyo_jpop_late_1990s","entity_slug":"tokyo-jpop-late-1990s","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_jpop_late_1990s:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_jpop_late_1990s:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-jpop-late-1990s'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1998, null, 0.800, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_jpop_late_1990s","entity_slug":"tokyo-jpop-late-1990s","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_jpop_late_1990s:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_jpop_late_1990s:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('utada_profile')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_jpop_late_1990s:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_jpop_late_1990s
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1998, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_jpop_late_1990s:place:associated_with'
where ce.slug='tokyo-jpop-late-1990s'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1998,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_synthesizer:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='synthesizer-ymo-japanese-electronic-pop'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Yellow Magic Orchestra’s electronic palette relied heavily on synthesizers; Ryuichi Sakamoto later became closely associated with advanced synthesizer programming and Yamaha digital synthesis."}'::jsonb,
    temporal_start_year = 1978,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"tokyo_ymo_synthesizer","entity_slug":"synthesizer-ymo-japanese-electronic-pop","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_synthesizer:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_synthesizer:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='synthesizer-ymo-japanese-electronic-pop'), 'summary',
  null, null, '{"text":"Yellow Magic Orchestra’s electronic palette relied heavily on synthesizers; Ryuichi Sakamoto later became closely associated with advanced synthesizer programming and Yamaha digital synthesis."}'::jsonb,
  1978, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_synthesizer","entity_slug":"synthesizer-ymo-japanese-electronic-pop","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_synthesizer:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_synthesizer:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('sony_ymo_archive', 'yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_synthesizer:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_synthesizer:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='synthesizer-ymo-japanese-electronic-pop'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1978,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"tokyo_ymo_synthesizer","entity_slug":"synthesizer-ymo-japanese-electronic-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_synthesizer:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_synthesizer:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='synthesizer-ymo-japanese-electronic-pop'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1978, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_synthesizer","entity_slug":"synthesizer-ymo-japanese-electronic-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_synthesizer:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_synthesizer:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('sony_ymo_archive', 'yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_synthesizer:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_ymo_synthesizer
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1978, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_ymo_synthesizer:place:associated_with'
where ce.slug='synthesizer-ymo-japanese-electronic-pop'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1978,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_tr808:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='roland-tr-808-ymo'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"YMO were among the early high-profile experimental users of the Roland TR-808, exploiting its deliberately electronic kick, clap and programmable rhythm character."}'::jsonb,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"tokyo_ymo_tr808","entity_slug":"roland-tr-808-ymo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_tr808:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_tr808:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='roland-tr-808-ymo'), 'summary',
  null, null, '{"text":"YMO were among the early high-profile experimental users of the Roland TR-808, exploiting its deliberately electronic kick, clap and programmable rhythm character."}'::jsonb,
  1980, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_tr808","entity_slug":"roland-tr-808-ymo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_tr808:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_tr808:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('roland_ymo_808')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_tr808:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_tr808:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='roland-tr-808-ymo'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"tokyo_ymo_tr808","entity_slug":"roland-tr-808-ymo","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_tr808:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_tr808:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='roland-tr-808-ymo'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1980, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_tr808","entity_slug":"roland-tr-808-ymo","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_tr808:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_tr808:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('roland_ymo_808')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_tr808:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_ymo_tr808
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1980, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_ymo_tr808:place:associated_with'
where ce.slug='roland-tr-808-ymo'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1980,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_mc8:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='roland-mc-8-ymo'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"YMO and Ryuichi Sakamoto used the Roland MC-8 microprocessor sequencer as part of early computer-controlled electronic production."}'::jsonb,
    temporal_start_year = 1978,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"tokyo_ymo_mc8","entity_slug":"roland-mc-8-ymo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_mc8:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_mc8:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='roland-mc-8-ymo'), 'summary',
  null, null, '{"text":"YMO and Ryuichi Sakamoto used the Roland MC-8 microprocessor sequencer as part of early computer-controlled electronic production."}'::jsonb,
  1978, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_mc8","entity_slug":"roland-mc-8-ymo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_mc8:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_mc8:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('roland_ymo_808')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_mc8:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_ymo_mc8:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='roland-mc-8-ymo'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1978,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"tokyo_ymo_mc8","entity_slug":"roland-mc-8-ymo","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_mc8:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_mc8:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='roland-mc-8-ymo'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1978, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_ymo_mc8","entity_slug":"roland-mc-8-ymo","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_ymo_mc8:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_mc8:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('roland_ymo_808')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_ymo_mc8:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_ymo_mc8
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1978, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_ymo_mc8:place:associated_with'
where ce.slug='roland-mc-8-ymo'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1978,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_dx7_jpop:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='yamaha-dx7-japanese-pop'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The DX7 arrived in 1983 as MIDI and digital synthesis were reshaping Japanese pop production; Sakamoto adopted it extensively in his post-YMO solo work."}'::jsonb,
    temporal_start_year = 1983,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"tokyo_dx7_jpop","entity_slug":"yamaha-dx7-japanese-pop","seed_claim_key":"seed:tokyo:entity:tokyo_dx7_jpop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_dx7_jpop:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='yamaha-dx7-japanese-pop'), 'summary',
  null, null, '{"text":"The DX7 arrived in 1983 as MIDI and digital synthesis were reshaping Japanese pop production; Sakamoto adopted it extensively in his post-YMO solo work."}'::jsonb,
  1983, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_dx7_jpop","entity_slug":"yamaha-dx7-japanese-pop","seed_claim_key":"seed:tokyo:entity:tokyo_dx7_jpop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_dx7_jpop:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('yamaha_jpop_synth', 'yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_dx7_jpop:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_dx7_jpop:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='yamaha-dx7-japanese-pop'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1983,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"tokyo_dx7_jpop","entity_slug":"yamaha-dx7-japanese-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_dx7_jpop:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_dx7_jpop:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='yamaha-dx7-japanese-pop'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1983, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_dx7_jpop","entity_slug":"yamaha-dx7-japanese-pop","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_dx7_jpop:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_dx7_jpop:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('yamaha_jpop_synth', 'yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_dx7_jpop:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_dx7_jpop
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1983, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_dx7_jpop:place:associated_with'
where ce.slug='yamaha-dx7-japanese-pop'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1983,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_1000_knives:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-1000-knives-ryuichi-sakamoto'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Roland documents “1000 Knives” as an early example of YMO/Sakamoto-era experimentation with programmable electronic rhythm and sequencing."}'::jsonb,
    temporal_start_year = 1978,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"tokyo_1000_knives","entity_slug":"tokyo-1000-knives-ryuichi-sakamoto","seed_claim_key":"seed:tokyo:entity:tokyo_1000_knives:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_1000_knives:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-1000-knives-ryuichi-sakamoto'), 'summary',
  null, null, '{"text":"Roland documents “1000 Knives” as an early example of YMO/Sakamoto-era experimentation with programmable electronic rhythm and sequencing."}'::jsonb,
  1978, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_1000_knives","entity_slug":"tokyo-1000-knives-ryuichi-sakamoto","seed_claim_key":"seed:tokyo:entity:tokyo_1000_knives:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_1000_knives:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'roland_ymo_808')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_1000_knives:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_1000_knives:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-1000-knives-ryuichi-sakamoto'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1978,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"tokyo_1000_knives","entity_slug":"tokyo-1000-knives-ryuichi-sakamoto","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_1000_knives:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_1000_knives:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-1000-knives-ryuichi-sakamoto'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  1978, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_1000_knives","entity_slug":"tokyo-1000-knives-ryuichi-sakamoto","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_1000_knives:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_1000_knives:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'roland_ymo_808')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_1000_knives:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_1000_knives
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1978, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_1000_knives:place:associated_with'
where ce.slug='tokyo-1000-knives-ryuichi-sakamoto'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1978,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_yamaha_rd_tokyo:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='yamaha-rd-tokyo-shibuya'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Yamaha established an R&D facility in Shibuya in 1985, linking Tokyo directly to the development and artist adoption of later Japanese synthesizer technologies."}'::jsonb,
    temporal_start_year = 1985,
    temporal_end_year = null,
    confidence = 0.850,
    metadata = metadata || '{"seed_id":"tokyo_yamaha_rd_tokyo","entity_slug":"yamaha-rd-tokyo-shibuya","seed_claim_key":"seed:tokyo:entity:tokyo_yamaha_rd_tokyo:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_yamaha_rd_tokyo:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='yamaha-rd-tokyo-shibuya'), 'summary',
  null, null, '{"text":"Yamaha established an R&D facility in Shibuya in 1985, linking Tokyo directly to the development and artist adoption of later Japanese synthesizer technologies."}'::jsonb,
  1985, null, 0.850, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_yamaha_rd_tokyo","entity_slug":"yamaha-rd-tokyo-shibuya","seed_claim_key":"seed:tokyo:entity:tokyo_yamaha_rd_tokyo:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_yamaha_rd_tokyo:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_yamaha_rd_tokyo:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_yamaha_rd_tokyo:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='yamaha-rd-tokyo-shibuya'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = 1985,
    temporal_end_year = null,
    confidence = 0.850,
    metadata = metadata || '{"seed_id":"tokyo_yamaha_rd_tokyo","entity_slug":"yamaha-rd-tokyo-shibuya","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_yamaha_rd_tokyo:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_yamaha_rd_tokyo:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='yamaha-rd-tokyo-shibuya'), 'historically_significant_in',
  'place', (select id::text from _world_tokyo_place), null,
  1985, null, 0.850, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_yamaha_rd_tokyo","entity_slug":"yamaha-rd-tokyo-shibuya","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_yamaha_rd_tokyo:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_yamaha_rd_tokyo:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_yamaha_rd_tokyo:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_yamaha_rd_tokyo
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1985, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_yamaha_rd_tokyo:place:historically_significant_in'
where ce.slug='yamaha-rd-tokyo-shibuya'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1985,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_artist_mariya_takeuchi:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='mariya-takeuchi'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Mariya Takeuchi; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"tokyo_artist_mariya_takeuchi","entity_slug":"mariya-takeuchi","seed_claim_key":"seed:tokyo:entity:tokyo_artist_mariya_takeuchi:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_mariya_takeuchi:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='mariya-takeuchi'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Mariya Takeuchi; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_artist_mariya_takeuchi","entity_slug":"mariya-takeuchi","seed_claim_key":"seed:tokyo:entity:tokyo_artist_mariya_takeuchi:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_mariya_takeuchi:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_culture_plastic_love', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_mariya_takeuchi:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_artist_mariya_takeuchi:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='mariya-takeuchi'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"tokyo_artist_mariya_takeuchi","entity_slug":"mariya-takeuchi","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_artist_mariya_takeuchi:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_mariya_takeuchi:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='mariya-takeuchi'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_artist_mariya_takeuchi","entity_slug":"mariya-takeuchi","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_artist_mariya_takeuchi:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_mariya_takeuchi:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_culture_plastic_love', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_mariya_takeuchi:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_artist_mariya_takeuchi
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_artist_mariya_takeuchi:place:associated_with'
where ce.slug='mariya-takeuchi'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_artist_ymo:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='yellow-magic-orchestra'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Yellow Magic Orchestra; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"tokyo_artist_ymo","entity_slug":"yellow-magic-orchestra","seed_claim_key":"seed:tokyo:entity:tokyo_artist_ymo:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ymo:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='yellow-magic-orchestra'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Yellow Magic Orchestra; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_artist_ymo","entity_slug":"yellow-magic-orchestra","seed_claim_key":"seed:tokyo:entity:tokyo_artist_ymo:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ymo:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'sony_ymo_archive', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ymo:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_artist_ymo:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='yellow-magic-orchestra'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"tokyo_artist_ymo","entity_slug":"yellow-magic-orchestra","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_artist_ymo:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ymo:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='yellow-magic-orchestra'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_artist_ymo","entity_slug":"yellow-magic-orchestra","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_artist_ymo:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ymo:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'sony_ymo_archive', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ymo:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_artist_ymo
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_artist_ymo:place:associated_with'
where ce.slug='yellow-magic-orchestra'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='ryuichi-sakamoto'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Ryuichi Sakamoto; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"tokyo_artist_ryuichi_sakamoto","entity_slug":"ryuichi-sakamoto","seed_claim_key":"seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='ryuichi-sakamoto'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Ryuichi Sakamoto; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_artist_ryuichi_sakamoto","entity_slug":"ryuichi-sakamoto","seed_claim_key":"seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='ryuichi-sakamoto'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"tokyo_artist_ryuichi_sakamoto","entity_slug":"ryuichi-sakamoto","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='ryuichi-sakamoto'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_artist_ryuichi_sakamoto","entity_slug":"ryuichi-sakamoto","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_artist_ryuichi_sakamoto
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_artist_ryuichi_sakamoto:place:associated_with'
where ce.slug='ryuichi-sakamoto'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:tokyo:entity:tokyo_artist_hikaru_utada:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='hikaru-utada'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Hikaru Utada; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"tokyo_artist_hikaru_utada","entity_slug":"hikaru-utada","seed_claim_key":"seed:tokyo:entity:tokyo_artist_hikaru_utada:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_hikaru_utada:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='hikaru-utada'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Hikaru Utada; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_artist_hikaru_utada","entity_slug":"hikaru-utada","seed_claim_key":"seed:tokyo:entity:tokyo_artist_hikaru_utada:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_hikaru_utada:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'utada_profile', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_hikaru_utada:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:tokyo:entity:tokyo_artist_hikaru_utada:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='hikaru-utada'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_tokyo_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"tokyo_artist_hikaru_utada","entity_slug":"hikaru-utada","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_artist_hikaru_utada:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_hikaru_utada:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='hikaru-utada'), 'associated_with',
  'place', (select id::text from _world_tokyo_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"tokyo_artist_hikaru_utada","entity_slug":"hikaru-utada","place_path":"jp/tokyo","seed_claim_key":"seed:tokyo:entity:tokyo_artist_hikaru_utada:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_hikaru_utada:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'utada_profile', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:entity:tokyo_artist_hikaru_utada:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE tokyo_artist_hikaru_utada
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_tokyo_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:entity:tokyo_artist_hikaru_utada:place:associated_with'
where ce.slug='hikaru-utada'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:tokyo:graph:1:tokyo_city_pop_internet_revival:related_to:tokyo_city_pop
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-internet-revival'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='tokyo-city-pop'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"tokyo_city_pop_internet_revival","object_seed_id":"tokyo_city_pop","seed_claim_key":"seed:tokyo:graph:1:tokyo_city_pop_internet_revival:related_to:tokyo_city_pop","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:1:tokyo_city_pop_internet_revival:related_to:tokyo_city_pop'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-city-pop-internet-revival'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-city-pop'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_city_pop_internet_revival","object_seed_id":"tokyo_city_pop","seed_claim_key":"seed:tokyo:graph:1:tokyo_city_pop_internet_revival:related_to:tokyo_city_pop","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:1:tokyo_city_pop_internet_revival:related_to:tokyo_city_pop');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_culture_plastic_love', 'jpf_city_pop')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:1:tokyo_city_pop_internet_revival:related_to:tokyo_city_pop'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 1 tokyo_city_pop_internet_revival related_to tokyo_city_pop
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:1:tokyo_city_pop_internet_revival:related_to:tokyo_city_pop","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='tokyo-city-pop'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:1:tokyo_city_pop_internet_revival:related_to:tokyo_city_pop'
where s.slug='tokyo-city-pop-internet-revival'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:2:tokyo_ymo_electronic_pop:related_to:tokyo_city_pop
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='tokyo-city-pop'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.650,
    metadata = metadata || '{"subject_seed_id":"tokyo_ymo_electronic_pop","object_seed_id":"tokyo_city_pop","seed_claim_key":"seed:tokyo:graph:2:tokyo_ymo_electronic_pop:related_to:tokyo_city_pop","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:2:tokyo_ymo_electronic_pop:related_to:tokyo_city_pop'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-city-pop'), null,
  null, null, 0.650, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_ymo_electronic_pop","object_seed_id":"tokyo_city_pop","seed_claim_key":"seed:tokyo:graph:2:tokyo_ymo_electronic_pop:related_to:tokyo_city_pop","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:2:tokyo_ymo_electronic_pop:related_to:tokyo_city_pop');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jpf_city_pop', 'sony_ymo_1979')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:2:tokyo_ymo_electronic_pop:related_to:tokyo_city_pop'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 2 tokyo_ymo_electronic_pop related_to tokyo_city_pop
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:2:tokyo_ymo_electronic_pop:related_to:tokyo_city_pop","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='tokyo-city-pop'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:2:tokyo_ymo_electronic_pop:related_to:tokyo_city_pop'
where s.slug='tokyo-ymo-electronic-pop'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:3:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_synthesizer
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='synthesizer-ymo-japanese-electronic-pop'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"tokyo_ymo_electronic_pop","object_seed_id":"tokyo_ymo_synthesizer","seed_claim_key":"seed:tokyo:graph:3:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_synthesizer","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:3:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_synthesizer'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='synthesizer-ymo-japanese-electronic-pop'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_ymo_electronic_pop","object_seed_id":"tokyo_ymo_synthesizer","seed_claim_key":"seed:tokyo:graph:3:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_synthesizer","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:3:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_synthesizer');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('sony_ymo_archive', 'yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:3:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_synthesizer'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 3 tokyo_ymo_electronic_pop uses_instrument tokyo_ymo_synthesizer
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:3:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_synthesizer","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='synthesizer-ymo-japanese-electronic-pop'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:3:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_synthesizer'
where s.slug='tokyo-ymo-electronic-pop'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:4:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_tr808
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='roland-tr-808-ymo'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"subject_seed_id":"tokyo_ymo_electronic_pop","object_seed_id":"tokyo_ymo_tr808","seed_claim_key":"seed:tokyo:graph:4:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_tr808","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:4:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_tr808'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='roland-tr-808-ymo'), null,
  null, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_ymo_electronic_pop","object_seed_id":"tokyo_ymo_tr808","seed_claim_key":"seed:tokyo:graph:4:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_tr808","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:4:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_tr808');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('roland_ymo_808')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:4:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_tr808'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 4 tokyo_ymo_electronic_pop uses_instrument tokyo_ymo_tr808
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:4:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_tr808","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='roland-tr-808-ymo'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:4:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_tr808'
where s.slug='tokyo-ymo-electronic-pop'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:5:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_mc8
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='roland-mc-8-ymo'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"subject_seed_id":"tokyo_ymo_electronic_pop","object_seed_id":"tokyo_ymo_mc8","seed_claim_key":"seed:tokyo:graph:5:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_mc8","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:5:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_mc8'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-ymo-electronic-pop'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='roland-mc-8-ymo'), null,
  null, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_ymo_electronic_pop","object_seed_id":"tokyo_ymo_mc8","seed_claim_key":"seed:tokyo:graph:5:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_mc8","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:5:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_mc8');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('roland_ymo_808')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:5:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_mc8'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 5 tokyo_ymo_electronic_pop uses_instrument tokyo_ymo_mc8
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:5:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_mc8","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='roland-mc-8-ymo'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:5:tokyo_ymo_electronic_pop:uses_instrument:tokyo_ymo_mc8'
where s.slug='tokyo-ymo-electronic-pop'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:6:tokyo_plastic_love:credited_to:tokyo_artist_mariya_takeuchi
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-plastic-love'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='mariya-takeuchi'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"subject_seed_id":"tokyo_plastic_love","object_seed_id":"tokyo_artist_mariya_takeuchi","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:6:tokyo_plastic_love:credited_to:tokyo_artist_mariya_takeuchi","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:6:tokyo_plastic_love:credited_to:tokyo_artist_mariya_takeuchi'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-plastic-love'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='mariya-takeuchi'), null,
  null, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_plastic_love","object_seed_id":"tokyo_artist_mariya_takeuchi","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:6:tokyo_plastic_love:credited_to:tokyo_artist_mariya_takeuchi","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:6:tokyo_plastic_love:credited_to:tokyo_artist_mariya_takeuchi');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('japan_culture_plastic_love', 'musicbrainz_artist_identity', 'wikidata_identity', 'wmg_plastic_love')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:6:tokyo_plastic_love:credited_to:tokyo_artist_mariya_takeuchi'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 6 tokyo_plastic_love credited_to tokyo_artist_mariya_takeuchi
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:6:tokyo_plastic_love:credited_to:tokyo_artist_mariya_takeuchi","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='mariya-takeuchi'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:6:tokyo_plastic_love:credited_to:tokyo_artist_mariya_takeuchi'
where s.slug='tokyo-plastic-love'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:7:tokyo_rydeen_ymo:credited_to:tokyo_artist_ymo
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-rydeen-ymo'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='yellow-magic-orchestra'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"subject_seed_id":"tokyo_rydeen_ymo","object_seed_id":"tokyo_artist_ymo","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:7:tokyo_rydeen_ymo:credited_to:tokyo_artist_ymo","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:7:tokyo_rydeen_ymo:credited_to:tokyo_artist_ymo'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-rydeen-ymo'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='yellow-magic-orchestra'), null,
  null, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_rydeen_ymo","object_seed_id":"tokyo_artist_ymo","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:7:tokyo_rydeen_ymo:credited_to:tokyo_artist_ymo","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:7:tokyo_rydeen_ymo:credited_to:tokyo_artist_ymo');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'sony_ymo_1979', 'sony_ymo_archive', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:7:tokyo_rydeen_ymo:credited_to:tokyo_artist_ymo'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 7 tokyo_rydeen_ymo credited_to tokyo_artist_ymo
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:7:tokyo_rydeen_ymo:credited_to:tokyo_artist_ymo","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='yellow-magic-orchestra'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:7:tokyo_rydeen_ymo:credited_to:tokyo_artist_ymo'
where s.slug='tokyo-rydeen-ymo'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:8:tokyo_technopolis_ymo:credited_to:tokyo_artist_ymo
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-technopolis-ymo'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='yellow-magic-orchestra'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"subject_seed_id":"tokyo_technopolis_ymo","object_seed_id":"tokyo_artist_ymo","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:8:tokyo_technopolis_ymo:credited_to:tokyo_artist_ymo","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:8:tokyo_technopolis_ymo:credited_to:tokyo_artist_ymo'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-technopolis-ymo'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='yellow-magic-orchestra'), null,
  null, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_technopolis_ymo","object_seed_id":"tokyo_artist_ymo","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:8:tokyo_technopolis_ymo:credited_to:tokyo_artist_ymo","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:8:tokyo_technopolis_ymo:credited_to:tokyo_artist_ymo');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'sony_ymo_1979', 'sony_ymo_archive', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:8:tokyo_technopolis_ymo:credited_to:tokyo_artist_ymo'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 8 tokyo_technopolis_ymo credited_to tokyo_artist_ymo
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:8:tokyo_technopolis_ymo:credited_to:tokyo_artist_ymo","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='yellow-magic-orchestra'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:8:tokyo_technopolis_ymo:credited_to:tokyo_artist_ymo'
where s.slug='tokyo-technopolis-ymo'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:9:tokyo_automatic_utada:credited_to:tokyo_artist_hikaru_utada
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-automatic-utada'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='hikaru-utada'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"subject_seed_id":"tokyo_automatic_utada","object_seed_id":"tokyo_artist_hikaru_utada","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:9:tokyo_automatic_utada:credited_to:tokyo_artist_hikaru_utada","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:9:tokyo_automatic_utada:credited_to:tokyo_artist_hikaru_utada'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-automatic-utada'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='hikaru-utada'), null,
  null, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_automatic_utada","object_seed_id":"tokyo_artist_hikaru_utada","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:9:tokyo_automatic_utada:credited_to:tokyo_artist_hikaru_utada","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:9:tokyo_automatic_utada:credited_to:tokyo_artist_hikaru_utada');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'musicbrainz_recording_identity', 'utada_automatic', 'utada_profile', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:9:tokyo_automatic_utada:credited_to:tokyo_artist_hikaru_utada'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 9 tokyo_automatic_utada credited_to tokyo_artist_hikaru_utada
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:9:tokyo_automatic_utada:credited_to:tokyo_artist_hikaru_utada","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='hikaru-utada'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:9:tokyo_automatic_utada:credited_to:tokyo_artist_hikaru_utada'
where s.slug='tokyo-automatic-utada'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:10:tokyo_1000_knives:credited_to:tokyo_artist_ryuichi_sakamoto
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='tokyo-1000-knives-ryuichi-sakamoto'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='ryuichi-sakamoto'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"subject_seed_id":"tokyo_1000_knives","object_seed_id":"tokyo_artist_ryuichi_sakamoto","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:10:tokyo_1000_knives:credited_to:tokyo_artist_ryuichi_sakamoto","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:10:tokyo_1000_knives:credited_to:tokyo_artist_ryuichi_sakamoto'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='tokyo-1000-knives-ryuichi-sakamoto'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='ryuichi-sakamoto'), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_1000_knives","object_seed_id":"tokyo_artist_ryuichi_sakamoto","credit_role":"primary_artist","seed_claim_key":"seed:tokyo:graph:10:tokyo_1000_knives:credited_to:tokyo_artist_ryuichi_sakamoto","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:10:tokyo_1000_knives:credited_to:tokyo_artist_ryuichi_sakamoto');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'roland_ymo_808', 'yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:10:tokyo_1000_knives:credited_to:tokyo_artist_ryuichi_sakamoto'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 10 tokyo_1000_knives credited_to tokyo_artist_ryuichi_sakamoto
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:10:tokyo_1000_knives:credited_to:tokyo_artist_ryuichi_sakamoto","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='ryuichi-sakamoto'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:10:tokyo_1000_knives:credited_to:tokyo_artist_ryuichi_sakamoto'
where s.slug='tokyo-1000-knives-ryuichi-sakamoto'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:tokyo:graph:11:tokyo_yamaha_rd_tokyo:related_to:tokyo_artist_ryuichi_sakamoto
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='yamaha-rd-tokyo-shibuya'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='ryuichi-sakamoto'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.990,
    metadata = metadata || '{"subject_seed_id":"tokyo_yamaha_rd_tokyo","object_seed_id":"tokyo_artist_ryuichi_sakamoto","relationship_note":"Yamaha documents Sakamoto visiting R&D Tokyo and advising designers and developers.","seed_claim_key":"seed:tokyo:graph:11:tokyo_yamaha_rd_tokyo:related_to:tokyo_artist_ryuichi_sakamoto","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:tokyo:graph:11:tokyo_yamaha_rd_tokyo:related_to:tokyo_artist_ryuichi_sakamoto'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='yamaha-rd-tokyo-shibuya'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='ryuichi-sakamoto'), null,
  null, null, 0.990, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"tokyo_yamaha_rd_tokyo","object_seed_id":"tokyo_artist_ryuichi_sakamoto","relationship_note":"Yamaha documents Sakamoto visiting R&D Tokyo and advising designers and developers.","seed_claim_key":"seed:tokyo:graph:11:tokyo_yamaha_rd_tokyo:related_to:tokyo_artist_ryuichi_sakamoto","seed_framework":"world-history-seed-v0.1","pilot_key":"tokyo"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:tokyo:graph:11:tokyo_yamaha_rd_tokyo:related_to:tokyo_artist_ryuichi_sakamoto');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('yamaha_sakamoto_synth')
where c.metadata->>'seed_claim_key' = 'seed:tokyo:graph:11:tokyo_yamaha_rd_tokyo:related_to:tokyo_artist_ryuichi_sakamoto'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 11 tokyo_yamaha_rd_tokyo related_to tokyo_artist_ryuichi_sakamoto
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:tokyo:graph:11:tokyo_yamaha_rd_tokyo:related_to:tokyo_artist_ryuichi_sakamoto","pilot_key":"tokyo"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='ryuichi-sakamoto'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:tokyo:graph:11:tokyo_yamaha_rd_tokyo:related_to:tokyo_artist_ryuichi_sakamoto'
where s.slug='yamaha-rd-tokyo-shibuya'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- Preview verification: all rows remain draft; no publication/playback action occurs.
select count(*) as pilot_entities from public.world_cultural_entities where metadata->>'pilot_key'='tokyo';
select count(*) as pilot_claims from public.world_claims where metadata->>'pilot_key'='tokyo';
select count(*) as pilot_place_edges from public.world_cultural_entity_places edge join public.world_cultural_entities ce on ce.id=edge.cultural_entity_id where ce.metadata->>'pilot_key'='tokyo';
select count(*) as pilot_graph_edges from public.world_cultural_relationships rel where rel.metadata->>'pilot_key'='tokyo';
select count(*) as forbidden_published_rows from public.world_cultural_entities where metadata->>'pilot_key'='tokyo' and publication_status='published';

