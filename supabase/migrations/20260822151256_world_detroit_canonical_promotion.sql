-- GOVERNED ACTIVATION MIGRATION (local isolated rehearsal)
-- Source artifact: implementation/phase2/generated/detroit_canonical_promotion_preview.sql
-- Converted per docs/24_G1_to_Detroit_Activation_Runbook.md A1-A4.
-- Preview wrapper lines (begin;/rollback;) removed so migration
-- governance owns atomicity. Local disposable database ONLY.

-- Tourify World of Music — Detroit canonical promotion preview v0.1
-- G1-BLOCKED / REVIEW ONLY / DO NOT APPLY TO TOURIFY DEMO
-- Promotes reviewed seed structure into canonical DRAFT rows only.
-- This transaction ALWAYS ends with ROLLBACK.
-- Expected entities: 25
-- Expected cultural-place edges: 25
-- Expected cultural relationships: 15
-- Expected claims: 66


do $$
declare
  v_missing integer;
begin
  if to_regclass('public.geo_places') is null or to_regclass('public.world_cultural_entities') is null then
    raise exception 'G1 World tables are not present';
  end if;
  if not exists (select 1 from public.geo_places where canonical_path = 'us/mi/detroit') then
    raise exception 'Detroit canonical geo place is missing';
  end if;
  select count(*) into v_missing from (values
    ('detroit_historical_atkins'),
    ('detroit_historical_demf_tech'),
    ('detroit_historical_may'),
    ('detroit_historical_motown'),
    ('detroit_historical_saunderson'),
    ('detroit_historical_transmat'),
    ('detroit_news_music_institute'),
    ('motown_museum_funk_brothers'),
    ('motown_museum_hitsville'),
    ('motown_museum_legacy'),
    ('musicbrainz_artist_identity'),
    ('musicbrainz_geo'),
    ('musicbrainz_recording_identity'),
    ('rbma_music_institute'),
    ('wikidata_geo'),
    ('wikidata_identity')
  ) required(source_key)
  where not exists (select 1 from public.world_sources s where s.source_key = required.source_key);
  if v_missing > 0 then raise exception '% Detroit source registry rows are missing', v_missing; end if;

  select count(*) into v_missing from (values
    ('cultural_place', 'associated_with'),
    ('cultural_place', 'developed_in'),
    ('cultural_place', 'historically_significant_in'),
    ('cultural_place', 'originated_in'),
    ('cultural_graph', 'credited_to'),
    ('cultural_graph', 'part_of'),
    ('cultural_graph', 'related_to'),
    ('cultural_graph', 'uses_instrument')
  ) required(domain, relation_key)
  where not exists (select 1 from public.world_relation_types r where r.domain=required.domain and r.relation_key=required.relation_key);
  if v_missing > 0 then raise exception '% required relation types are missing', v_missing; end if;
end $$;

-- Resolve the canonical Detroit place once for claim/edge construction.
create temporary table _world_detroit_place on commit drop as
select id, canonical_path from public.geo_places where canonical_path = 'us/mi/detroit';

