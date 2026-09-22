-- GOVERNED ACTIVATION MIGRATION (local isolated rehearsal)
-- Source artifact: implementation/phase2/generated/lagos_canonical_promotion_preview.sql
-- Compiled by compile_pilot_canonical_preview.py (validated 27 checks).
-- Preview wrapper lines removed so migration governance owns atomicity.

-- Tourify World of Music — Lagos canonical promotion preview v0.1
-- G1-BLOCKED / REVIEW ONLY / DO NOT APPLY TO TOURIFY DEMO
-- Promotes reviewed seed structure into canonical DRAFT rows only.
-- This transaction ALWAYS ends with ROLLBACK.
-- Expected entities: 18
-- Expected cultural-place edges: 18
-- Expected cultural relationships: 11
-- Expected claims: 48


do $$
declare
  v_missing integer;
begin
  if to_regclass('public.geo_places') is null or to_regclass('public.world_cultural_entities') is null then
    raise exception 'G1 World tables are not present';
  end if;
  if not exists (select 1 from public.geo_places where canonical_path = 'ng/lagos') then
    raise exception 'Lagos canonical geo place is missing';
  end if;
  select count(*) into v_missing from (values
    ('fela_1972_shrine'),
    ('fela_kalakuta_museum'),
    ('fela_official_1977'),
    ('fela_official_shrine'),
    ('grammy_afrobeats_evolution'),
    ('grammy_alte'),
    ('grammy_kuti_guide'),
    ('musicbrainz_artist_identity'),
    ('smithsonian_fela_book'),
    ('wikidata_geo'),
    ('wikidata_identity')
  ) required(source_key)
  where not exists (select 1 from public.world_sources s where s.source_key = required.source_key);
  if v_missing > 0 then raise exception '% Lagos source registry rows are missing', v_missing; end if;

  select count(*) into v_missing from (values
    ('cultural_place', 'associated_with'),
    ('cultural_place', 'developed_in'),
    ('cultural_place', 'historically_significant_in'),
    ('cultural_graph', 'credited_to'),
    ('cultural_graph', 'influenced_by'),
    ('cultural_graph', 'related_to'),
    ('cultural_graph', 'uses_instrument')
  ) required(domain, relation_key)
  where not exists (select 1 from public.world_relation_types r where r.domain=required.domain and r.relation_key=required.relation_key);
  if v_missing > 0 then raise exception '% required relation types are missing', v_missing; end if;
end $$;

-- Resolve the canonical Lagos place once for claim/edge construction.
create temporary table _world_lagos_place on commit drop as
select id, canonical_path from public.geo_places where canonical_path = 'ng/lagos';

-- ENTITY lagos_afrobeat
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'lagos-afrobeat', 'Afrobeat', 'A genre pioneered by Fela Kuti that combined African musical traditions with funk, jazz, rock and related diasporic influences, and became deeply linked with Lagos cultural and political life.',
  1960, null, '{"seed_id":"lagos_afrobeat","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_afrobeat_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'lagos-afrobeat-sound-signature', 'Afrobeat sound signature', 'A listening guide to broad traits documented in accounts of Fela Kuti’s Afrobeat.',
  null, null, '{"listen_for":["layered percussion and rhythm","prominent horn writing","extended instrumental development","funk- and jazz-informed groove","repeated vocal/political refrain structures"],"techniques":["improvisation","long-form ensemble arrangement"],"context":["Afrobeat is distinct from the later umbrella term Afrobeats."],"audio_policy":"description_only_until_rights_cleared","seed_id":"lagos_afrobeat_sound_signature","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_old_afrika_shrine
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'studio_landmark', 'lagos-old-afrika-shrine', 'Afrika Shrine (Fela-era Lagos venue)', 'The Fela-era Afrika Shrine functioned as a Lagos performance, political and cultural hub; it is historically distinct from the later New Afrika Shrine in Ikeja.',
  1972, null, '{"landmark_type":"performance_space_and_cultural_hub","media_policy":"link_only_until_cleared","identity_note":"Do not conflate with New Afrika Shrine; exact historical site identity remains under review.","seed_id":"lagos_old_afrika_shrine","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_afrobeat_political_stage
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'movement', 'lagos-afrobeat-political-stage', 'Afrobeat as political performance', 'Fela’s Lagos-based Afrobeat combined music and anti-establishment political expression, making the scene inseparable from postcolonial social history.',
  1970, null, '{"seed_id":"lagos_afrobeat_political_stage","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_zombie_fela
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'lagos-zombie-fela', 'Zombie', 'A major Fela recording associated with the confrontational political phase of 1970s Afrobeat.',
  1977, 1977, '{"artist_name":"Fela Kuti & Africa 70","title":"Zombie","release_year":1977,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Fela Kuti & Africa 70 Zombie"},"release_year_note":"Official catalog presents the release as 1976/1977; seed uses 1977 for the timeline and preserves the note.","credit_components":[{"artist_seed_id":"lagos_artist_fela_kuti","role":"primary_artist"},{"artist_seed_id":"lagos_artist_africa_70","role":"ensemble"}],"seed_id":"lagos_zombie_fela","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_afrobeats
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'genre', 'lagos-afrobeats', 'Afrobeats', 'A broad, fluid umbrella for contemporary West African pop sounds, distinct from Fela Kuti’s singular Afrobeat genre.',
  2010, null, '{"seed_id":"lagos_afrobeats","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_afrobeats_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'lagos-afrobeats-sound-signature', 'Afrobeats listening frame', 'A deliberately broad listening frame for the Lagos-centered contemporary pop ecosystem rather than a fixed sonic formula.',
  null, null, '{"listen_for":["beat-forward contemporary production","cross-genre pop synthesis","frequent movement between local and diaspora influences"],"techniques":[],"context":["Afrobeats is an umbrella term; Tourify should not reduce it to one rhythm or production template."],"audio_policy":"description_only_until_rights_cleared","seed_id":"lagos_afrobeats_sound_signature","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_ojuelegba_wizkid
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'recording_reference', 'lagos-ojuelegba-wizkid', 'Ojuelegba', 'An autobiographical Afrobeats landmark named for a Lagos mainland intersection/neighborhood and associated with the genre’s international crossover.',
  2014, 2014, '{"artist_name":"Wizkid","title":"Ojuelegba","release_year":2014,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Wizkid Ojuelegba"},"credit_components":[{"artist_seed_id":"lagos_artist_wizkid","role":"primary_artist"}],"seed_id":"lagos_ojuelegba_wizkid","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_alte
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'scene', 'lagos-alte', 'Alté', 'A Nigerian alternative scene/genre label coined by DRB LasGidi in 2014 and associated with cross-genre experimentation in Lagos and beyond.',
  2014, null, '{"seed_id":"lagos_alte","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_alte_sound_signature
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'sound_signature', 'lagos-alte-sound-signature', 'Alté listening frame', 'A listening frame for the intentionally hybrid Alté ecosystem.',
  null, null, '{"listen_for":["Afrobeats-adjacent rhythmic language","R&B and soul influence","rap and pop crossover","dancehall influence","visual/aesthetic experimentation"],"techniques":[],"context":["Alté functions as both a music and creative-cultural identity; artists vary widely."],"audio_policy":"description_only_until_rights_cleared","seed_id":"lagos_alte_sound_signature","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_fela_tenor_saxophone
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'fela-tenor-saxophone', 'Tenor saxophone in Fela’s Afrobeat practice', 'The Kalakuta Museum preserves Fela Kuti’s painted signature tenor saxophone, making the instrument a tangible link to his performance practice.',
  1970, null, '{"instrument_family":"woodwind","sound_role":"lead melodic voice, solos and horn-section color","listen_for":["forceful saxophone lines and solos","dialogue with repeated horn figures"],"audio_policy":"description_only_until_rights_cleared","seed_id":"lagos_fela_tenor_saxophone","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_afrobeat_percussion
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'instrument', 'afrobeat-percussion-ensemble', 'Layered percussion in Afrobeat', 'Afrobeat’s ensemble sound prominently uses layered percussion alongside horns, rhythm section and call-and-response vocals.',
  1970, null, '{"instrument_family":"percussion_ensemble","sound_role":"interlocking rhythmic layers and groove","listen_for":["multiple repeating percussion patterns","rhythmic layering beneath horns and vocals"],"audio_policy":"description_only_until_rights_cleared","seed_id":"lagos_afrobeat_percussion","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_kalakuta_museum
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'studio_landmark', 'lagos-kalakuta-museum', 'Kalakuta Museum', 'Fela Kuti’s former Lagos home is preserved as the Kalakuta Museum, with historic materials and instruments including his tenor saxophone.',
  2012, null, '{"landmark_type":"museum_and_former_residence","address_text":"7 Gbemisola Street, Allen, Ikeja, Lagos, Nigeria","media_policy":"link_only_until_cleared","identity_note":"Do not use Wikidata Q3743182 as the museum identifier; that item represents the historical Kalakuta Republic context.","seed_id":"lagos_kalakuta_museum","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_africa_shrine_1972
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'historical_milestone', 'lagos-africa-shrine-1972', 'Africa Shrine opens at the Empire Hotel site', 'In 1972 Fela renamed his Surulere venue the Africa Shrine, developing it as a performance space and political-cultural salon.',
  1972, null, '{"context_type":"venue_history","seed_id":"lagos_africa_shrine_1972","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_artist_fela_kuti
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'fela-kuti', 'Fela Kuti', 'External knowledge-graph identity for Fela Kuti; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"6514cffa-fbe0-4965-ad88-e998ead8a82a","wikidata_qid":"Q313868","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"lagos_artist_fela_kuti","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_artist_africa_70
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'africa-70', 'Africa 70', 'External knowledge-graph identity for Africa 70; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"dc45f2dc-ef36-4a7a-aa52-97495fca8ced","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"lagos_artist_africa_70","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_artist_wizkid
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'artist_reference', 'wizkid', 'Wizkid', 'External knowledge-graph identity for Wizkid; this record is not a Tourify user or artist profile.',
  null, null, '{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"efc5d365-a448-4e2f-9b5f-4a7c84be725c","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20","seed_id":"lagos_artist_wizkid","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- ENTITY lagos_new_afrika_shrine
