-- GOVERNED ACTIVATION MIGRATION (local isolated rehearsal)
-- Source artifact: implementation/phase2/generated/kingston_canonical_promotion_preview.sql
-- Compiled by compile_pilot_canonical_preview.py (validated 27 checks).
-- Preview wrapper lines removed so migration governance owns atomicity.

-- Tourify World of Music — Kingston canonical promotion preview v0.1
-- G1-BLOCKED / REVIEW ONLY / DO NOT APPLY TO TOURIFY DEMO
-- Promotes reviewed seed structure into canonical DRAFT rows only.
-- This transaction ALWAYS ends with ROLLBACK.
-- Expected entities: 25
-- Expected cultural-place edges: 25
-- Expected cultural relationships: 14
-- Expected claims: 65


do $$
declare
  v_missing integer;
begin
  if to_regclass('public.geo_places') is null or to_regclass('public.world_cultural_entities') is null then
    raise exception 'G1 World tables are not present';
  end if;
  if not exists (select 1 from public.geo_places where canonical_path = 'jm/kingston') then
    raise exception 'Kingston canonical geo place is missing';
  end if;
  select count(*) into v_missing from (values
    ('jamaica_gleaner_sound_system'),
    ('jamaica_gleaner_studio_one'),
    ('jamaica_jis_rocksteady'),
    ('jamaica_jis_roots_reggae'),
    ('musicbrainz_artist_identity'),
    ('musicbrainz_recording_identity'),
    ('smithsonian_nyahbinghi'),
    ('smithsonian_roots_reggae'),
    ('studio_one_official'),
    ('unesco_reggae_jamaica'),
    ('wikidata_identity')
  ) required(source_key)
  where not exists (select 1 from public.world_sources s where s.source_key = required.source_key);
  if v_missing > 0 then raise exception '% Kingston source registry rows are missing', v_missing; end if;

  select count(*) into v_missing from (values
    ('cultural_place', 'associated_with'),
    ('cultural_place', 'developed_in'),
    ('cultural_place', 'historically_significant_in'),
    ('cultural_place', 'originated_in'),
    ('cultural_place', 'practiced_in'),
    ('cultural_graph', 'credited_to'),
    ('cultural_graph', 'evolved_from'),
    ('cultural_graph', 'influenced_by'),
    ('cultural_graph', 'related_to'),
    ('cultural_graph', 'uses_instrument')
  ) required(domain, relation_key)
  where not exists (select 1 from public.world_relation_types r where r.domain=required.domain and r.relation_key=required.relation_key);
  if v_missing > 0 then raise exception '% required relation types are missing', v_missing; end if;
end $$;

-- Resolve the canonical Kingston place once for claim/edge construction.
create temporary table _world_kingston_place on commit drop as
select id, canonical_path from public.geo_places where canonical_path = 'jm/kingston';

