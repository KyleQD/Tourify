-- GOVERNED ACTIVATION MIGRATION (local isolated rehearsal)
-- Source artifact: implementation/phase2/generated/london_canonical_promotion_preview.sql
-- Compiled by compile_pilot_canonical_preview.py (validated 27 checks).
-- Preview wrapper lines removed so migration governance owns atomicity.

-- Tourify World of Music — London canonical promotion preview v0.1
-- G1-BLOCKED / REVIEW ONLY / DO NOT APPLY TO TOURIFY DEMO
-- Promotes reviewed seed structure into canonical DRAFT rows only.
-- This transaction ALWAYS ends with ROLLBACK.
-- Expected entities: 21
-- Expected cultural-place edges: 21
-- Expected cultural relationships: 10
-- Expected claims: 53


do $$
declare
  v_missing integer;
begin
  if to_regclass('public.geo_places') is null or to_regclass('public.world_cultural_entities') is null then
    raise exception 'G1 World tables are not present';
  end if;
  if not exists (select 1 from public.geo_places where canonical_path = 'gb/eng/london') then
    raise exception 'London canonical geo place is missing';
  end if;
  select count(*) into v_missing from (values
    ('ariwa_official_catalogue'),
    ('ariwa_official_story'),
    ('kcl_grime_and_gaming'),
    ('london_museum_dub'),
    ('london_museum_dub_project'),
    ('london_museum_dub_records'),
    ('london_museum_grime'),
    ('london_museum_grime_history'),
    ('musicbrainz_artist_identity'),
    ('musicbrainz_recording_identity'),
    ('westminster_bass_culture'),
    ('wikidata_identity')
  ) required(source_key)
  where not exists (select 1 from public.world_sources s where s.source_key = required.source_key);
  if v_missing > 0 then raise exception '% London source registry rows are missing', v_missing; end if;

  select count(*) into v_missing from (values
    ('cultural_place', 'associated_with'),
    ('cultural_place', 'developed_in'),
    ('cultural_place', 'historically_significant_in'),
    ('cultural_place', 'originated_in'),
    ('cultural_place', 'practiced_in'),
    ('cultural_graph', 'credited_to'),
    ('cultural_graph', 'influenced_by'),
    ('cultural_graph', 'part_of'),
    ('cultural_graph', 'related_to'),
    ('cultural_graph', 'uses_instrument')
  ) required(domain, relation_key)
  where not exists (select 1 from public.world_relation_types r where r.domain=required.domain and r.relation_key=required.relation_key);
  if v_missing > 0 then raise exception '% required relation types are missing', v_missing; end if;
end $$;

-- Resolve the canonical London place once for claim/edge construction.
create temporary table _world_london_place on commit drop as
select id, canonical_path from public.geo_places where canonical_path = 'gb/eng/london';