insert into public.world_cultural_entities (
  entity_type, slug, canonical_name, short_description, start_year, end_year, metadata, review_status, publication_status
) values (
  'studio_landmark', 'lagos-new-afrika-shrine', 'New Afrika Shrine', 'The New Afrika Shrine is a present-day performance and cultural venue in Ikeja that continues the Shrine tradition associated with Fela Kuti’s legacy.',
  2000, null, '{"landmark_type":"performance_space_and_cultural_hub","address_text":"NERDC Rd, Agidingbi 101233, Ikeja, Lagos State, Nigeria","media_policy":"link_only_until_cleared","external_ids":{"wikidata_qid":"Q25045334","musicbrainz_place_mbid":"1de41090-0afd-4e43-bb03-2bba7d41e2f3"},"center":{"lat":6.6228379,"lng":3.3568144},"seed_id":"lagos_new_afrika_shrine","pilot_key":"lagos","seed_framework":"world-history-seed-v0.1"}'::jsonb, 'needs_review', 'draft'
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

-- CLAIM seed:lagos:overview:musical_identity
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'place',
    subject_id = (select id::text from _world_lagos_place),
    predicate = 'musical_identity',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Lagos’s pilot history distinguishes Fela Kuti’s Afrobeat from the later Afrobeats umbrella and includes the city’s Shrine tradition, political performance history, and Alté-era experimentation."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"place_path":"ng/lagos","seed_claim_key":"seed:lagos:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:overview:musical_identity'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'place', (select id::text from _world_lagos_place), 'musical_identity',
  null, null, '{"text":"Lagos’s pilot history distinguishes Fela Kuti’s Afrobeat from the later Afrobeats umbrella and includes the city’s Shrine tradition, political performance history, and Alté-era experimentation."}'::jsonb,
  null, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"place_path":"ng/lagos","seed_claim_key":"seed:lagos:overview:musical_identity","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:overview:musical_identity');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'grammy_afrobeats_evolution', 'grammy_alte', 'grammy_kuti_guide', 'smithsonian_fela_book')
where c.metadata->>'seed_claim_key' = 'seed:lagos:overview:musical_identity'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_afrobeat:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A genre pioneered by Fela Kuti that combined African musical traditions with funk, jazz, rock and related diasporic influences, and became deeply linked with Lagos cultural and political life."}'::jsonb,
    temporal_start_year = 1960,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"lagos_afrobeat","entity_slug":"lagos-afrobeat","seed_claim_key":"seed:lagos:entity:lagos_afrobeat:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'), 'summary',
  null, null, '{"text":"A genre pioneered by Fela Kuti that combined African musical traditions with funk, jazz, rock and related diasporic influences, and became deeply linked with Lagos cultural and political life."}'::jsonb,
  1960, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeat","entity_slug":"lagos-afrobeat","seed_claim_key":"seed:lagos:entity:lagos_afrobeat:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_kuti_guide', 'smithsonian_fela_book')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_afrobeat:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 1960,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"lagos_afrobeat","entity_slug":"lagos-afrobeat","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeat:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'), 'developed_in',
  'place', (select id::text from _world_lagos_place), null,
  1960, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeat","entity_slug":"lagos-afrobeat","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeat:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_kuti_guide', 'smithsonian_fela_book')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_afrobeat
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1960, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_afrobeat:place:developed_in'
where ce.slug='lagos-afrobeat'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1960,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_afrobeat_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening guide to broad traits documented in accounts of Fela Kuti’s Afrobeat."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"lagos_afrobeat_sound_signature","entity_slug":"lagos-afrobeat-sound-signature","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-sound-signature'), 'summary',
  null, null, '{"text":"A listening guide to broad traits documented in accounts of Fela Kuti’s Afrobeat."}'::jsonb,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeat_sound_signature","entity_slug":"lagos-afrobeat-sound-signature","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_kuti_guide')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_afrobeat_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.880,
    metadata = metadata || '{"seed_id":"lagos_afrobeat_sound_signature","entity_slug":"lagos-afrobeat-sound-signature","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-sound-signature'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  null, null, 0.880, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeat_sound_signature","entity_slug":"lagos-afrobeat-sound-signature","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_kuti_guide')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_afrobeat_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_afrobeat_sound_signature:place:associated_with'