-- ENTITY detroit_motown_founded_1959
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'historical_milestone', 'detroit-motown-founded-1959', 'Motown is founded in Detroit', 'Berry Gordy founded Tamla in 1959 and added the Motown label later that year, building the company around Detroit.',
  1959, 1959, '{"seed_id":"detroit_motown_founded_1959","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_hitsville_usa
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'studio_landmark', 'detroit-hitsville-usa', 'Hitsville U.S.A.', 'The West Grand Boulevard property became Motown’s headquarters and Studio A, where many Motown recordings were made.',
  1959, 1972, '{"address_text":"2648 W. Grand Blvd., Detroit, Michigan","media_policy":"link_only_until_cleared","landmark_type":"recording_studio_and_museum","external_ids":{"wikidata_qid":"Q1987935","musicbrainz_place_mbid":"71939dd5-5b2f-442c-b984-b19f4ba38be7"},"seed_id":"detroit_hitsville_usa","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_motown_sound
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'detroit-motown-sound', 'Motown Sound', 'A Detroit-associated soul sound developed around Motown’s writers, producers, singers, and house musicians.',
  1959, null, '{"seed_id":"detroit_motown_sound","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_motown_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'detroit-motown-sound-signature', 'Motown sound signature', 'A listening guide to recurring traits described by Motown Museum and Detroit Historical Society.',
  null, null, '{"listen_for":["driving backbeat","gospel-influenced call and response","jazz-influenced syncopation and improvisation","studio echo/reverb character"],"techniques":["Funk Brothers house-band interplay","echo-chamber processing"],"context":["The traits vary by recording and period; this is a listening guide, not a rule."],"audio_policy":"description_only_until_rights_cleared","seed_id":"detroit_motown_sound_signature","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_money_barrett_strong
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'detroit-money-barrett-strong', 'Money (That’s What I Want)', 'An early Motown/Tamla breakthrough widely identified by Detroit institutions as the company’s first hit.',
  1959, 1959, '{"artist_name":"Barrett Strong","title":"Money (That’s What I Want)","release_year":1959,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Barrett Strong Money (That’s What I Want)"},"place_context":"recorded_in_detroit_motown_ecosystem","credit_components":[{"artist_seed_id":"detroit_artist_barrett_strong","role":"primary_artist"}],"seed_id":"detroit_money_barrett_strong","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_shop_around_miracles
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'detroit-shop-around-miracles', 'Shop Around', 'Motown’s first million-selling record, an early marker of the label’s national breakthrough.',
  1960, 1960, '{"artist_name":"The Miracles","title":"Shop Around","release_year":1960,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Miracles Shop Around"},"place_context":"recorded_in_detroit_motown_ecosystem","credit_components":[{"artist_seed_id":"detroit_artist_miracles","role":"primary_artist"}],"seed_id":"detroit_shop_around_miracles","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_techno
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'detroit-techno', 'Detroit techno', 'An electronic music tradition developed by Detroit-area innovators including Juan Atkins, Derrick May, and Kevin Saunderson.',
  1980, null, '{"seed_id":"detroit_techno","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_belleville_three
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'scene', 'detroit-belleville-three', 'Belleville Three / early Detroit techno network', 'Juan Atkins, Derrick May, and Kevin Saunderson became known as the Belleville Three and are central to the rise of Detroit techno.',
  1980, null, '{"seed_id":"detroit_belleville_three","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_techno_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'detroit-techno-sound-signature', 'Early Detroit techno sound signature', 'A listening guide to the futurist electronic palette documented around the early Detroit techno network.',
  null, null, '{"listen_for":["synthesized electronic textures","machine-driven rhythm","futurist atmosphere","funk-informed rhythmic sensibility"],"techniques":["electronic synthesis","DJ mix culture"],"context":["Influences documented by Detroit Historical Society include Parliament-Funkadelic, Kraftwerk, Gary Numan, The Electrifying Mojo, and cross-pollination with Chicago house."],"audio_policy":"description_only_until_rights_cleared","seed_id":"detroit_techno_sound_signature","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_clear_cybotron
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'detroit-clear-cybotron', 'Clear', 'Juan Atkins’s Cybotron recording is identified by Detroit Historical Society as one of the group’s most notable hits.',
  null, null, '{"artist_name":"Cybotron","title":"Clear","release_year":1983,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Cybotron Clear"},"credit_components":[{"artist_seed_id":"detroit_artist_cybotron","role":"primary_artist"}],"seed_id":"detroit_clear_cybotron","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_strings_of_life
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'detroit-strings-of-life', 'Strings of Life', 'A landmark Derrick May / Rhythim Is Rhythim recording that helped carry Detroit techno to audiences overseas.',
  1987, 1987, '{"artist_name":"Rhythim Is Rhythim","title":"Strings of Life","release_year":1987,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Rhythim Is Rhythim Strings of Life"},"credit_components":[{"artist_seed_id":"detroit_artist_derrick_may","role":"primary_artist","credited_as":"Rhythim Is Rhythim"}],"seed_id":"detroit_strings_of_life","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_good_life_inner_city
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'detroit-good-life-inner-city', 'Good Life', 'A popular Inner City dance recording associated with Kevin Saunderson’s Detroit techno lineage.',
  null, null, '{"artist_name":"Inner City","title":"Good Life","release_year":1988,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Inner City Good Life"},"credit_components":[{"artist_seed_id":"detroit_artist_inner_city","role":"primary_artist"}],"seed_id":"detroit_good_life_inner_city","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_motown_electric_bass
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'electric-bass-guitar-motown', 'Electric bass guitar — Motown rhythm section', 'The electric bass is a defining part of the Motown rhythm-section vocabulary, strongly associated with Funk Brothers bassist James Jamerson.',
  1959, null, '{"instrument_family":"electric_string","sound_role":"low-register melodic and rhythmic foundation","listen_for":["mobile bass lines beneath vocal melodies","tight interaction with drums and keyboards"],"audio_policy":"description_only_until_rights_cleared","seed_id":"detroit_motown_electric_bass","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_motown_drum_kit
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'drum-kit-motown', 'Drum kit — Motown rhythm section', 'Motown sessions relied on Detroit studio drummers including Benny Benjamin and Uriel Jones, placing the drum kit at the center of the Funk Brothers rhythm section.',
  1959, null, '{"instrument_family":"percussion","sound_role":"backbeat and rhythmic drive","listen_for":["firm backbeat","syncopated interaction with bass and tambourine/percussion"],"audio_policy":"description_only_until_rights_cleared","seed_id":"detroit_motown_drum_kit","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_techno_synthesizer
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'synthesizer-detroit-techno', 'Synthesizer — early Detroit techno', 'Detroit Historical Society describes early Detroit techno innovators working with a new generation of synthesizers as they shaped the genre in the 1980s.',
  1980, null, '{"instrument_family":"electronic","sound_role":"synthetic timbre, harmony, bass and futurist texture","listen_for":["synthetic bass and lead timbres","layered electronic textures"],"audio_policy":"description_only_until_rights_cleared","seed_id":"detroit_techno_synthesizer","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_techno_drum_machine
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'drum-machine-detroit-techno', 'Drum machine — early Detroit techno', 'A new generation of drum machines was part of the technology used by Detroit techno pioneers as the local electronic style formed.',
  1980, null, '{"instrument_family":"electronic_percussion","sound_role":"machine-driven pulse and programmed rhythm","listen_for":["precisely programmed kick/snare patterns","mechanical rhythmic repetition used expressively"],"audio_policy":"description_only_until_rights_cleared","seed_id":"detroit_techno_drum_machine","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_music_institute
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'studio_landmark', 'detroit-music-institute', 'The Music Institute', 'The Music Institute at 1315 Broadway was a short-lived downtown after-hours club that gave Detroit techno a dedicated dancefloor and gathering place.',
  1988, 1990, '{"landmark_type":"club","address_text":"1315 Broadway St., Detroit, Michigan","media_policy":"link_only_until_cleared","seed_id":"detroit_music_institute","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_techno_city_atkins
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'detroit-techno-city-juan-atkins', 'Techno City', 'Juan Atkins’s recording “Techno City” helped establish the term “techno” in the genre’s international naming history.',
  1984, null, '{"artist_name":"Cybotron","title":"Techno City","release_year":1984,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Cybotron Techno City"},"credit_components":[{"artist_seed_id":"detroit_artist_cybotron","role":"primary_artist"}],"seed_id":"detroit_techno_city_atkins","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_artist_barrett_strong
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'barrett-strong', 'Barrett Strong', 'External knowledge-graph identity for Barrett Strong; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"31ee774b-6248-48d5-a8b5-0d9bebeaba9d","wikidata_qid":"Q808900","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"detroit_artist_barrett_strong","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_artist_miracles
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'the-miracles', 'The Miracles', 'External knowledge-graph identity for The Miracles; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"6a4c2d34-7f7f-4f87-b17f-b5540aa840db","wikidata_qid":"Q1761222","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"detroit_artist_miracles","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_artist_cybotron
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'cybotron-detroit', 'Cybotron', 'External knowledge-graph identity for Cybotron; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"cd1a3be7-a10b-499c-acdd-1defaea473f8","wikidata_qid":"Q939429","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"detroit_artist_cybotron","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_artist_derrick_may
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'derrick-may', 'Derrick May', 'External knowledge-graph identity for Derrick May; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"371c8525-8111-4497-83ba-1ead9d7ed148","wikidata_qid":"Q923104","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"detroit_artist_derrick_may","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_artist_inner_city
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'inner-city-detroit', 'Inner City', 'External knowledge-graph identity for Inner City; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"65a8e571-8a08-433f-a5bf-ead38c269ea6","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"detroit_artist_inner_city","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_artist_juan_atkins
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'juan-atkins', 'Juan Atkins', 'External knowledge-graph identity for Juan Atkins; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"57dd6359-f4ef-422a-9566-b8f54a0904fe","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"detroit_artist_juan_atkins","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY detroit_artist_kevin_saunderson
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'kevin-saunderson', 'Kevin Saunderson', 'External knowledge-graph identity for Kevin Saunderson; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"bf259ecd-fe89-4738-82fc-ecdd67de1fcc","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"detroit_artist_kevin_saunderson","pilot_key":"detroit","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- CLAIM seed:detroit:overview:musical_identity
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'place',
    subject_id = (select id::text from _world_detroit_place),
    predicate = 'musical_identity',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Detroit’s pilot history connects the Motown recording ecosystem of Hitsville U.S.A. with the city-area electronic innovations that shaped Detroit techno."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:overview:musical_identity'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'place', (select id::text from _world_detroit_place), 'musical_identity',
  null, null, '{"text":"Detroit’s pilot history connects the Motown recording ecosystem of Hitsville U.S.A. with the city-area electronic innovations that shaped Detroit techno."}'::jsonb,
  null, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:overview:musical_identity');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'detroit_historical_may', 'detroit_historical_motown', 'detroit_historical_saunderson', 'motown_museum_legacy')