-- ENTITY london_dub_scene
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'scene', 'london-dub-scene', 'Dub London', 'A London dub ecosystem grew from the 1970s around Caribbean communities, sound systems, record shops, labels, radio, clubs, and producers.',
  1970, null, '{"seed_id":"london_dub_scene","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_dub
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'london-dub', 'Dub in London', 'Jamaican dub became a major London production and listening culture and helped shape later British electronic and bass music.',
  1970, null, '{"seed_id":"london_dub","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_dub_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'london-dub-sound-signature', 'Dub production sound signature', 'A listening guide to dub production practices documented by London Museum.',
  null, null, '{"listen_for":["heavy drum-and-bass foundation","echo","reverb","dropouts and spatial manipulation","instrumental/version-based arrangement"],"techniques":["studio-as-instrument production","mixing-console performance"],"context":["Dub originated in Jamaica; this seed describes its London development rather than relocating its origin."],"audio_policy":"description_only_until_rights_cleared","seed_id":"london_dub_sound_signature","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_pirate_radio
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'scene', 'london-pirate-radio', 'Pirate radio as scene infrastructure', 'Unlicensed radio stations provided vital platforms for London Black music and later grime artists, DJs, and MCs.',
  1980, null, '{"seed_id":"london_pirate_radio","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_grime
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'london-grime', 'Grime', 'A Black-British music scene that emerged in east London around the beginning of the 2000s, with Bow and neighboring areas central to its early development.',
  2000, null, '{"seed_id":"london_grime","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_grime_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'london-grime-sound-signature', 'Early grime sound signature', 'A listening guide to characteristics London Museum associates with early grime.',
  null, null, '{"listen_for":["hard-edged electronic instrumentals","jittery rhythmic programming","MC-led vocal performance","sparse/fierce production"],"techniques":["pirate-radio performance culture","producer-led instrumental ecosystems"],"context":["Wiley’s “eskimo sound” is one influential strand, not the entirety of grime."],"audio_policy":"description_only_until_rights_cleared","seed_id":"london_grime_sound_signature","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_wiley_eskimo_sound
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'london-wiley-eskimo-sound', 'Wiley’s eskimo sound', 'A cold, sparse production aesthetic developed by Wiley and closely associated with early grime.',
  2000, null, '{"listen_for":["icy/sparse synth textures","jittery electronic rhythm","space for MC vocals"],"audio_policy":"description_only_until_rights_cleared","seed_id":"london_wiley_eskimo_sound","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_bow_grime
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'scene', 'london-bow-grime', 'Bow early grime network', 'Bow in east London is a key geographic node in grime’s early history, associated with Wiley and other pioneers.',
  2000, null, '{"seed_id":"london_bow_grime","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_dub_to_grime_lineage
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'educational_topic', 'london-dub-to-grime-lineage', 'Bass-culture lineage: dub to later London genres', 'London Museum explicitly links dub’s studio-built bass culture to later British genres including jungle, UK garage, and grime.',
  1970, null, '{"seed_id":"london_dub_to_grime_lineage","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_i_luv_you_dizzee
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'london-i-luv-you-dizzee', 'I Luv You', 'A formative grime recording made by Dizzee Rascal as a teenager in Poplar, east London, cited by London Museum in its grime history.',
  null, null, '{"artist_name":"Dizzee Rascal","title":"I Luv You","release_year":2002,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Dizzee Rascal I Luv You"},"credit_components":[{"artist_seed_id":"london_artist_dizzee_rascal","role":"primary_artist"}],"seed_id":"london_i_luv_you_dizzee","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_commandments_of_dub
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'london-commandments-of-dub', 'The Commandments of Dub', 'A 1982 Jah Shaka dub record mixed at Ariwa Studio by Mad Professor and selected by London Museum as part of its Dub London record history.',
  1982, 1982, '{"artist_name":"Jah Shaka","title":"The Commandments of Dub","release_year":1982,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Jah Shaka The Commandments of Dub"},"credit_components":[{"artist_seed_id":"london_artist_jah_shaka","role":"primary_artist"}],"seed_id":"london_commandments_of_dub","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_bass_culture_lkj
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'london-bass-culture-lkj', 'Bass Culture', 'A Linton Kwesi Johnson recording/album highlighted by London Museum in its Dub London history and produced with Dennis Bovell.',
  null, null, '{"artist_name":"Linton Kwesi Johnson","title":"Bass Culture","release_year":1980,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Linton Kwesi Johnson Bass Culture"},"credit_components":[{"artist_seed_id":"london_artist_lkj","role":"primary_artist"}],"seed_id":"london_bass_culture_lkj","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_ariwa_sounds
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'studio_landmark', 'london-ariwa-sounds', 'Ariwa Sounds', 'Mad Professor’s Ariwa Sounds is a major London dub studio; London Museum used it to document dub mixing practice.',
  1979, null, '{"landmark_type":"recording_studio","address_text":"34 Whitehorse Lane, London SE25 6RE, United Kingdom","media_policy":"link_only_until_cleared","location_history":[{"from_year":1979,"to_year":1982,"address":"19 Bruce Road, Thornton Heath"},{"from_year":1982,"to_year":1986,"address":"42 Gautrey Road, Peckham"},{"from_year":1986,"to_year":null,"address":"34 Whitehorse Lane, London SE25 6RE"}],"seed_id":"london_ariwa_sounds","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_dub_mixing_console
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'educational_topic', 'dub-mixing-console-effects', 'Dub mixing console and effects as performance tools', 'London dub practice treats the studio as an instrument, reshaping drums and bass with faders, echo, reverb, dropouts and other effects.',
  1970, null, '{"topic_type":"production_technology","listen_for":["echo and reverb trails","sudden dropouts","bass-and-drum emphasis","live-feeling mix changes"],"audio_policy":"description_only_until_rights_cleared","seed_id":"london_dub_mixing_console","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_sound_system
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'sound-system-london-dub', 'Sound system — London dub culture', 'Large-format sound systems were central to how dub and reggae were heard collectively in London clubs, parties and carnival culture.',
  1970, null, '{"instrument_family":"amplified_playback_system","sound_role":"high-impact communal reproduction of bass-heavy recordings","listen_for":["physical low-frequency emphasis","selector-led sequencing of records and versions"],"audio_policy":"description_only_until_rights_cleared","seed_id":"london_sound_system","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_robotiks_mad_professor
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'london-robotiks-my-computers-acting-strange', 'My Computers Acting Strange', 'London Museum highlights Robotiks’ “My Computers Acting Strange” as a Mad Professor/Ariwa example of analogue, retro-futurist dub production.',
  1980, null, '{"artist_name":"The Robotiks","title":"My Computers Acting Strange","release_year":1986,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Robotiks My Computers Acting Strange"},"credit_components":[{"artist_seed_id":"london_artist_robotiks","role":"primary_artist"},{"artist_seed_id":"london_artist_mad_professor","role":"production_context"}],"seed_id":"london_robotiks_mad_professor","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_artist_dizzee_rascal
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'dizzee-rascal', 'Dizzee Rascal', 'External knowledge-graph identity for Dizzee Rascal; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"1a99cc88-aea3-4fe3-96b9-20791667f65f","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"london_artist_dizzee_rascal","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_artist_jah_shaka
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'jah-shaka', 'Jah Shaka', 'External knowledge-graph identity for Jah Shaka; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"47b2253e-034f-4806-b65c-7cee187f34d8","wikidata_qid":"Q726991","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"london_artist_jah_shaka","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_artist_lkj
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'linton-kwesi-johnson', 'Linton Kwesi Johnson', 'External knowledge-graph identity for Linton Kwesi Johnson; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"f27042c2-3a42-4529-876c-3aa0b4fd53fe","wikidata_qid":"Q557775","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"london_artist_lkj","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_artist_mad_professor
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'mad-professor', 'Mad Professor', 'External knowledge-graph identity for Mad Professor; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"ea3b97e8-8a76-4ea7-8e6f-3ebf40acaeb8","wikidata_qid":"Q918458","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"london_artist_mad_professor","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY london_artist_robotiks
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'the-robotiks', 'The Robotiks', 'External knowledge-graph identity for The Robotiks; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":null,"wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"london_artist_robotiks","pilot_key":"london","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- CLAIM seed:london:overview:musical_identity
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'place',
    subject_id = (select id::text from _world_london_place),
    predicate = 'musical_identity',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"London’s pilot seed focuses on migration and infrastructure: Jamaican dub’s London production ecosystem, pirate radio, and east London grime rather than treating the city as a single genre."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"place_path":"gb/eng/london","seed_claim_key":"seed:london:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:overview:musical_identity'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'place', (select id::text from _world_london_place), 'musical_identity',
  null, null, '{"text":"London’s pilot seed focuses on migration and infrastructure: Jamaican dub’s London production ecosystem, pirate radio, and east London grime rather than treating the city as a single genre."}'::jsonb,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"place_path":"gb/eng/london","seed_claim_key":"seed:london:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:overview:musical_identity');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub', 'london_museum_grime', 'london_museum_grime_history')
where c.metadata->>'seed_claim_key' = 'seed:london:overview:musical_identity'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_dub_scene:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub-scene'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A London dub ecosystem grew from the 1970s around Caribbean communities, sound systems, record shops, labels, radio, clubs, and producers."}'::jsonb,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"london_dub_scene","entity_slug":"london-dub-scene","seed_claim_key":"seed:london:entity:london_dub_scene:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_scene:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub-scene'), 'summary',
  null, null, '{"text":"A London dub ecosystem grew from the 1970s around Caribbean communities, sound systems, record shops, labels, radio, clubs, and producers."}'::jsonb,
  1970, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub_scene","entity_slug":"london-dub-scene","seed_claim_key":"seed:london:entity:london_dub_scene:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_scene:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub', 'london_museum_dub_records')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_scene:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_dub_scene:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub-scene'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"london_dub_scene","entity_slug":"london-dub-scene","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub_scene:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_scene:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub-scene'), 'developed_in',
  'place', (select id::text from _world_london_place), null,
  1970, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub_scene","entity_slug":"london-dub-scene","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub_scene:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_scene:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub', 'london_museum_dub_records')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_scene:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_dub_scene
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1970, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_dub_scene:place:developed_in'
where ce.slug='london-dub-scene'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1970,-2147483648)
  );