where ce.slug='lagos-afrobeat-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_old_afrika_shrine:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-old-afrika-shrine'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The Fela-era Afrika Shrine functioned as a Lagos performance, political and cultural hub; it is historically distinct from the later New Afrika Shrine in Ikeja."}'::jsonb,
    temporal_start_year = 1972,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"lagos_old_afrika_shrine","entity_slug":"lagos-old-afrika-shrine","seed_claim_key":"seed:lagos:entity:lagos_old_afrika_shrine:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_old_afrika_shrine:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-old-afrika-shrine'), 'summary',
  null, null, '{"text":"The Fela-era Afrika Shrine functioned as a Lagos performance, political and cultural hub; it is historically distinct from the later New Afrika Shrine in Ikeja."}'::jsonb,
  1972, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_old_afrika_shrine","entity_slug":"lagos-old-afrika-shrine","seed_claim_key":"seed:lagos:entity:lagos_old_afrika_shrine:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_old_afrika_shrine:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'smithsonian_fela_book')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_old_afrika_shrine:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_old_afrika_shrine:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-old-afrika-shrine'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 1972,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"lagos_old_afrika_shrine","entity_slug":"lagos-old-afrika-shrine","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_old_afrika_shrine:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_old_afrika_shrine:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-old-afrika-shrine'), 'historically_significant_in',
  'place', (select id::text from _world_lagos_place), null,
  1972, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_old_afrika_shrine","entity_slug":"lagos-old-afrika-shrine","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_old_afrika_shrine:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_old_afrika_shrine:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'smithsonian_fela_book')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_old_afrika_shrine:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_old_afrika_shrine
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1972, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_old_afrika_shrine:place:historically_significant_in'
where ce.slug='lagos-old-afrika-shrine'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1972,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_afrobeat_political_stage:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-political-stage'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Fela’s Lagos-based Afrobeat combined music and anti-establishment political expression, making the scene inseparable from postcolonial social history."}'::jsonb,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"lagos_afrobeat_political_stage","entity_slug":"lagos-afrobeat-political-stage","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_political_stage:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_political_stage:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-political-stage'), 'summary',
  null, null, '{"text":"Fela’s Lagos-based Afrobeat combined music and anti-establishment political expression, making the scene inseparable from postcolonial social history."}'::jsonb,
  1970, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeat_political_stage","entity_slug":"lagos-afrobeat-political-stage","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_political_stage:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_political_stage:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_kuti_guide', 'smithsonian_fela_book')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_political_stage:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_afrobeat_political_stage:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-political-stage'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"lagos_afrobeat_political_stage","entity_slug":"lagos-afrobeat-political-stage","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_political_stage:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_political_stage:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-political-stage'), 'developed_in',
  'place', (select id::text from _world_lagos_place), null,
  1970, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeat_political_stage","entity_slug":"lagos-afrobeat-political-stage","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_political_stage:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_political_stage:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_kuti_guide', 'smithsonian_fela_book')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_political_stage:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_afrobeat_political_stage
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1970, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_afrobeat_political_stage:place:developed_in'
where ce.slug='lagos-afrobeat-political-stage'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1970,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_zombie_fela:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-zombie-fela'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A major Fela recording associated with the confrontational political phase of 1970s Afrobeat."}'::jsonb,
    temporal_start_year = 1977,
    temporal_end_year = 1977,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"lagos_zombie_fela","entity_slug":"lagos-zombie-fela","seed_claim_key":"seed:lagos:entity:lagos_zombie_fela:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_zombie_fela:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-zombie-fela'), 'summary',
  null, null, '{"text":"A major Fela recording associated with the confrontational political phase of 1970s Afrobeat."}'::jsonb,
  1977, 1977, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_zombie_fela","entity_slug":"lagos-zombie-fela","seed_claim_key":"seed:lagos:entity:lagos_zombie_fela:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_zombie_fela:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_1977', 'grammy_kuti_guide', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_zombie_fela:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_zombie_fela:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-zombie-fela'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 1977,
    temporal_end_year = 1977,
    confidence = 0.950,
    metadata = metadata || '{"seed_id":"lagos_zombie_fela","entity_slug":"lagos-zombie-fela","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_zombie_fela:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_zombie_fela:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-zombie-fela'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  1977, 1977, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_zombie_fela","entity_slug":"lagos-zombie-fela","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_zombie_fela:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_zombie_fela:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_1977', 'grammy_kuti_guide', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_zombie_fela:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_zombie_fela
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1977, 1977, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_zombie_fela:place:associated_with'
where ce.slug='lagos-zombie-fela'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1977,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_afrobeats:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeats'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A broad, fluid umbrella for contemporary West African pop sounds, distinct from Fela Kuti’s singular Afrobeat genre."}'::jsonb,
    temporal_start_year = 2010,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"lagos_afrobeats","entity_slug":"lagos-afrobeats","seed_claim_key":"seed:lagos:entity:lagos_afrobeats:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeats'), 'summary',
  null, null, '{"text":"A broad, fluid umbrella for contemporary West African pop sounds, distinct from Fela Kuti’s singular Afrobeat genre."}'::jsonb,
  2010, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeats","entity_slug":"lagos-afrobeats","seed_claim_key":"seed:lagos:entity:lagos_afrobeats:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_afrobeats:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeats'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 2010,
    temporal_end_year = null,
    confidence = 0.930,
    metadata = metadata || '{"seed_id":"lagos_afrobeats","entity_slug":"lagos-afrobeats","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeats:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeats'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  2010, null, 0.930, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeats","entity_slug":"lagos-afrobeats","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeats:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_afrobeats
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2010, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_afrobeats:place:associated_with'
where ce.slug='lagos-afrobeats'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2010,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_afrobeats_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeats-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A deliberately broad listening frame for the Lagos-centered contemporary pop ecosystem rather than a fixed sonic formula."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.820,
    metadata = metadata || '{"seed_id":"lagos_afrobeats_sound_signature","entity_slug":"lagos-afrobeats-sound-signature","seed_claim_key":"seed:lagos:entity:lagos_afrobeats_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeats-sound-signature'), 'summary',
  null, null, '{"text":"A deliberately broad listening frame for the Lagos-centered contemporary pop ecosystem rather than a fixed sonic formula."}'::jsonb,
  null, null, 0.820, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeats_sound_signature","entity_slug":"lagos-afrobeats-sound-signature","seed_claim_key":"seed:lagos:entity:lagos_afrobeats_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_afrobeats_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeats-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.820,
    metadata = metadata || '{"seed_id":"lagos_afrobeats_sound_signature","entity_slug":"lagos-afrobeats-sound-signature","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeats_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeats-sound-signature'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  null, null, 0.820, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeats_sound_signature","entity_slug":"lagos-afrobeats-sound-signature","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeats_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeats_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_afrobeats_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_afrobeats_sound_signature:place:associated_with'