where c.metadata->>'seed_claim_key' = 'seed:detroit:overview:musical_identity'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_motown_founded_1959:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-motown-founded-1959'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Berry Gordy founded Tamla in 1959 and added the Motown label later that year, building the company around Detroit."}'::jsonb,
    temporal_start_year = 1959,
    temporal_end_year = 1959,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_motown_founded_1959","entity_slug":"detroit-motown-founded-1959","seed_claim_key":"seed:detroit:entity:detroit_motown_founded_1959:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_founded_1959:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-motown-founded-1959'), 'summary',
  null, null, '{"text":"Berry Gordy founded Tamla in 1959 and added the Motown label later that year, building the company around Detroit."}'::jsonb,
  1959, 1959, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_founded_1959","entity_slug":"detroit-motown-founded-1959","seed_claim_key":"seed:detroit:entity:detroit_motown_founded_1959:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_founded_1959:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'motown_museum_hitsville')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_founded_1959:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_motown_founded_1959:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-motown-founded-1959'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1959,
    temporal_end_year = 1959,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_motown_founded_1959","entity_slug":"detroit-motown-founded-1959","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_founded_1959:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_founded_1959:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-motown-founded-1959'), 'historically_significant_in',
  'place', (select id::text from _world_detroit_place), null,
  1959, 1959, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_founded_1959","entity_slug":"detroit-motown-founded-1959","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_founded_1959:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_founded_1959:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'motown_museum_hitsville')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_founded_1959:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_motown_founded_1959
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1959, 1959, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_motown_founded_1959:place:historically_significant_in'
where ce.slug='detroit-motown-founded-1959'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1959,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_hitsville_usa:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-hitsville-usa'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The West Grand Boulevard property became Motown’s headquarters and Studio A, where many Motown recordings were made."}'::jsonb,
    temporal_start_year = 1959,
    temporal_end_year = 1972,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_hitsville_usa","entity_slug":"detroit-hitsville-usa","seed_claim_key":"seed:detroit:entity:detroit_hitsville_usa:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_hitsville_usa:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-hitsville-usa'), 'summary',
  null, null, '{"text":"The West Grand Boulevard property became Motown’s headquarters and Studio A, where many Motown recordings were made."}'::jsonb,
  1959, 1972, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_hitsville_usa","entity_slug":"detroit-hitsville-usa","seed_claim_key":"seed:detroit:entity:detroit_hitsville_usa:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_hitsville_usa:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'motown_museum_hitsville', 'musicbrainz_geo', 'wikidata_geo')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_hitsville_usa:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_hitsville_usa:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-hitsville-usa'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1959,
    temporal_end_year = 1972,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_hitsville_usa","entity_slug":"detroit-hitsville-usa","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_hitsville_usa:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_hitsville_usa:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-hitsville-usa'), 'historically_significant_in',
  'place', (select id::text from _world_detroit_place), null,
  1959, 1972, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_hitsville_usa","entity_slug":"detroit-hitsville-usa","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_hitsville_usa:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_hitsville_usa:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'motown_museum_hitsville', 'musicbrainz_geo', 'wikidata_geo')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_hitsville_usa:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_hitsville_usa
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1959, 1972, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_hitsville_usa:place:historically_significant_in'
where ce.slug='detroit-hitsville-usa'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1959,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_motown_sound:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A Detroit-associated soul sound developed around Motown’s writers, producers, singers, and house musicians."}'::jsonb,
    temporal_start_year = 1959,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"detroit_motown_sound","entity_slug":"detroit-motown-sound","seed_claim_key":"seed:detroit:entity:detroit_motown_sound:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'), 'summary',
  null, null, '{"text":"A Detroit-associated soul sound developed around Motown’s writers, producers, singers, and house musicians."}'::jsonb,
  1959, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_sound","entity_slug":"detroit-motown-sound","seed_claim_key":"seed:detroit:entity:detroit_motown_sound:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'motown_museum_legacy')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_motown_sound:place:originated_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'),
    predicate = 'originated_in',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1959,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"detroit_motown_sound","entity_slug":"detroit-motown-sound","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_sound:place:originated_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound:place:originated_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'), 'originated_in',
  'place', (select id::text from _world_detroit_place), null,
  1959, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_sound","entity_slug":"detroit-motown-sound","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_sound:place:originated_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound:place:originated_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'motown_museum_legacy')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound:place:originated_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_motown_sound
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1959, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='originated_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_motown_sound:place:originated_in'
where ce.slug='detroit-motown-sound'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1959,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_motown_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-motown-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening guide to recurring traits described by Motown Museum and Detroit Historical Society."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"detroit_motown_sound_signature","entity_slug":"detroit-motown-sound-signature","seed_claim_key":"seed:detroit:entity:detroit_motown_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-motown-sound-signature'), 'summary',
  null, null, '{"text":"A listening guide to recurring traits described by Motown Museum and Detroit Historical Society."}'::jsonb,
  null, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_sound_signature","entity_slug":"detroit-motown-sound-signature","seed_claim_key":"seed:detroit:entity:detroit_motown_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'motown_museum_legacy')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_motown_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-motown-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"detroit_motown_sound_signature","entity_slug":"detroit-motown-sound-signature","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-motown-sound-signature'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_sound_signature","entity_slug":"detroit-motown-sound-signature","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'motown_museum_legacy')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_motown_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_motown_sound_signature:place:associated_with'
where ce.slug='detroit-motown-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_money_barrett_strong:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-money-barrett-strong'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"An early Motown/Tamla breakthrough widely identified by Detroit institutions as the company’s first hit."}'::jsonb,
    temporal_start_year = 1959,
    temporal_end_year = 1959,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_money_barrett_strong","entity_slug":"detroit-money-barrett-strong","seed_claim_key":"seed:detroit:entity:detroit_money_barrett_strong:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_money_barrett_strong:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-money-barrett-strong'), 'summary',
  null, null, '{"text":"An early Motown/Tamla breakthrough widely identified by Detroit institutions as the company’s first hit."}'::jsonb,
  1959, 1959, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_money_barrett_strong","entity_slug":"detroit-money-barrett-strong","seed_claim_key":"seed:detroit:entity:detroit_money_barrett_strong:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_money_barrett_strong:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_money_barrett_strong:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_money_barrett_strong:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-money-barrett-strong'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1959,
    temporal_end_year = 1959,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_money_barrett_strong","entity_slug":"detroit-money-barrett-strong","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_money_barrett_strong:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_money_barrett_strong:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-money-barrett-strong'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  1959, 1959, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_money_barrett_strong","entity_slug":"detroit-money-barrett-strong","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_money_barrett_strong:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_money_barrett_strong:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_money_barrett_strong:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_money_barrett_strong
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1959, 1959, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_money_barrett_strong:place:associated_with'
where ce.slug='detroit-money-barrett-strong'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1959,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_shop_around_miracles:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-shop-around-miracles'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Motown’s first million-selling record, an early marker of the label’s national breakthrough."}'::jsonb,
    temporal_start_year = 1960,
    temporal_end_year = 1960,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_shop_around_miracles","entity_slug":"detroit-shop-around-miracles","seed_claim_key":"seed:detroit:entity:detroit_shop_around_miracles:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_shop_around_miracles:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-shop-around-miracles'), 'summary',
  null, null, '{"text":"Motown’s first million-selling record, an early marker of the label’s national breakthrough."}'::jsonb,
  1960, 1960, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_shop_around_miracles","entity_slug":"detroit-shop-around-miracles","seed_claim_key":"seed:detroit:entity:detroit_shop_around_miracles:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_shop_around_miracles:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_shop_around_miracles:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_shop_around_miracles:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-shop-around-miracles'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1960,
    temporal_end_year = 1960,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_shop_around_miracles","entity_slug":"detroit-shop-around-miracles","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_shop_around_miracles:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_shop_around_miracles:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-shop-around-miracles'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  1960, 1960, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_shop_around_miracles","entity_slug":"detroit-shop-around-miracles","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_shop_around_miracles:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_shop_around_miracles:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_shop_around_miracles:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_shop_around_miracles
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1960, 1960, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_shop_around_miracles:place:associated_with'
where ce.slug='detroit-shop-around-miracles'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1960,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_techno:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-techno'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"An electronic music tradition developed by Detroit-area innovators including Juan Atkins, Derrick May, and Kevin Saunderson."}'::jsonb,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"detroit_techno","entity_slug":"detroit-techno","seed_claim_key":"seed:detroit:entity:detroit_techno:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno'), 'summary',
  null, null, '{"text":"An electronic music tradition developed by Detroit-area innovators including Juan Atkins, Derrick May, and Kevin Saunderson."}'::jsonb,
  1980, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno","entity_slug":"detroit-techno","seed_claim_key":"seed:detroit:entity:detroit_techno:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'detroit_historical_may', 'detroit_historical_saunderson')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_techno:place:originated_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-techno'),
    predicate = 'originated_in',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"detroit_techno","entity_slug":"detroit-techno","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno:place:originated_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno:place:originated_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno'), 'originated_in',
  'place', (select id::text from _world_detroit_place), null,
  1980, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno","entity_slug":"detroit-techno","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno:place:originated_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno:place:originated_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'detroit_historical_may', 'detroit_historical_saunderson')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno:place:originated_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_techno
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1980, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='originated_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_techno:place:originated_in'
where ce.slug='detroit-techno'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1980,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_belleville_three:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Juan Atkins, Derrick May, and Kevin Saunderson became known as the Belleville Three and are central to the rise of Detroit techno."}'::jsonb,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"detroit_belleville_three","entity_slug":"detroit-belleville-three","seed_claim_key":"seed:detroit:entity:detroit_belleville_three:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_belleville_three:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'), 'summary',
  null, null, '{"text":"Juan Atkins, Derrick May, and Kevin Saunderson became known as the Belleville Three and are central to the rise of Detroit techno."}'::jsonb,
  1980, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_belleville_three","entity_slug":"detroit-belleville-three","seed_claim_key":"seed:detroit:entity:detroit_belleville_three:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_belleville_three:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'detroit_historical_may', 'detroit_historical_saunderson')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_belleville_three:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_belleville_three:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"detroit_belleville_three","entity_slug":"detroit-belleville-three","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_belleville_three:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_belleville_three:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'), 'developed_in',
  'place', (select id::text from _world_detroit_place), null,
  1980, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_belleville_three","entity_slug":"detroit-belleville-three","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_belleville_three:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_belleville_three:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'detroit_historical_may', 'detroit_historical_saunderson')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_belleville_three:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_belleville_three
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1980, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_belleville_three:place:developed_in'
where ce.slug='detroit-belleville-three'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1980,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_techno_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-techno-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening guide to the futurist electronic palette documented around the early Detroit techno network."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"detroit_techno_sound_signature","entity_slug":"detroit-techno-sound-signature","seed_claim_key":"seed:detroit:entity:detroit_techno_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno-sound-signature'), 'summary',
  null, null, '{"text":"A listening guide to the futurist electronic palette documented around the early Detroit techno network."}'::jsonb,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno_sound_signature","entity_slug":"detroit-techno-sound-signature","seed_claim_key":"seed:detroit:entity:detroit_techno_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'detroit_historical_may')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_techno_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-techno-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"detroit_techno_sound_signature","entity_slug":"detroit-techno-sound-signature","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno-sound-signature'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno_sound_signature","entity_slug":"detroit-techno-sound-signature","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'detroit_historical_may')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_techno_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_techno_sound_signature:place:associated_with'