-- CLAIM seed:london:entity:london_dub:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Jamaican dub became a major London production and listening culture and helped shape later British electronic and bass music."}'::jsonb,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"london_dub","entity_slug":"london-dub","seed_claim_key":"seed:london:entity:london_dub:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub'), 'summary',
  null, null, '{"text":"Jamaican dub became a major London production and listening culture and helped shape later British electronic and bass music."}'::jsonb,
  1970, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub","entity_slug":"london-dub","seed_claim_key":"seed:london:entity:london_dub:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_dub:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"london_dub","entity_slug":"london-dub","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  1970, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub","entity_slug":"london-dub","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_dub
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1970, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_dub:place:associated_with'
where ce.slug='london-dub'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1970,-2147483648)
  );

-- CLAIM seed:london:entity:london_dub_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening guide to dub production practices documented by London Museum."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"london_dub_sound_signature","entity_slug":"london-dub-sound-signature","seed_claim_key":"seed:london:entity:london_dub_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub-sound-signature'), 'summary',
  null, null, '{"text":"A listening guide to dub production practices documented by London Museum."}'::jsonb,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub_sound_signature","entity_slug":"london-dub-sound-signature","seed_claim_key":"seed:london:entity:london_dub_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_dub_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"london_dub_sound_signature","entity_slug":"london-dub-sound-signature","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub-sound-signature'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub_sound_signature","entity_slug":"london-dub-sound-signature","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_dub_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_dub_sound_signature:place:associated_with'
where ce.slug='london-dub-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:london:entity:london_pirate_radio:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-pirate-radio'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Unlicensed radio stations provided vital platforms for London Black music and later grime artists, DJs, and MCs."}'::jsonb,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"london_pirate_radio","entity_slug":"london-pirate-radio","seed_claim_key":"seed:london:entity:london_pirate_radio:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_pirate_radio:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-pirate-radio'), 'summary',
  null, null, '{"text":"Unlicensed radio stations provided vital platforms for London Black music and later grime artists, DJs, and MCs."}'::jsonb,
  1980, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_pirate_radio","entity_slug":"london-pirate-radio","seed_claim_key":"seed:london:entity:london_pirate_radio:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_pirate_radio:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub', 'london_museum_grime')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_pirate_radio:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_pirate_radio:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-pirate-radio'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"london_pirate_radio","entity_slug":"london-pirate-radio","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_pirate_radio:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_pirate_radio:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-pirate-radio'), 'developed_in',
  'place', (select id::text from _world_london_place), null,
  1980, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_pirate_radio","entity_slug":"london-pirate-radio","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_pirate_radio:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_pirate_radio:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub', 'london_museum_grime')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_pirate_radio:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_pirate_radio
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1980, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_pirate_radio:place:developed_in'
where ce.slug='london-pirate-radio'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1980,-2147483648)
  );

-- CLAIM seed:london:entity:london_grime:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-grime'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A Black-British music scene that emerged in east London around the beginning of the 2000s, with Bow and neighboring areas central to its early development."}'::jsonb,
    temporal_start_year = 2000,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_grime","entity_slug":"london-grime","seed_claim_key":"seed:london:entity:london_grime:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_grime:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-grime'), 'summary',
  null, null, '{"text":"A Black-British music scene that emerged in east London around the beginning of the 2000s, with Bow and neighboring areas central to its early development."}'::jsonb,
  2000, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_grime","entity_slug":"london-grime","seed_claim_key":"seed:london:entity:london_grime:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_grime:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime', 'london_museum_grime_history')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_grime:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_grime:place:originated_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-grime'),
    predicate = 'originated_in',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 2000,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_grime","entity_slug":"london-grime","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_grime:place:originated_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_grime:place:originated_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-grime'), 'originated_in',
  'place', (select id::text from _world_london_place), null,
  2000, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_grime","entity_slug":"london-grime","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_grime:place:originated_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_grime:place:originated_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime', 'london_museum_grime_history')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_grime:place:originated_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_grime
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2000, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='originated_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_grime:place:originated_in'
where ce.slug='london-grime'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2000,-2147483648)
  );

-- CLAIM seed:london:entity:london_grime_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-grime-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening guide to characteristics London Museum associates with early grime."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"london_grime_sound_signature","entity_slug":"london-grime-sound-signature","seed_claim_key":"seed:london:entity:london_grime_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_grime_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-grime-sound-signature'), 'summary',
  null, null, '{"text":"A listening guide to characteristics London Museum associates with early grime."}'::jsonb,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_grime_sound_signature","entity_slug":"london-grime-sound-signature","seed_claim_key":"seed:london:entity:london_grime_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_grime_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_grime_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_grime_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-grime-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"london_grime_sound_signature","entity_slug":"london-grime-sound-signature","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_grime_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_grime_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-grime-sound-signature'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_grime_sound_signature","entity_slug":"london-grime-sound-signature","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_grime_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_grime_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_grime_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_grime_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_grime_sound_signature:place:associated_with'