where ce.slug='lagos-afrobeats-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_ojuelegba_wizkid:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-ojuelegba-wizkid'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"An autobiographical Afrobeats landmark named for a Lagos mainland intersection/neighborhood and associated with the genre’s international crossover."}'::jsonb,
    temporal_start_year = 2014,
    temporal_end_year = 2014,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"lagos_ojuelegba_wizkid","entity_slug":"lagos-ojuelegba-wizkid","seed_claim_key":"seed:lagos:entity:lagos_ojuelegba_wizkid:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_ojuelegba_wizkid:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-ojuelegba-wizkid'), 'summary',
  null, null, '{"text":"An autobiographical Afrobeats landmark named for a Lagos mainland intersection/neighborhood and associated with the genre’s international crossover."}'::jsonb,
  2014, 2014, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_ojuelegba_wizkid","entity_slug":"lagos-ojuelegba-wizkid","seed_claim_key":"seed:lagos:entity:lagos_ojuelegba_wizkid:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_ojuelegba_wizkid:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_ojuelegba_wizkid:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_ojuelegba_wizkid:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-ojuelegba-wizkid'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 2014,
    temporal_end_year = 2014,
    confidence = 0.960,
    metadata = metadata || '{"seed_id":"lagos_ojuelegba_wizkid","entity_slug":"lagos-ojuelegba-wizkid","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_ojuelegba_wizkid:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_ojuelegba_wizkid:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-ojuelegba-wizkid'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  2014, 2014, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_ojuelegba_wizkid","entity_slug":"lagos-ojuelegba-wizkid","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_ojuelegba_wizkid:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_ojuelegba_wizkid:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_ojuelegba_wizkid:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_ojuelegba_wizkid
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2014, 2014, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_ojuelegba_wizkid:place:associated_with'
where ce.slug='lagos-ojuelegba-wizkid'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2014,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_alte:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-alte'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A Nigerian alternative scene/genre label coined by DRB LasGidi in 2014 and associated with cross-genre experimentation in Lagos and beyond."}'::jsonb,
    temporal_start_year = 2014,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"lagos_alte","entity_slug":"lagos-alte","seed_claim_key":"seed:lagos:entity:lagos_alte:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-alte'), 'summary',
  null, null, '{"text":"A Nigerian alternative scene/genre label coined by DRB LasGidi in 2014 and associated with cross-genre experimentation in Lagos and beyond."}'::jsonb,
  2014, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_alte","entity_slug":"lagos-alte","seed_claim_key":"seed:lagos:entity:lagos_alte:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_alte')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_alte:place:developed_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-alte'),
    predicate = 'developed_in',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 2014,
    temporal_end_year = null,
    confidence = 0.920,
    metadata = metadata || '{"seed_id":"lagos_alte","entity_slug":"lagos-alte","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_alte:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte:place:developed_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-alte'), 'developed_in',
  'place', (select id::text from _world_lagos_place), null,
  2014, null, 0.920, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_alte","entity_slug":"lagos-alte","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_alte:place:developed_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte:place:developed_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_alte')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte:place:developed_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_alte
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2014, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='developed_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_alte:place:developed_in'
where ce.slug='lagos-alte'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2014,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_alte_sound_signature:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-alte-sound-signature'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"A listening frame for the intentionally hybrid Alté ecosystem."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"lagos_alte_sound_signature","entity_slug":"lagos-alte-sound-signature","seed_claim_key":"seed:lagos:entity:lagos_alte_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte_sound_signature:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-alte-sound-signature'), 'summary',
  null, null, '{"text":"A listening frame for the intentionally hybrid Alté ecosystem."}'::jsonb,
  null, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_alte_sound_signature","entity_slug":"lagos-alte-sound-signature","seed_claim_key":"seed:lagos:entity:lagos_alte_sound_signature:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte_sound_signature:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_alte')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte_sound_signature:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_alte_sound_signature:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-alte-sound-signature'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"seed_id":"lagos_alte_sound_signature","entity_slug":"lagos-alte-sound-signature","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_alte_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte_sound_signature:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-alte-sound-signature'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  null, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_alte_sound_signature","entity_slug":"lagos-alte-sound-signature","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_alte_sound_signature:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte_sound_signature:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_alte')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_alte_sound_signature:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_alte_sound_signature
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_alte_sound_signature:place:associated_with'
where ce.slug='lagos-alte-sound-signature'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_fela_tenor_saxophone:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='fela-tenor-saxophone'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The Kalakuta Museum preserves Fela Kuti’s painted signature tenor saxophone, making the instrument a tangible link to his performance practice."}'::jsonb,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_fela_tenor_saxophone","entity_slug":"fela-tenor-saxophone","seed_claim_key":"seed:lagos:entity:lagos_fela_tenor_saxophone:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_fela_tenor_saxophone:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='fela-tenor-saxophone'), 'summary',
  null, null, '{"text":"The Kalakuta Museum preserves Fela Kuti’s painted signature tenor saxophone, making the instrument a tangible link to his performance practice."}'::jsonb,
  1970, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_fela_tenor_saxophone","entity_slug":"fela-tenor-saxophone","seed_claim_key":"seed:lagos:entity:lagos_fela_tenor_saxophone:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_fela_tenor_saxophone:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_kalakuta_museum')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_fela_tenor_saxophone:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_fela_tenor_saxophone:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='fela-tenor-saxophone'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_fela_tenor_saxophone","entity_slug":"fela-tenor-saxophone","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_fela_tenor_saxophone:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_fela_tenor_saxophone:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='fela-tenor-saxophone'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  1970, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_fela_tenor_saxophone","entity_slug":"fela-tenor-saxophone","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_fela_tenor_saxophone:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_fela_tenor_saxophone:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_kalakuta_museum')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_fela_tenor_saxophone:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_fela_tenor_saxophone
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1970, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_fela_tenor_saxophone:place:associated_with'
where ce.slug='fela-tenor-saxophone'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1970,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_afrobeat_percussion:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='afrobeat-percussion-ensemble'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Afrobeat’s ensemble sound prominently uses layered percussion alongside horns, rhythm section and call-and-response vocals."}'::jsonb,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"lagos_afrobeat_percussion","entity_slug":"afrobeat-percussion-ensemble","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_percussion:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_percussion:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='afrobeat-percussion-ensemble'), 'summary',
  null, null, '{"text":"Afrobeat’s ensemble sound prominently uses layered percussion alongside horns, rhythm section and call-and-response vocals."}'::jsonb,
  1970, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeat_percussion","entity_slug":"afrobeat-percussion-ensemble","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_percussion:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_percussion:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_kuti_guide')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_percussion:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_afrobeat_percussion:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='afrobeat-percussion-ensemble'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 1970,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"seed_id":"lagos_afrobeat_percussion","entity_slug":"afrobeat-percussion-ensemble","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_percussion:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_percussion:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='afrobeat-percussion-ensemble'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  1970, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_afrobeat_percussion","entity_slug":"afrobeat-percussion-ensemble","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_afrobeat_percussion:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_percussion:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_kuti_guide')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_afrobeat_percussion:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_afrobeat_percussion
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1970, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_afrobeat_percussion:place:associated_with'
where ce.slug='afrobeat-percussion-ensemble'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1970,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_kalakuta_museum:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-kalakuta-museum'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"Fela Kuti’s former Lagos home is preserved as the Kalakuta Museum, with historic materials and instruments including his tenor saxophone."}'::jsonb,
    temporal_start_year = 2012,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_kalakuta_museum","entity_slug":"lagos-kalakuta-museum","seed_claim_key":"seed:lagos:entity:lagos_kalakuta_museum:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_kalakuta_museum:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-kalakuta-museum'), 'summary',
  null, null, '{"text":"Fela Kuti’s former Lagos home is preserved as the Kalakuta Museum, with historic materials and instruments including his tenor saxophone."}'::jsonb,
  2012, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_kalakuta_museum","entity_slug":"lagos-kalakuta-museum","seed_claim_key":"seed:lagos:entity:lagos_kalakuta_museum:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_kalakuta_museum:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_kalakuta_museum')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_kalakuta_museum:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_kalakuta_museum:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-kalakuta-museum'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 2012,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_kalakuta_museum","entity_slug":"lagos-kalakuta-museum","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_kalakuta_museum:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_kalakuta_museum:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-kalakuta-museum'), 'historically_significant_in',
  'place', (select id::text from _world_lagos_place), null,
  2012, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_kalakuta_museum","entity_slug":"lagos-kalakuta-museum","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_kalakuta_museum:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_kalakuta_museum:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_kalakuta_museum')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_kalakuta_museum:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_kalakuta_museum
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2012, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_kalakuta_museum:place:historically_significant_in'
where ce.slug='lagos-kalakuta-museum'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2012,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_africa_shrine_1972:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-africa-shrine-1972'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"In 1972 Fela renamed his Surulere venue the Africa Shrine, developing it as a performance space and political-cultural salon."}'::jsonb,
    temporal_start_year = 1972,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_africa_shrine_1972","entity_slug":"lagos-africa-shrine-1972","seed_claim_key":"seed:lagos:entity:lagos_africa_shrine_1972:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_africa_shrine_1972:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-africa-shrine-1972'), 'summary',
  null, null, '{"text":"In 1972 Fela renamed his Surulere venue the Africa Shrine, developing it as a performance space and political-cultural salon."}'::jsonb,
  1972, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_africa_shrine_1972","entity_slug":"lagos-africa-shrine-1972","seed_claim_key":"seed:lagos:entity:lagos_africa_shrine_1972:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_africa_shrine_1972:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_1972_shrine')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_africa_shrine_1972:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_africa_shrine_1972:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-africa-shrine-1972'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 1972,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_africa_shrine_1972","entity_slug":"lagos-africa-shrine-1972","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_africa_shrine_1972:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_africa_shrine_1972:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-africa-shrine-1972'), 'historically_significant_in',
  'place', (select id::text from _world_lagos_place), null,
  1972, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_africa_shrine_1972","entity_slug":"lagos-africa-shrine-1972","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_africa_shrine_1972:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_africa_shrine_1972:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_1972_shrine')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_africa_shrine_1972:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_africa_shrine_1972
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 1972, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_africa_shrine_1972:place:historically_significant_in'
where ce.slug='lagos-africa-shrine-1972'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(1972,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_artist_fela_kuti:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='fela-kuti'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Fela Kuti; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_artist_fela_kuti","entity_slug":"fela-kuti","seed_claim_key":"seed:lagos:entity:lagos_artist_fela_kuti:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_fela_kuti:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='fela-kuti'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Fela Kuti; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_artist_fela_kuti","entity_slug":"fela-kuti","seed_claim_key":"seed:lagos:entity:lagos_artist_fela_kuti:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_fela_kuti:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_fela_kuti:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_artist_fela_kuti:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='fela-kuti'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_artist_fela_kuti","entity_slug":"fela-kuti","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_artist_fela_kuti:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_fela_kuti:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='fela-kuti'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_artist_fela_kuti","entity_slug":"fela-kuti","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_artist_fela_kuti:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_fela_kuti:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_fela_kuti:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_artist_fela_kuti
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_artist_fela_kuti:place:associated_with'
where ce.slug='fela-kuti'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_artist_africa_70:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='africa-70'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Africa 70; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_artist_africa_70","entity_slug":"africa-70","seed_claim_key":"seed:lagos:entity:lagos_artist_africa_70:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_africa_70:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='africa-70'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Africa 70; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_artist_africa_70","entity_slug":"africa-70","seed_claim_key":"seed:lagos:entity:lagos_artist_africa_70:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_africa_70:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_africa_70:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_artist_africa_70:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='africa-70'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_artist_africa_70","entity_slug":"africa-70","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_artist_africa_70:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_africa_70:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='africa-70'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_artist_africa_70","entity_slug":"africa-70","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_artist_africa_70:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_africa_70:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_africa_70:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_artist_africa_70
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_artist_africa_70:place:associated_with'
where ce.slug='africa-70'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_artist_wizkid:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='wizkid'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"External knowledge-graph identity for Wizkid; this record is not a Tourify user or artist profile."}'::jsonb,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_artist_wizkid","entity_slug":"wizkid","seed_claim_key":"seed:lagos:entity:lagos_artist_wizkid:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_wizkid:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='wizkid'), 'summary',
  null, null, '{"text":"External knowledge-graph identity for Wizkid; this record is not a Tourify user or artist profile."}'::jsonb,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_artist_wizkid","entity_slug":"wizkid","seed_claim_key":"seed:lagos:entity:lagos_artist_wizkid:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_wizkid:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_wizkid:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_artist_wizkid:place:associated_with
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='wizkid'),
    predicate = 'associated_with',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"seed_id":"lagos_artist_wizkid","entity_slug":"wizkid","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_artist_wizkid:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_wizkid:place:associated_with'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='wizkid'), 'associated_with',
  'place', (select id::text from _world_lagos_place), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_artist_wizkid","entity_slug":"wizkid","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_artist_wizkid:place:associated_with","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_wizkid:place:associated_with');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_artist_wizkid:place:associated_with'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_artist_wizkid
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, null, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='associated_with'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_artist_wizkid:place:associated_with'
where ce.slug='wizkid'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(null,-2147483648)
  );