-- ENTITY jamaica_sound_system_culture
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'scene', 'jamaica-sound-system-culture', 'Kingston sound-system culture', 'Urban sound-system dances provided an important platform for Jamaican popular music and the transition among ska, rocksteady, and reggae.',
  1950, null, '{"seed_id":"jamaica_sound_system_culture","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_ska
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'jamaica-ska', 'Ska', 'A Jamaican popular style that emerged before rocksteady and reggae and became part of the island’s postwar/independence-era musical transformation.',
  1950, 1966, '{"seed_id":"jamaica_ska","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_ska_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'jamaica-ska-sound-signature', 'Ska sound signature', 'A listening guide to traits described in Smithsonian’s overview of the ska-to-reggae continuum.',
  null, null, '{"listen_for":["syncopated rhythmic accents","prominent snare and hi-hat pulse","dance-oriented momentum"],"techniques":[],"context":["The seed describes broad historical listening traits; individual recordings differ."],"audio_policy":"description_only_until_rights_cleared","seed_id":"jamaica_ska_sound_signature","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_rocksteady
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'jamaica-rocksteady', 'Rocksteady', 'A slower Jamaican style that emerged around 1966, shifting emphasis toward drums, bass, guitar interplay, vocals, and social commentary.',
  1966, 1968, '{"seed_id":"jamaica_rocksteady","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_rocksteady_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'jamaica-rocksteady-sound-signature', 'Rocksteady sound signature', 'A listening guide to the slower groove and instrumental balance described by Smithsonian Folklife.',
  null, null, '{"listen_for":["slower pulse than ska","strong bass and drum foundation","swaying guitar-and-bass interplay","greater space for vocals and commentary"],"techniques":[],"context":[],"audio_policy":"description_only_until_rights_cleared","seed_id":"jamaica_rocksteady_sound_signature","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_reggae
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'jamaica-reggae', 'Reggae', 'A Jamaican music tradition that emerged in the late 1960s and drew on earlier Jamaican forms, Caribbean and international influences, and Rastafari-linked cultural expression.',
  1968, null, '{"seed_id":"jamaica_reggae","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_nyahbinghi
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'tradition', 'jamaica-nyahbinghi', 'Nyahbinghi drumming influence', 'Rastafari-linked Nyahbinghi drumming is an important influence in roots reggae history.',
  null, null, '{"seed_id":"jamaica_nyahbinghi","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_reggae_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'jamaica-reggae-sound-signature', 'Roots reggae sound signature', 'A listening guide to rhythmic traits and influences described by Smithsonian Folklife.',
  null, null, '{"listen_for":["emphasis on the backbeat/downbeat feel","one-drop rhythmic approach","bass-forward groove","Nyahbinghi-derived rhythmic influence"],"techniques":["one drop","rockers","steppers"],"context":["These rhythm labels describe a family of approaches rather than one universal reggae beat."],"audio_policy":"description_only_until_rights_cleared","seed_id":"jamaica_reggae_sound_signature","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_ocarolina
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'jamaica-ocarolina', 'O’Carolina', 'A recording cited by Smithsonian in explaining the incorporation of Rastafari/Nyahbinghi-associated sound into Jamaican popular music.',
  null, null, '{"artist_name":"The Folkes Brothers","title":"O’Carolina","release_year":null,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Folkes Brothers O’Carolina"},"credit_components":[{"artist_seed_id":"jamaica_artist_folkes_brothers","role":"primary_artist"},{"artist_seed_id":"jamaica_artist_count_ossie","role":"accompaniment"}],"seed_id":"jamaica_ocarolina","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_forward_march
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'jamaica-forward-march', 'Forward March', 'A topical ska-era recording associated by Smithsonian with the optimism around Jamaican Independence.',
  1962, 1962, '{"artist_name":"Derrick Morgan","title":"Forward March","release_year":1962,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Derrick Morgan Forward March"},"credit_components":[{"artist_seed_id":"jamaica_artist_derrick_morgan","role":"primary_artist"}],"seed_id":"jamaica_forward_march","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_everything_crash
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'jamaica-everything-crash', 'Everything Crash', 'A recording used by Smithsonian to illustrate social tension at the end of the ska/rocksteady era.',
  1968, 1968, '{"artist_name":"The Ethiopians","title":"Everything Crash","release_year":1968,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Ethiopians Everything Crash"},"credit_components":[{"artist_seed_id":"jamaica_artist_ethiopians","role":"primary_artist"}],"seed_id":"jamaica_everything_crash","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_one_drop
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'jamaica-one-drop', 'One Drop', 'A roots-reggae recording cited by Smithsonian when discussing the one-drop rhythmic tradition.',
  null, null, '{"artist_name":"Bob Marley & The Wailers","title":"One Drop","release_year":1979,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Bob Marley & The Wailers One Drop"},"credit_components":[{"artist_seed_id":"jamaica_artist_bob_marley_wailers","role":"primary_artist"}],"seed_id":"jamaica_one_drop","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_reggae_unesco_2018
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'historical_milestone', 'jamaica-reggae-unesco-2018', 'Reggae inscribed by UNESCO', 'UNESCO inscribed Reggae music of Jamaica on the Representative List of the Intangible Cultural Heritage of Humanity in 2018.',
  2018, 2018, '{"seed_id":"jamaica_reggae_unesco_2018","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_nyahbinghi_bass_drum
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'nyahbinghi-bass-drum', 'Nyahbinghi bass drum', 'Smithsonian Folkways describes Nyahbinghi as a three-part Rastafari drum ensemble whose bass drum carries the low heartbeat foundation.',
  1950, null, '{"instrument_family":"drum","sound_role":"low heartbeat foundation in Nyahbinghi ensemble","listen_for":["deep pulse supporting the ensemble"],"audio_policy":"description_only_until_rights_cleared","seed_id":"jamaica_nyahbinghi_bass_drum","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_nyahbinghi_funde
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'nyahbinghi-funde', 'Nyahbinghi funde', 'The funde is one of the three characteristic drums in the Nyahbinghi ensemble documented by Smithsonian Folkways.',
  1950, null, '{"instrument_family":"drum","sound_role":"steady middle-register pulse","listen_for":["repeating pulse between bass and repeater roles"],"audio_policy":"description_only_until_rights_cleared","seed_id":"jamaica_nyahbinghi_funde","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_nyahbinghi_repeater
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'nyahbinghi-repeater', 'Nyahbinghi repeater / kete', 'The repeater is the improvisatory high-register drum in the three-part Nyahbinghi ensemble documented by Smithsonian Folkways.',
  1950, null, '{"instrument_family":"drum","sound_role":"improvised higher-register rhythmic voice","listen_for":["freer improvisatory patterns above the steady pulse"],"audio_policy":"description_only_until_rights_cleared","seed_id":"jamaica_nyahbinghi_repeater","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_studio_one
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'studio_landmark', 'kingston-studio-one', 'Studio One', 'Clement “Coxsone” Dodd established Studio One at 13 Brentford Road in Kingston, a major recording base for ska, rocksteady and reggae.',
  1962, null, '{"landmark_type":"recording_studio","address_text":"13 Studio One Boulevard (formerly Brentford Road), Kingston/St. Andrew, Jamaica","media_policy":"link_only_until_cleared","seed_id":"jamaica_studio_one","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_sound_system_technology
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'educational_topic', 'jamaican-sound-system-technology', 'Sound-system culture as music infrastructure', 'Kingston sound-system operators combined amplification, selectors/DJs, records and dance spaces; the culture also helped push operators such as Clement Dodd into local recording and production.',
  1950, null, '{"topic_type":"performance_and_distribution_infrastructure","listen_for":["bass-forward playback","selector/DJ sequencing","dubplate and special culture"],"media_policy":"link_only_until_cleared","seed_id":"jamaica_sound_system_technology","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_simmer_down
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'jamaica-simmer-down-wailers', 'Simmer Down', 'The Wailers recorded “Simmer Down” at Studio One, an important early recording in Bob Marley and the Wailers’ Kingston story.',
  1963, null, '{"artist_name":"The Wailers","title":"Simmer Down","release_year":1963,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Wailers Simmer Down"},"credit_components":[{"artist_seed_id":"jamaica_artist_wailers_early","role":"primary_artist"}],"seed_id":"jamaica_simmer_down","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_artist_folkes_brothers
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'folkes-brothers', 'The Folkes Brothers', 'External knowledge-graph identity for The Folkes Brothers; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"63e55587-a4c6-4ff8-b7b7-bf0071774b1f","wikidata_qid":"Q2395926","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"jamaica_artist_folkes_brothers","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_artist_count_ossie
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'count-ossie', 'Count Ossie', 'External knowledge-graph identity for Count Ossie; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"217e2df6-61be-4ff5-b62c-4c8642d396c5","wikidata_qid":"Q665714","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"jamaica_artist_count_ossie","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_artist_derrick_morgan
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'derrick-morgan', 'Derrick Morgan', 'External knowledge-graph identity for Derrick Morgan; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"2f2c85b9-135d-4830-a925-ee7548332f70","wikidata_qid":"Q1936730","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"jamaica_artist_derrick_morgan","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_artist_ethiopians
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'the-ethiopians-jamaica', 'The Ethiopians', 'External knowledge-graph identity for The Ethiopians; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"1646c8fd-d950-4978-b944-0c7597a7837a","wikidata_qid":"Q629184","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"jamaica_artist_ethiopians","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_artist_bob_marley_wailers
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'bob-marley-the-wailers', 'Bob Marley & The Wailers', 'External knowledge-graph identity for Bob Marley & The Wailers; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"c296e10c-110a-4103-9e77-47bfebb7fb2e","wikidata_qid":"Q2525354","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"jamaica_artist_bob_marley_wailers","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY jamaica_artist_wailers_early
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'the-wailers-early-jamaica', 'The Wailers', 'External knowledge-graph identity for The Wailers; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"c9e99d40-4a2c-4ca7-ac5b-e842264ee271","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"jamaica_artist_wailers_early","pilot_key":"kingston","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- CLAIM seed:kingston:overview:musical_identity
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'place',
    subject_id = (select id::text from _world_kingston_place),
    predicate = 'musical_identity',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Kingston’s pilot history follows the sound-system ecosystem and the evolution from ska through rocksteady into reggae, while treating Rastafari and Nyahbinghi influence as living cultural context rather than decorative genre trivia."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"place_path":"jm/kingston","seed_claim_key":"seed:kingston:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:overview:musical_identity'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'place', (select id::text from _world_kingston_place), 'musical_identity',
  null, null, '{"text":"Kingston’s pilot history follows the sound-system ecosystem and the evolution from ska through rocksteady into reggae, while treating Rastafari and Nyahbinghi influence as living cultural context rather than decorative genre trivia."}'::jsonb,
  null, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"place_path":"jm/kingston","seed_claim_key":"seed:kingston:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:overview:musical_identity');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae', 'unesco_reggae_jamaica')