where ce.slug='london-grime-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:london:entity:london_wiley_eskimo_sound:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-wiley-eskimo-sound'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A cold, sparse production aesthetic developed by Wiley and closely associated with early grime."}'::jsonb,
    temporal_start_year = 2000,
    temporal_end_year = null,
    confidence = 0.910,
    metadata = metadata || '{"seed_id":"london_wiley_eskimo_sound","entity_slug":"london-wiley-eskimo-sound","seed_claim_key":"seed:london:entity:london_wiley_eskimo_sound:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_wiley_eskimo_sound:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-wiley-eskimo-sound'), 'summary',
  null, null, '{"text":"A cold, sparse production aesthetic developed by Wiley and closely associated with early grime."}'::jsonb,
  2000, null, 0.910, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_wiley_eskimo_sound","entity_slug":"london-wiley-eskimo-sound","seed_claim_key":"seed:london:entity:london_wiley_eskimo_sound:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_wiley_eskimo_sound:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_wiley_eskimo_sound:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_wiley_eskimo_sound:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-wiley-eskimo-sound'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 2000,
    temporal_end_year = null,
    confidence = 0.910,
    metadata = metadata || '{"seed_id":"london_wiley_eskimo_sound","entity_slug":"london-wiley-eskimo-sound","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_wiley_eskimo_sound:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_wiley_eskimo_sound:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-wiley-eskimo-sound'), 'developed_in',
  'place', (select id::text from _world_london_place), null,
  2000, null, 0.910, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_wiley_eskimo_sound","entity_slug":"london-wiley-eskimo-sound","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_wiley_eskimo_sound:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_wiley_eskimo_sound:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_wiley_eskimo_sound:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_wiley_eskimo_sound
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2000, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_wiley_eskimo_sound:place:developed_in'
where ce.slug='london-wiley-eskimo-sound'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2000,-2147483648)
  );

-- CLAIM seed:london:entity:london_bow_grime:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-bow-grime'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Bow in east London is a key geographic node in grime’s early history, associated with Wiley and other pioneers."}'::jsonb,
    temporal_start_year = 2000,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"london_bow_grime","entity_slug":"london-bow-grime","seed_claim_key":"seed:london:entity:london_bow_grime:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_bow_grime:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-bow-grime'), 'summary',
  null, null, '{"text":"Bow in east London is a key geographic node in grime’s early history, associated with Wiley and other pioneers."}'::jsonb,
  2000, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_bow_grime","entity_slug":"london-bow-grime","seed_claim_key":"seed:london:entity:london_bow_grime:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_bow_grime:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('kcl_grime_and_gaming', 'london_museum_grime')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_bow_grime:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_bow_grime:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-bow-grime'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 2000,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"london_bow_grime","entity_slug":"london-bow-grime","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_bow_grime:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_bow_grime:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-bow-grime'), 'developed_in',
  'place', (select id::text from _world_london_place), null,
  2000, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_bow_grime","entity_slug":"london-bow-grime","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_bow_grime:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_bow_grime:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('kcl_grime_and_gaming', 'london_museum_grime')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_bow_grime:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_bow_grime
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2000, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_bow_grime:place:developed_in'
where ce.slug='london-bow-grime'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2000,-2147483648)
  );

-- CLAIM seed:london:entity:london_dub_to_grime_lineage:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub-to-grime-lineage'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"London Museum explicitly links dub’s studio-built bass culture to later British genres including jungle, UK garage, and grime."}'::jsonb,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"london_dub_to_grime_lineage","entity_slug":"london-dub-to-grime-lineage","seed_claim_key":"seed:london:entity:london_dub_to_grime_lineage:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_to_grime_lineage:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub-to-grime-lineage'), 'summary',
  null, null, '{"text":"London Museum explicitly links dub’s studio-built bass culture to later British genres including jungle, UK garage, and grime."}'::jsonb,
  1970, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub_to_grime_lineage","entity_slug":"london-dub-to-grime-lineage","seed_claim_key":"seed:london:entity:london_dub_to_grime_lineage:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_to_grime_lineage:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_to_grime_lineage:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_dub_to_grime_lineage:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub-to-grime-lineage'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"london_dub_to_grime_lineage","entity_slug":"london-dub-to-grime-lineage","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub_to_grime_lineage:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_to_grime_lineage:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub-to-grime-lineage'), 'historically_significant_in',
  'place', (select id::text from _world_london_place), null,
  1970, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub_to_grime_lineage","entity_slug":"london-dub-to-grime-lineage","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub_to_grime_lineage:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_to_grime_lineage:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_to_grime_lineage:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_dub_to_grime_lineage
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1970, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_dub_to_grime_lineage:place:historically_significant_in'
where ce.slug='london-dub-to-grime-lineage'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1970,-2147483648)
  );

-- CLAIM seed:london:entity:london_i_luv_you_dizzee:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-i-luv-you-dizzee'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A formative grime recording made by Dizzee Rascal as a teenager in Poplar, east London, cited by London Museum in its grime history."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"london_i_luv_you_dizzee","entity_slug":"london-i-luv-you-dizzee","seed_claim_key":"seed:london:entity:london_i_luv_you_dizzee:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_i_luv_you_dizzee:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-i-luv-you-dizzee'), 'summary',
  null, null, '{"text":"A formative grime recording made by Dizzee Rascal as a teenager in Poplar, east London, cited by London Museum in its grime history."}'::jsonb,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_i_luv_you_dizzee","entity_slug":"london-i-luv-you-dizzee","seed_claim_key":"seed:london:entity:london_i_luv_you_dizzee:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_i_luv_you_dizzee:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_i_luv_you_dizzee:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_i_luv_you_dizzee:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-i-luv-you-dizzee'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"london_i_luv_you_dizzee","entity_slug":"london-i-luv-you-dizzee","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_i_luv_you_dizzee:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_i_luv_you_dizzee:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-i-luv-you-dizzee'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_i_luv_you_dizzee","entity_slug":"london-i-luv-you-dizzee","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_i_luv_you_dizzee:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_i_luv_you_dizzee:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_i_luv_you_dizzee:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_i_luv_you_dizzee
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_i_luv_you_dizzee:place:associated_with'
where ce.slug='london-i-luv-you-dizzee'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:london:entity:london_commandments_of_dub:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-commandments-of-dub'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A 1982 Jah Shaka dub record mixed at Ariwa Studio by Mad Professor and selected by London Museum as part of its Dub London record history."}'::jsonb,
    temporal_start_year = 1982,
    temporal_end_year = 1982,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"london_commandments_of_dub","entity_slug":"london-commandments-of-dub","seed_claim_key":"seed:london:entity:london_commandments_of_dub:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_commandments_of_dub:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-commandments-of-dub'), 'summary',
  null, null, '{"text":"A 1982 Jah Shaka dub record mixed at Ariwa Studio by Mad Professor and selected by London Museum as part of its Dub London record history."}'::jsonb,
  1982, 1982, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_commandments_of_dub","entity_slug":"london-commandments-of-dub","seed_claim_key":"seed:london:entity:london_commandments_of_dub:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_commandments_of_dub:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_commandments_of_dub:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_commandments_of_dub:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-commandments-of-dub'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 1982,
    temporal_end_year = 1982,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"london_commandments_of_dub","entity_slug":"london-commandments-of-dub","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_commandments_of_dub:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_commandments_of_dub:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-commandments-of-dub'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  1982, 1982, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_commandments_of_dub","entity_slug":"london-commandments-of-dub","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_commandments_of_dub:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_commandments_of_dub:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_commandments_of_dub:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_commandments_of_dub
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1982, 1982, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_commandments_of_dub:place:associated_with'
where ce.slug='london-commandments-of-dub'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1982,-2147483648)
  );