-- CLAIM seed:lagos:entity:lagos_new_afrika_shrine:summary
update public.world_claims
set claim_type = 'summary',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-new-afrika-shrine'),
    predicate = 'summary',
    object_kind = null,
    object_id = null,
    literal_value = '{"text":"The New Afrika Shrine is a present-day performance and cultural venue in Ikeja that continues the Shrine tradition associated with Fela Kuti’s legacy."}'::jsonb,
    temporal_start_year = 2000,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"lagos_new_afrika_shrine","entity_slug":"lagos-new-afrika-shrine","seed_claim_key":"seed:lagos:entity:lagos_new_afrika_shrine:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_new_afrika_shrine:summary'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'summary', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-new-afrika-shrine'), 'summary',
  null, null, '{"text":"The New Afrika Shrine is a present-day performance and cultural venue in Ikeja that continues the Shrine tradition associated with Fela Kuti’s legacy."}'::jsonb,
  2000, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_new_afrika_shrine","entity_slug":"lagos-new-afrika-shrine","seed_claim_key":"seed:lagos:entity:lagos_new_afrika_shrine:summary","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_new_afrika_shrine:summary');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'wikidata_geo')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_new_afrika_shrine:summary'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- CLAIM seed:lagos:entity:lagos_new_afrika_shrine:place:historically_significant_in
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-new-afrika-shrine'),
    predicate = 'historically_significant_in',
    object_kind = 'place',
    object_id = (select id::text from _world_lagos_place),
    literal_value = null,
    temporal_start_year = 2000,
    temporal_end_year = null,
    confidence = 0.940,
    metadata = metadata || '{"seed_id":"lagos_new_afrika_shrine","entity_slug":"lagos-new-afrika-shrine","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_new_afrika_shrine:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_new_afrika_shrine:place:historically_significant_in'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-new-afrika-shrine'), 'historically_significant_in',
  'place', (select id::text from _world_lagos_place), null,
  2000, null, 0.940, 'agent_candidate', 'needs_review', 'draft', '{"seed_id":"lagos_new_afrika_shrine","entity_slug":"lagos-new-afrika-shrine","place_path":"ng/lagos","seed_claim_key":"seed:lagos:entity:lagos_new_afrika_shrine:place:historically_significant_in","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_new_afrika_shrine:place:historically_significant_in');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'wikidata_geo')