where c.metadata->>'seed_claim_key' = 'seed:kingston:overview:musical_identity'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_sound_system_culture:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-sound-system-culture'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Urban sound-system dances provided an important platform for Jamaican popular music and the transition among ska, rocksteady, and reggae."}'::jsonb,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"jamaica_sound_system_culture","entity_slug":"jamaica-sound-system-culture","seed_claim_key":"seed:kingston:entity:jamaica_sound_system_culture:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_culture:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-sound-system-culture'), 'summary',
  null, null, '{"text":"Urban sound-system dances provided an important platform for Jamaican popular music and the transition among ska, rocksteady, and reggae."}'::jsonb,
  1950, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_sound_system_culture","entity_slug":"jamaica-sound-system-culture","seed_claim_key":"seed:kingston:entity:jamaica_sound_system_culture:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_culture:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_culture:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_sound_system_culture:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-sound-system-culture'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"jamaica_sound_system_culture","entity_slug":"jamaica-sound-system-culture","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_sound_system_culture:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_culture:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-sound-system-culture'), 'developed_in',
  'place', (select id::text from _world_kingston_place), null,
  1950, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_sound_system_culture","entity_slug":"jamaica-sound-system-culture","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_sound_system_culture:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_culture:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_culture:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_sound_system_culture
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1950, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_sound_system_culture:place:developed_in'
where ce.slug='jamaica-sound-system-culture'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1950,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_ska:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-ska'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A Jamaican popular style that emerged before rocksteady and reggae and became part of the island’s postwar/independence-era musical transformation."}'::jsonb,
    temporal_start_year = 1950,
    temporal_end_year = 1966,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"jamaica_ska","entity_slug":"jamaica-ska","seed_claim_key":"seed:kingston:entity:jamaica_ska:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-ska'), 'summary',
  null, null, '{"text":"A Jamaican popular style that emerged before rocksteady and reggae and became part of the island’s postwar/independence-era musical transformation."}'::jsonb,
  1950, 1966, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_ska","entity_slug":"jamaica-ska","seed_claim_key":"seed:kingston:entity:jamaica_ska:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_ska:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-ska'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1950,
    temporal_end_year = 1966,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"jamaica_ska","entity_slug":"jamaica-ska","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_ska:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-ska'), 'developed_in',
  'place', (select id::text from _world_kingston_place), null,
  1950, 1966, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_ska","entity_slug":"jamaica-ska","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_ska:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_ska
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1950, 1966, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_ska:place:developed_in'
where ce.slug='jamaica-ska'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1950,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_ska_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-ska-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening guide to traits described in Smithsonian’s overview of the ska-to-reggae continuum."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"jamaica_ska_sound_signature","entity_slug":"jamaica-ska-sound-signature","seed_claim_key":"seed:kingston:entity:jamaica_ska_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-ska-sound-signature'), 'summary',
  null, null, '{"text":"A listening guide to traits described in Smithsonian’s overview of the ska-to-reggae continuum."}'::jsonb,
  null, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_ska_sound_signature","entity_slug":"jamaica-ska-sound-signature","seed_claim_key":"seed:kingston:entity:jamaica_ska_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_ska_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-ska-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"jamaica_ska_sound_signature","entity_slug":"jamaica-ska-sound-signature","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_ska_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-ska-sound-signature'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_ska_sound_signature","entity_slug":"jamaica-ska-sound-signature","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_ska_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ska_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_ska_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_ska_sound_signature:place:associated_with'
where ce.slug='jamaica-ska-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_rocksteady:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A slower Jamaican style that emerged around 1966, shifting emphasis toward drums, bass, guitar interplay, vocals, and social commentary."}'::jsonb,
    temporal_start_year = 1966,
    temporal_end_year = 1968,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"jamaica_rocksteady","entity_slug":"jamaica-rocksteady","seed_claim_key":"seed:kingston:entity:jamaica_rocksteady:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'), 'summary',
  null, null, '{"text":"A slower Jamaican style that emerged around 1966, shifting emphasis toward drums, bass, guitar interplay, vocals, and social commentary."}'::jsonb,
  1966, 1968, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_rocksteady","entity_slug":"jamaica-rocksteady","seed_claim_key":"seed:kingston:entity:jamaica_rocksteady:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_rocksteady:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1966,
    temporal_end_year = 1968,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"jamaica_rocksteady","entity_slug":"jamaica-rocksteady","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_rocksteady:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'), 'developed_in',
  'place', (select id::text from _world_kingston_place), null,
  1966, 1968, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_rocksteady","entity_slug":"jamaica-rocksteady","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_rocksteady:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_rocksteady
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1966, 1968, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_rocksteady:place:developed_in'
where ce.slug='jamaica-rocksteady'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1966,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_rocksteady_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening guide to the slower groove and instrumental balance described by Smithsonian Folklife."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"jamaica_rocksteady_sound_signature","entity_slug":"jamaica-rocksteady-sound-signature","seed_claim_key":"seed:kingston:entity:jamaica_rocksteady_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady-sound-signature'), 'summary',
  null, null, '{"text":"A listening guide to the slower groove and instrumental balance described by Smithsonian Folklife."}'::jsonb,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_rocksteady_sound_signature","entity_slug":"jamaica-rocksteady-sound-signature","seed_claim_key":"seed:kingston:entity:jamaica_rocksteady_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_rocksteady_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"jamaica_rocksteady_sound_signature","entity_slug":"jamaica-rocksteady-sound-signature","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_rocksteady_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady-sound-signature'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_rocksteady_sound_signature","entity_slug":"jamaica-rocksteady-sound-signature","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_rocksteady_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_rocksteady_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_rocksteady_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_rocksteady_sound_signature:place:associated_with'
where ce.slug='jamaica-rocksteady-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_reggae:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-reggae'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A Jamaican music tradition that emerged in the late 1960s and drew on earlier Jamaican forms, Caribbean and international influences, and Rastafari-linked cultural expression."}'::jsonb,
    temporal_start_year = 1968,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_reggae","entity_slug":"jamaica-reggae","seed_claim_key":"seed:kingston:entity:jamaica_reggae:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-reggae'), 'summary',
  null, null, '{"text":"A Jamaican music tradition that emerged in the late 1960s and drew on earlier Jamaican forms, Caribbean and international influences, and Rastafari-linked cultural expression."}'::jsonb,
  1968, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_reggae","entity_slug":"jamaica-reggae","seed_claim_key":"seed:kingston:entity:jamaica_reggae:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae', 'unesco_reggae_jamaica')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_reggae:place:originated_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-reggae'),
    predicate = 'originated_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1968,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_reggae","entity_slug":"jamaica-reggae","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_reggae:place:originated_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae:place:originated_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-reggae'), 'originated_in',
  'place', (select id::text from _world_kingston_place), null,
  1968, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_reggae","entity_slug":"jamaica-reggae","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_reggae:place:originated_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae:place:originated_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae', 'unesco_reggae_jamaica')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae:place:originated_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_reggae
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1968, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='originated_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_reggae:place:originated_in'
where ce.slug='jamaica-reggae'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1968,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_nyahbinghi:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Rastafari-linked Nyahbinghi drumming is an important influence in roots reggae history."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"jamaica_nyahbinghi","entity_slug":"jamaica-nyahbinghi","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'), 'summary',
  null, null, '{"text":"Rastafari-linked Nyahbinghi drumming is an important influence in roots reggae history."}'::jsonb,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_nyahbinghi","entity_slug":"jamaica-nyahbinghi","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_jis_roots_reggae', 'smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_nyahbinghi:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"jamaica_nyahbinghi","entity_slug":"jamaica-nyahbinghi","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_nyahbinghi","entity_slug":"jamaica-nyahbinghi","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_jis_roots_reggae', 'smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_nyahbinghi
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_nyahbinghi:place:associated_with'
where ce.slug='jamaica-nyahbinghi'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_reggae_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-reggae-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening guide to rhythmic traits and influences described by Smithsonian Folklife."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"jamaica_reggae_sound_signature","entity_slug":"jamaica-reggae-sound-signature","seed_claim_key":"seed:kingston:entity:jamaica_reggae_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-reggae-sound-signature'), 'summary',
  null, null, '{"text":"A listening guide to rhythmic traits and influences described by Smithsonian Folklife."}'::jsonb,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_reggae_sound_signature","entity_slug":"jamaica-reggae-sound-signature","seed_claim_key":"seed:kingston:entity:jamaica_reggae_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_reggae_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-reggae-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"jamaica_reggae_sound_signature","entity_slug":"jamaica-reggae-sound-signature","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_reggae_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-reggae-sound-signature'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_reggae_sound_signature","entity_slug":"jamaica-reggae-sound-signature","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_reggae_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_reggae_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_reggae_sound_signature:place:associated_with'