-- CLAIM seed:london:entity:london_bass_culture_lkj:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-bass-culture-lkj'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A Linton Kwesi Johnson recording/album highlighted by London Museum in its Dub London history and produced with Dennis Bovell."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"london_bass_culture_lkj","entity_slug":"london-bass-culture-lkj","seed_claim_key":"seed:london:entity:london_bass_culture_lkj:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_bass_culture_lkj:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-bass-culture-lkj'), 'summary',
  null, null, '{"text":"A Linton Kwesi Johnson recording/album highlighted by London Museum in its Dub London history and produced with Dennis Bovell."}'::jsonb,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_bass_culture_lkj","entity_slug":"london-bass-culture-lkj","seed_claim_key":"seed:london:entity:london_bass_culture_lkj:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_bass_culture_lkj:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_bass_culture_lkj:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_bass_culture_lkj:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-bass-culture-lkj'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"london_bass_culture_lkj","entity_slug":"london-bass-culture-lkj","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_bass_culture_lkj:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_bass_culture_lkj:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-bass-culture-lkj'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_bass_culture_lkj","entity_slug":"london-bass-culture-lkj","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_bass_culture_lkj:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_bass_culture_lkj:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_bass_culture_lkj:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_bass_culture_lkj
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_bass_culture_lkj:place:associated_with'
where ce.slug='london-bass-culture-lkj'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:london:entity:london_ariwa_sounds:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-ariwa-sounds'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Mad Professor’s Ariwa Sounds is a major London dub studio; London Museum used it to document dub mixing practice."}'::jsonb,
    temporal_start_year = 1979,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"london_ariwa_sounds","entity_slug":"london-ariwa-sounds","seed_claim_key":"seed:london:entity:london_ariwa_sounds:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_ariwa_sounds:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-ariwa-sounds'), 'summary',
  null, null, '{"text":"Mad Professor’s Ariwa Sounds is a major London dub studio; London Museum used it to document dub mixing practice."}'::jsonb,
  1979, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_ariwa_sounds","entity_slug":"london-ariwa-sounds","seed_claim_key":"seed:london:entity:london_ariwa_sounds:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_ariwa_sounds:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_story', 'london_museum_dub', 'london_museum_dub_project')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_ariwa_sounds:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_ariwa_sounds:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-ariwa-sounds'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 1979,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"london_ariwa_sounds","entity_slug":"london-ariwa-sounds","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_ariwa_sounds:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_ariwa_sounds:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-ariwa-sounds'), 'historically_significant_in',
  'place', (select id::text from _world_london_place), null,
  1979, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_ariwa_sounds","entity_slug":"london-ariwa-sounds","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_ariwa_sounds:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_ariwa_sounds:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_story', 'london_museum_dub', 'london_museum_dub_project')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_ariwa_sounds:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_ariwa_sounds
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1979, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_ariwa_sounds:place:historically_significant_in'
where ce.slug='london-ariwa-sounds'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1979,-2147483648)
  );

-- CLAIM seed:london:entity:london_dub_mixing_console:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='dub-mixing-console-effects'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"London dub practice treats the studio as an instrument, reshaping drums and bass with faders, echo, reverb, dropouts and other effects."}'::jsonb,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"london_dub_mixing_console","entity_slug":"dub-mixing-console-effects","seed_claim_key":"seed:london:entity:london_dub_mixing_console:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_mixing_console:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='dub-mixing-console-effects'), 'summary',
  null, null, '{"text":"London dub practice treats the studio as an instrument, reshaping drums and bass with faders, echo, reverb, dropouts and other effects."}'::jsonb,
  1970, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub_mixing_console","entity_slug":"dub-mixing-console-effects","seed_claim_key":"seed:london:entity:london_dub_mixing_console:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_mixing_console:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub', 'london_museum_dub_project')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_mixing_console:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_dub_mixing_console:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='dub-mixing-console-effects'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"london_dub_mixing_console","entity_slug":"dub-mixing-console-effects","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub_mixing_console:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_mixing_console:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='dub-mixing-console-effects'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  1970, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_dub_mixing_console","entity_slug":"dub-mixing-console-effects","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_dub_mixing_console:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_mixing_console:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub', 'london_museum_dub_project')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_dub_mixing_console:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_dub_mixing_console
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1970, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_dub_mixing_console:place:associated_with'
where ce.slug='dub-mixing-console-effects'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1970,-2147483648)
  );

-- CLAIM seed:london:entity:london_sound_system:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='sound-system-london-dub'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Large-format sound systems were central to how dub and reggae were heard collectively in London clubs, parties and carnival culture."}'::jsonb,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"london_sound_system","entity_slug":"sound-system-london-dub","seed_claim_key":"seed:london:entity:london_sound_system:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_sound_system:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='sound-system-london-dub'), 'summary',
  null, null, '{"text":"Large-format sound systems were central to how dub and reggae were heard collectively in London clubs, parties and carnival culture."}'::jsonb,
  1970, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_sound_system","entity_slug":"sound-system-london-dub","seed_claim_key":"seed:london:entity:london_sound_system:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_sound_system:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_sound_system:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_sound_system:place:practiced_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='sound-system-london-dub'),
    predicate = 'practiced_in',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"london_sound_system","entity_slug":"sound-system-london-dub","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_sound_system:place:practiced_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_sound_system:place:practiced_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='sound-system-london-dub'), 'practiced_in',
  'place', (select id::text from _world_london_place), null,
  1970, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_sound_system","entity_slug":"sound-system-london-dub","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_sound_system:place:practiced_in","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_sound_system:place:practiced_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_sound_system:place:practiced_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_sound_system
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1970, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='practiced_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_sound_system:place:practiced_in'
where ce.slug='sound-system-london-dub'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1970,-2147483648)
  );