where c.metadata->>'seed_claim_key' = 'seed:lagos:entity:lagos_new_afrika_shrine:place:historically_significant_in'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- PLACE_EDGE lagos_new_afrika_shrine
insert into public.world_cultural_entity_places (
  cultural_entity_id, place_id, relation_type_id, start_year, end_year, claim_id, review_status, publication_status
)
select ce.id, p.id, rt.id, 2000, null, c.id, 'needs_review', 'draft'
from public.world_cultural_entities ce
cross join _world_lagos_place p
join public.world_relation_types rt on rt.domain='cultural_place' and rt.relation_key='historically_significant_in'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:entity:lagos_new_afrika_shrine:place:historically_significant_in'
where ce.slug='lagos-new-afrika-shrine'
  and not exists (
    select 1 from public.world_cultural_entity_places edge
    where edge.cultural_entity_id=ce.id and edge.place_id=p.id and edge.relation_type_id=rt.id
      and coalesce(edge.start_year,-2147483648)=coalesce(2000,-2147483648)
  );

-- CLAIM seed:lagos:graph:1:lagos_afrobeats:influenced_by:lagos_afrobeat
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeats'),
    predicate = 'influenced_by',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.750,
    metadata = metadata || '{"subject_seed_id":"lagos_afrobeats","object_seed_id":"lagos_afrobeat","seed_claim_key":"seed:lagos:graph:1:lagos_afrobeats:influenced_by:lagos_afrobeat","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:1:lagos_afrobeats:influenced_by:lagos_afrobeat'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeats'), 'influenced_by',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'), null,
  null, null, 0.750, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_afrobeats","object_seed_id":"lagos_afrobeat","seed_claim_key":"seed:lagos:graph:1:lagos_afrobeats:influenced_by:lagos_afrobeat","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:1:lagos_afrobeats:influenced_by:lagos_afrobeat');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution', 'grammy_kuti_guide')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:1:lagos_afrobeats:influenced_by:lagos_afrobeat'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 1 lagos_afrobeats influenced_by lagos_afrobeat
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:1:lagos_afrobeats:influenced_by:lagos_afrobeat","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='lagos-afrobeat'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='influenced_by'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:1:lagos_afrobeats:influenced_by:lagos_afrobeat'
where s.slug='lagos-afrobeats'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:2:lagos_alte:related_to:lagos_afrobeats
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-alte'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeats'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.860,
    metadata = metadata || '{"subject_seed_id":"lagos_alte","object_seed_id":"lagos_afrobeats","seed_claim_key":"seed:lagos:graph:2:lagos_alte:related_to:lagos_afrobeats","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:2:lagos_alte:related_to:lagos_afrobeats'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-alte'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeats'), null,
  null, null, 0.860, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_alte","object_seed_id":"lagos_afrobeats","seed_claim_key":"seed:lagos:graph:2:lagos_alte:related_to:lagos_afrobeats","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:2:lagos_alte:related_to:lagos_afrobeats');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_alte')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:2:lagos_alte:related_to:lagos_afrobeats'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 2 lagos_alte related_to lagos_afrobeats
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:2:lagos_alte:related_to:lagos_afrobeats","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='lagos-afrobeats'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:2:lagos_alte:related_to:lagos_afrobeats'
where s.slug='lagos-alte'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:3:lagos_afrobeat:uses_instrument:lagos_fela_tenor_saxophone
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='fela-tenor-saxophone'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"subject_seed_id":"lagos_afrobeat","object_seed_id":"lagos_fela_tenor_saxophone","seed_claim_key":"seed:lagos:graph:3:lagos_afrobeat:uses_instrument:lagos_fela_tenor_saxophone","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:3:lagos_afrobeat:uses_instrument:lagos_fela_tenor_saxophone'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='fela-tenor-saxophone'), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_afrobeat","object_seed_id":"lagos_fela_tenor_saxophone","seed_claim_key":"seed:lagos:graph:3:lagos_afrobeat:uses_instrument:lagos_fela_tenor_saxophone","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:3:lagos_afrobeat:uses_instrument:lagos_fela_tenor_saxophone');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_kalakuta_museum')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:3:lagos_afrobeat:uses_instrument:lagos_fela_tenor_saxophone'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 3 lagos_afrobeat uses_instrument lagos_fela_tenor_saxophone
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:3:lagos_afrobeat:uses_instrument:lagos_fela_tenor_saxophone","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='fela-tenor-saxophone'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:3:lagos_afrobeat:uses_instrument:lagos_fela_tenor_saxophone'
where s.slug='lagos-afrobeat'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:4:lagos_afrobeat:uses_instrument:lagos_afrobeat_percussion
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'),
    predicate = 'uses_instrument',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='afrobeat-percussion-ensemble'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.900,
    metadata = metadata || '{"subject_seed_id":"lagos_afrobeat","object_seed_id":"lagos_afrobeat_percussion","seed_claim_key":"seed:lagos:graph:4:lagos_afrobeat:uses_instrument:lagos_afrobeat_percussion","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:4:lagos_afrobeat:uses_instrument:lagos_afrobeat_percussion'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'), 'uses_instrument',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='afrobeat-percussion-ensemble'), null,
  null, null, 0.900, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_afrobeat","object_seed_id":"lagos_afrobeat_percussion","seed_claim_key":"seed:lagos:graph:4:lagos_afrobeat:uses_instrument:lagos_afrobeat_percussion","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:4:lagos_afrobeat:uses_instrument:lagos_afrobeat_percussion');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_kuti_guide')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:4:lagos_afrobeat:uses_instrument:lagos_afrobeat_percussion'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 4 lagos_afrobeat uses_instrument lagos_afrobeat_percussion
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:4:lagos_afrobeat:uses_instrument:lagos_afrobeat_percussion","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='afrobeat-percussion-ensemble'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='uses_instrument'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:4:lagos_afrobeat:uses_instrument:lagos_afrobeat_percussion'
where s.slug='lagos-afrobeat'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:5:lagos_afrobeat_political_stage:related_to:lagos_africa_shrine_1972
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-political-stage'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='lagos-africa-shrine-1972'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"lagos_afrobeat_political_stage","object_seed_id":"lagos_africa_shrine_1972","seed_claim_key":"seed:lagos:graph:5:lagos_afrobeat_political_stage:related_to:lagos_africa_shrine_1972","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:5:lagos_afrobeat_political_stage:related_to:lagos_africa_shrine_1972'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat-political-stage'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-africa-shrine-1972'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_afrobeat_political_stage","object_seed_id":"lagos_africa_shrine_1972","seed_claim_key":"seed:lagos:graph:5:lagos_afrobeat_political_stage:related_to:lagos_africa_shrine_1972","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:5:lagos_afrobeat_political_stage:related_to:lagos_africa_shrine_1972');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_1972_shrine')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:5:lagos_afrobeat_political_stage:related_to:lagos_africa_shrine_1972'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 5 lagos_afrobeat_political_stage related_to lagos_africa_shrine_1972
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:5:lagos_afrobeat_political_stage:related_to:lagos_africa_shrine_1972","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='lagos-africa-shrine-1972'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:5:lagos_afrobeat_political_stage:related_to:lagos_africa_shrine_1972'
where s.slug='lagos-afrobeat-political-stage'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:6:lagos_zombie_fela:credited_to:lagos_artist_fela_kuti
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-zombie-fela'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='fela-kuti'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"lagos_zombie_fela","object_seed_id":"lagos_artist_fela_kuti","credit_role":"primary_artist","seed_claim_key":"seed:lagos:graph:6:lagos_zombie_fela:credited_to:lagos_artist_fela_kuti","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:6:lagos_zombie_fela:credited_to:lagos_artist_fela_kuti'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-zombie-fela'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='fela-kuti'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_zombie_fela","object_seed_id":"lagos_artist_fela_kuti","credit_role":"primary_artist","seed_claim_key":"seed:lagos:graph:6:lagos_zombie_fela:credited_to:lagos_artist_fela_kuti","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:6:lagos_zombie_fela:credited_to:lagos_artist_fela_kuti');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_1977', 'fela_official_shrine', 'grammy_kuti_guide', 'musicbrainz_artist_identity', 'wikidata_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:6:lagos_zombie_fela:credited_to:lagos_artist_fela_kuti'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 6 lagos_zombie_fela credited_to lagos_artist_fela_kuti
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:6:lagos_zombie_fela:credited_to:lagos_artist_fela_kuti","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='fela-kuti'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:6:lagos_zombie_fela:credited_to:lagos_artist_fela_kuti'
where s.slug='lagos-zombie-fela'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:7:lagos_zombie_fela:credited_to:lagos_artist_africa_70
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-zombie-fela'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='africa-70'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.950,
    metadata = metadata || '{"subject_seed_id":"lagos_zombie_fela","object_seed_id":"lagos_artist_africa_70","credit_role":"ensemble","seed_claim_key":"seed:lagos:graph:7:lagos_zombie_fela:credited_to:lagos_artist_africa_70","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:7:lagos_zombie_fela:credited_to:lagos_artist_africa_70'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-zombie-fela'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='africa-70'), null,
  null, null, 0.950, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_zombie_fela","object_seed_id":"lagos_artist_africa_70","credit_role":"ensemble","seed_claim_key":"seed:lagos:graph:7:lagos_zombie_fela:credited_to:lagos_artist_africa_70","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:7:lagos_zombie_fela:credited_to:lagos_artist_africa_70');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_1977', 'fela_official_shrine', 'grammy_kuti_guide', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:7:lagos_zombie_fela:credited_to:lagos_artist_africa_70'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 7 lagos_zombie_fela credited_to lagos_artist_africa_70
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:7:lagos_zombie_fela:credited_to:lagos_artist_africa_70","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='africa-70'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:7:lagos_zombie_fela:credited_to:lagos_artist_africa_70'
where s.slug='lagos-zombie-fela'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:8:lagos_ojuelegba_wizkid:credited_to:lagos_artist_wizkid
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-ojuelegba-wizkid'),
    predicate = 'credited_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='wizkid'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.960,
    metadata = metadata || '{"subject_seed_id":"lagos_ojuelegba_wizkid","object_seed_id":"lagos_artist_wizkid","credit_role":"primary_artist","seed_claim_key":"seed:lagos:graph:8:lagos_ojuelegba_wizkid:credited_to:lagos_artist_wizkid","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:8:lagos_ojuelegba_wizkid:credited_to:lagos_artist_wizkid'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-ojuelegba-wizkid'), 'credited_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='wizkid'), null,
  null, null, 0.960, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_ojuelegba_wizkid","object_seed_id":"lagos_artist_wizkid","credit_role":"primary_artist","seed_claim_key":"seed:lagos:graph:8:lagos_ojuelegba_wizkid:credited_to:lagos_artist_wizkid","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:8:lagos_ojuelegba_wizkid:credited_to:lagos_artist_wizkid');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('grammy_afrobeats_evolution', 'musicbrainz_artist_identity')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:8:lagos_ojuelegba_wizkid:credited_to:lagos_artist_wizkid'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 8 lagos_ojuelegba_wizkid credited_to lagos_artist_wizkid
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:8:lagos_ojuelegba_wizkid:credited_to:lagos_artist_wizkid","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='wizkid'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='credited_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:8:lagos_ojuelegba_wizkid:credited_to:lagos_artist_wizkid'
where s.slug='lagos-ojuelegba-wizkid'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:9:lagos_old_afrika_shrine:related_to:lagos_afrobeat
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-old-afrika-shrine'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.980,
    metadata = metadata || '{"subject_seed_id":"lagos_old_afrika_shrine","object_seed_id":"lagos_afrobeat","relationship_note":"Fela’s archive documents the Shrine as a core performance/political space during Afrobeat’s development.","seed_claim_key":"seed:lagos:graph:9:lagos_old_afrika_shrine:related_to:lagos_afrobeat","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:9:lagos_old_afrika_shrine:related_to:lagos_afrobeat'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-old-afrika-shrine'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-afrobeat'), null,
  null, null, 0.980, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_old_afrika_shrine","object_seed_id":"lagos_afrobeat","relationship_note":"Fela’s archive documents the Shrine as a core performance/political space during Afrobeat’s development.","seed_claim_key":"seed:lagos:graph:9:lagos_old_afrika_shrine:related_to:lagos_afrobeat","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:9:lagos_old_afrika_shrine:related_to:lagos_afrobeat');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine', 'smithsonian_fela_book')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:9:lagos_old_afrika_shrine:related_to:lagos_afrobeat'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 9 lagos_old_afrika_shrine related_to lagos_afrobeat
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:9:lagos_old_afrika_shrine:related_to:lagos_afrobeat","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='lagos-afrobeat'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:9:lagos_old_afrika_shrine:related_to:lagos_afrobeat'
where s.slug='lagos-old-afrika-shrine'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:10:lagos_kalakuta_museum:related_to:lagos_artist_fela_kuti
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-kalakuta-museum'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='fela-kuti'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.990,
    metadata = metadata || '{"subject_seed_id":"lagos_kalakuta_museum","object_seed_id":"lagos_artist_fela_kuti","relationship_note":"The museum occupies Fela’s former Kalakuta home and preserves objects from his life and career.","seed_claim_key":"seed:lagos:graph:10:lagos_kalakuta_museum:related_to:lagos_artist_fela_kuti","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:10:lagos_kalakuta_museum:related_to:lagos_artist_fela_kuti'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-kalakuta-museum'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='fela-kuti'), null,
  null, null, 0.990, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_kalakuta_museum","object_seed_id":"lagos_artist_fela_kuti","relationship_note":"The museum occupies Fela’s former Kalakuta home and preserves objects from his life and career.","seed_claim_key":"seed:lagos:graph:10:lagos_kalakuta_museum:related_to:lagos_artist_fela_kuti","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:10:lagos_kalakuta_museum:related_to:lagos_artist_fela_kuti');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_kalakuta_museum')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:10:lagos_kalakuta_museum:related_to:lagos_artist_fela_kuti'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 10 lagos_kalakuta_museum related_to lagos_artist_fela_kuti
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:10:lagos_kalakuta_museum:related_to:lagos_artist_fela_kuti","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='fela-kuti'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:10:lagos_kalakuta_museum:related_to:lagos_artist_fela_kuti'
where s.slug='lagos-kalakuta-museum'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- CLAIM seed:lagos:graph:11:lagos_new_afrika_shrine:related_to:lagos_artist_fela_kuti
update public.world_claims
set claim_type = 'relationship',
    subject_kind = 'cultural_entity',
    subject_id = (select id::text from public.world_cultural_entities where slug='lagos-new-afrika-shrine'),
    predicate = 'related_to',
    object_kind = 'cultural_entity',
    object_id = (select id::text from public.world_cultural_entities where slug='fela-kuti'),
    literal_value = null,
    temporal_start_year = null,
    temporal_end_year = null,
    confidence = 0.970,
    metadata = metadata || '{"subject_seed_id":"lagos_new_afrika_shrine","object_seed_id":"lagos_artist_fela_kuti","relationship_note":"Fela’s family built the New Afrika Shrine to preserve Fela and the original Shrine’s community/cultural legacy.","seed_claim_key":"seed:lagos:graph:11:lagos_new_afrika_shrine:related_to:lagos_artist_fela_kuti","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb,
    updated_at = now()
