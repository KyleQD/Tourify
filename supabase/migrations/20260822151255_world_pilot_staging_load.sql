-- GOVERNED ACTIVATION MIGRATION (local isolated rehearsal)
-- Source artifact: implementation/phase2/generated/pilot_seed_candidates.sql
-- Converted per docs/24_G1_to_Detroit_Activation_Runbook.md A1-A4.
-- Preview wrapper lines (begin;/rollback;) removed so migration
-- governance owns atomicity. Local disposable database ONLY.

-- TOURIFY WORLD OF MUSIC — PILOT HISTORY SEED CANDIDATES
-- STAGING ONLY. DO NOT EXECUTE UNTIL G1 ISOLATED VALIDATION HAS PASSED.
-- Requires reviewed world_sources rows with matching source_key values.
-- Does not publish canonical facts or playable audio.


-- seed:detroit:overview:musical_identity
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'claim', 'seed:detroit:overview:musical_identity', '{"pilot_key":"detroit","place_path":"us/mi/detroit","claim":{"claim_type":"summary","subject_kind":"place","subject_id":"us/mi/detroit","predicate":"musical_identity","literal_value":{"text":"Detroit’s pilot history connects the Motown recording ecosystem of Hitsville U.S.A. with the city-area electronic innovations that shaped Detroit techno."},"source_keys":["detroit_historical_motown","motown_museum_legacy","detroit_historical_atkins","detroit_historical_may","detroit_historical_saunderson"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '959f993bef593ad194ae4d8cd5423cc9abb7320c36092f758330998af4fedd9d', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_motown'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_motown_founded_1959
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_motown_founded_1959', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_motown_founded_1959","entity_type":"historical_milestone","slug":"detroit-motown-founded-1959","canonical_name":"Motown is founded in Detroit","short_description":"Berry Gordy founded Tamla in 1959 and added the Motown label later that year, building the company around Detroit.","start_year":1959,"end_year":1959,"place_relation":"historically_significant_in","source_keys":["detroit_historical_motown","motown_museum_hitsville"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '45f8227644307d6051ec7e4319b9682c857c99dd7c88c65ab6677fa00f6f99a0', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_motown'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_hitsville_usa
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_hitsville_usa', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_hitsville_usa","entity_type":"studio_landmark","slug":"detroit-hitsville-usa","canonical_name":"Hitsville U.S.A.","short_description":"The West Grand Boulevard property became Motown’s headquarters and Studio A, where many Motown recordings were made.","start_year":1959,"end_year":1972,"place_relation":"historically_significant_in","source_keys":["detroit_historical_motown","motown_museum_hitsville","wikidata_geo","musicbrainz_geo"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"address_text":"2648 W. Grand Blvd., Detroit, Michigan","media_policy":"link_only_until_cleared","landmark_type":"recording_studio_and_museum","external_ids":{"wikidata_qid":"Q1987935","musicbrainz_place_mbid":"71939dd5-5b2f-442c-b984-b19f4ba38be7"}}}}'::jsonb, '4f40b6830e0659d2fc5d104ce9d2619d2624f429ab8ab67a031a877afe053bce', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_motown'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_motown_sound
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_motown_sound', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_motown_sound","entity_type":"genre","slug":"detroit-motown-sound","canonical_name":"Motown Sound","short_description":"A Detroit-associated soul sound developed around Motown’s writers, producers, singers, and house musicians.","start_year":1959,"end_year":null,"place_relation":"originated_in","source_keys":["detroit_historical_motown","motown_museum_legacy"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '6cd904aad9486474ab649dc9adaabb4527c6b25f380bf33fe7b6a075fd2f1be8', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_motown'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_motown_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_motown_sound_signature', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_motown_sound_signature","entity_type":"sound_signature","slug":"detroit-motown-sound-signature","canonical_name":"Motown sound signature","short_description":"A listening guide to recurring traits described by Motown Museum and Detroit Historical Society.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["detroit_historical_motown","motown_museum_legacy"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["driving backbeat","gospel-influenced call and response","jazz-influenced syncopation and improvisation","studio echo/reverb character"],"techniques":["Funk Brothers house-band interplay","echo-chamber processing"],"context":["The traits vary by recording and period; this is a listening guide, not a rule."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '6604bf59436ad3dd41a16dbc4d57f74d1046507709ae39de8f483dd621bb89b8', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_motown'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_money_barrett_strong
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_money_barrett_strong', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_money_barrett_strong","entity_type":"recording_reference","slug":"detroit-money-barrett-strong","canonical_name":"Money (That’s What I Want)","short_description":"An early Motown/Tamla breakthrough widely identified by Detroit institutions as the company’s first hit.","start_year":1959,"end_year":1959,"place_relation":"associated_with","source_keys":["detroit_historical_motown"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Barrett Strong","title":"Money (That’s What I Want)","release_year":1959,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Barrett Strong Money (That’s What I Want)"},"place_context":"recorded_in_detroit_motown_ecosystem","credit_components":[{"artist_seed_id":"detroit_artist_barrett_strong","role":"primary_artist"}]}}}'::jsonb, 'a1da87d1100848befff3505050e8447507d0d03e04ddb94780eec006994db7cd', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_motown'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_shop_around_miracles
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_shop_around_miracles', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_shop_around_miracles","entity_type":"recording_reference","slug":"detroit-shop-around-miracles","canonical_name":"Shop Around","short_description":"Motown’s first million-selling record, an early marker of the label’s national breakthrough.","start_year":1960,"end_year":1960,"place_relation":"associated_with","source_keys":["detroit_historical_motown"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"The Miracles","title":"Shop Around","release_year":1960,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Miracles Shop Around"},"place_context":"recorded_in_detroit_motown_ecosystem","credit_components":[{"artist_seed_id":"detroit_artist_miracles","role":"primary_artist"}]}}}'::jsonb, '7554601f9396e2e7cc218c79d9fe5d6203537362db299b0a9e17756749076f6f', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_motown'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_techno
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_techno', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_techno","entity_type":"genre","slug":"detroit-techno","canonical_name":"Detroit techno","short_description":"An electronic music tradition developed by Detroit-area innovators including Juan Atkins, Derrick May, and Kevin Saunderson.","start_year":1980,"end_year":null,"place_relation":"originated_in","source_keys":["detroit_historical_atkins","detroit_historical_may","detroit_historical_saunderson"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '1ed258a79b10d18cc227c5034ceeb7316bfadab0bf39828e92942fa8de8272c3', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_atkins'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_belleville_three
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_belleville_three', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_belleville_three","entity_type":"scene","slug":"detroit-belleville-three","canonical_name":"Belleville Three / early Detroit techno network","short_description":"Juan Atkins, Derrick May, and Kevin Saunderson became known as the Belleville Three and are central to the rise of Detroit techno.","start_year":1980,"end_year":null,"place_relation":"developed_in","source_keys":["detroit_historical_atkins","detroit_historical_may","detroit_historical_saunderson"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, 'fd2a557f3e8967aa971c811bff86a82ca55eb916cd8200d7472babdc304c27c4', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_atkins'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_techno_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_techno_sound_signature', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_techno_sound_signature","entity_type":"sound_signature","slug":"detroit-techno-sound-signature","canonical_name":"Early Detroit techno sound signature","short_description":"A listening guide to the futurist electronic palette documented around the early Detroit techno network.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["detroit_historical_atkins","detroit_historical_may"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["synthesized electronic textures","machine-driven rhythm","futurist atmosphere","funk-informed rhythmic sensibility"],"techniques":["electronic synthesis","DJ mix culture"],"context":["Influences documented by Detroit Historical Society include Parliament-Funkadelic, Kraftwerk, Gary Numan, The Electrifying Mojo, and cross-pollination with Chicago house."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'fb4af7f30a587cb170575c00fa772f9bba781572b5a67146eb4d17896df03e46', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_atkins'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_clear_cybotron
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_clear_cybotron', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_clear_cybotron","entity_type":"recording_reference","slug":"detroit-clear-cybotron","canonical_name":"Clear","short_description":"Juan Atkins’s Cybotron recording is identified by Detroit Historical Society as one of the group’s most notable hits.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["detroit_historical_atkins","musicbrainz_recording_identity"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Cybotron","title":"Clear","release_year":1983,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Cybotron Clear"},"credit_components":[{"artist_seed_id":"detroit_artist_cybotron","role":"primary_artist"}]}}}'::jsonb, '4ecb899081005cc6301385a5235ab2fc92c42f91ec5bfa7b4e1ca56eb2f9bf58', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_atkins'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_strings_of_life
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_strings_of_life', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_strings_of_life","entity_type":"recording_reference","slug":"detroit-strings-of-life","canonical_name":"Strings of Life","short_description":"A landmark Derrick May / Rhythim Is Rhythim recording that helped carry Detroit techno to audiences overseas.","start_year":1987,"end_year":1987,"place_relation":"associated_with","source_keys":["detroit_historical_may","detroit_historical_transmat","musicbrainz_artist_identity"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Rhythim Is Rhythim","title":"Strings of Life","release_year":1987,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Rhythim Is Rhythim Strings of Life"},"credit_components":[{"artist_seed_id":"detroit_artist_derrick_may","role":"primary_artist","credited_as":"Rhythim Is Rhythim"}]}}}'::jsonb, '97238a7e213338a964a85f800c8b17c951a1f5ddc17a26639a6db3755976caa7', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_may'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_good_life_inner_city
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_good_life_inner_city', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_good_life_inner_city","entity_type":"recording_reference","slug":"detroit-good-life-inner-city","canonical_name":"Good Life","short_description":"A popular Inner City dance recording associated with Kevin Saunderson’s Detroit techno lineage.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["detroit_historical_saunderson","musicbrainz_recording_identity"],"confidence":0.88,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Inner City","title":"Good Life","release_year":1988,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Inner City Good Life"},"credit_components":[{"artist_seed_id":"detroit_artist_inner_city","role":"primary_artist"}]}}}'::jsonb, '28617b0eb40b9c0b582b4885898a048928464167ba18bc3c5f56181e60707a19', 'new_candidate', 'needs_review', 0.880, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_saunderson'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_motown_electric_bass
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_motown_electric_bass', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_motown_electric_bass","entity_type":"instrument","slug":"electric-bass-guitar-motown","canonical_name":"Electric bass guitar — Motown rhythm section","short_description":"The electric bass is a defining part of the Motown rhythm-section vocabulary, strongly associated with Funk Brothers bassist James Jamerson.","start_year":1959,"end_year":null,"place_relation":"associated_with","source_keys":["motown_museum_funk_brothers"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"electric_string","sound_role":"low-register melodic and rhythmic foundation","listen_for":["mobile bass lines beneath vocal melodies","tight interaction with drums and keyboards"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '87dc88b3265c515e2f92be89ccf60a0872f5a6774130d96779c1230d32eeb7f2', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'motown_museum_funk_brothers'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_motown_drum_kit
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_motown_drum_kit', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_motown_drum_kit","entity_type":"instrument","slug":"drum-kit-motown","canonical_name":"Drum kit — Motown rhythm section","short_description":"Motown sessions relied on Detroit studio drummers including Benny Benjamin and Uriel Jones, placing the drum kit at the center of the Funk Brothers rhythm section.","start_year":1959,"end_year":null,"place_relation":"associated_with","source_keys":["motown_museum_funk_brothers"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"percussion","sound_role":"backbeat and rhythmic drive","listen_for":["firm backbeat","syncopated interaction with bass and tambourine/percussion"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '94f1b46f829ab36ad3391d5b9ba15500561d8a715bf9066e3e2d796c10791128', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'motown_museum_funk_brothers'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_techno_synthesizer
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_techno_synthesizer', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_techno_synthesizer","entity_type":"instrument","slug":"synthesizer-detroit-techno","canonical_name":"Synthesizer — early Detroit techno","short_description":"Detroit Historical Society describes early Detroit techno innovators working with a new generation of synthesizers as they shaped the genre in the 1980s.","start_year":1980,"end_year":null,"place_relation":"associated_with","source_keys":["detroit_historical_demf_tech"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"electronic","sound_role":"synthetic timbre, harmony, bass and futurist texture","listen_for":["synthetic bass and lead timbres","layered electronic textures"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '76f5a9871dcc5808f6e5eb9e0fee3ea5465b80f58aed7b8c4edf367d3c0f1cf2', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_demf_tech'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_techno_drum_machine
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_techno_drum_machine', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_techno_drum_machine","entity_type":"instrument","slug":"drum-machine-detroit-techno","canonical_name":"Drum machine — early Detroit techno","short_description":"A new generation of drum machines was part of the technology used by Detroit techno pioneers as the local electronic style formed.","start_year":1980,"end_year":null,"place_relation":"associated_with","source_keys":["detroit_historical_demf_tech"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"electronic_percussion","sound_role":"machine-driven pulse and programmed rhythm","listen_for":["precisely programmed kick/snare patterns","mechanical rhythmic repetition used expressively"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '9ba82394dceefdc3115b5edd7bfa67cf2fd8ebd5253b1a0644ad6d8dc28a8ccf', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_demf_tech'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_music_institute
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_music_institute', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_music_institute","entity_type":"studio_landmark","slug":"detroit-music-institute","canonical_name":"The Music Institute","short_description":"The Music Institute at 1315 Broadway was a short-lived downtown after-hours club that gave Detroit techno a dedicated dancefloor and gathering place.","start_year":1988,"end_year":1990,"place_relation":"historically_significant_in","source_keys":["detroit_historical_may","detroit_news_music_institute","rbma_music_institute"],"confidence":0.86,"review_status":"needs_review","publication_status":"draft","metadata":{"landmark_type":"club","address_text":"1315 Broadway St., Detroit, Michigan","media_policy":"link_only_until_cleared"}}}'::jsonb, 'ca6db7b3088ec10763ee4416ef9fcc2021a3b18bf80150128bbc028d5af107b0', 'new_candidate', 'needs_review', 0.860, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_may'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_techno_city_atkins
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_techno_city_atkins', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_techno_city_atkins","entity_type":"recording_reference","slug":"detroit-techno-city-juan-atkins","canonical_name":"Techno City","short_description":"Juan Atkins’s recording “Techno City” helped establish the term “techno” in the genre’s international naming history.","start_year":1984,"end_year":null,"place_relation":"associated_with","source_keys":["detroit_historical_atkins","musicbrainz_recording_identity"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Cybotron","title":"Techno City","release_year":1984,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Cybotron Techno City"},"credit_components":[{"artist_seed_id":"detroit_artist_cybotron","role":"primary_artist"}]}}}'::jsonb, '4f664f7dae4fd4c494c84784c7b5126b2f6cc377fb929877f007785f3a5457df', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_atkins'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_artist_barrett_strong
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_artist_barrett_strong', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_artist_barrett_strong","entity_type":"artist_reference","slug":"barrett-strong","canonical_name":"Barrett Strong","short_description":"External knowledge-graph identity for Barrett Strong; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","detroit_historical_motown"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"31ee774b-6248-48d5-a8b5-0d9bebeaba9d","wikidata_qid":"Q808900","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, 'f572a43c92b4a2316380c69119c3ca7bcfac7aa62c1d4d8347d34a1f0fdd4101', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_artist_miracles
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_artist_miracles', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_artist_miracles","entity_type":"artist_reference","slug":"the-miracles","canonical_name":"The Miracles","short_description":"External knowledge-graph identity for The Miracles; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","detroit_historical_motown"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"6a4c2d34-7f7f-4f87-b17f-b5540aa840db","wikidata_qid":"Q1761222","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, 'c8fe0ae76fa882a049219d916f2d2688141ad8112d8609e3109b83a99792b9e9', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_artist_cybotron
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_artist_cybotron', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_artist_cybotron","entity_type":"artist_reference","slug":"cybotron-detroit","canonical_name":"Cybotron","short_description":"External knowledge-graph identity for Cybotron; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","detroit_historical_atkins"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"cd1a3be7-a10b-499c-acdd-1defaea473f8","wikidata_qid":"Q939429","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, 'ed7ee8fb45b855a48faf884b408e7c9366dd65c81c6f0b04430ff1f4b91b3dbe', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_artist_derrick_may
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_artist_derrick_may', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_artist_derrick_may","entity_type":"artist_reference","slug":"derrick-may","canonical_name":"Derrick May","short_description":"External knowledge-graph identity for Derrick May; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","detroit_historical_may"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"371c8525-8111-4497-83ba-1ead9d7ed148","wikidata_qid":"Q923104","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '74620454e475447cb90dce3f111d5992ebde11d49b4cc1d3a079846d0041d2f3', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_artist_inner_city
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_artist_inner_city', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_artist_inner_city","entity_type":"artist_reference","slug":"inner-city-detroit","canonical_name":"Inner City","short_description":"External knowledge-graph identity for Inner City; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","detroit_historical_saunderson"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"65a8e571-8a08-433f-a5bf-ead38c269ea6","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, 'dcd6bc2d981c2a0a3fc2f7d8495adadb01de511d25ccff4c66ef676070f8ba1c', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_artist_juan_atkins
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_artist_juan_atkins', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_artist_juan_atkins","entity_type":"artist_reference","slug":"juan-atkins","canonical_name":"Juan Atkins","short_description":"External knowledge-graph identity for Juan Atkins; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","detroit_historical_atkins"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"57dd6359-f4ef-422a-9566-b8f54a0904fe","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '04e1f5c0316d0c87089860cc303ba998d452cd8db59f90584f90150c7cb18195', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:detroit_artist_kevin_saunderson
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:detroit:detroit_artist_kevin_saunderson', '{"pilot_key":"detroit","place_path":"us/mi/detroit","entity":{"seed_id":"detroit_artist_kevin_saunderson","entity_type":"artist_reference","slug":"kevin-saunderson","canonical_name":"Kevin Saunderson","short_description":"External knowledge-graph identity for Kevin Saunderson; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","detroit_historical_saunderson"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"bf259ecd-fe89-4738-82fc-ecdd67de1fcc","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '554b1d93a9b6c8936843970ae55c1d8a758365ffb2e721775d0816ce04a34332', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:1
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:1', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_belleville_three","relation_key":"part_of","object_seed_id":"detroit_techno","source_keys":["detroit_historical_atkins"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '1d43bc835e35f829837e1c6a933ed4fbaf464f6546ace529e0517dc7a05aa93e', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_atkins'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:2
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:2', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_techno","relation_key":"uses_instrument","object_seed_id":"detroit_techno_synthesizer","source_keys":["detroit_historical_demf_tech"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'e2085424c5c629e4e709eb07a579bcf0740e3976022abcc0e85347b11ab7a946', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_demf_tech'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:3
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:3', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_techno","relation_key":"uses_instrument","object_seed_id":"detroit_techno_drum_machine","source_keys":["detroit_historical_demf_tech"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '012cbabd11474f2b518262fda011b09796d88610f8242720b7572a192e70ae2f', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_demf_tech'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:4
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:4', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_motown_sound","relation_key":"uses_instrument","object_seed_id":"detroit_motown_electric_bass","source_keys":["motown_museum_funk_brothers"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '1cbf239af149179fcf1fed62bb62406e1301d6cab68edd53930e112a105b3c8e', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'motown_museum_funk_brothers'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:5
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:5', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_motown_sound","relation_key":"uses_instrument","object_seed_id":"detroit_motown_drum_kit","source_keys":["motown_museum_funk_brothers"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '25254cedfe3806e0905ce0b66877352179404b5b3633429247372f217da06286', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'motown_museum_funk_brothers'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:6
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:6', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_money_barrett_strong","relation_key":"credited_to","object_seed_id":"detroit_artist_barrett_strong","source_keys":["detroit_historical_motown","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '4d3d85326bfd8e0d87effb3533bff3bbd5915b9d0ad5a08e893699971ea7915a', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_motown'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:7
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:7', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_shop_around_miracles","relation_key":"credited_to","object_seed_id":"detroit_artist_miracles","source_keys":["detroit_historical_motown","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '4d6a2ccdcd686c8bd679ff56a359fb82fb7ed86470f0d60e4b23c26a255592bb', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_motown'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:8
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:8', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_clear_cybotron","relation_key":"credited_to","object_seed_id":"detroit_artist_cybotron","source_keys":["detroit_historical_atkins","musicbrainz_recording_identity","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '3f41523bae4cd36da8d56b53093c6e76c96d00d4628c25276625de0b8142d961', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_atkins'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:9
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:9', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_strings_of_life","relation_key":"credited_to","object_seed_id":"detroit_artist_derrick_may","source_keys":["detroit_historical_may","detroit_historical_transmat","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist","credited_as":"Rhythim Is Rhythim"}}}'::jsonb, '34cf07636e69617f769e20f90cf58afd86e704ad5856f9246c2e9baae11d8437', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_may'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:10
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:10', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_good_life_inner_city","relation_key":"credited_to","object_seed_id":"detroit_artist_inner_city","source_keys":["detroit_historical_saunderson","musicbrainz_recording_identity","musicbrainz_artist_identity"],"confidence":0.88,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'a737a6c93ded2626bc3b390cae7dd302f6b09916b862cb8c89a2d506fa8920f0', 'new_candidate', 'needs_review', 0.880, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_saunderson'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:11
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:11', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_techno_city_atkins","relation_key":"credited_to","object_seed_id":"detroit_artist_cybotron","source_keys":["detroit_historical_atkins","musicbrainz_recording_identity","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'da847823e307885e7e8746b6003caef83148f7c83e0145f282a515aae46866b0', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_atkins'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:12
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:12', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_artist_juan_atkins","relation_key":"part_of","object_seed_id":"detroit_belleville_three","source_keys":["detroit_historical_atkins"],"confidence":0.99,"review_status":"needs_review","publication_status":"draft","metadata":{"relationship_note":"Detroit Historical Society identifies Atkins, May, and Saunderson as the Belleville Three."}}}'::jsonb, '3be931c77da1795af3d3def9bd1c49800ec614535b7247df975634dc019aa5fd', 'new_candidate', 'needs_review', 0.990, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_atkins'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:13
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:13', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_artist_kevin_saunderson","relation_key":"part_of","object_seed_id":"detroit_belleville_three","source_keys":["detroit_historical_saunderson"],"confidence":0.99,"review_status":"needs_review","publication_status":"draft","metadata":{"relationship_note":"Detroit Historical Society identifies Saunderson, Atkins, and May as the Belleville Three."}}}'::jsonb, '06bff78d1394f0ebbadebdde8b3b9ac65b8c329ea6d22bbce1d1268a50b6d0bc', 'new_candidate', 'needs_review', 0.990, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_saunderson'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:14
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:14', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_hitsville_usa","relation_key":"related_to","object_seed_id":"detroit_motown_sound","source_keys":["motown_museum_hitsville","motown_museum_legacy"],"confidence":0.99,"review_status":"needs_review","publication_status":"draft","metadata":{"relationship_note":"Motown Museum identifies Hitsville Studio A as the place where the Motown Sound was created and recorded."}}}'::jsonb, '17af94ef498c00b264306dda8fd6794ea8b21e3f054852c65001a140a9d00861', 'new_candidate', 'needs_review', 0.990, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'motown_museum_hitsville'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:detroit:relationship:15
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:detroit:relationship:15', '{"pilot_key":"detroit","place_path":"us/mi/detroit","relationship":{"subject_seed_id":"detroit_music_institute","relation_key":"related_to","object_seed_id":"detroit_techno","source_keys":["detroit_historical_may","rbma_music_institute"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"relationship_note":"Detroit Historical Society and RBMA describe the Music Institute as a dedicated Detroit techno platform."}}}'::jsonb, '8eba1e0a6872c1a523da836e8832ac5e2fef7d436edb382d47330df5315cc130', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'detroit_historical_may'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:overview:musical_identity
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'claim', 'seed:kingston:overview:musical_identity', '{"pilot_key":"kingston","place_path":"jm/kingston","claim":{"claim_type":"summary","subject_kind":"place","subject_id":"jm/kingston","predicate":"musical_identity","literal_value":{"text":"Kingston’s pilot history follows the sound-system ecosystem and the evolution from ska through rocksteady into reggae, while treating Rastafari and Nyahbinghi influence as living cultural context rather than decorative genre trivia."},"source_keys":["unesco_reggae_jamaica","smithsonian_roots_reggae"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '85d2dffd526d1e50875c62a4ec494d5000f7a164b8550f7837d23b68c08779b0', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'unesco_reggae_jamaica'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_sound_system_culture
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_sound_system_culture', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_sound_system_culture","entity_type":"scene","slug":"jamaica-sound-system-culture","canonical_name":"Kingston sound-system culture","short_description":"Urban sound-system dances provided an important platform for Jamaican popular music and the transition among ska, rocksteady, and reggae.","start_year":1950,"end_year":null,"place_relation":"developed_in","source_keys":["smithsonian_roots_reggae"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '10547fb4c65daa9cb56f4c0a47014f262bd183fd0bfbbbb5ad5787d967e460a8', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_ska
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_ska', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_ska","entity_type":"genre","slug":"jamaica-ska","canonical_name":"Ska","short_description":"A Jamaican popular style that emerged before rocksteady and reggae and became part of the island’s postwar/independence-era musical transformation.","start_year":1950,"end_year":1966,"place_relation":"developed_in","source_keys":["smithsonian_roots_reggae"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '811359284e544cf454af754f672836984cf0c9f427a87f2ed3a79875c38be9d5', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_ska_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_ska_sound_signature', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_ska_sound_signature","entity_type":"sound_signature","slug":"jamaica-ska-sound-signature","canonical_name":"Ska sound signature","short_description":"A listening guide to traits described in Smithsonian’s overview of the ska-to-reggae continuum.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["smithsonian_roots_reggae"],"confidence":0.86,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["syncopated rhythmic accents","prominent snare and hi-hat pulse","dance-oriented momentum"],"techniques":[],"context":["The seed describes broad historical listening traits; individual recordings differ."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '4f60c14fb127a919bdebf9f0ebcc4d2b0acbec2ef77d86fd0268d5f3e48f63f7', 'new_candidate', 'needs_review', 0.860, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_rocksteady
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_rocksteady', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_rocksteady","entity_type":"genre","slug":"jamaica-rocksteady","canonical_name":"Rocksteady","short_description":"A slower Jamaican style that emerged around 1966, shifting emphasis toward drums, bass, guitar interplay, vocals, and social commentary.","start_year":1966,"end_year":1968,"place_relation":"developed_in","source_keys":["smithsonian_roots_reggae"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '82368246c183a71c962aab13f4290de911e9346f622e639213b9003a393a0b52', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_rocksteady_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_rocksteady_sound_signature', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_rocksteady_sound_signature","entity_type":"sound_signature","slug":"jamaica-rocksteady-sound-signature","canonical_name":"Rocksteady sound signature","short_description":"A listening guide to the slower groove and instrumental balance described by Smithsonian Folklife.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["smithsonian_roots_reggae"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["slower pulse than ska","strong bass and drum foundation","swaying guitar-and-bass interplay","greater space for vocals and commentary"],"techniques":[],"context":[],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '6521ff46eab795976d5be7ca0ae064da38ef77f1e9c7b920471ea8ebd43ce5af', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_reggae
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_reggae', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_reggae","entity_type":"genre","slug":"jamaica-reggae","canonical_name":"Reggae","short_description":"A Jamaican music tradition that emerged in the late 1960s and drew on earlier Jamaican forms, Caribbean and international influences, and Rastafari-linked cultural expression.","start_year":1968,"end_year":null,"place_relation":"originated_in","source_keys":["unesco_reggae_jamaica","smithsonian_roots_reggae"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, 'cd0b51ea0ea9a6f2567aa4d91cd1bd09a652a6ff6e576fa6e8c45947e3fb8690', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'unesco_reggae_jamaica'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_nyahbinghi
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_nyahbinghi', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_nyahbinghi","entity_type":"tradition","slug":"jamaica-nyahbinghi","canonical_name":"Nyahbinghi drumming influence","short_description":"Rastafari-linked Nyahbinghi drumming is an important influence in roots reggae history.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["smithsonian_roots_reggae","jamaica_jis_roots_reggae"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '93bf4ac9bbaed0cd6d63e732b94e1a9f371fae5d7f342463e7abe37b72bc34f0', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_reggae_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_reggae_sound_signature', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_reggae_sound_signature","entity_type":"sound_signature","slug":"jamaica-reggae-sound-signature","canonical_name":"Roots reggae sound signature","short_description":"A listening guide to rhythmic traits and influences described by Smithsonian Folklife.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["smithsonian_roots_reggae"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["emphasis on the backbeat/downbeat feel","one-drop rhythmic approach","bass-forward groove","Nyahbinghi-derived rhythmic influence"],"techniques":["one drop","rockers","steppers"],"context":["These rhythm labels describe a family of approaches rather than one universal reggae beat."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '6936bba2c9db492c80dfcbf0c5ad58917c986516c70eb2583e1950bac35b75e5', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_ocarolina
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_ocarolina', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_ocarolina","entity_type":"recording_reference","slug":"jamaica-ocarolina","canonical_name":"O’Carolina","short_description":"A recording cited by Smithsonian in explaining the incorporation of Rastafari/Nyahbinghi-associated sound into Jamaican popular music.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["smithsonian_roots_reggae","jamaica_jis_roots_reggae","musicbrainz_artist_identity"],"confidence":0.88,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"The Folkes Brothers","title":"O’Carolina","release_year":null,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Folkes Brothers O’Carolina"},"credit_components":[{"artist_seed_id":"jamaica_artist_folkes_brothers","role":"primary_artist"},{"artist_seed_id":"jamaica_artist_count_ossie","role":"accompaniment"}]}}}'::jsonb, 'a2a1d0656e2d7cc9294901a690d74cdd83322c455e723207ef28195a44400c2e', 'new_candidate', 'needs_review', 0.880, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_forward_march
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_forward_march', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_forward_march","entity_type":"recording_reference","slug":"jamaica-forward-march","canonical_name":"Forward March","short_description":"A topical ska-era recording associated by Smithsonian with the optimism around Jamaican Independence.","start_year":1962,"end_year":1962,"place_relation":"associated_with","source_keys":["smithsonian_roots_reggae"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Derrick Morgan","title":"Forward March","release_year":1962,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Derrick Morgan Forward March"},"credit_components":[{"artist_seed_id":"jamaica_artist_derrick_morgan","role":"primary_artist"}]}}}'::jsonb, 'f5416dfb9deff8a4a2d32c335be515e9b3c854351593b479f325434eaf5e1286', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_everything_crash
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_everything_crash', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_everything_crash","entity_type":"recording_reference","slug":"jamaica-everything-crash","canonical_name":"Everything Crash","short_description":"A recording used by Smithsonian to illustrate social tension at the end of the ska/rocksteady era.","start_year":1968,"end_year":1968,"place_relation":"associated_with","source_keys":["smithsonian_roots_reggae"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"The Ethiopians","title":"Everything Crash","release_year":1968,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Ethiopians Everything Crash"},"credit_components":[{"artist_seed_id":"jamaica_artist_ethiopians","role":"primary_artist"}]}}}'::jsonb, '5e5f07956b59bbb642b243acc3b206897df6bff771663cedfa46f7631988b467', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_one_drop
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_one_drop', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_one_drop","entity_type":"recording_reference","slug":"jamaica-one-drop","canonical_name":"One Drop","short_description":"A roots-reggae recording cited by Smithsonian when discussing the one-drop rhythmic tradition.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["smithsonian_roots_reggae","musicbrainz_recording_identity"],"confidence":0.88,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Bob Marley & The Wailers","title":"One Drop","release_year":1979,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Bob Marley & The Wailers One Drop"},"credit_components":[{"artist_seed_id":"jamaica_artist_bob_marley_wailers","role":"primary_artist"}]}}}'::jsonb, '601584cc6a7dadf515748e7806793c176364e454d0c4aeb5031deb13bb432d01', 'new_candidate', 'needs_review', 0.880, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_reggae_unesco_2018
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_reggae_unesco_2018', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_reggae_unesco_2018","entity_type":"historical_milestone","slug":"jamaica-reggae-unesco-2018","canonical_name":"Reggae inscribed by UNESCO","short_description":"UNESCO inscribed Reggae music of Jamaica on the Representative List of the Intangible Cultural Heritage of Humanity in 2018.","start_year":2018,"end_year":2018,"place_relation":"historically_significant_in","source_keys":["unesco_reggae_jamaica"],"confidence":0.99,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '736919016a0fe2d4f92b89e2658dc9e58f29147b5559847736765543e8459604', 'new_candidate', 'needs_review', 0.990, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'unesco_reggae_jamaica'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_nyahbinghi_bass_drum
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_nyahbinghi_bass_drum', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_nyahbinghi_bass_drum","entity_type":"instrument","slug":"nyahbinghi-bass-drum","canonical_name":"Nyahbinghi bass drum","short_description":"Smithsonian Folkways describes Nyahbinghi as a three-part Rastafari drum ensemble whose bass drum carries the low heartbeat foundation.","start_year":1950,"end_year":null,"place_relation":"practiced_in","source_keys":["smithsonian_nyahbinghi"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"drum","sound_role":"low heartbeat foundation in Nyahbinghi ensemble","listen_for":["deep pulse supporting the ensemble"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'f7bf7ed8bc0ff2c2fa9dd0a45e73f0bc2538d2f26c53e56febef4c332c8a34ee', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_nyahbinghi'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_nyahbinghi_funde
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_nyahbinghi_funde', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_nyahbinghi_funde","entity_type":"instrument","slug":"nyahbinghi-funde","canonical_name":"Nyahbinghi funde","short_description":"The funde is one of the three characteristic drums in the Nyahbinghi ensemble documented by Smithsonian Folkways.","start_year":1950,"end_year":null,"place_relation":"practiced_in","source_keys":["smithsonian_nyahbinghi"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"drum","sound_role":"steady middle-register pulse","listen_for":["repeating pulse between bass and repeater roles"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'c404cd4ad31d6e06f99cd2f5fd77a92f48b47240850f6343c3916f6e8d9e17e8', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_nyahbinghi'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_nyahbinghi_repeater
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_nyahbinghi_repeater', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_nyahbinghi_repeater","entity_type":"instrument","slug":"nyahbinghi-repeater","canonical_name":"Nyahbinghi repeater / kete","short_description":"The repeater is the improvisatory high-register drum in the three-part Nyahbinghi ensemble documented by Smithsonian Folkways.","start_year":1950,"end_year":null,"place_relation":"practiced_in","source_keys":["smithsonian_nyahbinghi"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"drum","sound_role":"improvised higher-register rhythmic voice","listen_for":["freer improvisatory patterns above the steady pulse"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'f5e82c1a7ba903f61368c322db6481d639362613cb8a96152ed052e45a860c15', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_nyahbinghi'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_studio_one
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_studio_one', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_studio_one","entity_type":"studio_landmark","slug":"kingston-studio-one","canonical_name":"Studio One","short_description":"Clement “Coxsone” Dodd established Studio One at 13 Brentford Road in Kingston, a major recording base for ska, rocksteady and reggae.","start_year":1962,"end_year":null,"place_relation":"historically_significant_in","source_keys":["jamaica_gleaner_studio_one","jamaica_gleaner_sound_system","studio_one_official"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{"landmark_type":"recording_studio","address_text":"13 Studio One Boulevard (formerly Brentford Road), Kingston/St. Andrew, Jamaica","media_policy":"link_only_until_cleared"}}}'::jsonb, 'e5214fb3c0d32235c180f33712b537661bfd6cb0465f71f14bd9fafbc40fa6d2', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jamaica_gleaner_studio_one'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_sound_system_technology
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_sound_system_technology', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_sound_system_technology","entity_type":"educational_topic","slug":"jamaican-sound-system-technology","canonical_name":"Sound-system culture as music infrastructure","short_description":"Kingston sound-system operators combined amplification, selectors/DJs, records and dance spaces; the culture also helped push operators such as Clement Dodd into local recording and production.","start_year":1950,"end_year":null,"place_relation":"developed_in","source_keys":["jamaica_gleaner_sound_system"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{"topic_type":"performance_and_distribution_infrastructure","listen_for":["bass-forward playback","selector/DJ sequencing","dubplate and special culture"],"media_policy":"link_only_until_cleared"}}}'::jsonb, '63a429b36cbb7ea1d66f743a8a5abbecb3af85a30c2390e934af1615b2cd8282', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jamaica_gleaner_sound_system'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_simmer_down
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_simmer_down', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_simmer_down","entity_type":"recording_reference","slug":"jamaica-simmer-down-wailers","canonical_name":"Simmer Down","short_description":"The Wailers recorded “Simmer Down” at Studio One, an important early recording in Bob Marley and the Wailers’ Kingston story.","start_year":1963,"end_year":null,"place_relation":"associated_with","source_keys":["jamaica_gleaner_studio_one","studio_one_official"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"The Wailers","title":"Simmer Down","release_year":1963,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Wailers Simmer Down"},"credit_components":[{"artist_seed_id":"jamaica_artist_wailers_early","role":"primary_artist"}]}}}'::jsonb, 'b0b253c354eeec39fbf71516175e7d9717382ce2f8c6ebdb51a709b7941c789b', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jamaica_gleaner_studio_one'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_artist_folkes_brothers
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_artist_folkes_brothers', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_artist_folkes_brothers","entity_type":"artist_reference","slug":"folkes-brothers","canonical_name":"The Folkes Brothers","short_description":"External knowledge-graph identity for The Folkes Brothers; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","smithsonian_roots_reggae"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"63e55587-a4c6-4ff8-b7b7-bf0071774b1f","wikidata_qid":"Q2395926","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '14d0b88ca2f256af30dabc07080b88b2192015d97b8a3664a706fa3167643908', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_artist_count_ossie
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_artist_count_ossie', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_artist_count_ossie","entity_type":"artist_reference","slug":"count-ossie","canonical_name":"Count Ossie","short_description":"External knowledge-graph identity for Count Ossie; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","smithsonian_roots_reggae"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"217e2df6-61be-4ff5-b62c-4c8642d396c5","wikidata_qid":"Q665714","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '595593568bb549fd1dcb86266b5cfdb44f6c82d2b3dee240d2cb999695da617c', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_artist_derrick_morgan
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_artist_derrick_morgan', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_artist_derrick_morgan","entity_type":"artist_reference","slug":"derrick-morgan","canonical_name":"Derrick Morgan","short_description":"External knowledge-graph identity for Derrick Morgan; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","smithsonian_roots_reggae"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"2f2c85b9-135d-4830-a925-ee7548332f70","wikidata_qid":"Q1936730","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '346a7a5a5649f42cd1486c28f19e3bb248741ac926bc88ca42c80644326816b8', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_artist_ethiopians
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_artist_ethiopians', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_artist_ethiopians","entity_type":"artist_reference","slug":"the-ethiopians-jamaica","canonical_name":"The Ethiopians","short_description":"External knowledge-graph identity for The Ethiopians; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","smithsonian_roots_reggae"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"1646c8fd-d950-4978-b944-0c7597a7837a","wikidata_qid":"Q629184","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '85530a44639b532f402098bdea20082579490463212b390bceed5a44384f568e', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_artist_bob_marley_wailers
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_artist_bob_marley_wailers', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_artist_bob_marley_wailers","entity_type":"artist_reference","slug":"bob-marley-the-wailers","canonical_name":"Bob Marley & The Wailers","short_description":"External knowledge-graph identity for Bob Marley & The Wailers; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","smithsonian_roots_reggae"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"c296e10c-110a-4103-9e77-47bfebb7fb2e","wikidata_qid":"Q2525354","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '063fea767d4f18ceb15f5a5f0017f8bfed844e031b79c10181e047075b97925d', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:jamaica_artist_wailers_early
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:kingston:jamaica_artist_wailers_early', '{"pilot_key":"kingston","place_path":"jm/kingston","entity":{"seed_id":"jamaica_artist_wailers_early","entity_type":"artist_reference","slug":"the-wailers-early-jamaica","canonical_name":"The Wailers","short_description":"External knowledge-graph identity for The Wailers; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","studio_one_official"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"c9e99d40-4a2c-4ca7-ac5b-e842264ee271","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, 'a55197001d8395f23edcabede4a5bafc6940d8e1e317e4928e5d3b76e7b52c3f', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:1
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:1', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_rocksteady","relation_key":"evolved_from","object_seed_id":"jamaica_ska","source_keys":["smithsonian_roots_reggae","jamaica_jis_rocksteady"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'e3f679490e9fbe9fdba4b0ae8abd64eca864d36712e63007e71a2e378df3d4b2', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:2
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:2', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_reggae","relation_key":"evolved_from","object_seed_id":"jamaica_rocksteady","source_keys":["smithsonian_roots_reggae","jamaica_jis_rocksteady","jamaica_jis_roots_reggae"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '95227c009f1f6eb82f6be07cb930c2b61072bad829b799afa6f32bddb9e1fb9a', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:3
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:3', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_reggae","relation_key":"influenced_by","object_seed_id":"jamaica_nyahbinghi","source_keys":["smithsonian_roots_reggae","jamaica_jis_roots_reggae"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '6e68b6198b67794fc5e7f739606c46e2467166466c1e369614f96fc852395f5f', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:4
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:4', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_nyahbinghi","relation_key":"uses_instrument","object_seed_id":"jamaica_nyahbinghi_bass_drum","source_keys":["smithsonian_nyahbinghi"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'f37c6978bd95526f30f236d0f5747cf3ddcf4c92545268de7054796de517237b', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_nyahbinghi'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:5
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:5', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_nyahbinghi","relation_key":"uses_instrument","object_seed_id":"jamaica_nyahbinghi_funde","source_keys":["smithsonian_nyahbinghi"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '5fbcbb32117b4166056a69f9075690e5da0e721857629ba0fff03a380a52fb6c', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_nyahbinghi'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:6
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:6', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_nyahbinghi","relation_key":"uses_instrument","object_seed_id":"jamaica_nyahbinghi_repeater","source_keys":["smithsonian_nyahbinghi"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'b7eafcc559e011510e087417b2494a4fd963712ce89a6e266fdc78053dc3aba9', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_nyahbinghi'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:7
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:7', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_sound_system_culture","relation_key":"related_to","object_seed_id":"jamaica_sound_system_technology","source_keys":["jamaica_gleaner_sound_system"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'c0e7cbb65c5880ca788dc9c91dbc4263fdb04ac98b69f7f659005902e884e3e1', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jamaica_gleaner_sound_system'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:8
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:8', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_ocarolina","relation_key":"credited_to","object_seed_id":"jamaica_artist_folkes_brothers","source_keys":["smithsonian_roots_reggae","jamaica_jis_roots_reggae","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.88,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '0d92ab0fd8f07ff8abec8906e143cc83c06b92605b7aa77423a9542c3eb80546', 'new_candidate', 'needs_review', 0.880, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:9
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:9', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_ocarolina","relation_key":"credited_to","object_seed_id":"jamaica_artist_count_ossie","source_keys":["smithsonian_roots_reggae","jamaica_jis_roots_reggae","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.88,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"accompaniment"}}}'::jsonb, 'c8184f855bed21e91843e991d556d527ebffe9347272f2b94b7dff7b9e96bf2a', 'new_candidate', 'needs_review', 0.880, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:10
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:10', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_forward_march","relation_key":"credited_to","object_seed_id":"jamaica_artist_derrick_morgan","source_keys":["smithsonian_roots_reggae","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'ebe121f3050aa98225991deffaf3612da0a723ffd101921de1227eb30c04f811', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:11
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:11', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_everything_crash","relation_key":"credited_to","object_seed_id":"jamaica_artist_ethiopians","source_keys":["smithsonian_roots_reggae","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'eeb3380bacf9dea1e88a013f18362a5c4083632ed08f7f556af68288030c650b', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:12
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:12', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_one_drop","relation_key":"credited_to","object_seed_id":"jamaica_artist_bob_marley_wailers","source_keys":["smithsonian_roots_reggae","musicbrainz_recording_identity","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.88,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '6fc41d56aaa8ef0ae005599d000e5ed037eba5cdb7ca100cd1e23487d68b803a', 'new_candidate', 'needs_review', 0.880, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_roots_reggae'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:13
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:13', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_simmer_down","relation_key":"credited_to","object_seed_id":"jamaica_artist_wailers_early","source_keys":["jamaica_gleaner_studio_one","studio_one_official","musicbrainz_artist_identity"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'aa024e4ef029f192b9ede90551e1798814f14bb609848cf10595525e84d804db', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jamaica_gleaner_studio_one'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:kingston:relationship:14
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:kingston:relationship:14', '{"pilot_key":"kingston","place_path":"jm/kingston","relationship":{"subject_seed_id":"jamaica_studio_one","relation_key":"related_to","object_seed_id":"jamaica_rocksteady","source_keys":["studio_one_official","jamaica_gleaner_studio_one"],"confidence":0.99,"review_status":"needs_review","publication_status":"draft","metadata":{"relationship_note":"Studio One’s official history identifies the Brentford Road studio as the birthplace of rocksteady."}}}'::jsonb, '0c1f7bef714b0b8674bb79e7db87af18d3546f747c0511260867471a8b20fb8f', 'new_candidate', 'needs_review', 0.990, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'studio_one_official'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:overview:musical_identity
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'claim', 'seed:lagos:overview:musical_identity', '{"pilot_key":"lagos","place_path":"ng/lagos","claim":{"claim_type":"summary","subject_kind":"place","subject_id":"ng/lagos","predicate":"musical_identity","literal_value":{"text":"Lagos’s pilot history distinguishes Fela Kuti’s Afrobeat from the later Afrobeats umbrella and includes the city’s Shrine tradition, political performance history, and Alté-era experimentation."},"source_keys":["smithsonian_fela_book","fela_official_shrine","grammy_kuti_guide","grammy_afrobeats_evolution","grammy_alte"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '8cf81f5cac96a31cd0d8a7d15953bdf872a7a9b68822195f65c02a2e469c6591', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_fela_book'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_afrobeat
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_afrobeat', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_afrobeat","entity_type":"genre","slug":"lagos-afrobeat","canonical_name":"Afrobeat","short_description":"A genre pioneered by Fela Kuti that combined African musical traditions with funk, jazz, rock and related diasporic influences, and became deeply linked with Lagos cultural and political life.","start_year":1960,"end_year":null,"place_relation":"developed_in","source_keys":["smithsonian_fela_book","grammy_kuti_guide"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '23f0d96e3ae234a06d464c629710ac193498d324c7b5544904d5739e38b2290b', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_fela_book'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_afrobeat_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_afrobeat_sound_signature', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_afrobeat_sound_signature","entity_type":"sound_signature","slug":"lagos-afrobeat-sound-signature","canonical_name":"Afrobeat sound signature","short_description":"A listening guide to broad traits documented in accounts of Fela Kuti’s Afrobeat.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["grammy_kuti_guide"],"confidence":0.88,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["layered percussion and rhythm","prominent horn writing","extended instrumental development","funk- and jazz-informed groove","repeated vocal/political refrain structures"],"techniques":["improvisation","long-form ensemble arrangement"],"context":["Afrobeat is distinct from the later umbrella term Afrobeats."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '52f4208d3283b435c3c58b885b2031b7f038ebd248501e0dd3d06a2773331671', 'new_candidate', 'needs_review', 0.880, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_kuti_guide'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_old_afrika_shrine
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_old_afrika_shrine', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_old_afrika_shrine","entity_type":"studio_landmark","slug":"lagos-old-afrika-shrine","canonical_name":"Afrika Shrine (Fela-era Lagos venue)","short_description":"The Fela-era Afrika Shrine functioned as a Lagos performance, political and cultural hub; it is historically distinct from the later New Afrika Shrine in Ikeja.","start_year":1972,"end_year":null,"place_relation":"historically_significant_in","source_keys":["fela_official_shrine","smithsonian_fela_book"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft","metadata":{"landmark_type":"performance_space_and_cultural_hub","media_policy":"link_only_until_cleared","identity_note":"Do not conflate with New Afrika Shrine; exact historical site identity remains under review."}}}'::jsonb, '1458d61f56a2b704faa546b5b19217575b270280bf90edff3417695245ab92be', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_official_shrine'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_afrobeat_political_stage
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_afrobeat_political_stage', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_afrobeat_political_stage","entity_type":"movement","slug":"lagos-afrobeat-political-stage","canonical_name":"Afrobeat as political performance","short_description":"Fela’s Lagos-based Afrobeat combined music and anti-establishment political expression, making the scene inseparable from postcolonial social history.","start_year":1970,"end_year":null,"place_relation":"developed_in","source_keys":["smithsonian_fela_book","grammy_kuti_guide"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, 'eaa8758fbc0e9f17fb77cbc9afcc15bd82150fde0e075330ca3996e8932fda4b', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'smithsonian_fela_book'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_zombie_fela
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_zombie_fela', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_zombie_fela","entity_type":"recording_reference","slug":"lagos-zombie-fela","canonical_name":"Zombie","short_description":"A major Fela recording associated with the confrontational political phase of 1970s Afrobeat.","start_year":1977,"end_year":1977,"place_relation":"associated_with","source_keys":["fela_official_1977","grammy_kuti_guide","musicbrainz_artist_identity"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Fela Kuti & Africa 70","title":"Zombie","release_year":1977,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Fela Kuti & Africa 70 Zombie"},"release_year_note":"Official catalog presents the release as 1976/1977; seed uses 1977 for the timeline and preserves the note.","credit_components":[{"artist_seed_id":"lagos_artist_fela_kuti","role":"primary_artist"},{"artist_seed_id":"lagos_artist_africa_70","role":"ensemble"}]}}}'::jsonb, '7dd40824367babb13b45a2736710b2f8c8ffd37544f534081470d56b11d42378', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_official_1977'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_afrobeats
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_afrobeats', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_afrobeats","entity_type":"genre","slug":"lagos-afrobeats","canonical_name":"Afrobeats","short_description":"A broad, fluid umbrella for contemporary West African pop sounds, distinct from Fela Kuti’s singular Afrobeat genre.","start_year":2010,"end_year":null,"place_relation":"associated_with","source_keys":["grammy_afrobeats_evolution"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, 'ff897903d92fe385f95d933c0a22329f490289bc90f32101438ac8360c894f5d', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_afrobeats_evolution'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_afrobeats_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_afrobeats_sound_signature', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_afrobeats_sound_signature","entity_type":"sound_signature","slug":"lagos-afrobeats-sound-signature","canonical_name":"Afrobeats listening frame","short_description":"A deliberately broad listening frame for the Lagos-centered contemporary pop ecosystem rather than a fixed sonic formula.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["grammy_afrobeats_evolution"],"confidence":0.82,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["beat-forward contemporary production","cross-genre pop synthesis","frequent movement between local and diaspora influences"],"techniques":[],"context":["Afrobeats is an umbrella term; Tourify should not reduce it to one rhythm or production template."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '226f8a99384c23bf7353d1ad37a7d99991f8fd293c0c090be64590a09d44124b', 'new_candidate', 'needs_review', 0.820, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_afrobeats_evolution'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_ojuelegba_wizkid
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_ojuelegba_wizkid', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_ojuelegba_wizkid","entity_type":"recording_reference","slug":"lagos-ojuelegba-wizkid","canonical_name":"Ojuelegba","short_description":"An autobiographical Afrobeats landmark named for a Lagos mainland intersection/neighborhood and associated with the genre’s international crossover.","start_year":2014,"end_year":2014,"place_relation":"associated_with","source_keys":["grammy_afrobeats_evolution","musicbrainz_artist_identity"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Wizkid","title":"Ojuelegba","release_year":2014,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Wizkid Ojuelegba"},"credit_components":[{"artist_seed_id":"lagos_artist_wizkid","role":"primary_artist"}]}}}'::jsonb, '46fdcf0632fd6159b5f010cfac0b1618d67f0b0200d45ba673476273524a405b', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_afrobeats_evolution'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_alte
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_alte', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_alte","entity_type":"scene","slug":"lagos-alte","canonical_name":"Alté","short_description":"A Nigerian alternative scene/genre label coined by DRB LasGidi in 2014 and associated with cross-genre experimentation in Lagos and beyond.","start_year":2014,"end_year":null,"place_relation":"developed_in","source_keys":["grammy_alte"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '705400a5c2da81c51133f318c3a11ad299b46ee82dfd8c6635df88239bce7b27', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_alte'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_alte_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_alte_sound_signature', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_alte_sound_signature","entity_type":"sound_signature","slug":"lagos-alte-sound-signature","canonical_name":"Alté listening frame","short_description":"A listening frame for the intentionally hybrid Alté ecosystem.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["grammy_alte"],"confidence":0.86,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["Afrobeats-adjacent rhythmic language","R&B and soul influence","rap and pop crossover","dancehall influence","visual/aesthetic experimentation"],"techniques":[],"context":["Alté functions as both a music and creative-cultural identity; artists vary widely."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'a4579b8008e52e0d02c5e3af7791d92638b9d1f2aeeb42ea2c2184b40c415542', 'new_candidate', 'needs_review', 0.860, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_alte'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_fela_tenor_saxophone
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_fela_tenor_saxophone', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_fela_tenor_saxophone","entity_type":"instrument","slug":"fela-tenor-saxophone","canonical_name":"Tenor saxophone in Fela’s Afrobeat practice","short_description":"The Kalakuta Museum preserves Fela Kuti’s painted signature tenor saxophone, making the instrument a tangible link to his performance practice.","start_year":1970,"end_year":null,"place_relation":"associated_with","source_keys":["fela_kalakuta_museum"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"woodwind","sound_role":"lead melodic voice, solos and horn-section color","listen_for":["forceful saxophone lines and solos","dialogue with repeated horn figures"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '1e919c340660e0db9692e4739f067b660edd04810949744c1c7079718a125981', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_kalakuta_museum'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_afrobeat_percussion
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_afrobeat_percussion', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_afrobeat_percussion","entity_type":"instrument","slug":"afrobeat-percussion-ensemble","canonical_name":"Layered percussion in Afrobeat","short_description":"Afrobeat’s ensemble sound prominently uses layered percussion alongside horns, rhythm section and call-and-response vocals.","start_year":1970,"end_year":null,"place_relation":"associated_with","source_keys":["grammy_kuti_guide"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"percussion_ensemble","sound_role":"interlocking rhythmic layers and groove","listen_for":["multiple repeating percussion patterns","rhythmic layering beneath horns and vocals"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '2c38ba6cffb3a51987500e37f61500676154ee6ccff9ce125af13e45069f2f9e', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_kuti_guide'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_kalakuta_museum
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_kalakuta_museum', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_kalakuta_museum","entity_type":"studio_landmark","slug":"lagos-kalakuta-museum","canonical_name":"Kalakuta Museum","short_description":"Fela Kuti’s former Lagos home is preserved as the Kalakuta Museum, with historic materials and instruments including his tenor saxophone.","start_year":2012,"end_year":null,"place_relation":"historically_significant_in","source_keys":["fela_kalakuta_museum"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"landmark_type":"museum_and_former_residence","address_text":"7 Gbemisola Street, Allen, Ikeja, Lagos, Nigeria","media_policy":"link_only_until_cleared","identity_note":"Do not use Wikidata Q3743182 as the museum identifier; that item represents the historical Kalakuta Republic context."}}}'::jsonb, '68940b778a17f4930076d749974a30101a0f18b37741eb3d2fa9c5748f5845b1', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_kalakuta_museum'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_africa_shrine_1972
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_africa_shrine_1972', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_africa_shrine_1972","entity_type":"historical_milestone","slug":"lagos-africa-shrine-1972","canonical_name":"Africa Shrine opens at the Empire Hotel site","short_description":"In 1972 Fela renamed his Surulere venue the Africa Shrine, developing it as a performance space and political-cultural salon.","start_year":1972,"end_year":null,"place_relation":"historically_significant_in","source_keys":["fela_1972_shrine"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"context_type":"venue_history"}}}'::jsonb, '3815602be3267f254afbf56fc44f23d64b863bbfd045791ebfa88786ebe59d0f', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_1972_shrine'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_artist_fela_kuti
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_artist_fela_kuti', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_artist_fela_kuti","entity_type":"artist_reference","slug":"fela-kuti","canonical_name":"Fela Kuti","short_description":"External knowledge-graph identity for Fela Kuti; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","fela_official_shrine"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"6514cffa-fbe0-4965-ad88-e998ead8a82a","wikidata_qid":"Q313868","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '31420512f9e7d0bb008f4dc46fd92f8c79fc020ab00c41b89034de431766f3d0', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_artist_africa_70
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_artist_africa_70', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_artist_africa_70","entity_type":"artist_reference","slug":"africa-70","canonical_name":"Africa 70","short_description":"External knowledge-graph identity for Africa 70; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","fela_official_shrine"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"dc45f2dc-ef36-4a7a-aa52-97495fca8ced","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, 'ad5f4ad96fd8286f217550a93ad31e4018027078722340ec0a966859dc47a90a', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_artist_wizkid
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_artist_wizkid', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_artist_wizkid","entity_type":"artist_reference","slug":"wizkid","canonical_name":"Wizkid","short_description":"External knowledge-graph identity for Wizkid; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","grammy_afrobeats_evolution"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"efc5d365-a448-4e2f-9b5f-4a7c84be725c","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '86ed02112bbc8e59c7dc728157fd687b6d76538c096e8a63f68e1a1a769f7beb', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:lagos_new_afrika_shrine
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:lagos:lagos_new_afrika_shrine', '{"pilot_key":"lagos","place_path":"ng/lagos","entity":{"seed_id":"lagos_new_afrika_shrine","entity_type":"studio_landmark","slug":"lagos-new-afrika-shrine","canonical_name":"New Afrika Shrine","short_description":"The New Afrika Shrine is a present-day performance and cultural venue in Ikeja that continues the Shrine tradition associated with Fela Kuti’s legacy.","start_year":2000,"end_year":null,"place_relation":"historically_significant_in","source_keys":["wikidata_geo","fela_official_shrine"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{"landmark_type":"performance_space_and_cultural_hub","address_text":"NERDC Rd, Agidingbi 101233, Ikeja, Lagos State, Nigeria","media_policy":"link_only_until_cleared","external_ids":{"wikidata_qid":"Q25045334","musicbrainz_place_mbid":"1de41090-0afd-4e43-bb03-2bba7d41e2f3"},"center":{"lat":6.6228379,"lng":3.3568144}}}}'::jsonb, 'f954ed59c1179106557ee42a49a9b9ad02fba226b1f7dec25b08048ebace76c2', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'wikidata_geo'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:1
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:1', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_afrobeats","relation_key":"influenced_by","object_seed_id":"lagos_afrobeat","source_keys":["grammy_kuti_guide","grammy_afrobeats_evolution"],"confidence":0.75,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '4218d2b6a88af35fcf99596fa1d3bf17399bbfb65ae9e75221eaa69839473b23', 'new_candidate', 'needs_review', 0.750, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_kuti_guide'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:2
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:2', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_alte","relation_key":"related_to","object_seed_id":"lagos_afrobeats","source_keys":["grammy_alte"],"confidence":0.86,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'd0c188dbb21920ce79c6edbdffc5c3b4ec3cbdc91f9ebddbb61eae371e26fa9b', 'new_candidate', 'needs_review', 0.860, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_alte'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:3
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:3', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_afrobeat","relation_key":"uses_instrument","object_seed_id":"lagos_fela_tenor_saxophone","source_keys":["fela_kalakuta_museum"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'bca38df105513182829d54058af2a22b8130754aaa3f71d8c7af94ddd596995b', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_kalakuta_museum'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:4
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:4', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_afrobeat","relation_key":"uses_instrument","object_seed_id":"lagos_afrobeat_percussion","source_keys":["grammy_kuti_guide"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'bfc95a7621d2684c26d0d3103514985efaaa37b314d7c3e418d0118419d671d7', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_kuti_guide'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:5
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:5', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_afrobeat_political_stage","relation_key":"related_to","object_seed_id":"lagos_africa_shrine_1972","source_keys":["fela_1972_shrine"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '0ce90844a6099818a3a8dcfe644cdf4d0a13ff8961b555ebc3ffc5922d721838', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_1972_shrine'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:6
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:6', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_zombie_fela","relation_key":"credited_to","object_seed_id":"lagos_artist_fela_kuti","source_keys":["fela_official_1977","grammy_kuti_guide","musicbrainz_artist_identity","wikidata_identity","fela_official_shrine"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '6589ace8ca0261b6ca29de152e1dc03252d4918d813b80558847ad4faded0c9b', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_official_1977'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:7
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:7', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_zombie_fela","relation_key":"credited_to","object_seed_id":"lagos_artist_africa_70","source_keys":["fela_official_1977","grammy_kuti_guide","musicbrainz_artist_identity","fela_official_shrine"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"ensemble"}}}'::jsonb, 'c53b9704904f7e5dd0c336f74028f88501142f44316c7bada2a9caef3b51ae22', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_official_1977'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:8
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:8', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_ojuelegba_wizkid","relation_key":"credited_to","object_seed_id":"lagos_artist_wizkid","source_keys":["grammy_afrobeats_evolution","musicbrainz_artist_identity"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '016f1a7b18edf965989bd2b6a9be60322ed98075dd916658dc62ea6d0fc578d6', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'grammy_afrobeats_evolution'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:9
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:9', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_old_afrika_shrine","relation_key":"related_to","object_seed_id":"lagos_afrobeat","source_keys":["fela_official_shrine","smithsonian_fela_book"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"relationship_note":"Fela’s archive documents the Shrine as a core performance/political space during Afrobeat’s development."}}}'::jsonb, '21e0c8fbc1279b3e9d943b32f590e7727134e4c59d309ffdba1fd9a3dfc8c90f', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_official_shrine'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:10
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:10', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_kalakuta_museum","relation_key":"related_to","object_seed_id":"lagos_artist_fela_kuti","source_keys":["fela_kalakuta_museum"],"confidence":0.99,"review_status":"needs_review","publication_status":"draft","metadata":{"relationship_note":"The museum occupies Fela’s former Kalakuta home and preserves objects from his life and career."}}}'::jsonb, '9ca9fdf5399b4e7eb5df1c620cea6caabbd9befa004156e3648f566d69fedc9c', 'new_candidate', 'needs_review', 0.990, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_kalakuta_museum'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:lagos:relationship:11
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:lagos:relationship:11', '{"pilot_key":"lagos","place_path":"ng/lagos","relationship":{"subject_seed_id":"lagos_new_afrika_shrine","relation_key":"related_to","object_seed_id":"lagos_artist_fela_kuti","source_keys":["fela_official_shrine"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{"relationship_note":"Fela’s family built the New Afrika Shrine to preserve Fela and the original Shrine’s community/cultural legacy."}}}'::jsonb, 'd81037dfd8da5ba6865d13f5636c5bf888132a54811eebaf48824c407585d430', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'fela_official_shrine'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:overview:musical_identity
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'claim', 'seed:london:overview:musical_identity', '{"pilot_key":"london","place_path":"gb/eng/london","claim":{"claim_type":"summary","subject_kind":"place","subject_id":"gb/eng/london","predicate":"musical_identity","literal_value":{"text":"London’s pilot seed focuses on migration and infrastructure: Jamaican dub’s London production ecosystem, pirate radio, and east London grime rather than treating the city as a single genre."},"source_keys":["london_museum_dub","london_museum_grime","london_museum_grime_history"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'f78e0920fe6b4f19052d32280c33d5ba7edaf0f02c44b43d004528c6e3718738', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_dub_scene
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_dub_scene', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_dub_scene","entity_type":"scene","slug":"london-dub-scene","canonical_name":"Dub London","short_description":"A London dub ecosystem grew from the 1970s around Caribbean communities, sound systems, record shops, labels, radio, clubs, and producers.","start_year":1970,"end_year":null,"place_relation":"developed_in","source_keys":["london_museum_dub","london_museum_dub_records"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '1e007a646eb39d44e0854a9b90e48fdabb3d51a917bde59e328fd72593a580ac', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_dub
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_dub', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_dub","entity_type":"genre","slug":"london-dub","canonical_name":"Dub in London","short_description":"Jamaican dub became a major London production and listening culture and helped shape later British electronic and bass music.","start_year":1970,"end_year":null,"place_relation":"associated_with","source_keys":["london_museum_dub"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '4c978ca49bc5685da0d2b662e903ab23856656168d7e5d29a61676c18329888b', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_dub_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_dub_sound_signature', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_dub_sound_signature","entity_type":"sound_signature","slug":"london-dub-sound-signature","canonical_name":"Dub production sound signature","short_description":"A listening guide to dub production practices documented by London Museum.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["london_museum_dub"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["heavy drum-and-bass foundation","echo","reverb","dropouts and spatial manipulation","instrumental/version-based arrangement"],"techniques":["studio-as-instrument production","mixing-console performance"],"context":["Dub originated in Jamaica; this seed describes its London development rather than relocating its origin."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '16416200524966dab05aad1520fada1459c4751e434e26bbb67feb29ee6758d4', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_pirate_radio
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_pirate_radio', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_pirate_radio","entity_type":"scene","slug":"london-pirate-radio","canonical_name":"Pirate radio as scene infrastructure","short_description":"Unlicensed radio stations provided vital platforms for London Black music and later grime artists, DJs, and MCs.","start_year":1980,"end_year":null,"place_relation":"developed_in","source_keys":["london_museum_grime","london_museum_dub"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '0c8b9ed4f7783c1ca4f5f3d8911e7d2f5ff17910a437962f59e512fb7c3c1a31', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_grime'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_grime
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_grime', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_grime","entity_type":"genre","slug":"london-grime","canonical_name":"Grime","short_description":"A Black-British music scene that emerged in east London around the beginning of the 2000s, with Bow and neighboring areas central to its early development.","start_year":2000,"end_year":null,"place_relation":"originated_in","source_keys":["london_museum_grime","london_museum_grime_history"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '2b4d64cabcb9175ecf312a1f502105c82683eda52001c81af2432cb1f174e950', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_grime'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_grime_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_grime_sound_signature', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_grime_sound_signature","entity_type":"sound_signature","slug":"london-grime-sound-signature","canonical_name":"Early grime sound signature","short_description":"A listening guide to characteristics London Museum associates with early grime.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["london_museum_grime"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["hard-edged electronic instrumentals","jittery rhythmic programming","MC-led vocal performance","sparse/fierce production"],"techniques":["pirate-radio performance culture","producer-led instrumental ecosystems"],"context":["Wiley’s “eskimo sound” is one influential strand, not the entirety of grime."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '7e0db4ebef1beae7753c317711909a124f8b50d809935aa52934e9edc25cbb53', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_grime'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_wiley_eskimo_sound
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_wiley_eskimo_sound', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_wiley_eskimo_sound","entity_type":"sound_signature","slug":"london-wiley-eskimo-sound","canonical_name":"Wiley’s eskimo sound","short_description":"A cold, sparse production aesthetic developed by Wiley and closely associated with early grime.","start_year":2000,"end_year":null,"place_relation":"developed_in","source_keys":["london_museum_grime"],"confidence":0.91,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["icy/sparse synth textures","jittery electronic rhythm","space for MC vocals"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '1f1c94dca09816b4a2dc6f22bf4059a49a95bdab0e9152713cedcd47766cc716', 'new_candidate', 'needs_review', 0.910, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_grime'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_bow_grime
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_bow_grime', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_bow_grime","entity_type":"scene","slug":"london-bow-grime","canonical_name":"Bow early grime network","short_description":"Bow in east London is a key geographic node in grime’s early history, associated with Wiley and other pioneers.","start_year":2000,"end_year":null,"place_relation":"developed_in","source_keys":["london_museum_grime","kcl_grime_and_gaming"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '7fa6d6cc8c571f5be716dd95bdac9903c2eb47969c393a6df1111394a1af5a63', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_grime'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_dub_to_grime_lineage
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_dub_to_grime_lineage', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_dub_to_grime_lineage","entity_type":"educational_topic","slug":"london-dub-to-grime-lineage","canonical_name":"Bass-culture lineage: dub to later London genres","short_description":"London Museum explicitly links dub’s studio-built bass culture to later British genres including jungle, UK garage, and grime.","start_year":1970,"end_year":null,"place_relation":"historically_significant_in","source_keys":["london_museum_dub"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, 'c1d910ca33de69e381d3a1b73a918d36cc6912d629619d7076ef551b5cfa6199', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_i_luv_you_dizzee
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_i_luv_you_dizzee', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_i_luv_you_dizzee","entity_type":"recording_reference","slug":"london-i-luv-you-dizzee","canonical_name":"I Luv You","short_description":"A formative grime recording made by Dizzee Rascal as a teenager in Poplar, east London, cited by London Museum in its grime history.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["london_museum_grime","musicbrainz_recording_identity"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Dizzee Rascal","title":"I Luv You","release_year":2002,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Dizzee Rascal I Luv You"},"credit_components":[{"artist_seed_id":"london_artist_dizzee_rascal","role":"primary_artist"}]}}}'::jsonb, 'a5cb02340a5b6c523178c119b54f31e038b5e1a0c473f5c28fbf371dd461c333', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_grime'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_commandments_of_dub
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_commandments_of_dub', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_commandments_of_dub","entity_type":"recording_reference","slug":"london-commandments-of-dub","canonical_name":"The Commandments of Dub","short_description":"A 1982 Jah Shaka dub record mixed at Ariwa Studio by Mad Professor and selected by London Museum as part of its Dub London record history.","start_year":1982,"end_year":1982,"place_relation":"associated_with","source_keys":["london_museum_dub_records","musicbrainz_artist_identity"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Jah Shaka","title":"The Commandments of Dub","release_year":1982,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Jah Shaka The Commandments of Dub"},"credit_components":[{"artist_seed_id":"london_artist_jah_shaka","role":"primary_artist"}]}}}'::jsonb, '57ef106f0d19e10a2fc2deacc6fdf77d781a2d1e4e3894a177a4e1c2733c8c63', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub_records'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_bass_culture_lkj
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_bass_culture_lkj', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_bass_culture_lkj","entity_type":"recording_reference","slug":"london-bass-culture-lkj","canonical_name":"Bass Culture","short_description":"A Linton Kwesi Johnson recording/album highlighted by London Museum in its Dub London history and produced with Dennis Bovell.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["london_museum_dub_records","musicbrainz_recording_identity"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Linton Kwesi Johnson","title":"Bass Culture","release_year":1980,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Linton Kwesi Johnson Bass Culture"},"credit_components":[{"artist_seed_id":"london_artist_lkj","role":"primary_artist"}]}}}'::jsonb, '5b6eaf213fa493befb6346a3f0403ba9969d5b9c70c8382d182b6bf7bd94deef', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub_records'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_ariwa_sounds
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_ariwa_sounds', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_ariwa_sounds","entity_type":"studio_landmark","slug":"london-ariwa-sounds","canonical_name":"Ariwa Sounds","short_description":"Mad Professor’s Ariwa Sounds is a major London dub studio; London Museum used it to document dub mixing practice.","start_year":1979,"end_year":null,"place_relation":"historically_significant_in","source_keys":["london_museum_dub_project","london_museum_dub","ariwa_official_story"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"landmark_type":"recording_studio","address_text":"34 Whitehorse Lane, London SE25 6RE, United Kingdom","media_policy":"link_only_until_cleared","location_history":[{"from_year":1979,"to_year":1982,"address":"19 Bruce Road, Thornton Heath"},{"from_year":1982,"to_year":1986,"address":"42 Gautrey Road, Peckham"},{"from_year":1986,"to_year":null,"address":"34 Whitehorse Lane, London SE25 6RE"}]}}}'::jsonb, '6b56623ec1dd181091f3d260abeb8c69d8c3f013dcd0aac63fe2fca0d4fa591f', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub_project'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_dub_mixing_console
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_dub_mixing_console', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_dub_mixing_console","entity_type":"educational_topic","slug":"dub-mixing-console-effects","canonical_name":"Dub mixing console and effects as performance tools","short_description":"London dub practice treats the studio as an instrument, reshaping drums and bass with faders, echo, reverb, dropouts and other effects.","start_year":1970,"end_year":null,"place_relation":"associated_with","source_keys":["london_museum_dub","london_museum_dub_project"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft","metadata":{"topic_type":"production_technology","listen_for":["echo and reverb trails","sudden dropouts","bass-and-drum emphasis","live-feeling mix changes"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'f7b5333401eadaa2061e79a0ff0bfddff6b2e4f8e98b5af6a00851bdd0a0cb47', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_sound_system
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_sound_system', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_sound_system","entity_type":"instrument","slug":"sound-system-london-dub","canonical_name":"Sound system — London dub culture","short_description":"Large-format sound systems were central to how dub and reggae were heard collectively in London clubs, parties and carnival culture.","start_year":1970,"end_year":null,"place_relation":"practiced_in","source_keys":["london_museum_dub"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"amplified_playback_system","sound_role":"high-impact communal reproduction of bass-heavy recordings","listen_for":["physical low-frequency emphasis","selector-led sequencing of records and versions"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '1f899b832bb1697ffbd9a03b9a6a0973b9b8975048f3369e3010f4278e4030c8', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_robotiks_mad_professor
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_robotiks_mad_professor', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_robotiks_mad_professor","entity_type":"recording_reference","slug":"london-robotiks-my-computers-acting-strange","canonical_name":"My Computers Acting Strange","short_description":"London Museum highlights Robotiks’ “My Computers Acting Strange” as a Mad Professor/Ariwa example of analogue, retro-futurist dub production.","start_year":1980,"end_year":null,"place_relation":"associated_with","source_keys":["london_museum_dub_records","ariwa_official_catalogue","musicbrainz_recording_identity"],"confidence":0.86,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"The Robotiks","title":"My Computers Acting Strange","release_year":1986,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"The Robotiks My Computers Acting Strange"},"credit_components":[{"artist_seed_id":"london_artist_robotiks","role":"primary_artist"},{"artist_seed_id":"london_artist_mad_professor","role":"production_context"}]}}}'::jsonb, '067e3cf014cf65ba6e3dd86a823566637accad80efa7c4fe754958f20c8759f2', 'new_candidate', 'needs_review', 0.860, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub_records'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_artist_dizzee_rascal
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_artist_dizzee_rascal', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_artist_dizzee_rascal","entity_type":"artist_reference","slug":"dizzee-rascal","canonical_name":"Dizzee Rascal","short_description":"External knowledge-graph identity for Dizzee Rascal; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","london_museum_grime"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"1a99cc88-aea3-4fe3-96b9-20791667f65f","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '944b456c28660875aaa70ec98ccd48fc79dc7ec33b271aa3d48f13fb680c62cb', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_artist_jah_shaka
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_artist_jah_shaka', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_artist_jah_shaka","entity_type":"artist_reference","slug":"jah-shaka","canonical_name":"Jah Shaka","short_description":"External knowledge-graph identity for Jah Shaka; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","london_museum_dub_records"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"47b2253e-034f-4806-b65c-7cee187f34d8","wikidata_qid":"Q726991","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '565409b7163c16e7fc813fcff68d31a25287cd31be31cfdd9f70ead0ab573fef', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_artist_lkj
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_artist_lkj', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_artist_lkj","entity_type":"artist_reference","slug":"linton-kwesi-johnson","canonical_name":"Linton Kwesi Johnson","short_description":"External knowledge-graph identity for Linton Kwesi Johnson; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","london_museum_dub_records"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"f27042c2-3a42-4529-876c-3aa0b4fd53fe","wikidata_qid":"Q557775","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, 'd87e3dd882da71e8143fde0dd8da1533be90066073f44f8bca71e75d18729d7b', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_artist_mad_professor
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_artist_mad_professor', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_artist_mad_professor","entity_type":"artist_reference","slug":"mad-professor","canonical_name":"Mad Professor","short_description":"External knowledge-graph identity for Mad Professor; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","ariwa_official_story"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"ea3b97e8-8a76-4ea7-8e6f-3ebf40acaeb8","wikidata_qid":"Q918458","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '2986995b17c83b145999e597b5c82c951f50e490fd08cacdfa86036cf07866d7', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:london_artist_robotiks
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:london:london_artist_robotiks', '{"pilot_key":"london","place_path":"gb/eng/london","entity":{"seed_id":"london_artist_robotiks","entity_type":"artist_reference","slug":"the-robotiks","canonical_name":"The Robotiks","short_description":"External knowledge-graph identity for The Robotiks; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["ariwa_official_catalogue","ariwa_official_story"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":null,"wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '4d41e074b1d26170700f1ff6256900173640c31604b7c1b24913d54d7e0542da', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'ariwa_official_catalogue'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:1
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:1', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_grime","relation_key":"influenced_by","object_seed_id":"london_dub","source_keys":["london_museum_dub","westminster_bass_culture"],"confidence":0.84,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'f7d88b5b024c54968371727d135d7155134ad6c9aa4cf6650f05f1612193c5c0', 'new_candidate', 'needs_review', 0.840, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:2
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:2', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_bow_grime","relation_key":"part_of","object_seed_id":"london_grime","source_keys":["london_museum_grime"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'b466ef0c2c008c6a1b05fa2c74101139507ab06ef131dc6638d3d436cde0ed5d', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_grime'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:3
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:3', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_dub","relation_key":"uses_instrument","object_seed_id":"london_sound_system","source_keys":["london_museum_dub"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '8e194c1ad452d241f35aaedd749197156e104f6091f4cf059f5ee16260f359b6', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:4
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:4', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_dub","relation_key":"related_to","object_seed_id":"london_dub_mixing_console","source_keys":["london_museum_dub","london_museum_dub_project"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'ffd01b4779a714b50a23d1fe6fee31256177c255bcdcd27b5d658e02603066e8', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:5
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:5', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_dub_scene","relation_key":"related_to","object_seed_id":"london_ariwa_sounds","source_keys":["london_museum_dub_project"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '218da3e7da4c8adfad2d33172cad571b4bbef6a19c66ba444b7014e3c02f195a', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub_project'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:6
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:6', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_i_luv_you_dizzee","relation_key":"credited_to","object_seed_id":"london_artist_dizzee_rascal","source_keys":["london_museum_grime","musicbrainz_recording_identity","musicbrainz_artist_identity"],"confidence":0.92,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'd5f3afec4911f69b9aef0bb9cffee336859500e56bb08bf60d187f74b0420527', 'new_candidate', 'needs_review', 0.920, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_grime'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:7
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:7', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_commandments_of_dub","relation_key":"credited_to","object_seed_id":"london_artist_jah_shaka","source_keys":["london_museum_dub_records","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'b7e520f02b53aa59975731069c21a649295406514ecc75adb11b3e8df8ec4773', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub_records'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:8
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:8', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_bass_culture_lkj","relation_key":"credited_to","object_seed_id":"london_artist_lkj","source_keys":["london_museum_dub_records","musicbrainz_recording_identity","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'ff3244f885be46076c14424447d577a7c3c9c444c655ac840e7c4cf794817446', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub_records'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:9
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:9', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_robotiks_mad_professor","relation_key":"credited_to","object_seed_id":"london_artist_robotiks","source_keys":["london_museum_dub_records","ariwa_official_catalogue","musicbrainz_recording_identity","ariwa_official_story"],"confidence":0.86,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '6a5fcfda3c90bb2082f50b4efef4522dfead1766297dd01becae42a76c07ba2b', 'new_candidate', 'needs_review', 0.860, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub_records'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:london:relationship:10
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:london:relationship:10', '{"pilot_key":"london","place_path":"gb/eng/london","relationship":{"subject_seed_id":"london_robotiks_mad_professor","relation_key":"credited_to","object_seed_id":"london_artist_mad_professor","source_keys":["london_museum_dub_records","ariwa_official_catalogue","musicbrainz_recording_identity","musicbrainz_artist_identity","wikidata_identity","ariwa_official_story"],"confidence":0.86,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"production_context"}}}'::jsonb, '19f55119b64f38fdaf03ff61b4c5ec2b1f617d928627e16f239596408782a47b', 'new_candidate', 'needs_review', 0.860, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'london_museum_dub_records'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:overview:musical_identity
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'claim', 'seed:tokyo:overview:musical_identity', '{"pilot_key":"tokyo","place_path":"jp/tokyo","claim":{"claim_type":"summary","subject_kind":"place","subject_id":"jp/tokyo","predicate":"musical_identity","literal_value":{"text":"Tokyo’s pilot seed connects late-1970s/1980s city pop and electronic pop to internet-era rediscovery and a later J-pop landmark, while avoiding a false single-line genealogy."},"source_keys":["jpf_city_pop","japan_culture_plastic_love","sony_ymo_1979","utada_profile"],"confidence":0.91,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '019fe598012c20cec54e1405db47bf073124d64557c4a5df707b0a503524db23', 'new_candidate', 'needs_review', 0.910, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jpf_city_pop'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_city_pop
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_city_pop', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_city_pop","entity_type":"genre","slug":"tokyo-city-pop","canonical_name":"City pop","short_description":"A Japanese pop style that arose in the late 1970s and peaked in the 1980s, blending disco, soul, R&B, funk and other influences with an urban consumer/technology context.","start_year":1970,"end_year":1989,"place_relation":"associated_with","source_keys":["jpf_city_pop","nippon_city_pop","japan_embassy_city_pop"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '3081e20b9908430bc3f6629c80220c66888aff15c4d3ba73e1a342a2649c562b', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jpf_city_pop'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_city_pop_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_city_pop_sound_signature', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_city_pop_sound_signature","entity_type":"sound_signature","slug":"tokyo-city-pop-sound-signature","canonical_name":"City pop listening frame","short_description":"A broad listening frame based on Japan Foundation’s historical description of the style.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["jpf_city_pop"],"confidence":0.86,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["polished studio production","disco/funk groove","soul and R&B influence","synth and electric-instrument textures","urban leisure atmosphere"],"techniques":[],"context":["City pop is a broad retrospective label; not every Japanese urban pop recording of the era fits the same formula."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, '01000ee143e039c9dac5e47fdb331b3448f5c437b806f91f60ff73805af212c3', 'new_candidate', 'needs_review', 0.860, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jpf_city_pop'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_mobile_listening_city_pop
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_mobile_listening_city_pop', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_mobile_listening_city_pop","entity_type":"historical_milestone","slug":"tokyo-mobile-listening-city-pop","canonical_name":"Mobile listening and the city-pop era","short_description":"Japan Foundation links city pop’s urban identity with rapid consumer-technology change, including the Walkman and in-car cassette listening.","start_year":1979,"end_year":1989,"place_relation":"historically_significant_in","source_keys":["jpf_city_pop"],"confidence":0.88,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, 'd064ce61fa643ea4dd859820fc57dbfb47106636fca73ef62c333c48c75b05fe', 'new_candidate', 'needs_review', 0.880, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jpf_city_pop'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_plastic_love
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_plastic_love', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_plastic_love","entity_type":"recording_reference","slug":"tokyo-plastic-love","canonical_name":"Plastic Love","short_description":"A 1984 city-pop recording that gained a large international second life through internet circulation decades later.","start_year":1984,"end_year":1984,"place_relation":"associated_with","source_keys":["japan_culture_plastic_love","wmg_plastic_love","musicbrainz_artist_identity"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Mariya Takeuchi","title":"Plastic Love","release_year":1984,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Mariya Takeuchi Plastic Love"},"credit_components":[{"artist_seed_id":"tokyo_artist_mariya_takeuchi","role":"primary_artist"}]}}}'::jsonb, '507c8d5c37d156462396cc040f58fe60c46434edeaa7ff3e524c072156906000', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'japan_culture_plastic_love'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_city_pop_internet_revival
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_city_pop_internet_revival', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_city_pop_internet_revival","entity_type":"historical_milestone","slug":"tokyo-city-pop-internet-revival","canonical_name":"City pop’s internet-era global revival","short_description":"Online circulation in the 2010s helped reintroduce city pop internationally, with “Plastic Love” becoming a prominent example.","start_year":2010,"end_year":null,"place_relation":"historically_significant_in","source_keys":["japan_culture_plastic_love","jpf_city_pop"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '29a43fd145d706b76a54291d7a17dab3e3abaa0239bdab9e2a7ecc9bd5a74674', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'japan_culture_plastic_love'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_ymo_electronic_pop
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_ymo_electronic_pop', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_ymo_electronic_pop","entity_type":"scene","slug":"tokyo-ymo-electronic-pop","canonical_name":"Yellow Magic Orchestra and Japanese electronic pop","short_description":"YMO’s late-1970s work and international touring made Japanese electronic pop highly visible beyond Japan.","start_year":1978,"end_year":null,"place_relation":"associated_with","source_keys":["sony_ymo_1979","sony_ymo_archive"],"confidence":0.91,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '080eab9d51147fb55b275559cba6ebf6ac8f064762e8d2fa54995b521512d67a', 'new_candidate', 'needs_review', 0.910, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'sony_ymo_1979'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_ymo_sound_signature
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_ymo_sound_signature', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_ymo_sound_signature","entity_type":"sound_signature","slug":"tokyo-ymo-sound-signature","canonical_name":"YMO electronic listening frame","short_description":"A listening frame for YMO’s late-1970s electronic repertoire based on first-party archive documentation.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["sony_ymo_1979","sony_ymo_archive"],"confidence":0.84,"review_status":"needs_review","publication_status":"draft","metadata":{"listen_for":["synthesizer-led arrangements","electronic rhythm","precise ensemble programming/performance","futurist pop presentation"],"techniques":[],"context":["This is a listening frame for the seed, not a claim that all Tokyo electronic music shares these traits."],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'ec8ac97e828544d1cad07843be98581839f61ae12023a51a666f872e49279d73', 'new_candidate', 'needs_review', 0.840, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'sony_ymo_1979'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_rydeen_ymo
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_rydeen_ymo', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_rydeen_ymo","entity_type":"recording_reference","slug":"tokyo-rydeen-ymo","canonical_name":"Rydeen","short_description":"A widely documented YMO repertoire piece from the 1979 Solid State Survivor era and international live set.","start_year":1979,"end_year":1979,"place_relation":"associated_with","source_keys":["sony_ymo_1979","sony_ymo_archive","musicbrainz_artist_identity"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Yellow Magic Orchestra","title":"Rydeen","release_year":1979,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Yellow Magic Orchestra Rydeen"},"credit_components":[{"artist_seed_id":"tokyo_artist_ymo","role":"primary_artist"}]}}}'::jsonb, '0ed528585a6ca9271acaf51b70e7a6fee38b8673f96f1781158c3f4698003c7f', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'sony_ymo_1979'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_technopolis_ymo
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_technopolis_ymo', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_technopolis_ymo","entity_type":"recording_reference","slug":"tokyo-technopolis-ymo","canonical_name":"Technopolis","short_description":"A YMO electronic-pop landmark documented in 1979-era live/archive materials.","start_year":1979,"end_year":1979,"place_relation":"associated_with","source_keys":["sony_ymo_1979","sony_ymo_archive","musicbrainz_artist_identity"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Yellow Magic Orchestra","title":"Technopolis","release_year":1979,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Yellow Magic Orchestra Technopolis"},"credit_components":[{"artist_seed_id":"tokyo_artist_ymo","role":"primary_artist"}]}}}'::jsonb, 'd2487afc6b5202a03d96bbc0a4a3cf277286c55ee8d6562ec22de59107a5f4d9', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'sony_ymo_1979'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_automatic_utada
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_automatic_utada', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_automatic_utada","entity_type":"recording_reference","slug":"tokyo-automatic-utada","canonical_name":"Automatic","short_description":"Hikaru Utada’s debut single, released December 9, 1998, and a major late-1990s Japanese pop landmark.","start_year":1998,"end_year":1998,"place_relation":"associated_with","source_keys":["utada_profile","utada_automatic","musicbrainz_recording_identity"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Hikaru Utada","title":"Automatic","release_year":1998,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Hikaru Utada Automatic"},"credit_components":[{"artist_seed_id":"tokyo_artist_hikaru_utada","role":"primary_artist"}]}}}'::jsonb, '47bd5dbbe38621af555cd960577c23d120eb4b2e395357188ef92dec7b5b63e8', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'utada_profile'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_jpop_late_1990s
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_jpop_late_1990s', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_jpop_late_1990s","entity_type":"educational_topic","slug":"tokyo-jpop-late-1990s","canonical_name":"Late-1990s Japanese pop transition","short_description":"A pilot educational node for connecting city-pop/electronic precedents to the late-1990s J-pop era without claiming a single direct genre lineage.","start_year":1998,"end_year":null,"place_relation":"associated_with","source_keys":["utada_profile"],"confidence":0.8,"review_status":"needs_review","publication_status":"draft","metadata":{}}}'::jsonb, '0dbdcef82235be5a8b3ffad40b74955f732aa0dea5135fc95bba780b94e5e1f9', 'new_candidate', 'needs_review', 0.800, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'utada_profile'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_ymo_synthesizer
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_ymo_synthesizer', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_ymo_synthesizer","entity_type":"instrument","slug":"synthesizer-ymo-japanese-electronic-pop","canonical_name":"Synthesizer — YMO and Japanese electronic pop","short_description":"Yellow Magic Orchestra’s electronic palette relied heavily on synthesizers; Ryuichi Sakamoto later became closely associated with advanced synthesizer programming and Yamaha digital synthesis.","start_year":1978,"end_year":null,"place_relation":"associated_with","source_keys":["yamaha_sakamoto_synth","sony_ymo_archive"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"electronic","sound_role":"synthetic melody, bass, harmony and timbral design","listen_for":["precise synthetic timbres","layered electronic bass and lead lines"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'edf5ac0fed99eea0a50559245f41e24cea78136de654e2b858ebcdf5d9b8e52b', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'yamaha_sakamoto_synth'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_ymo_tr808
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_ymo_tr808', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_ymo_tr808","entity_type":"instrument","slug":"roland-tr-808-ymo","canonical_name":"Roland TR-808 rhythm machine","short_description":"YMO were among the early high-profile experimental users of the Roland TR-808, exploiting its deliberately electronic kick, clap and programmable rhythm character.","start_year":1980,"end_year":null,"place_relation":"associated_with","source_keys":["roland_ymo_808"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"electronic_percussion","sound_role":"programmable drum-machine rhythm","listen_for":["electronic kick and clap timbres","machine rhythm used as an expressive texture"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'c523fbc533b2f7e897a476ec7f415d3f192887935b86758f8e56ee6fc3a87496', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'roland_ymo_808'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_ymo_mc8
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_ymo_mc8', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_ymo_mc8","entity_type":"instrument","slug":"roland-mc-8-ymo","canonical_name":"Roland MC-8 Microcomposer","short_description":"YMO and Ryuichi Sakamoto used the Roland MC-8 microprocessor sequencer as part of early computer-controlled electronic production.","start_year":1978,"end_year":null,"place_relation":"associated_with","source_keys":["roland_ymo_808"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"sequencer","sound_role":"computer-controlled sequencing of electronic parts","listen_for":["precisely sequenced multi-part electronic arrangements"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'e029ae27bdb14ccdc4d22b96da7f42f809a25c55757bcb2645e48f9e542b41cd', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'roland_ymo_808'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_dx7_jpop
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_dx7_jpop', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_dx7_jpop","entity_type":"instrument","slug":"yamaha-dx7-japanese-pop","canonical_name":"Yamaha DX7 and 1980s Japanese pop production","short_description":"The DX7 arrived in 1983 as MIDI and digital synthesis were reshaping Japanese pop production; Sakamoto adopted it extensively in his post-YMO solo work.","start_year":1983,"end_year":null,"place_relation":"associated_with","source_keys":["yamaha_jpop_synth","yamaha_sakamoto_synth"],"confidence":0.96,"review_status":"needs_review","publication_status":"draft","metadata":{"instrument_family":"digital_synthesizer","sound_role":"FM-synthesis timbres and programmable digital keyboard textures","listen_for":["bright digital FM timbres","precisely programmed keyboard textures"],"audio_policy":"description_only_until_rights_cleared"}}}'::jsonb, 'f5586f8e756e8648d7a364c58bb7d491f8b8c7907ea572bd568531c91a1aa3cd', 'new_candidate', 'needs_review', 0.960, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'yamaha_jpop_synth'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_1000_knives
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_1000_knives', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_1000_knives","entity_type":"recording_reference","slug":"tokyo-1000-knives-ryuichi-sakamoto","canonical_name":"1000 Knives","short_description":"Roland documents “1000 Knives” as an early example of YMO/Sakamoto-era experimentation with programmable electronic rhythm and sequencing.","start_year":1978,"end_year":null,"place_relation":"associated_with","source_keys":["roland_ymo_808","musicbrainz_artist_identity"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"artist_name":"Ryuichi Sakamoto","title":"1000 Knives","release_year":1978,"playback_policy":"metadata_only","rights_status":"unresolved","provider_lookup_hints":{"query":"Ryuichi Sakamoto 1000 Knives"},"credit_components":[{"artist_seed_id":"tokyo_artist_ryuichi_sakamoto","role":"primary_artist"}]}}}'::jsonb, '2bf289849cece96d380acdf30f6d73bd5fb83d361be8938b0dd2e2408e59916b', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'roland_ymo_808'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_yamaha_rd_tokyo
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_yamaha_rd_tokyo', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_yamaha_rd_tokyo","entity_type":"studio_landmark","slug":"yamaha-rd-tokyo-shibuya","canonical_name":"Yamaha R&D Tokyo","short_description":"Yamaha established an R&D facility in Shibuya in 1985, linking Tokyo directly to the development and artist adoption of later Japanese synthesizer technologies.","start_year":1985,"end_year":null,"place_relation":"historically_significant_in","source_keys":["yamaha_sakamoto_synth"],"confidence":0.85,"review_status":"needs_review","publication_status":"draft","metadata":{"landmark_type":"music_technology_research_facility","address_text":"Dogenzaka district, Shibuya, Tokyo, Japan","media_policy":"link_only_until_cleared","geocoding_precision":"district_only","do_not_invent_street_address":true}}}'::jsonb, 'c99f7c302d7523515baba72982c71b4e68eeb09f9ef0e3dd675a26f72c42b180', 'new_candidate', 'needs_review', 0.850, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'yamaha_sakamoto_synth'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_artist_mariya_takeuchi
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_artist_mariya_takeuchi', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_artist_mariya_takeuchi","entity_type":"artist_reference","slug":"mariya-takeuchi","canonical_name":"Mariya Takeuchi","short_description":"External knowledge-graph identity for Mariya Takeuchi; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","japan_culture_plastic_love"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"02bdc7ec-d102-4698-85e2-789a42d40b9c","wikidata_qid":"Q1143704","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, 'e4aec4ad704ac3df06fee72d9819253ba02d6eb23622574a0143e2999fe8093c', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_artist_ymo
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_artist_ymo', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_artist_ymo","entity_type":"artist_reference","slug":"yellow-magic-orchestra","canonical_name":"Yellow Magic Orchestra","short_description":"External knowledge-graph identity for Yellow Magic Orchestra; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","sony_ymo_archive"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"group","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"ac5af671-1df0-4312-8b7b-e61992ecc883","wikidata_qid":"Q854590","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '94f7d645e5124affe7ab37407c04e03173afab232501407fe7c0db260662bd76', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_artist_ryuichi_sakamoto
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_artist_ryuichi_sakamoto', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_artist_ryuichi_sakamoto","entity_type":"artist_reference","slug":"ryuichi-sakamoto","canonical_name":"Ryuichi Sakamoto","short_description":"External knowledge-graph identity for Ryuichi Sakamoto; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","yamaha_sakamoto_synth"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"a7f7df4a-77d8-4f12-8acd-5c60c93f4de8","wikidata_qid":null,"tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, '449a5aa72140bcdc655bbf2a9eb67a056add6e09508b689f457d2b84ad9d7d57', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:tokyo_artist_hikaru_utada
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'cultural_entity', 'seed:tokyo:tokyo_artist_hikaru_utada', '{"pilot_key":"tokyo","place_path":"jp/tokyo","entity":{"seed_id":"tokyo_artist_hikaru_utada","entity_type":"artist_reference","slug":"hikaru-utada","canonical_name":"Hikaru Utada","short_description":"External knowledge-graph identity for Hikaru Utada; this record is not a Tourify user or artist profile.","start_year":null,"end_year":null,"place_relation":"associated_with","source_keys":["musicbrainz_artist_identity","wikidata_identity","utada_profile"],"confidence":0.98,"review_status":"needs_review","publication_status":"draft","metadata":{"identity_kind":"person","identity_policy":"external_reference_not_tourify_profile","external_ids":{"musicbrainz_artist_mbid":"b539e453-c4fe-47e3-8a07-8517eac74429","wikidata_qid":"Q234598","tourify_artist_profile_id":null},"tourify_match_status":"no_exact_demo_match_checked_2026_08_20"}}}'::jsonb, 'b66c6fff3b22797e1ebcf124db6d6d2f166cec40d27539534492030afdb7aa08', 'new_candidate', 'needs_review', 0.980, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'musicbrainz_artist_identity'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:1
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:1', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_city_pop_internet_revival","relation_key":"related_to","object_seed_id":"tokyo_city_pop","source_keys":["japan_culture_plastic_love","jpf_city_pop"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'ac5d9c8a93e5a3e2cc10b8777e261a38d4237599c4b0ebeb313365073bfd4359', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'japan_culture_plastic_love'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:2
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:2', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_ymo_electronic_pop","relation_key":"related_to","object_seed_id":"tokyo_city_pop","source_keys":["jpf_city_pop","sony_ymo_1979"],"confidence":0.65,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'c683f1cd252516793accc5a38d192a09ad99adfaf2be2f5d8f0a062f92d8adcf', 'new_candidate', 'needs_review', 0.650, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'jpf_city_pop'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:3
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:3', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_ymo_electronic_pop","relation_key":"uses_instrument","object_seed_id":"tokyo_ymo_synthesizer","source_keys":["yamaha_sakamoto_synth","sony_ymo_archive"],"confidence":0.95,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'd5dd0ea961a5e8ab3088d17aa280cdc10c0b440394e2b55ec15d99572fc60a9f', 'new_candidate', 'needs_review', 0.950, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'yamaha_sakamoto_synth'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:4
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:4', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_ymo_electronic_pop","relation_key":"uses_instrument","object_seed_id":"tokyo_ymo_tr808","source_keys":["roland_ymo_808"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, '5a34cff1af285c687e3ef12ec2d42e5ef25b38901f626a949f843f0ec5a0bf65', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'roland_ymo_808'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:5
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:5', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_ymo_electronic_pop","relation_key":"uses_instrument","object_seed_id":"tokyo_ymo_mc8","source_keys":["roland_ymo_808"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft"}}'::jsonb, 'b512986f2318033b294790e78e823f89a00a710a4e0e9004e5d840b4615b0178', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'roland_ymo_808'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:6
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:6', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_plastic_love","relation_key":"credited_to","object_seed_id":"tokyo_artist_mariya_takeuchi","source_keys":["japan_culture_plastic_love","wmg_plastic_love","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'f2e58b9d8e27db9430c1c46dcd94534cef8126f42664b0aea1bf6edf73f68ffb', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'japan_culture_plastic_love'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:7
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:7', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_rydeen_ymo","relation_key":"credited_to","object_seed_id":"tokyo_artist_ymo","source_keys":["sony_ymo_1979","sony_ymo_archive","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.94,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '4721f90699049afe872ba97f7f1999e410d3e7a87f1e05c16e0647286381a100', 'new_candidate', 'needs_review', 0.940, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'sony_ymo_1979'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:8
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:8', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_technopolis_ymo","relation_key":"credited_to","object_seed_id":"tokyo_artist_ymo","source_keys":["sony_ymo_1979","sony_ymo_archive","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.93,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '92f45e00e6a06402b38cca8af40fb37a40469bdf9034594e978522636e553e08', 'new_candidate', 'needs_review', 0.930, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'sony_ymo_1979'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:9
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:9', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_automatic_utada","relation_key":"credited_to","object_seed_id":"tokyo_artist_hikaru_utada","source_keys":["utada_profile","utada_automatic","musicbrainz_recording_identity","musicbrainz_artist_identity","wikidata_identity"],"confidence":0.97,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, '2b7537007491eaeac58ba11bd6afdc9be1436aee442ee6520e07a57c1140f5c4', 'new_candidate', 'needs_review', 0.970, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'utada_profile'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:10
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:10', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_1000_knives","relation_key":"credited_to","object_seed_id":"tokyo_artist_ryuichi_sakamoto","source_keys":["roland_ymo_808","musicbrainz_artist_identity","yamaha_sakamoto_synth"],"confidence":0.9,"review_status":"needs_review","publication_status":"draft","metadata":{"credit_role":"primary_artist"}}}'::jsonb, 'e7a8ac672bbc244cbe2f8c5140c9f1952743b09f78f0345cc4d8584b4188022f', 'new_candidate', 'needs_review', 0.900, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'roland_ymo_808'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- seed:tokyo:relationship:11
insert into public.world_ingestion_candidates (source_id, entity_kind, external_record_id, normalized_payload, payload_hash, match_status, review_status, confidence, metadata)
select s.id, 'relationship', 'seed:tokyo:relationship:11', '{"pilot_key":"tokyo","place_path":"jp/tokyo","relationship":{"subject_seed_id":"tokyo_yamaha_rd_tokyo","relation_key":"related_to","object_seed_id":"tokyo_artist_ryuichi_sakamoto","source_keys":["yamaha_sakamoto_synth"],"confidence":0.99,"review_status":"needs_review","publication_status":"draft","metadata":{"relationship_note":"Yamaha documents Sakamoto visiting R&D Tokyo and advising designers and developers."}}}'::jsonb, '2cc5596f242fa593a024343a0b3fff6629f4670ec01501647b23873b50ee033c', 'new_candidate', 'needs_review', 0.990, '{"seed_framework":"world-history-seed-v0.1"}'::jsonb
from public.world_sources s where s.source_key = 'yamaha_sakamoto_synth'
on conflict (source_id, entity_kind, external_record_id) do update
set normalized_payload=excluded.normalized_payload, payload_hash=excluded.payload_hash, review_status='needs_review', confidence=excluded.confidence, updated_at=now();

-- Intentionally rollback by default. Remove only during an explicitly authorized isolated/staging seed run.