-- CLAIM seed:london:entity:london_robotiks_mad_professor:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-robotiks-my-computers-acting-strange'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"London Museum highlights Robotiks’ “My Computers Acting Strange” as a Mad Professor/Ariwa example of analogue, retro-futurist dub production."}'::jsonb,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"london_robotiks_mad_professor","entity_slug":"london-robotiks-my-computers-acting-strange","seed_claim_key":"seed:london:entity:london_robotiks_mad_professor:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_robotiks_mad_professor:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-robotiks-my-computers-acting-strange'), 'summary',
  null, null, '{"text":"London Museum highlights Robotiks’ “My Computers Acting Strange” as a Mad Professor/Ariwa example of analogue, retro-futurist dub production."}'::jsonb,
  1980, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_robotiks_mad_professor","entity_slug":"london-robotiks-my-computers-acting-strange","seed_claim_key":"seed:london:entity:london_robotiks_mad_professor:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_robotiks_mad_professor:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_catalogue', 'london_museum_dub_records', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_robotiks_mad_professor:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_robotiks_mad_professor:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-robotiks-my-computers-acting-strange'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = 1980,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"london_robotiks_mad_professor","entity_slug":"london-robotiks-my-computers-acting-strange","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_robotiks_mad_professor:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_robotiks_mad_professor:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-robotiks-my-computers-acting-strange'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  1980, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_robotiks_mad_professor","entity_slug":"london-robotiks-my-computers-acting-strange","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_robotiks_mad_professor:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_robotiks_mad_professor:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_catalogue', 'london_museum_dub_records', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_robotiks_mad_professor:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_robotiks_mad_professor
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1980, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_robotiks_mad_professor:place:associated_with'
where ce.slug='london-robotiks-my-computers-acting-strange'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1980,-2147483648)
  );

-- CLAIM seed:london:entity:london_artist_dizzee_rascal:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='dizzee-rascal'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Dizzee Rascal; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_artist_dizzee_rascal","entity_slug":"dizzee-rascal","seed_claim_key":"seed:london:entity:london_artist_dizzee_rascal:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_dizzee_rascal:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='dizzee-rascal'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Dizzee Rascal; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_dizzee_rascal","entity_slug":"dizzee-rascal","seed_claim_key":"seed:london:entity:london_artist_dizzee_rascal:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_dizzee_rascal:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_dizzee_rascal:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_artist_dizzee_rascal:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='dizzee-rascal'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_artist_dizzee_rascal","entity_slug":"dizzee-rascal","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_dizzee_rascal:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_dizzee_rascal:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='dizzee-rascal'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_dizzee_rascal","entity_slug":"dizzee-rascal","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_dizzee_rascal:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_dizzee_rascal:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_dizzee_rascal:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_artist_dizzee_rascal
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_artist_dizzee_rascal:place:associated_with'
where ce.slug='dizzee-rascal'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:london:entity:london_artist_jah_shaka:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jah-shaka'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Jah Shaka; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_artist_jah_shaka","entity_slug":"jah-shaka","seed_claim_key":"seed:london:entity:london_artist_jah_shaka:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_jah_shaka:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jah-shaka'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Jah Shaka; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_jah_shaka","entity_slug":"jah-shaka","seed_claim_key":"seed:london:entity:london_artist_jah_shaka:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_jah_shaka:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_jah_shaka:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_artist_jah_shaka:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='jah-shaka'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_artist_jah_shaka","entity_slug":"jah-shaka","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_jah_shaka:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_jah_shaka:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='jah-shaka'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_jah_shaka","entity_slug":"jah-shaka","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_jah_shaka:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_jah_shaka:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_jah_shaka:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_artist_jah_shaka
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_artist_jah_shaka:place:associated_with'
where ce.slug='jah-shaka'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:london:entity:london_artist_lkj:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='linton-kwesi-johnson'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Linton Kwesi Johnson; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_artist_lkj","entity_slug":"linton-kwesi-johnson","seed_claim_key":"seed:london:entity:london_artist_lkj:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_lkj:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='linton-kwesi-johnson'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Linton Kwesi Johnson; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_lkj","entity_slug":"linton-kwesi-johnson","seed_claim_key":"seed:london:entity:london_artist_lkj:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_lkj:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_lkj:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_artist_lkj:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='linton-kwesi-johnson'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_artist_lkj","entity_slug":"linton-kwesi-johnson","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_lkj:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_lkj:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='linton-kwesi-johnson'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_lkj","entity_slug":"linton-kwesi-johnson","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_lkj:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_lkj:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_lkj:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_artist_lkj
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_artist_lkj:place:associated_with'
where ce.slug='linton-kwesi-johnson'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:london:entity:london_artist_mad_professor:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='mad-professor'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Mad Professor; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_artist_mad_professor","entity_slug":"mad-professor","seed_claim_key":"seed:london:entity:london_artist_mad_professor:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_mad_professor:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='mad-professor'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Mad Professor; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_mad_professor","entity_slug":"mad-professor","seed_claim_key":"seed:london:entity:london_artist_mad_professor:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_mad_professor:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_story', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_mad_professor:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_artist_mad_professor:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='mad-professor'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"london_artist_mad_professor","entity_slug":"mad-professor","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_mad_professor:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_mad_professor:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='mad-professor'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_mad_professor","entity_slug":"mad-professor","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_mad_professor:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_mad_professor:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_story', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_mad_professor:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_artist_mad_professor
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_artist_mad_professor:place:associated_with'
where ce.slug='mad-professor'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:london:entity:london_artist_robotiks:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='the-robotiks'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for The Robotiks; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"london_artist_robotiks","entity_slug":"the-robotiks","seed_claim_key":"seed:london:entity:london_artist_robotiks:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_robotiks:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-robotiks'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for The Robotiks; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_robotiks","entity_slug":"the-robotiks","seed_claim_key":"seed:london:entity:london_artist_robotiks:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_robotiks:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_catalogue', 'ariwa_official_story')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_robotiks:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:london:entity:london_artist_robotiks:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='the-robotiks'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_london_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"london_artist_robotiks","entity_slug":"the-robotiks","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_robotiks:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_robotiks:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-robotiks'), 'associated_with',
  'place', (select id::text from _world_london_place), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"london_artist_robotiks","entity_slug":"the-robotiks","place_path":"gb/eng/london","seed_claim_key":"seed:london:entity:london_artist_robotiks:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_robotiks:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_catalogue', 'ariwa_official_story')