where metadata->>'seed_claim_key' = 'seed:lagos:graph:11:lagos_new_afrika_shrine:related_to:lagos_artist_fela_kuti'
  and publication_status = 'draft'
  and review_status in ('candidate','needs_review');

insert into public.world_claims (
  claim_type, subject_kind, subject_id, predicate, object_kind, object_id, literal_value,
  temporal_start_year, temporal_end_year, confidence, origin_type, review_status, publication_status, metadata
)
select
  'relationship', 'cultural_entity', (select id::text from public.world_cultural_entities where slug='lagos-new-afrika-shrine'), 'related_to',
  'cultural_entity', (select id::text from public.world_cultural_entities where slug='fela-kuti'), null,
  null, null, 0.970, 'agent_candidate', 'needs_review', 'draft', '{"subject_seed_id":"lagos_new_afrika_shrine","object_seed_id":"lagos_artist_fela_kuti","relationship_note":"Fela’s family built the New Afrika Shrine to preserve Fela and the original Shrine’s community/cultural legacy.","seed_claim_key":"seed:lagos:graph:11:lagos_new_afrika_shrine:related_to:lagos_artist_fela_kuti","seed_framework":"world-history-seed-v0.1","pilot_key":"lagos"}'::jsonb
where not exists (select 1 from public.world_claims where metadata->>'seed_claim_key' = 'seed:lagos:graph:11:lagos_new_afrika_shrine:related_to:lagos_artist_fela_kuti');