where ce.slug='detroit-techno-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_clear_cybotron:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-clear-cybotron'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Juan Atkins’s Cybotron recording is identified by Detroit Historical Society as one of the group’s most notable hits."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"detroit_clear_cybotron","entity_slug":"detroit-clear-cybotron","seed_claim_key":"seed:detroit:entity:detroit_clear_cybotron:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_clear_cybotron:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-clear-cybotron'), 'summary',
  null, null, '{"text":"Juan Atkins’s Cybotron recording is identified by Detroit Historical Society as one of the group’s most notable hits."}'::jsonb,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_clear_cybotron","entity_slug":"detroit-clear-cybotron","seed_claim_key":"seed:detroit:entity:detroit_clear_cybotron:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_clear_cybotron:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_clear_cybotron:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_clear_cybotron:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-clear-cybotron'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"detroit_clear_cybotron","entity_slug":"detroit-clear-cybotron","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_clear_cybotron:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_clear_cybotron:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-clear-cybotron'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_clear_cybotron","entity_slug":"detroit-clear-cybotron","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_clear_cybotron:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_clear_cybotron:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_clear_cybotron:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_clear_cybotron
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_clear_cybotron:place:associated_with'
where ce.slug='detroit-clear-cybotron'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_strings_of_life:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-strings-of-life'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A landmark Derrick May / Rhythim Is Rhythim recording that helped carry Detroit techno to audiences overseas."}'::jsonb,
    temporal_start_year = 1987,
    temporal_end_year = 1987,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_strings_of_life","entity_slug":"detroit-strings-of-life","seed_claim_key":"seed:detroit:entity:detroit_strings_of_life:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_strings_of_life:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-strings-of-life'), 'summary',
  null, null, '{"text":"A landmark Derrick May / Rhythim Is Rhythim recording that helped carry Detroit techno to audiences overseas."}'::jsonb,
  1987, 1987, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_strings_of_life","entity_slug":"detroit-strings-of-life","seed_claim_key":"seed:detroit:entity:detroit_strings_of_life:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_strings_of_life:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_may', 'detroit_historical_transmat', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_strings_of_life:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_strings_of_life:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-strings-of-life'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1987,
    temporal_end_year = 1987,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_strings_of_life","entity_slug":"detroit-strings-of-life","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_strings_of_life:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_strings_of_life:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-strings-of-life'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  1987, 1987, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_strings_of_life","entity_slug":"detroit-strings-of-life","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_strings_of_life:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_strings_of_life:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_may', 'detroit_historical_transmat', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_strings_of_life:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_strings_of_life
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1987, 1987, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_strings_of_life:place:associated_with'
where ce.slug='detroit-strings-of-life'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1987,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_good_life_inner_city:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-good-life-inner-city'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A popular Inner City dance recording associated with Kevin Saunderson’s Detroit techno lineage."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"detroit_good_life_inner_city","entity_slug":"detroit-good-life-inner-city","seed_claim_key":"seed:detroit:entity:detroit_good_life_inner_city:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_good_life_inner_city:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-good-life-inner-city'), 'summary',
  null, null, '{"text":"A popular Inner City dance recording associated with Kevin Saunderson’s Detroit techno lineage."}'::jsonb,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_good_life_inner_city","entity_slug":"detroit-good-life-inner-city","seed_claim_key":"seed:detroit:entity:detroit_good_life_inner_city:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_good_life_inner_city:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_saunderson', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_good_life_inner_city:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_good_life_inner_city:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-good-life-inner-city'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"detroit_good_life_inner_city","entity_slug":"detroit-good-life-inner-city","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_good_life_inner_city:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_good_life_inner_city:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-good-life-inner-city'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_good_life_inner_city","entity_slug":"detroit-good-life-inner-city","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_good_life_inner_city:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_good_life_inner_city:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_saunderson', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_good_life_inner_city:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_good_life_inner_city
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_good_life_inner_city:place:associated_with'
where ce.slug='detroit-good-life-inner-city'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_motown_electric_bass:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='electric-bass-guitar-motown'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The electric bass is a defining part of the Motown rhythm-section vocabulary, strongly associated with Funk Brothers bassist James Jamerson."}'::jsonb,
    temporal_start_year = 1959,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"detroit_motown_electric_bass","entity_slug":"electric-bass-guitar-motown","seed_claim_key":"seed:detroit:entity:detroit_motown_electric_bass:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_electric_bass:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='electric-bass-guitar-motown'), 'summary',
  null, null, '{"text":"The electric bass is a defining part of the Motown rhythm-section vocabulary, strongly associated with Funk Brothers bassist James Jamerson."}'::jsonb,
  1959, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_electric_bass","entity_slug":"electric-bass-guitar-motown","seed_claim_key":"seed:detroit:entity:detroit_motown_electric_bass:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_electric_bass:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('motown_museum_funk_brothers')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_electric_bass:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_motown_electric_bass:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='electric-bass-guitar-motown'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1959,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"detroit_motown_electric_bass","entity_slug":"electric-bass-guitar-motown","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_electric_bass:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_electric_bass:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='electric-bass-guitar-motown'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  1959, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_electric_bass","entity_slug":"electric-bass-guitar-motown","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_electric_bass:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_electric_bass:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('motown_museum_funk_brothers')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_electric_bass:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_motown_electric_bass
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1959, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_motown_electric_bass:place:associated_with'
where ce.slug='electric-bass-guitar-motown'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1959,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_motown_drum_kit:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='drum-kit-motown'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Motown sessions relied on Detroit studio drummers including Benny Benjamin and Uriel Jones, placing the drum kit at the center of the Funk Brothers rhythm section."}'::jsonb,
    temporal_start_year = 1959,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"detroit_motown_drum_kit","entity_slug":"drum-kit-motown","seed_claim_key":"seed:detroit:entity:detroit_motown_drum_kit:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_drum_kit:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='drum-kit-motown'), 'summary',
  null, null, '{"text":"Motown sessions relied on Detroit studio drummers including Benny Benjamin and Uriel Jones, placing the drum kit at the center of the Funk Brothers rhythm section."}'::jsonb,
  1959, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_drum_kit","entity_slug":"drum-kit-motown","seed_claim_key":"seed:detroit:entity:detroit_motown_drum_kit:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_drum_kit:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('motown_museum_funk_brothers')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_drum_kit:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_motown_drum_kit:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='drum-kit-motown'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1959,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"detroit_motown_drum_kit","entity_slug":"drum-kit-motown","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_drum_kit:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_drum_kit:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='drum-kit-motown'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  1959, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_motown_drum_kit","entity_slug":"drum-kit-motown","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_motown_drum_kit:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_drum_kit:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('motown_museum_funk_brothers')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_motown_drum_kit:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_motown_drum_kit
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1959, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_motown_drum_kit:place:associated_with'
where ce.slug='drum-kit-motown'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1959,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_techno_synthesizer:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='synthesizer-detroit-techno'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Detroit Historical Society describes early Detroit techno innovators working with a new generation of synthesizers as they shaped the genre in the 1980s."}'::jsonb,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_techno_synthesizer","entity_slug":"synthesizer-detroit-techno","seed_claim_key":"seed:detroit:entity:detroit_techno_synthesizer:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_synthesizer:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='synthesizer-detroit-techno'), 'summary',
  null, null, '{"text":"Detroit Historical Society describes early Detroit techno innovators working with a new generation of synthesizers as they shaped the genre in the 1980s."}'::jsonb,
  1980, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno_synthesizer","entity_slug":"synthesizer-detroit-techno","seed_claim_key":"seed:detroit:entity:detroit_techno_synthesizer:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_synthesizer:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_demf_tech')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_synthesizer:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_techno_synthesizer:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='synthesizer-detroit-techno'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_techno_synthesizer","entity_slug":"synthesizer-detroit-techno","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno_synthesizer:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_synthesizer:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='synthesizer-detroit-techno'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  1980, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno_synthesizer","entity_slug":"synthesizer-detroit-techno","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno_synthesizer:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_synthesizer:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_demf_tech')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_synthesizer:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_techno_synthesizer
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1980, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_techno_synthesizer:place:associated_with'
where ce.slug='synthesizer-detroit-techno'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1980,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_techno_drum_machine:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='drum-machine-detroit-techno'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A new generation of drum machines was part of the technology used by Detroit techno pioneers as the local electronic style formed."}'::jsonb,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_techno_drum_machine","entity_slug":"drum-machine-detroit-techno","seed_claim_key":"seed:detroit:entity:detroit_techno_drum_machine:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_drum_machine:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='drum-machine-detroit-techno'), 'summary',
  null, null, '{"text":"A new generation of drum machines was part of the technology used by Detroit techno pioneers as the local electronic style formed."}'::jsonb,
  1980, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno_drum_machine","entity_slug":"drum-machine-detroit-techno","seed_claim_key":"seed:detroit:entity:detroit_techno_drum_machine:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_drum_machine:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_demf_tech')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_drum_machine:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_techno_drum_machine:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='drum-machine-detroit-techno'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"detroit_techno_drum_machine","entity_slug":"drum-machine-detroit-techno","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno_drum_machine:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_drum_machine:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='drum-machine-detroit-techno'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  1980, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno_drum_machine","entity_slug":"drum-machine-detroit-techno","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno_drum_machine:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_drum_machine:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_demf_tech')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_drum_machine:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_techno_drum_machine
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1980, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_techno_drum_machine:place:associated_with'
where ce.slug='drum-machine-detroit-techno'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1980,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_music_institute:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-music-institute'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The Music Institute at 1315 Broadway was a short-lived downtown after-hours club that gave Detroit techno a dedicated dancefloor and gathering place."}'::jsonb,
    temporal_start_year = 1988,
    temporal_end_year = 1990,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"detroit_music_institute","entity_slug":"detroit-music-institute","seed_claim_key":"seed:detroit:entity:detroit_music_institute:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_music_institute:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-music-institute'), 'summary',
  null, null, '{"text":"The Music Institute at 1315 Broadway was a short-lived downtown after-hours club that gave Detroit techno a dedicated dancefloor and gathering place."}'::jsonb,
  1988, 1990, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_music_institute","entity_slug":"detroit-music-institute","seed_claim_key":"seed:detroit:entity:detroit_music_institute:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_music_institute:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_may', 'detroit_news_music_institute', 'rbma_music_institute')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_music_institute:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_music_institute:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-music-institute'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1988,
    temporal_end_year = 1990,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"detroit_music_institute","entity_slug":"detroit-music-institute","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_music_institute:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_music_institute:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-music-institute'), 'historically_significant_in',
  'place', (select id::text from _world_detroit_place), null,
  1988, 1990, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_music_institute","entity_slug":"detroit-music-institute","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_music_institute:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_music_institute:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_may', 'detroit_news_music_institute', 'rbma_music_institute')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_music_institute:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_music_institute
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1988, 1990, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_music_institute:place:historically_significant_in'
where ce.slug='detroit-music-institute'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1988,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_techno_city_atkins:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-techno-city-juan-atkins'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Juan Atkins’s recording “Techno City” helped establish the term “techno” in the genre’s international naming history."}'::jsonb,
    temporal_start_year = 1984,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"detroit_techno_city_atkins","entity_slug":"detroit-techno-city-juan-atkins","seed_claim_key":"seed:detroit:entity:detroit_techno_city_atkins:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_city_atkins:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno-city-juan-atkins'), 'summary',
  null, null, '{"text":"Juan Atkins’s recording “Techno City” helped establish the term “techno” in the genre’s international naming history."}'::jsonb,
  1984, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno_city_atkins","entity_slug":"detroit-techno-city-juan-atkins","seed_claim_key":"seed:detroit:entity:detroit_techno_city_atkins:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_city_atkins:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_city_atkins:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_techno_city_atkins:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-techno-city-juan-atkins'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = 1984,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"detroit_techno_city_atkins","entity_slug":"detroit-techno-city-juan-atkins","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno_city_atkins:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_city_atkins:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno-city-juan-atkins'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  1984, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_techno_city_atkins","entity_slug":"detroit-techno-city-juan-atkins","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_techno_city_atkins:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_city_atkins:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_techno_city_atkins:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_techno_city_atkins
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1984, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_techno_city_atkins:place:associated_with'
where ce.slug='detroit-techno-city-juan-atkins'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1984,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_artist_barrett_strong:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='barrett-strong'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Barrett Strong; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_barrett_strong","entity_slug":"barrett-strong","seed_claim_key":"seed:detroit:entity:detroit_artist_barrett_strong:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_barrett_strong:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='barrett-strong'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Barrett Strong; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_barrett_strong","entity_slug":"barrett-strong","seed_claim_key":"seed:detroit:entity:detroit_artist_barrett_strong:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_barrett_strong:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_barrett_strong:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_artist_barrett_strong:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='barrett-strong'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_barrett_strong","entity_slug":"barrett-strong","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_barrett_strong:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_barrett_strong:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='barrett-strong'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_barrett_strong","entity_slug":"barrett-strong","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_barrett_strong:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_barrett_strong:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_barrett_strong:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_artist_barrett_strong
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_artist_barrett_strong:place:associated_with'
where ce.slug='barrett-strong'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_artist_miracles:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='the-miracles'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for The Miracles; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_miracles","entity_slug":"the-miracles","seed_claim_key":"seed:detroit:entity:detroit_artist_miracles:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_miracles:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-miracles'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for The Miracles; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_miracles","entity_slug":"the-miracles","seed_claim_key":"seed:detroit:entity:detroit_artist_miracles:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_miracles:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_miracles:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_artist_miracles:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='the-miracles'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_miracles","entity_slug":"the-miracles","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_miracles:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_miracles:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-miracles'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_miracles","entity_slug":"the-miracles","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_miracles:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_miracles:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_miracles:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_artist_miracles
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_artist_miracles:place:associated_with'
where ce.slug='the-miracles'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_artist_cybotron:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='cybotron-detroit'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Cybotron; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_cybotron","entity_slug":"cybotron-detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_cybotron:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_cybotron:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='cybotron-detroit'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Cybotron; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_cybotron","entity_slug":"cybotron-detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_cybotron:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_cybotron:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_cybotron:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_artist_cybotron:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='cybotron-detroit'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_cybotron","entity_slug":"cybotron-detroit","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_cybotron:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_cybotron:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='cybotron-detroit'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_cybotron","entity_slug":"cybotron-detroit","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_cybotron:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_cybotron:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_cybotron:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_artist_cybotron
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_artist_cybotron:place:associated_with'
where ce.slug='cybotron-detroit'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_artist_derrick_may:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='derrick-may'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Derrick May; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_derrick_may","entity_slug":"derrick-may","seed_claim_key":"seed:detroit:entity:detroit_artist_derrick_may:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_derrick_may:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='derrick-may'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Derrick May; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_derrick_may","entity_slug":"derrick-may","seed_claim_key":"seed:detroit:entity:detroit_artist_derrick_may:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_derrick_may:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_may', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_derrick_may:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_artist_derrick_may:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='derrick-may'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_derrick_may","entity_slug":"derrick-may","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_derrick_may:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_derrick_may:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='derrick-may'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_derrick_may","entity_slug":"derrick-may","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_derrick_may:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_derrick_may:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_may', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_derrick_may:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_artist_derrick_may
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_artist_derrick_may:place:associated_with'
where ce.slug='derrick-may'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_artist_inner_city:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='inner-city-detroit'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Inner City; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_inner_city","entity_slug":"inner-city-detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_inner_city:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_inner_city:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='inner-city-detroit'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Inner City; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_inner_city","entity_slug":"inner-city-detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_inner_city:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_inner_city:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_saunderson', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_inner_city:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_artist_inner_city:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='inner-city-detroit'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_inner_city","entity_slug":"inner-city-detroit","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_inner_city:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_inner_city:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='inner-city-detroit'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_inner_city","entity_slug":"inner-city-detroit","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_inner_city:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_inner_city:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_saunderson', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_inner_city:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_artist_inner_city
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_artist_inner_city:place:associated_with'
where ce.slug='inner-city-detroit'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_artist_juan_atkins:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='juan-atkins'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Juan Atkins; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_juan_atkins","entity_slug":"juan-atkins","seed_claim_key":"seed:detroit:entity:detroit_artist_juan_atkins:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_juan_atkins:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='juan-atkins'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Juan Atkins; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_juan_atkins","entity_slug":"juan-atkins","seed_claim_key":"seed:detroit:entity:detroit_artist_juan_atkins:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_juan_atkins:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_juan_atkins:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_artist_juan_atkins:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='juan-atkins'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_juan_atkins","entity_slug":"juan-atkins","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_juan_atkins:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_juan_atkins:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='juan-atkins'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_juan_atkins","entity_slug":"juan-atkins","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_juan_atkins:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_juan_atkins:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_juan_atkins:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_artist_juan_atkins
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_artist_juan_atkins:place:associated_with'
where ce.slug='juan-atkins'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:entity:detroit_artist_kevin_saunderson:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='kevin-saunderson'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Kevin Saunderson; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_kevin_saunderson","entity_slug":"kevin-saunderson","seed_claim_key":"seed:detroit:entity:detroit_artist_kevin_saunderson:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_kevin_saunderson:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='kevin-saunderson'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Kevin Saunderson; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_kevin_saunderson","entity_slug":"kevin-saunderson","seed_claim_key":"seed:detroit:entity:detroit_artist_kevin_saunderson:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_kevin_saunderson:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_saunderson', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_kevin_saunderson:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:detroit:entity:detroit_artist_kevin_saunderson:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='kevin-saunderson'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_detroit_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"detroit_artist_kevin_saunderson","entity_slug":"kevin-saunderson","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_kevin_saunderson:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_kevin_saunderson:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='kevin-saunderson'), 'associated_with',
  'place', (select id::text from _world_detroit_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"detroit_artist_kevin_saunderson","entity_slug":"kevin-saunderson","place_path":"us/mi/detroit","seed_claim_key":"seed:detroit:entity:detroit_artist_kevin_saunderson:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_kevin_saunderson:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_saunderson', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:entity:detroit_artist_kevin_saunderson:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE detroit_artist_kevin_saunderson
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_detroit_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:entity:detroit_artist_kevin_saunderson:place:associated_with'
where ce.slug='kevin-saunderson'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:detroit:graph:1:detroit_belleville_three:part_of:detroit_techno
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'),
    predicate = 'part_of',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='detroit-techno'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"detroit_belleville_three","object_seed_id":"detroit_techno","seed_claim_key":"seed:detroit:graph:1:detroit_belleville_three:part_of:detroit_techno","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:1:detroit_belleville_three:part_of:detroit_techno'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'), 'part_of',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_belleville_three","object_seed_id":"detroit_techno","seed_claim_key":"seed:detroit:graph:1:detroit_belleville_three:part_of:detroit_techno","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:1:detroit_belleville_three:part_of:detroit_techno');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:1:detroit_belleville_three:part_of:detroit_techno'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 1 detroit_belleville_three part_of detroit_techno
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:1:detroit_belleville_three:part_of:detroit_techno","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='detroit-techno'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='part_of'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:1:detroit_belleville_three:part_of:detroit_techno'
where s.slug='detroit-belleville-three'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:2:detroit_techno:uses_instrument:detroit_techno_synthesizer
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-techno'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='synthesizer-detroit-techno'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"detroit_techno","object_seed_id":"detroit_techno_synthesizer","seed_claim_key":"seed:detroit:graph:2:detroit_techno:uses_instrument:detroit_techno_synthesizer","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:2:detroit_techno:uses_instrument:detroit_techno_synthesizer'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='synthesizer-detroit-techno'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_techno","object_seed_id":"detroit_techno_synthesizer","seed_claim_key":"seed:detroit:graph:2:detroit_techno:uses_instrument:detroit_techno_synthesizer","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:2:detroit_techno:uses_instrument:detroit_techno_synthesizer');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_demf_tech')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:2:detroit_techno:uses_instrument:detroit_techno_synthesizer'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 2 detroit_techno uses_instrument detroit_techno_synthesizer
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:2:detroit_techno:uses_instrument:detroit_techno_synthesizer","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='synthesizer-detroit-techno'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:2:detroit_techno:uses_instrument:detroit_techno_synthesizer'
where s.slug='detroit-techno'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:3:detroit_techno:uses_instrument:detroit_techno_drum_machine
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-techno'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='drum-machine-detroit-techno'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"detroit_techno","object_seed_id":"detroit_techno_drum_machine","seed_claim_key":"seed:detroit:graph:3:detroit_techno:uses_instrument:detroit_techno_drum_machine","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:3:detroit_techno:uses_instrument:detroit_techno_drum_machine'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='drum-machine-detroit-techno'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_techno","object_seed_id":"detroit_techno_drum_machine","seed_claim_key":"seed:detroit:graph:3:detroit_techno:uses_instrument:detroit_techno_drum_machine","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:3:detroit_techno:uses_instrument:detroit_techno_drum_machine');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_demf_tech')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:3:detroit_techno:uses_instrument:detroit_techno_drum_machine'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 3 detroit_techno uses_instrument detroit_techno_drum_machine
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:3:detroit_techno:uses_instrument:detroit_techno_drum_machine","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='drum-machine-detroit-techno'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:3:detroit_techno:uses_instrument:detroit_techno_drum_machine'
where s.slug='detroit-techno'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:4:detroit_motown_sound:uses_instrument:detroit_motown_electric_bass
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='electric-bass-guitar-motown'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"subject_seed_id":"detroit_motown_sound","object_seed_id":"detroit_motown_electric_bass","seed_claim_key":"seed:detroit:graph:4:detroit_motown_sound:uses_instrument:detroit_motown_electric_bass","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:4:detroit_motown_sound:uses_instrument:detroit_motown_electric_bass'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='electric-bass-guitar-motown'), null,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_motown_sound","object_seed_id":"detroit_motown_electric_bass","seed_claim_key":"seed:detroit:graph:4:detroit_motown_sound:uses_instrument:detroit_motown_electric_bass","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:4:detroit_motown_sound:uses_instrument:detroit_motown_electric_bass');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('motown_museum_funk_brothers')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:4:detroit_motown_sound:uses_instrument:detroit_motown_electric_bass'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 4 detroit_motown_sound uses_instrument detroit_motown_electric_bass
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:4:detroit_motown_sound:uses_instrument:detroit_motown_electric_bass","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='electric-bass-guitar-motown'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:4:detroit_motown_sound:uses_instrument:detroit_motown_electric_bass'
where s.slug='detroit-motown-sound'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:5:detroit_motown_sound:uses_instrument:detroit_motown_drum_kit
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='drum-kit-motown'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"subject_seed_id":"detroit_motown_sound","object_seed_id":"detroit_motown_drum_kit","seed_claim_key":"seed:detroit:graph:5:detroit_motown_sound:uses_instrument:detroit_motown_drum_kit","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:5:detroit_motown_sound:uses_instrument:detroit_motown_drum_kit'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='drum-kit-motown'), null,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_motown_sound","object_seed_id":"detroit_motown_drum_kit","seed_claim_key":"seed:detroit:graph:5:detroit_motown_sound:uses_instrument:detroit_motown_drum_kit","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:5:detroit_motown_sound:uses_instrument:detroit_motown_drum_kit');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('motown_museum_funk_brothers')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:5:detroit_motown_sound:uses_instrument:detroit_motown_drum_kit'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 5 detroit_motown_sound uses_instrument detroit_motown_drum_kit
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:5:detroit_motown_sound:uses_instrument:detroit_motown_drum_kit","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='drum-kit-motown'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:5:detroit_motown_sound:uses_instrument:detroit_motown_drum_kit'
where s.slug='detroit-motown-sound'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:6:detroit_money_barrett_strong:credited_to:detroit_artist_barrett_strong
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-money-barrett-strong'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='barrett-strong'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"detroit_money_barrett_strong","object_seed_id":"detroit_artist_barrett_strong","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:6:detroit_money_barrett_strong:credited_to:detroit_artist_barrett_strong","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:6:detroit_money_barrett_strong:credited_to:detroit_artist_barrett_strong'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-money-barrett-strong'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='barrett-strong'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_money_barrett_strong","object_seed_id":"detroit_artist_barrett_strong","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:6:detroit_money_barrett_strong:credited_to:detroit_artist_barrett_strong","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:6:detroit_money_barrett_strong:credited_to:detroit_artist_barrett_strong');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:6:detroit_money_barrett_strong:credited_to:detroit_artist_barrett_strong'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 6 detroit_money_barrett_strong credited_to detroit_artist_barrett_strong
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:6:detroit_money_barrett_strong:credited_to:detroit_artist_barrett_strong","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='barrett-strong'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:6:detroit_money_barrett_strong:credited_to:detroit_artist_barrett_strong'
where s.slug='detroit-money-barrett-strong'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:7:detroit_shop_around_miracles:credited_to:detroit_artist_miracles
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-shop-around-miracles'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='the-miracles'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"detroit_shop_around_miracles","object_seed_id":"detroit_artist_miracles","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:7:detroit_shop_around_miracles:credited_to:detroit_artist_miracles","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:7:detroit_shop_around_miracles:credited_to:detroit_artist_miracles'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-shop-around-miracles'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-miracles'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_shop_around_miracles","object_seed_id":"detroit_artist_miracles","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:7:detroit_shop_around_miracles:credited_to:detroit_artist_miracles","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:7:detroit_shop_around_miracles:credited_to:detroit_artist_miracles');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_motown', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:7:detroit_shop_around_miracles:credited_to:detroit_artist_miracles'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 7 detroit_shop_around_miracles credited_to detroit_artist_miracles
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:7:detroit_shop_around_miracles:credited_to:detroit_artist_miracles","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='the-miracles'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:7:detroit_shop_around_miracles:credited_to:detroit_artist_miracles'
where s.slug='detroit-shop-around-miracles'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:8:detroit_clear_cybotron:credited_to:detroit_artist_cybotron
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-clear-cybotron'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='cybotron-detroit'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"subject_seed_id":"detroit_clear_cybotron","object_seed_id":"detroit_artist_cybotron","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:8:detroit_clear_cybotron:credited_to:detroit_artist_cybotron","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:8:detroit_clear_cybotron:credited_to:detroit_artist_cybotron'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-clear-cybotron'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='cybotron-detroit'), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_clear_cybotron","object_seed_id":"detroit_artist_cybotron","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:8:detroit_clear_cybotron:credited_to:detroit_artist_cybotron","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:8:detroit_clear_cybotron:credited_to:detroit_artist_cybotron');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_artist_identity', 'musicbrainz_recording_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:8:detroit_clear_cybotron:credited_to:detroit_artist_cybotron'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 8 detroit_clear_cybotron credited_to detroit_artist_cybotron
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:8:detroit_clear_cybotron:credited_to:detroit_artist_cybotron","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='cybotron-detroit'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:8:detroit_clear_cybotron:credited_to:detroit_artist_cybotron'
where s.slug='detroit-clear-cybotron'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:9:detroit_strings_of_life:credited_to:detroit_artist_derrick_may
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-strings-of-life'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='derrick-may'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"detroit_strings_of_life","object_seed_id":"detroit_artist_derrick_may","credit_role":"primary_artist","credited_as":"Rhythim Is Rhythim","seed_claim_key":"seed:detroit:graph:9:detroit_strings_of_life:credited_to:detroit_artist_derrick_may","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:9:detroit_strings_of_life:credited_to:detroit_artist_derrick_may'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-strings-of-life'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='derrick-may'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_strings_of_life","object_seed_id":"detroit_artist_derrick_may","credit_role":"primary_artist","credited_as":"Rhythim Is Rhythim","seed_claim_key":"seed:detroit:graph:9:detroit_strings_of_life:credited_to:detroit_artist_derrick_may","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:9:detroit_strings_of_life:credited_to:detroit_artist_derrick_may');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_may', 'detroit_historical_transmat', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:9:detroit_strings_of_life:credited_to:detroit_artist_derrick_may'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 9 detroit_strings_of_life credited_to detroit_artist_derrick_may
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:9:detroit_strings_of_life:credited_to:detroit_artist_derrick_may","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='derrick-may'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:9:detroit_strings_of_life:credited_to:detroit_artist_derrick_may'
where s.slug='detroit-strings-of-life'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:10:detroit_good_life_inner_city:credited_to:detroit_artist_inner_city
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-good-life-inner-city'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='inner-city-detroit'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"subject_seed_id":"detroit_good_life_inner_city","object_seed_id":"detroit_artist_inner_city","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:10:detroit_good_life_inner_city:credited_to:detroit_artist_inner_city","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:10:detroit_good_life_inner_city:credited_to:detroit_artist_inner_city'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-good-life-inner-city'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='inner-city-detroit'), null,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_good_life_inner_city","object_seed_id":"detroit_artist_inner_city","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:10:detroit_good_life_inner_city:credited_to:detroit_artist_inner_city","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:10:detroit_good_life_inner_city:credited_to:detroit_artist_inner_city');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_saunderson', 'musicbrainz_artist_identity', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:10:detroit_good_life_inner_city:credited_to:detroit_artist_inner_city'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 10 detroit_good_life_inner_city credited_to detroit_artist_inner_city
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:10:detroit_good_life_inner_city:credited_to:detroit_artist_inner_city","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='inner-city-detroit'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:10:detroit_good_life_inner_city:credited_to:detroit_artist_inner_city'
where s.slug='detroit-good-life-inner-city'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:11:detroit_techno_city_atkins:credited_to:detroit_artist_cybotron
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-techno-city-juan-atkins'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='cybotron-detroit'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"subject_seed_id":"detroit_techno_city_atkins","object_seed_id":"detroit_artist_cybotron","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:11:detroit_techno_city_atkins:credited_to:detroit_artist_cybotron","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:11:detroit_techno_city_atkins:credited_to:detroit_artist_cybotron'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno-city-juan-atkins'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='cybotron-detroit'), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_techno_city_atkins","object_seed_id":"detroit_artist_cybotron","credit_role":"primary_artist","seed_claim_key":"seed:detroit:graph:11:detroit_techno_city_atkins:credited_to:detroit_artist_cybotron","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:11:detroit_techno_city_atkins:credited_to:detroit_artist_cybotron');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins', 'musicbrainz_artist_identity', 'musicbrainz_recording_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:11:detroit_techno_city_atkins:credited_to:detroit_artist_cybotron'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 11 detroit_techno_city_atkins credited_to detroit_artist_cybotron
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:11:detroit_techno_city_atkins:credited_to:detroit_artist_cybotron","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='cybotron-detroit'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:11:detroit_techno_city_atkins:credited_to:detroit_artist_cybotron'
where s.slug='detroit-techno-city-juan-atkins'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:12:detroit_artist_juan_atkins:part_of:detroit_belleville_three
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='juan-atkins'),
    predicate = 'part_of',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.990,
    metadata = metadata || '{"subject_seed_id":"detroit_artist_juan_atkins","object_seed_id":"detroit_belleville_three","relationship_note":"Detroit Historical Society identifies Atkins, May, and Saunderson as the Belleville Three.","seed_claim_key":"seed:detroit:graph:12:detroit_artist_juan_atkins:part_of:detroit_belleville_three","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:12:detroit_artist_juan_atkins:part_of:detroit_belleville_three'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='juan-atkins'), 'part_of',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'), null,
  null, null, 0.990, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_artist_juan_atkins","object_seed_id":"detroit_belleville_three","relationship_note":"Detroit Historical Society identifies Atkins, May, and Saunderson as the Belleville Three.","seed_claim_key":"seed:detroit:graph:12:detroit_artist_juan_atkins:part_of:detroit_belleville_three","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:12:detroit_artist_juan_atkins:part_of:detroit_belleville_three');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_atkins')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:12:detroit_artist_juan_atkins:part_of:detroit_belleville_three'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 12 detroit_artist_juan_atkins part_of detroit_belleville_three
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:12:detroit_artist_juan_atkins:part_of:detroit_belleville_three","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='detroit-belleville-three'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='part_of'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:12:detroit_artist_juan_atkins:part_of:detroit_belleville_three'
where s.slug='juan-atkins'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:13:detroit_artist_kevin_saunderson:part_of:detroit_belleville_three
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='kevin-saunderson'),
    predicate = 'part_of',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.990,
    metadata = metadata || '{"subject_seed_id":"detroit_artist_kevin_saunderson","object_seed_id":"detroit_belleville_three","relationship_note":"Detroit Historical Society identifies Saunderson, Atkins, and May as the Belleville Three.","seed_claim_key":"seed:detroit:graph:13:detroit_artist_kevin_saunderson:part_of:detroit_belleville_three","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:13:detroit_artist_kevin_saunderson:part_of:detroit_belleville_three'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='kevin-saunderson'), 'part_of',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-belleville-three'), null,
  null, null, 0.990, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_artist_kevin_saunderson","object_seed_id":"detroit_belleville_three","relationship_note":"Detroit Historical Society identifies Saunderson, Atkins, and May as the Belleville Three.","seed_claim_key":"seed:detroit:graph:13:detroit_artist_kevin_saunderson:part_of:detroit_belleville_three","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:13:detroit_artist_kevin_saunderson:part_of:detroit_belleville_three');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_saunderson')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:13:detroit_artist_kevin_saunderson:part_of:detroit_belleville_three'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 13 detroit_artist_kevin_saunderson part_of detroit_belleville_three
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:13:detroit_artist_kevin_saunderson:part_of:detroit_belleville_three","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='detroit-belleville-three'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='part_of'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:13:detroit_artist_kevin_saunderson:part_of:detroit_belleville_three'
where s.slug='kevin-saunderson'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:14:detroit_hitsville_usa:related_to:detroit_motown_sound
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-hitsville-usa'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.990,
    metadata = metadata || '{"subject_seed_id":"detroit_hitsville_usa","object_seed_id":"detroit_motown_sound","relationship_note":"Motown Museum identifies Hitsville Studio A as the place where the Motown Sound was created and recorded.","seed_claim_key":"seed:detroit:graph:14:detroit_hitsville_usa:related_to:detroit_motown_sound","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:14:detroit_hitsville_usa:related_to:detroit_motown_sound'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-hitsville-usa'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-motown-sound'), null,
  null, null, 0.990, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_hitsville_usa","object_seed_id":"detroit_motown_sound","relationship_note":"Motown Museum identifies Hitsville Studio A as the place where the Motown Sound was created and recorded.","seed_claim_key":"seed:detroit:graph:14:detroit_hitsville_usa:related_to:detroit_motown_sound","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:14:detroit_hitsville_usa:related_to:detroit_motown_sound');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('motown_museum_hitsville', 'motown_museum_legacy')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:14:detroit_hitsville_usa:related_to:detroit_motown_sound'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 14 detroit_hitsville_usa related_to detroit_motown_sound
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:14:detroit_hitsville_usa:related_to:detroit_motown_sound","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='detroit-motown-sound'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:14:detroit_hitsville_usa:related_to:detroit_motown_sound'
where s.slug='detroit-hitsville-usa'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:detroit:graph:15:detroit_music_institute:related_to:detroit_techno
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='detroit-music-institute'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='detroit-techno'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"subject_seed_id":"detroit_music_institute","object_seed_id":"detroit_techno","relationship_note":"Detroit Historical Society and RBMA describe the Music Institute as a dedicated Detroit techno platform.","seed_claim_key":"seed:detroit:graph:15:detroit_music_institute:related_to:detroit_techno","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:detroit:graph:15:detroit_music_institute:related_to:detroit_techno'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-music-institute'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='detroit-techno'), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"detroit_music_institute","object_seed_id":"detroit_techno","relationship_note":"Detroit Historical Society and RBMA describe the Music Institute as a dedicated Detroit techno platform.","seed_claim_key":"seed:detroit:graph:15:detroit_music_institute:related_to:detroit_techno","seed_framework":"world-history-seed-v0.1","pilot_key":"detroit"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:detroit:graph:15:detroit_music_institute:related_to:detroit_techno');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('detroit_historical_may', 'rbma_music_institute')
where c.metadata->>'seed_claim_key' = 'seed:detroit:graph:15:detroit_music_institute:related_to:detroit_techno'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 15 detroit_music_institute related_to detroit_techno
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:detroit:graph:15:detroit_music_institute:related_to:detroit_techno","pilot_key":"detroit"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='detroit-techno'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:detroit:graph:15:detroit_music_institute:related_to:detroit_techno'
where s.slug='detroit-music-institute'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- Preview verification: all rows remain draft; no publication/playback action occurs.
select count(*) as detroit_entities from public.world_cultural_entities where metadata->>'pilot_key'='detroit';
select count(*) as detroit_claims from public.world_claims where metadata->>'pilot_key'='detroit';
select count(*) as detroit_place_edges from public.world_cultural_entity_places edge join public.world_cultural_entities ce on ce.id=edge.cultural_entity_id where ce.metadata->>'pilot_key'='detroit';
select count(*) as detroit_graph_edges from public.world_cultural_relationships rel where rel.metadata->>'pilot_key'='detroit';
select count(*) as forbidden_published_rows from public.world_cultural_entities where metadata->>'pilot_key'='detroit' and publication_status='published';