where ce.slug='jamaica-reggae-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_ocarolina:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-ocarolina'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A recording cited by Smithsonian in explaining the incorporation of Rastafari/Nyahbinghi-associated sound into Jamaican popular music."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"jamaica_ocarolina","entity_slug":"jamaica-ocarolina","seed_claim_key":"seed:kingston:entity:jamaica_ocarolina:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ocarolina:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-ocarolina'), 'summary',
  null, null, '{"text":"A recording cited by Smithsonian in explaining the incorporation of Rastafari/Nyahbinghi-associated sound into Jamaican popular music."}'::jsonb,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_ocarolina","entity_slug":"jamaica-ocarolina","seed_claim_key":"seed:kingston:entity:jamaica_ocarolina:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ocarolina:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_jis_roots_reggae', 'musicbrainz_artist_identity', 'smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ocarolina:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_ocarolina:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-ocarolina'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"jamaica_ocarolina","entity_slug":"jamaica-ocarolina","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_ocarolina:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ocarolina:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-ocarolina'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_ocarolina","entity_slug":"jamaica-ocarolina","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_ocarolina:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ocarolina:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_jis_roots_reggae', 'musicbrainz_artist_identity', 'smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_ocarolina:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_ocarolina
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_ocarolina:place:associated_with'
where ce.slug='jamaica-ocarolina'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_forward_march:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-forward-march'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A topical ska-era recording associated by Smithsonian with the optimism around Jamaican Independence."}'::jsonb,
    temporal_start_year = 1962,
    temporal_end_year = 1962,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"jamaica_forward_march","entity_slug":"jamaica-forward-march","seed_claim_key":"seed:kingston:entity:jamaica_forward_march:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_forward_march:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-forward-march'), 'summary',
  null, null, '{"text":"A topical ska-era recording associated by Smithsonian with the optimism around Jamaican Independence."}'::jsonb,
  1962, 1962, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_forward_march","entity_slug":"jamaica-forward-march","seed_claim_key":"seed:kingston:entity:jamaica_forward_march:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_forward_march:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_forward_march:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_forward_march:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-forward-march'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1962,
    temporal_end_year = 1962,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"jamaica_forward_march","entity_slug":"jamaica-forward-march","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_forward_march:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_forward_march:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-forward-march'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  1962, 1962, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_forward_march","entity_slug":"jamaica-forward-march","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_forward_march:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_forward_march:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_forward_march:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_forward_march
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1962, 1962, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_forward_march:place:associated_with'
where ce.slug='jamaica-forward-march'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1962,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_everything_crash:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-everything-crash'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A recording used by Smithsonian to illustrate social tension at the end of the ska/rocksteady era."}'::jsonb,
    temporal_start_year = 1968,
    temporal_end_year = 1968,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"jamaica_everything_crash","entity_slug":"jamaica-everything-crash","seed_claim_key":"seed:kingston:entity:jamaica_everything_crash:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_everything_crash:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-everything-crash'), 'summary',
  null, null, '{"text":"A recording used by Smithsonian to illustrate social tension at the end of the ska/rocksteady era."}'::jsonb,
  1968, 1968, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_everything_crash","entity_slug":"jamaica-everything-crash","seed_claim_key":"seed:kingston:entity:jamaica_everything_crash:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_everything_crash:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_everything_crash:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_everything_crash:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-everything-crash'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1968,
    temporal_end_year = 1968,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"jamaica_everything_crash","entity_slug":"jamaica-everything-crash","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_everything_crash:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_everything_crash:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-everything-crash'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  1968, 1968, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_everything_crash","entity_slug":"jamaica-everything-crash","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_everything_crash:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_everything_crash:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_everything_crash:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_everything_crash
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1968, 1968, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_everything_crash:place:associated_with'
where ce.slug='jamaica-everything-crash'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1968,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_one_drop:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-one-drop'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A roots-reggae recording cited by Smithsonian when discussing the one-drop rhythmic tradition."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"jamaica_one_drop","entity_slug":"jamaica-one-drop","seed_claim_key":"seed:kingston:entity:jamaica_one_drop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_one_drop:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-one-drop'), 'summary',
  null, null, '{"text":"A roots-reggae recording cited by Smithsonian when discussing the one-drop rhythmic tradition."}'::jsonb,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_one_drop","entity_slug":"jamaica-one-drop","seed_claim_key":"seed:kingston:entity:jamaica_one_drop:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_one_drop:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_recording_identity', 'smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_one_drop:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_one_drop:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-one-drop'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"jamaica_one_drop","entity_slug":"jamaica-one-drop","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_one_drop:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_one_drop:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-one-drop'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_one_drop","entity_slug":"jamaica-one-drop","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_one_drop:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_one_drop:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_recording_identity', 'smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_one_drop:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_one_drop
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_one_drop:place:associated_with'
where ce.slug='jamaica-one-drop'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_reggae_unesco_2018:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-reggae-unesco-2018'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"UNESCO inscribed Reggae music of Jamaica on the Representative List of the Intangible Cultural Heritage of Humanity in 2018."}'::jsonb,
    temporal_start_year = 2018,
    temporal_end_year = 2018,
    confidence = 0.990,
    metadata = metadata || '{"seed_id":"jamaica_reggae_unesco_2018","entity_slug":"jamaica-reggae-unesco-2018","seed_claim_key":"seed:kingston:entity:jamaica_reggae_unesco_2018:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_unesco_2018:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-reggae-unesco-2018'), 'summary',
  null, null, '{"text":"UNESCO inscribed Reggae music of Jamaica on the Representative List of the Intangible Cultural Heritage of Humanity in 2018."}'::jsonb,
  2018, 2018, 0.990, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_reggae_unesco_2018","entity_slug":"jamaica-reggae-unesco-2018","seed_claim_key":"seed:kingston:entity:jamaica_reggae_unesco_2018:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_unesco_2018:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('unesco_reggae_jamaica')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_unesco_2018:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_reggae_unesco_2018:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-reggae-unesco-2018'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 2018,
    temporal_end_year = 2018,
    confidence = 0.990,
    metadata = metadata || '{"seed_id":"jamaica_reggae_unesco_2018","entity_slug":"jamaica-reggae-unesco-2018","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_reggae_unesco_2018:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_unesco_2018:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-reggae-unesco-2018'), 'historically_significant_in',
  'place', (select id::text from _world_kingston_place), null,
  2018, 2018, 0.990, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_reggae_unesco_2018","entity_slug":"jamaica-reggae-unesco-2018","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_reggae_unesco_2018:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_unesco_2018:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('unesco_reggae_jamaica')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_reggae_unesco_2018:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_reggae_unesco_2018
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2018, 2018, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_reggae_unesco_2018:place:historically_significant_in'
where ce.slug='jamaica-reggae-unesco-2018'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2018,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_nyahbinghi_bass_drum:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='nyahbinghi-bass-drum'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Smithsonian Folkways describes Nyahbinghi as a three-part Rastafari drum ensemble whose bass drum carries the low heartbeat foundation."}'::jsonb,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"jamaica_nyahbinghi_bass_drum","entity_slug":"nyahbinghi-bass-drum","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_bass_drum:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_bass_drum:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='nyahbinghi-bass-drum'), 'summary',
  null, null, '{"text":"Smithsonian Folkways describes Nyahbinghi as a three-part Rastafari drum ensemble whose bass drum carries the low heartbeat foundation."}'::jsonb,
  1950, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_nyahbinghi_bass_drum","entity_slug":"nyahbinghi-bass-drum","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_bass_drum:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_bass_drum:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_nyahbinghi')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_bass_drum:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_nyahbinghi_bass_drum:place:practiced_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='nyahbinghi-bass-drum'),
    predicate = 'practiced_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"jamaica_nyahbinghi_bass_drum","entity_slug":"nyahbinghi-bass-drum","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_bass_drum:place:practiced_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_bass_drum:place:practiced_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='nyahbinghi-bass-drum'), 'practiced_in',
  'place', (select id::text from _world_kingston_place), null,
  1950, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_nyahbinghi_bass_drum","entity_slug":"nyahbinghi-bass-drum","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_bass_drum:place:practiced_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_bass_drum:place:practiced_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_nyahbinghi')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_bass_drum:place:practiced_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_nyahbinghi_bass_drum
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1950, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='practiced_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_nyahbinghi_bass_drum:place:practiced_in'
where ce.slug='nyahbinghi-bass-drum'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1950,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_nyahbinghi_funde:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='nyahbinghi-funde'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The funde is one of the three characteristic drums in the Nyahbinghi ensemble documented by Smithsonian Folkways."}'::jsonb,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"jamaica_nyahbinghi_funde","entity_slug":"nyahbinghi-funde","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_funde:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_funde:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='nyahbinghi-funde'), 'summary',
  null, null, '{"text":"The funde is one of the three characteristic drums in the Nyahbinghi ensemble documented by Smithsonian Folkways."}'::jsonb,
  1950, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_nyahbinghi_funde","entity_slug":"nyahbinghi-funde","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_funde:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_funde:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_nyahbinghi')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_funde:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_nyahbinghi_funde:place:practiced_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='nyahbinghi-funde'),
    predicate = 'practiced_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"jamaica_nyahbinghi_funde","entity_slug":"nyahbinghi-funde","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_funde:place:practiced_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_funde:place:practiced_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='nyahbinghi-funde'), 'practiced_in',
  'place', (select id::text from _world_kingston_place), null,
  1950, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_nyahbinghi_funde","entity_slug":"nyahbinghi-funde","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_funde:place:practiced_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_funde:place:practiced_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_nyahbinghi')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_funde:place:practiced_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_nyahbinghi_funde
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1950, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='practiced_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_nyahbinghi_funde:place:practiced_in'
where ce.slug='nyahbinghi-funde'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1950,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_nyahbinghi_repeater:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='nyahbinghi-repeater'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The repeater is the improvisatory high-register drum in the three-part Nyahbinghi ensemble documented by Smithsonian Folkways."}'::jsonb,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"jamaica_nyahbinghi_repeater","entity_slug":"nyahbinghi-repeater","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_repeater:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_repeater:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='nyahbinghi-repeater'), 'summary',
  null, null, '{"text":"The repeater is the improvisatory high-register drum in the three-part Nyahbinghi ensemble documented by Smithsonian Folkways."}'::jsonb,
  1950, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_nyahbinghi_repeater","entity_slug":"nyahbinghi-repeater","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_repeater:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_repeater:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_nyahbinghi')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_repeater:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_nyahbinghi_repeater:place:practiced_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='nyahbinghi-repeater'),
    predicate = 'practiced_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"jamaica_nyahbinghi_repeater","entity_slug":"nyahbinghi-repeater","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_repeater:place:practiced_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_repeater:place:practiced_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='nyahbinghi-repeater'), 'practiced_in',
  'place', (select id::text from _world_kingston_place), null,
  1950, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_nyahbinghi_repeater","entity_slug":"nyahbinghi-repeater","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_nyahbinghi_repeater:place:practiced_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_repeater:place:practiced_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_nyahbinghi')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_nyahbinghi_repeater:place:practiced_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_nyahbinghi_repeater
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1950, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='practiced_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_nyahbinghi_repeater:place:practiced_in'
where ce.slug='nyahbinghi-repeater'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1950,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_studio_one:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='kingston-studio-one'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Clement “Coxsone” Dodd established Studio One at 13 Brentford Road in Kingston, a major recording base for ska, rocksteady and reggae."}'::jsonb,
    temporal_start_year = 1962,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"jamaica_studio_one","entity_slug":"kingston-studio-one","seed_claim_key":"seed:kingston:entity:jamaica_studio_one:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_studio_one:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='kingston-studio-one'), 'summary',
  null, null, '{"text":"Clement “Coxsone” Dodd established Studio One at 13 Brentford Road in Kingston, a major recording base for ska, rocksteady and reggae."}'::jsonb,
  1962, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_studio_one","entity_slug":"kingston-studio-one","seed_claim_key":"seed:kingston:entity:jamaica_studio_one:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_studio_one:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_gleaner_sound_system', 'jamaica_gleaner_studio_one', 'studio_one_official')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_studio_one:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_studio_one:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='kingston-studio-one'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1962,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"seed_id":"jamaica_studio_one","entity_slug":"kingston-studio-one","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_studio_one:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_studio_one:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='kingston-studio-one'), 'historically_significant_in',
  'place', (select id::text from _world_kingston_place), null,
  1962, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_studio_one","entity_slug":"kingston-studio-one","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_studio_one:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_studio_one:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_gleaner_sound_system', 'jamaica_gleaner_studio_one', 'studio_one_official')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_studio_one:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_studio_one
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1962, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_studio_one:place:historically_significant_in'
where ce.slug='kingston-studio-one'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1962,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_sound_system_technology:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaican-sound-system-technology'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Kingston sound-system operators combined amplification, selectors/DJs, records and dance spaces; the culture also helped push operators such as Clement Dodd into local recording and production."}'::jsonb,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"jamaica_sound_system_technology","entity_slug":"jamaican-sound-system-technology","seed_claim_key":"seed:kingston:entity:jamaica_sound_system_technology:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_technology:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaican-sound-system-technology'), 'summary',
  null, null, '{"text":"Kingston sound-system operators combined amplification, selectors/DJs, records and dance spaces; the culture also helped push operators such as Clement Dodd into local recording and production."}'::jsonb,
  1950, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_sound_system_technology","entity_slug":"jamaican-sound-system-technology","seed_claim_key":"seed:kingston:entity:jamaica_sound_system_technology:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_technology:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_gleaner_sound_system')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_technology:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_sound_system_technology:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaican-sound-system-technology'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1950,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"jamaica_sound_system_technology","entity_slug":"jamaican-sound-system-technology","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_sound_system_technology:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_technology:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaican-sound-system-technology'), 'developed_in',
  'place', (select id::text from _world_kingston_place), null,
  1950, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_sound_system_technology","entity_slug":"jamaican-sound-system-technology","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_sound_system_technology:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_technology:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_gleaner_sound_system')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_sound_system_technology:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_sound_system_technology
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1950, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_sound_system_technology:place:developed_in'
where ce.slug='jamaican-sound-system-technology'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1950,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_simmer_down:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-simmer-down-wailers'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The Wailers recorded “Simmer Down” at Studio One, an important early recording in Bob Marley and the Wailers’ Kingston story."}'::jsonb,
    temporal_start_year = 1963,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"jamaica_simmer_down","entity_slug":"jamaica-simmer-down-wailers","seed_claim_key":"seed:kingston:entity:jamaica_simmer_down:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_simmer_down:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-simmer-down-wailers'), 'summary',
  null, null, '{"text":"The Wailers recorded “Simmer Down” at Studio One, an important early recording in Bob Marley and the Wailers’ Kingston story."}'::jsonb,
  1963, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_simmer_down","entity_slug":"jamaica-simmer-down-wailers","seed_claim_key":"seed:kingston:entity:jamaica_simmer_down:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_simmer_down:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_gleaner_studio_one', 'studio_one_official')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_simmer_down:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_simmer_down:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-simmer-down-wailers'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = 1963,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"jamaica_simmer_down","entity_slug":"jamaica-simmer-down-wailers","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_simmer_down:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_simmer_down:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-simmer-down-wailers'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  1963, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_simmer_down","entity_slug":"jamaica-simmer-down-wailers","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_simmer_down:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_simmer_down:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_gleaner_studio_one', 'studio_one_official')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_simmer_down:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_simmer_down
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1963, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_simmer_down:place:associated_with'
where ce.slug='jamaica-simmer-down-wailers'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1963,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_artist_folkes_brothers:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='folkes-brothers'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for The Folkes Brothers; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_folkes_brothers","entity_slug":"folkes-brothers","seed_claim_key":"seed:kingston:entity:jamaica_artist_folkes_brothers:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_folkes_brothers:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='folkes-brothers'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for The Folkes Brothers; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_folkes_brothers","entity_slug":"folkes-brothers","seed_claim_key":"seed:kingston:entity:jamaica_artist_folkes_brothers:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_folkes_brothers:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_folkes_brothers:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_artist_folkes_brothers:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='folkes-brothers'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_folkes_brothers","entity_slug":"folkes-brothers","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_folkes_brothers:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_folkes_brothers:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='folkes-brothers'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_folkes_brothers","entity_slug":"folkes-brothers","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_folkes_brothers:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_folkes_brothers:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_folkes_brothers:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_artist_folkes_brothers
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_artist_folkes_brothers:place:associated_with'
where ce.slug='folkes-brothers'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_artist_count_ossie:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='count-ossie'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Count Ossie; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_count_ossie","entity_slug":"count-ossie","seed_claim_key":"seed:kingston:entity:jamaica_artist_count_ossie:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_count_ossie:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='count-ossie'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Count Ossie; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_count_ossie","entity_slug":"count-ossie","seed_claim_key":"seed:kingston:entity:jamaica_artist_count_ossie:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_count_ossie:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_count_ossie:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_artist_count_ossie:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='count-ossie'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_count_ossie","entity_slug":"count-ossie","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_count_ossie:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_count_ossie:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='count-ossie'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_count_ossie","entity_slug":"count-ossie","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_count_ossie:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_count_ossie:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_count_ossie:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_artist_count_ossie
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_artist_count_ossie:place:associated_with'
where ce.slug='count-ossie'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_artist_derrick_morgan:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='derrick-morgan'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Derrick Morgan; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_derrick_morgan","entity_slug":"derrick-morgan","seed_claim_key":"seed:kingston:entity:jamaica_artist_derrick_morgan:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_derrick_morgan:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='derrick-morgan'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Derrick Morgan; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_derrick_morgan","entity_slug":"derrick-morgan","seed_claim_key":"seed:kingston:entity:jamaica_artist_derrick_morgan:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_derrick_morgan:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_derrick_morgan:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_artist_derrick_morgan:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='derrick-morgan'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_derrick_morgan","entity_slug":"derrick-morgan","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_derrick_morgan:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_derrick_morgan:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='derrick-morgan'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_derrick_morgan","entity_slug":"derrick-morgan","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_derrick_morgan:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_derrick_morgan:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_derrick_morgan:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_artist_derrick_morgan
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_artist_derrick_morgan:place:associated_with'
where ce.slug='derrick-morgan'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_artist_ethiopians:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='the-ethiopians-jamaica'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for The Ethiopians; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_ethiopians","entity_slug":"the-ethiopians-jamaica","seed_claim_key":"seed:kingston:entity:jamaica_artist_ethiopians:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_ethiopians:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-ethiopians-jamaica'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for The Ethiopians; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_ethiopians","entity_slug":"the-ethiopians-jamaica","seed_claim_key":"seed:kingston:entity:jamaica_artist_ethiopians:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_ethiopians:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_ethiopians:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_artist_ethiopians:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='the-ethiopians-jamaica'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_ethiopians","entity_slug":"the-ethiopians-jamaica","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_ethiopians:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_ethiopians:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-ethiopians-jamaica'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_ethiopians","entity_slug":"the-ethiopians-jamaica","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_ethiopians:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_ethiopians:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_ethiopians:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_artist_ethiopians
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_artist_ethiopians:place:associated_with'
where ce.slug='the-ethiopians-jamaica'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_artist_bob_marley_wailers:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='bob-marley-the-wailers'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Bob Marley & The Wailers; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_bob_marley_wailers","entity_slug":"bob-marley-the-wailers","seed_claim_key":"seed:kingston:entity:jamaica_artist_bob_marley_wailers:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_bob_marley_wailers:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='bob-marley-the-wailers'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Bob Marley & The Wailers; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_bob_marley_wailers","entity_slug":"bob-marley-the-wailers","seed_claim_key":"seed:kingston:entity:jamaica_artist_bob_marley_wailers:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_bob_marley_wailers:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_bob_marley_wailers:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_artist_bob_marley_wailers:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='bob-marley-the-wailers'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_bob_marley_wailers","entity_slug":"bob-marley-the-wailers","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_bob_marley_wailers:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_bob_marley_wailers:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='bob-marley-the-wailers'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_bob_marley_wailers","entity_slug":"bob-marley-the-wailers","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_bob_marley_wailers:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_bob_marley_wailers:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_bob_marley_wailers:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_artist_bob_marley_wailers
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_artist_bob_marley_wailers:place:associated_with'
where ce.slug='bob-marley-the-wailers'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:entity:jamaica_artist_wailers_early:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='the-wailers-early-jamaica'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for The Wailers; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_wailers_early","entity_slug":"the-wailers-early-jamaica","seed_claim_key":"seed:kingston:entity:jamaica_artist_wailers_early:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_wailers_early:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-wailers-early-jamaica'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for The Wailers; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_wailers_early","entity_slug":"the-wailers-early-jamaica","seed_claim_key":"seed:kingston:entity:jamaica_artist_wailers_early:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_wailers_early:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'studio_one_official')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_wailers_early:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:kingston:entity:jamaica_artist_wailers_early:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='the-wailers-early-jamaica'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_kingston_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"jamaica_artist_wailers_early","entity_slug":"the-wailers-early-jamaica","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_wailers_early:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_wailers_early:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-wailers-early-jamaica'), 'associated_with',
  'place', (select id::text from _world_kingston_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"jamaica_artist_wailers_early","entity_slug":"the-wailers-early-jamaica","place_path":"jm/kingston","seed_claim_key":"seed:kingston:entity:jamaica_artist_wailers_early:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_wailers_early:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'studio_one_official')
where c.metadata->>'seed_claim_key' = 'seed:kingston:entity:jamaica_artist_wailers_early:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE jamaica_artist_wailers_early
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_kingston_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:entity:jamaica_artist_wailers_early:place:associated_with'
where ce.slug='the-wailers-early-jamaica'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:kingston:graph:1:jamaica_rocksteady:evolved_from:jamaica_ska
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'),
    predicate = 'evolved_from',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='jamaica-ska'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"subject_seed_id":"jamaica_rocksteady","object_seed_id":"jamaica_ska","seed_claim_key":"seed:kingston:graph:1:jamaica_rocksteady:evolved_from:jamaica_ska","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:1:jamaica_rocksteady:evolved_from:jamaica_ska'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'), 'evolved_from',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-ska'), null,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_rocksteady","object_seed_id":"jamaica_ska","seed_claim_key":"seed:kingston:graph:1:jamaica_rocksteady:evolved_from:jamaica_ska","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:1:jamaica_rocksteady:evolved_from:jamaica_ska');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_jis_rocksteady', 'smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:1:jamaica_rocksteady:evolved_from:jamaica_ska'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 1 jamaica_rocksteady evolved_from jamaica_ska
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:1:jamaica_rocksteady:evolved_from:jamaica_ska","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='jamaica-ska'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='evolved_from'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:1:jamaica_rocksteady:evolved_from:jamaica_ska'
where s.slug='jamaica-rocksteady'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:2:jamaica_reggae:evolved_from:jamaica_rocksteady
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-reggae'),
    predicate = 'evolved_from',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"subject_seed_id":"jamaica_reggae","object_seed_id":"jamaica_rocksteady","seed_claim_key":"seed:kingston:graph:2:jamaica_reggae:evolved_from:jamaica_rocksteady","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:2:jamaica_reggae:evolved_from:jamaica_rocksteady'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-reggae'), 'evolved_from',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'), null,
  null, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_reggae","object_seed_id":"jamaica_rocksteady","seed_claim_key":"seed:kingston:graph:2:jamaica_reggae:evolved_from:jamaica_rocksteady","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:2:jamaica_reggae:evolved_from:jamaica_rocksteady');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_jis_rocksteady', 'jamaica_jis_roots_reggae', 'smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:2:jamaica_reggae:evolved_from:jamaica_rocksteady'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 2 jamaica_reggae evolved_from jamaica_rocksteady
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:2:jamaica_reggae:evolved_from:jamaica_rocksteady","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='jamaica-rocksteady'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='evolved_from'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:2:jamaica_reggae:evolved_from:jamaica_rocksteady'
where s.slug='jamaica-reggae'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:3:jamaica_reggae:influenced_by:jamaica_nyahbinghi
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-reggae'),
    predicate = 'influenced_by',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"subject_seed_id":"jamaica_reggae","object_seed_id":"jamaica_nyahbinghi","seed_claim_key":"seed:kingston:graph:3:jamaica_reggae:influenced_by:jamaica_nyahbinghi","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:3:jamaica_reggae:influenced_by:jamaica_nyahbinghi'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-reggae'), 'influenced_by',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_reggae","object_seed_id":"jamaica_nyahbinghi","seed_claim_key":"seed:kingston:graph:3:jamaica_reggae:influenced_by:jamaica_nyahbinghi","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:3:jamaica_reggae:influenced_by:jamaica_nyahbinghi');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_jis_roots_reggae', 'smithsonian_roots_reggae')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:3:jamaica_reggae:influenced_by:jamaica_nyahbinghi'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 3 jamaica_reggae influenced_by jamaica_nyahbinghi
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:3:jamaica_reggae:influenced_by:jamaica_nyahbinghi","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='jamaica-nyahbinghi'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='influenced_by'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:3:jamaica_reggae:influenced_by:jamaica_nyahbinghi'
where s.slug='jamaica-reggae'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:4:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_bass_drum
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='nyahbinghi-bass-drum'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"subject_seed_id":"jamaica_nyahbinghi","object_seed_id":"jamaica_nyahbinghi_bass_drum","seed_claim_key":"seed:kingston:graph:4:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_bass_drum","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:4:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_bass_drum'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='nyahbinghi-bass-drum'), null,
  null, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_nyahbinghi","object_seed_id":"jamaica_nyahbinghi_bass_drum","seed_claim_key":"seed:kingston:graph:4:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_bass_drum","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:4:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_bass_drum');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_nyahbinghi')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:4:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_bass_drum'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 4 jamaica_nyahbinghi uses_instrument jamaica_nyahbinghi_bass_drum
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:4:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_bass_drum","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='nyahbinghi-bass-drum'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:4:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_bass_drum'
where s.slug='jamaica-nyahbinghi'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:5:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_funde
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='nyahbinghi-funde'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"subject_seed_id":"jamaica_nyahbinghi","object_seed_id":"jamaica_nyahbinghi_funde","seed_claim_key":"seed:kingston:graph:5:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_funde","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:5:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_funde'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='nyahbinghi-funde'), null,
  null, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_nyahbinghi","object_seed_id":"jamaica_nyahbinghi_funde","seed_claim_key":"seed:kingston:graph:5:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_funde","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:5:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_funde');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_nyahbinghi')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:5:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_funde'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 5 jamaica_nyahbinghi uses_instrument jamaica_nyahbinghi_funde
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:5:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_funde","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='nyahbinghi-funde'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:5:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_funde'
where s.slug='jamaica-nyahbinghi'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:6:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_repeater
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='nyahbinghi-repeater'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"jamaica_nyahbinghi","object_seed_id":"jamaica_nyahbinghi_repeater","seed_claim_key":"seed:kingston:graph:6:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_repeater","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:6:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_repeater'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-nyahbinghi'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='nyahbinghi-repeater'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_nyahbinghi","object_seed_id":"jamaica_nyahbinghi_repeater","seed_claim_key":"seed:kingston:graph:6:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_repeater","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:6:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_repeater');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('smithsonian_nyahbinghi')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:6:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_repeater'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 6 jamaica_nyahbinghi uses_instrument jamaica_nyahbinghi_repeater
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:6:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_repeater","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='nyahbinghi-repeater'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:6:jamaica_nyahbinghi:uses_instrument:jamaica_nyahbinghi_repeater'
where s.slug='jamaica-nyahbinghi'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:7:jamaica_sound_system_culture:related_to:jamaica_sound_system_technology
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-sound-system-culture'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='jamaican-sound-system-technology'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"subject_seed_id":"jamaica_sound_system_culture","object_seed_id":"jamaica_sound_system_technology","seed_claim_key":"seed:kingston:graph:7:jamaica_sound_system_culture:related_to:jamaica_sound_system_technology","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:7:jamaica_sound_system_culture:related_to:jamaica_sound_system_technology'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-sound-system-culture'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaican-sound-system-technology'), null,
  null, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_sound_system_culture","object_seed_id":"jamaica_sound_system_technology","seed_claim_key":"seed:kingston:graph:7:jamaica_sound_system_culture:related_to:jamaica_sound_system_technology","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:7:jamaica_sound_system_culture:related_to:jamaica_sound_system_technology');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_gleaner_sound_system')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:7:jamaica_sound_system_culture:related_to:jamaica_sound_system_technology'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 7 jamaica_sound_system_culture related_to jamaica_sound_system_technology
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:7:jamaica_sound_system_culture:related_to:jamaica_sound_system_technology","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='jamaican-sound-system-technology'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:7:jamaica_sound_system_culture:related_to:jamaica_sound_system_technology'
where s.slug='jamaica-sound-system-culture'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:8:jamaica_ocarolina:credited_to:jamaica_artist_folkes_brothers
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-ocarolina'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='folkes-brothers'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"subject_seed_id":"jamaica_ocarolina","object_seed_id":"jamaica_artist_folkes_brothers","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:8:jamaica_ocarolina:credited_to:jamaica_artist_folkes_brothers","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:8:jamaica_ocarolina:credited_to:jamaica_artist_folkes_brothers'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-ocarolina'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='folkes-brothers'), null,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_ocarolina","object_seed_id":"jamaica_artist_folkes_brothers","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:8:jamaica_ocarolina:credited_to:jamaica_artist_folkes_brothers","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:8:jamaica_ocarolina:credited_to:jamaica_artist_folkes_brothers');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_jis_roots_reggae', 'musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:8:jamaica_ocarolina:credited_to:jamaica_artist_folkes_brothers'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 8 jamaica_ocarolina credited_to jamaica_artist_folkes_brothers
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:8:jamaica_ocarolina:credited_to:jamaica_artist_folkes_brothers","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='folkes-brothers'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:8:jamaica_ocarolina:credited_to:jamaica_artist_folkes_brothers'
where s.slug='jamaica-ocarolina'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:9:jamaica_ocarolina:credited_to:jamaica_artist_count_ossie
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-ocarolina'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='count-ossie'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"subject_seed_id":"jamaica_ocarolina","object_seed_id":"jamaica_artist_count_ossie","credit_role":"accompaniment","seed_claim_key":"seed:kingston:graph:9:jamaica_ocarolina:credited_to:jamaica_artist_count_ossie","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:9:jamaica_ocarolina:credited_to:jamaica_artist_count_ossie'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-ocarolina'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='count-ossie'), null,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_ocarolina","object_seed_id":"jamaica_artist_count_ossie","credit_role":"accompaniment","seed_claim_key":"seed:kingston:graph:9:jamaica_ocarolina:credited_to:jamaica_artist_count_ossie","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:9:jamaica_ocarolina:credited_to:jamaica_artist_count_ossie');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_jis_roots_reggae', 'musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:9:jamaica_ocarolina:credited_to:jamaica_artist_count_ossie'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 9 jamaica_ocarolina credited_to jamaica_artist_count_ossie
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:9:jamaica_ocarolina:credited_to:jamaica_artist_count_ossie","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='count-ossie'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:9:jamaica_ocarolina:credited_to:jamaica_artist_count_ossie'
where s.slug='jamaica-ocarolina'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:10:jamaica_forward_march:credited_to:jamaica_artist_derrick_morgan
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-forward-march'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='derrick-morgan'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"subject_seed_id":"jamaica_forward_march","object_seed_id":"jamaica_artist_derrick_morgan","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:10:jamaica_forward_march:credited_to:jamaica_artist_derrick_morgan","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:10:jamaica_forward_march:credited_to:jamaica_artist_derrick_morgan'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-forward-march'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='derrick-morgan'), null,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_forward_march","object_seed_id":"jamaica_artist_derrick_morgan","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:10:jamaica_forward_march:credited_to:jamaica_artist_derrick_morgan","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:10:jamaica_forward_march:credited_to:jamaica_artist_derrick_morgan');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:10:jamaica_forward_march:credited_to:jamaica_artist_derrick_morgan'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 10 jamaica_forward_march credited_to jamaica_artist_derrick_morgan
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:10:jamaica_forward_march:credited_to:jamaica_artist_derrick_morgan","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='derrick-morgan'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:10:jamaica_forward_march:credited_to:jamaica_artist_derrick_morgan'
where s.slug='jamaica-forward-march'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:11:jamaica_everything_crash:credited_to:jamaica_artist_ethiopians
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-everything-crash'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='the-ethiopians-jamaica'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"subject_seed_id":"jamaica_everything_crash","object_seed_id":"jamaica_artist_ethiopians","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:11:jamaica_everything_crash:credited_to:jamaica_artist_ethiopians","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:11:jamaica_everything_crash:credited_to:jamaica_artist_ethiopians'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-everything-crash'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-ethiopians-jamaica'), null,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_everything_crash","object_seed_id":"jamaica_artist_ethiopians","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:11:jamaica_everything_crash:credited_to:jamaica_artist_ethiopians","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:11:jamaica_everything_crash:credited_to:jamaica_artist_ethiopians');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:11:jamaica_everything_crash:credited_to:jamaica_artist_ethiopians'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 11 jamaica_everything_crash credited_to jamaica_artist_ethiopians
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:11:jamaica_everything_crash:credited_to:jamaica_artist_ethiopians","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='the-ethiopians-jamaica'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:11:jamaica_everything_crash:credited_to:jamaica_artist_ethiopians'
where s.slug='jamaica-everything-crash'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:12:jamaica_one_drop:credited_to:jamaica_artist_bob_marley_wailers
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-one-drop'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='bob-marley-the-wailers'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"subject_seed_id":"jamaica_one_drop","object_seed_id":"jamaica_artist_bob_marley_wailers","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:12:jamaica_one_drop:credited_to:jamaica_artist_bob_marley_wailers","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:12:jamaica_one_drop:credited_to:jamaica_artist_bob_marley_wailers'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-one-drop'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='bob-marley-the-wailers'), null,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_one_drop","object_seed_id":"jamaica_artist_bob_marley_wailers","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:12:jamaica_one_drop:credited_to:jamaica_artist_bob_marley_wailers","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:12:jamaica_one_drop:credited_to:jamaica_artist_bob_marley_wailers');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('musicbrainz_artist_identity', 'musicbrainz_recording_identity', 'smithsonian_roots_reggae', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:12:jamaica_one_drop:credited_to:jamaica_artist_bob_marley_wailers'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 12 jamaica_one_drop credited_to jamaica_artist_bob_marley_wailers
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:12:jamaica_one_drop:credited_to:jamaica_artist_bob_marley_wailers","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='bob-marley-the-wailers'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:12:jamaica_one_drop:credited_to:jamaica_artist_bob_marley_wailers'
where s.slug='jamaica-one-drop'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:13:jamaica_simmer_down:credited_to:jamaica_artist_wailers_early
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jamaica-simmer-down-wailers'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='the-wailers-early-jamaica'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"subject_seed_id":"jamaica_simmer_down","object_seed_id":"jamaica_artist_wailers_early","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:13:jamaica_simmer_down:credited_to:jamaica_artist_wailers_early","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:13:jamaica_simmer_down:credited_to:jamaica_artist_wailers_early'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-simmer-down-wailers'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-wailers-early-jamaica'), null,
  null, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_simmer_down","object_seed_id":"jamaica_artist_wailers_early","credit_role":"primary_artist","seed_claim_key":"seed:kingston:graph:13:jamaica_simmer_down:credited_to:jamaica_artist_wailers_early","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:13:jamaica_simmer_down:credited_to:jamaica_artist_wailers_early');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_gleaner_studio_one', 'musicbrainz_artist_identity', 'studio_one_official')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:13:jamaica_simmer_down:credited_to:jamaica_artist_wailers_early'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 13 jamaica_simmer_down credited_to jamaica_artist_wailers_early
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:13:jamaica_simmer_down:credited_to:jamaica_artist_wailers_early","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='the-wailers-early-jamaica'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:13:jamaica_simmer_down:credited_to:jamaica_artist_wailers_early'
where s.slug='jamaica-simmer-down-wailers'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:kingston:graph:14:jamaica_studio_one:related_to:jamaica_rocksteady
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='kingston-studio-one'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.990,
    metadata = metadata || '{"subject_seed_id":"jamaica_studio_one","object_seed_id":"jamaica_rocksteady","relationship_note":"Studio One’s official history identifies the Brentford Road studio as the birthplace of rocksteady.","seed_claim_key":"seed:kingston:graph:14:jamaica_studio_one:related_to:jamaica_rocksteady","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:kingston:graph:14:jamaica_studio_one:related_to:jamaica_rocksteady'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='kingston-studio-one'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='jamaica-rocksteady'), null,
  null, null, 0.990, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"jamaica_studio_one","object_seed_id":"jamaica_rocksteady","relationship_note":"Studio One’s official history identifies the Brentford Road studio as the birthplace of rocksteady.","seed_claim_key":"seed:kingston:graph:14:jamaica_studio_one:related_to:jamaica_rocksteady","seed_framework":"world-history-seed-v0.1","pilot_key":"kingston"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:kingston:graph:14:jamaica_studio_one:related_to:jamaica_rocksteady');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('jamaica_gleaner_studio_one', 'studio_one_official')
where c.metadata->>'seed_claim_key' = 'seed:kingston:graph:14:jamaica_studio_one:related_to:jamaica_rocksteady'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 14 jamaica_studio_one related_to jamaica_rocksteady
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:kingston:graph:14:jamaica_studio_one:related_to:jamaica_rocksteady","pilot_key":"kingston"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='jamaica-rocksteady'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:kingston:graph:14:jamaica_studio_one:related_to:jamaica_rocksteady'
where s.slug='kingston-studio-one'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- Preview verification: all rows remain draft; no publication/playback action occurs.
select count(*) as pilot_entities from public.world_cultural_entities where metadata->>'pilot_key'='kingston';
select count(*) as pilot_claims from public.world_claims where metadata->>'pilot_key'='kingston';
select count(*) as pilot_place_edges from public.world_cultural_entity_places edge join public.world_cultural_entities ce on ce.id=edge.cultural_entity_id where ce.metadata->>'pilot_key'='kingston';
select count(*) as pilot_graph_edges from public.world_cultural_relationships rel where rel.metadata->>'pilot_key'='kingston';
select count(*) as forbidden_published_rows from public.world_cultural_entities where metadata->>'pilot_key'='kingston' and publication_status='published';