insert into public.world_claim_evidence (claim_id, source_id, rights_snapshot, evidence_status)
select c.id, s.id, jsonb_build_object(
  'license_class', s.license_class,
  'ingestion_permission', s.ingestion_permission,
  'media_reuse_permission', s.media_reuse_permission,
  'commercial_use_permission', s.commercial_use_permission
), 'supporting'
from public.world_claims c
join public.world_sources s on s.source_key in ('fela_official_shrine')
where c.metadata->>'seed_claim_key' = 'seed:lagos:graph:11:lagos_new_afrika_shrine:related_to:lagos_artist_fela_kuti'
  and not exists (
    select 1 from public.world_claim_evidence e
    where e.claim_id = c.id and e.source_id = s.id and e.evidence_status = 'supporting'
  );

-- GRAPH_EDGE 11 lagos_new_afrika_shrine related_to lagos_artist_fela_kuti
insert into public.world_cultural_relationships (
  subject_entity_id, relation_type_id, object_entity_id, claim_id, review_status, publication_status, metadata
)
select s.id, rt.id, o.id, c.id, 'needs_review', 'draft', '{"seed_relationship_key":"seed:lagos:graph:11:lagos_new_afrika_shrine:related_to:lagos_artist_fela_kuti","pilot_key":"lagos"}'::jsonb
from public.world_cultural_entities s
join public.world_cultural_entities o on o.slug='fela-kuti'
join public.world_relation_types rt on rt.domain='cultural_graph' and rt.relation_key='related_to'
join public.world_claims c on c.metadata->>'seed_claim_key'='seed:lagos:graph:11:lagos_new_afrika_shrine:related_to:lagos_artist_fela_kuti'
where s.slug='lagos-new-afrika-shrine'
  and not exists (
    select 1 from public.world_cultural_relationships rel
    where rel.subject_entity_id=s.id and rel.object_entity_id=o.id and rel.relation_type_id=rt.id
      and coalesce(rel.start_year,-2147483648)=-2147483648
  );

-- Preview verification: all rows remain draft; no publication/playback action occurs.
select count(*) as pilot_entities from public.world_cultural_entities where metadata->>'pilot_key'='lagos';
select count(*) as pilot_claims from public.world_claims where metadata->>'pilot_key'='lagos';
select count(*) as pilot_place_edges from public.world_cultural_entity_places edge join public.world_cultural_entities ce on ce.id=edge.cultural_entity_id where ce.metadata->>'pilot_key'='lagos';
select count(*) as pilot_graph_edges from public.world_cultural_relationships rel where rel.metadata->>'pilot_key'='lagos';
select count(*) as forbidden_published_rows from public.world_cultural_entities where metadata->>'pilot_key'='lagos' and publication_status='published';