where c.metadata->>'seed_claim_key' = 'seed:london:entity:london_artist_robotiks:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE london_artist_robotiks
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_london_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:entity:london_artist_robotiks:place:associated_with'
where ce.slug='the-robotiks'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:london:graph:1:london_grime:influenced_by:london_dub
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-grime'),
    predicate = 'influenced_by',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='london-dub'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.840,
    metadata = metadata || '{"subject_seed_id":"london_grime","object_seed_id":"london_dub","seed_claim_key":"seed:london:graph:1:london_grime:influenced_by:london_dub","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:1:london_grime:influenced_by:london_dub'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-grime'), 'influenced_by',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub'), null,
  null, null, 0.840, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_grime","object_seed_id":"london_dub","seed_claim_key":"seed:london:graph:1:london_grime:influenced_by:london_dub","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:1:london_grime:influenced_by:london_dub');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub', 'westminster_bass_culture')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:1:london_grime:influenced_by:london_dub'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 1 london_grime influenced_by london_dub
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:1:london_grime:influenced_by:london_dub","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='london-dub'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='influenced_by'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:1:london_grime:influenced_by:london_dub'
where s.slug='london-grime'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:london:graph:2:london_bow_grime:part_of:london_grime
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-bow-grime'),
    predicate = 'part_of',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='london-grime'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"subject_seed_id":"london_bow_grime","object_seed_id":"london_grime","seed_claim_key":"seed:london:graph:2:london_bow_grime:part_of:london_grime","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:2:london_bow_grime:part_of:london_grime'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-bow-grime'), 'part_of',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-grime'), null,
  null, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_bow_grime","object_seed_id":"london_grime","seed_claim_key":"seed:london:graph:2:london_bow_grime:part_of:london_grime","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:2:london_bow_grime:part_of:london_grime');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:2:london_bow_grime:part_of:london_grime'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 2 london_bow_grime part_of london_grime
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:2:london_bow_grime:part_of:london_grime","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='london-grime'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='part_of'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:2:london_bow_grime:part_of:london_grime'
where s.slug='london-bow-grime'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:london:graph:3:london_dub:uses_instrument:london_sound_system
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='sound-system-london-dub'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"subject_seed_id":"london_dub","object_seed_id":"london_sound_system","seed_claim_key":"seed:london:graph:3:london_dub:uses_instrument:london_sound_system","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:3:london_dub:uses_instrument:london_sound_system'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='sound-system-london-dub'), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_dub","object_seed_id":"london_sound_system","seed_claim_key":"seed:london:graph:3:london_dub:uses_instrument:london_sound_system","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:3:london_dub:uses_instrument:london_sound_system');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:3:london_dub:uses_instrument:london_sound_system'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 3 london_dub uses_instrument london_sound_system
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:3:london_dub:uses_instrument:london_sound_system","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='sound-system-london-dub'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:3:london_dub:uses_instrument:london_sound_system'
where s.slug='london-dub'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:london:graph:4:london_dub:related_to:london_dub_mixing_console
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='dub-mixing-console-effects'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"subject_seed_id":"london_dub","object_seed_id":"london_dub_mixing_console","seed_claim_key":"seed:london:graph:4:london_dub:related_to:london_dub_mixing_console","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:4:london_dub:related_to:london_dub_mixing_console'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='dub-mixing-console-effects'), null,
  null, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_dub","object_seed_id":"london_dub_mixing_console","seed_claim_key":"seed:london:graph:4:london_dub:related_to:london_dub_mixing_console","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:4:london_dub:related_to:london_dub_mixing_console');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub', 'london_museum_dub_project')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:4:london_dub:related_to:london_dub_mixing_console'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 4 london_dub related_to london_dub_mixing_console
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:4:london_dub:related_to:london_dub_mixing_console","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='dub-mixing-console-effects'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:4:london_dub:related_to:london_dub_mixing_console'
where s.slug='london-dub'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:london:graph:5:london_dub_scene:related_to:london_ariwa_sounds
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-dub-scene'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='london-ariwa-sounds'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"subject_seed_id":"london_dub_scene","object_seed_id":"london_ariwa_sounds","seed_claim_key":"seed:london:graph:5:london_dub_scene:related_to:london_ariwa_sounds","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:5:london_dub_scene:related_to:london_ariwa_sounds'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-dub-scene'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-ariwa-sounds'), null,
  null, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_dub_scene","object_seed_id":"london_ariwa_sounds","seed_claim_key":"seed:london:graph:5:london_dub_scene:related_to:london_ariwa_sounds","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:5:london_dub_scene:related_to:london_ariwa_sounds');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_project')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:5:london_dub_scene:related_to:london_ariwa_sounds'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 5 london_dub_scene related_to london_ariwa_sounds
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:5:london_dub_scene:related_to:london_ariwa_sounds","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='london-ariwa-sounds'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:5:london_dub_scene:related_to:london_ariwa_sounds'
where s.slug='london-dub-scene'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:london:graph:6:london_i_luv_you_dizzee:credited_to:london_artist_dizzee_rascal
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-i-luv-you-dizzee'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='dizzee-rascal'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"subject_seed_id":"london_i_luv_you_dizzee","object_seed_id":"london_artist_dizzee_rascal","credit_role":"primary_artist","seed_claim_key":"seed:london:graph:6:london_i_luv_you_dizzee:credited_to:london_artist_dizzee_rascal","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:6:london_i_luv_you_dizzee:credited_to:london_artist_dizzee_rascal'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-i-luv-you-dizzee'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='dizzee-rascal'), null,
  null, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_i_luv_you_dizzee","object_seed_id":"london_artist_dizzee_rascal","credit_role":"primary_artist","seed_claim_key":"seed:london:graph:6:london_i_luv_you_dizzee:credited_to:london_artist_dizzee_rascal","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:6:london_i_luv_you_dizzee:credited_to:london_artist_dizzee_rascal');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_grime', 'musicbrainz_artist_identity', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:6:london_i_luv_you_dizzee:credited_to:london_artist_dizzee_rascal'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 6 london_i_luv_you_dizzee credited_to london_artist_dizzee_rascal
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:6:london_i_luv_you_dizzee:credited_to:london_artist_dizzee_rascal","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='dizzee-rascal'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:6:london_i_luv_you_dizzee:credited_to:london_artist_dizzee_rascal'
where s.slug='london-i-luv-you-dizzee'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:london:graph:7:london_commandments_of_dub:credited_to:london_artist_jah_shaka
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-commandments-of-dub'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='jah-shaka'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"subject_seed_id":"london_commandments_of_dub","object_seed_id":"london_artist_jah_shaka","credit_role":"primary_artist","seed_claim_key":"seed:london:graph:7:london_commandments_of_dub:credited_to:london_artist_jah_shaka","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:7:london_commandments_of_dub:credited_to:london_artist_jah_shaka'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-commandments-of-dub'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='jah-shaka'), null,
  null, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_commandments_of_dub","object_seed_id":"london_artist_jah_shaka","credit_role":"primary_artist","seed_claim_key":"seed:london:graph:7:london_commandments_of_dub:credited_to:london_artist_jah_shaka","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:7:london_commandments_of_dub:credited_to:london_artist_jah_shaka');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:7:london_commandments_of_dub:credited_to:london_artist_jah_shaka'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 7 london_commandments_of_dub credited_to london_artist_jah_shaka
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:7:london_commandments_of_dub:credited_to:london_artist_jah_shaka","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='jah-shaka'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:7:london_commandments_of_dub:credited_to:london_artist_jah_shaka'
where s.slug='london-commandments-of-dub'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:london:graph:8:london_bass_culture_lkj:credited_to:london_artist_lkj
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-bass-culture-lkj'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='linton-kwesi-johnson'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"subject_seed_id":"london_bass_culture_lkj","object_seed_id":"london_artist_lkj","credit_role":"primary_artist","seed_claim_key":"seed:london:graph:8:london_bass_culture_lkj:credited_to:london_artist_lkj","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:8:london_bass_culture_lkj:credited_to:london_artist_lkj'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-bass-culture-lkj'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='linton-kwesi-johnson'), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_bass_culture_lkj","object_seed_id":"london_artist_lkj","credit_role":"primary_artist","seed_claim_key":"seed:london:graph:8:london_bass_culture_lkj:credited_to:london_artist_lkj","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:8:london_bass_culture_lkj:credited_to:london_artist_lkj');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('london_museum_dub_records', 'musicbrainz_artist_identity', 'musicbrainz_recording_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:8:london_bass_culture_lkj:credited_to:london_artist_lkj'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 8 london_bass_culture_lkj credited_to london_artist_lkj
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:8:london_bass_culture_lkj:credited_to:london_artist_lkj","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='linton-kwesi-johnson'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:8:london_bass_culture_lkj:credited_to:london_artist_lkj'
where s.slug='london-bass-culture-lkj'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:london:graph:9:london_robotiks_mad_professor:credited_to:london_artist_robotiks
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-robotiks-my-computers-acting-strange'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='the-robotiks'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"subject_seed_id":"london_robotiks_mad_professor","object_seed_id":"london_artist_robotiks","credit_role":"primary_artist","seed_claim_key":"seed:london:graph:9:london_robotiks_mad_professor:credited_to:london_artist_robotiks","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:9:london_robotiks_mad_professor:credited_to:london_artist_robotiks'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-robotiks-my-computers-acting-strange'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='the-robotiks'), null,
  null, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_robotiks_mad_professor","object_seed_id":"london_artist_robotiks","credit_role":"primary_artist","seed_claim_key":"seed:london:graph:9:london_robotiks_mad_professor:credited_to:london_artist_robotiks","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:9:london_robotiks_mad_professor:credited_to:london_artist_robotiks');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_catalogue', 'ariwa_official_story', 'london_museum_dub_records', 'musicbrainz_recording_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:9:london_robotiks_mad_professor:credited_to:london_artist_robotiks'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 9 london_robotiks_mad_professor credited_to london_artist_robotiks
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:9:london_robotiks_mad_professor:credited_to:london_artist_robotiks","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='the-robotiks'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:9:london_robotiks_mad_professor:credited_to:london_artist_robotiks'
where s.slug='london-robotiks-my-computers-acting-strange'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:london:graph:10:london_robotiks_mad_professor:credited_to:london_artist_mad_professor
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='london-robotiks-my-computers-acting-strange'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='mad-professor'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"subject_seed_id":"london_robotiks_mad_professor","object_seed_id":"london_artist_mad_professor","credit_role":"production_context","seed_claim_key":"seed:london:graph:10:london_robotiks_mad_professor:credited_to:london_artist_mad_professor","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:london:graph:10:london_robotiks_mad_professor:credited_to:london_artist_mad_professor'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='london-robotiks-my-computers-acting-strange'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='mad-professor'), null,
  null, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"london_robotiks_mad_professor","object_seed_id":"london_artist_mad_professor","credit_role":"production_context","seed_claim_key":"seed:london:graph:10:london_robotiks_mad_professor:credited_to:london_artist_mad_professor","seed_framework":"world-history-seed-v0.1","pilot_key":"london"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:london:graph:10:london_robotiks_mad_professor:credited_to:london_artist_mad_professor');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('ariwa_official_catalogue', 'ariwa_official_story', 'london_museum_dub_records', 'musicbrainz_artist_identity', 'musicbrainz_recording_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:london:graph:10:london_robotiks_mad_professor:credited_to:london_artist_mad_professor'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 10 london_robotiks_mad_professor credited_to london_artist_mad_professor
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:london:graph:10:london_robotiks_mad_professor:credited_to:london_artist_mad_professor","pilot_key":"london"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='mad-professor'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:london:graph:10:london_robotiks_mad_professor:credited_to:london_artist_mad_professor'
where s.slug='london-robotiks-my-computers-acting-strange'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- Preview verification: all rows remain draft; no publication/playback action occurs.
select count(*) as pilot_entities from public.world_cultural_entities where metadata->>'pilot_key'='london';
select count(*) as pilot_claims from public.world_claims where metadata->>'pilot_key'='london';
select count(*) as pilot_place_edges from public.world_cultural_entity_places edge join public.world_cultural_entities ce on ce.id=edge.cultural_entity_id where ce.metadata->>'pilot_key'='london';
select count(*) as pilot_graph_edges from public.world_cultural_relationships rel where rel.metadata->>'pilot_key'='london';
select count(*) as forbidden_published_rows from public.world_cultural_entities where metadata->>'pilot_key'='london' and publication_status='published';

