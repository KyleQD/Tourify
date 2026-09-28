-- GOVERNED ACTIVATION MIGRATION (local isolated rehearsal)
-- Source artifact: implementation/phase2/generated/pilot_source_registry.sql
-- Converted per docs/24_G1_to_Detroit_Activation_Runbook.md A1-A4.
-- Preview wrapper lines (begin;/rollback;) removed so migration
-- governance owns atomicity. Local disposable database ONLY.
-- Vocabulary drift fix: artifact used source_type
-- 'manufacturer_archive' (3 rows) which the reviewed v0.5 schema and
-- Migration B check constraint never contained; remapped to 'archive'
-- (closest reviewed class) rather than widening the frozen contract.

-- WORLD OF MUSIC PILOT SOURCE REGISTRY
-- REVIEW STAGING ONLY. DEFAULTS TO ROLLBACK.

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('detroit_historical_motown', 'Detroit Historical Society — Motown Records', 'museum', 'https://www.detroithistorical.org/learn/online-research/encyclopedia-of-detroit/motown-records', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"local_history_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('motown_museum_legacy', 'Motown Museum — The Motown Sound', 'museum', 'https://www.motownmuseum.org/legacy/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"first_party_museum"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('motown_museum_hitsville', 'Motown Museum — Hitsville U.S.A.', 'museum', 'https://www.motownmuseum.org/visit/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"first_party_museum"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('detroit_historical_atkins', 'Detroit Historical Society — Juan Atkins', 'museum', 'https://www.detroithistorical.org/learn/online-research/encyclopedia-of-detroit/atkins-juan', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"local_history_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('detroit_historical_may', 'Detroit Historical Society — Derrick May', 'museum', 'https://www.detroithistorical.org/learn/online-research/encyclopedia-of-detroit/may-derrick', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"local_history_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('detroit_historical_saunderson', 'Detroit Historical Society — Kevin Saunderson', 'museum', 'https://www.detroithistorical.org/learn/online-research/encyclopedia-of-detroit/saunderson-kevin', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"local_history_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('detroit_historical_transmat', 'Detroit Historical Society — Transmat / Rhythim Is Rhythim label artifact', 'museum', 'https://www.detroithistorical.org/learn/online-research/collection/archive/label-transmat-rhythim-rhythim', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"local_history_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('unesco_reggae_jamaica', 'UNESCO Intangible Cultural Heritage — Reggae music of Jamaica', 'cultural_institution', 'https://ich.unesco.org/en/RL/reggae-music-of-jamaica-01398', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"intergovernmental_cultural_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('smithsonian_roots_reggae', 'Smithsonian Folklife — Black History in Roots Reggae Music', 'cultural_institution', 'https://folklife.si.edu/magazine/black-history-in-roots-reggae-music', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"national_cultural_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('smithsonian_fela_book', 'Smithsonian Libraries — Arrest the music! Fela and his rebel art and politics', 'archive', 'https://www.si.edu/object/siris_sil_773265', 'cc0', 'metadata_only', 'link_only', 'conditional', 'needs_review', '{"authority":"national_archive_metadata","notes":"CC0 applies to Smithsonian record metadata; not assumed to cover the underlying book."}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('fela_official_1977', 'Fela Kuti official history — 1977', 'partner', 'https://felakuti.com/story/1977', 'proprietary', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"first_party_artist_archive"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('fela_official_shrine', 'Fela Kuti official history — New Afrika Shrine', 'partner', 'https://felakuti.com/legacy/new-afrika-shrine', 'proprietary', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"first_party_artist_archive"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('grammy_kuti_guide', 'Recording Academy — Guide to the Kuti family and Afrobeat', 'editorial', 'https://www.grammy.com/news/fela-kuti-musical-family-femi-seun-yeni-made-guide/', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"music_industry_editorial"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('grammy_afrobeats_evolution', 'Recording Academy — Evolution of Afrobeats', 'editorial', 'https://www.grammy.com/news/afrobeats-evolution-wizkid-rema-wande-coal-olamide-asake/?hl=en-US', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"music_industry_editorial"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('grammy_alte', 'Recording Academy — Alté artists and scene', 'editorial', 'https://www.grammy.com/news/10-alte-artists-to-know-odunsi-the-engine-amaarae-teezee/', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"music_industry_editorial"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('london_museum_grime', 'London Museum — London’s grime stars', 'museum', 'https://www.londonmuseum.org.uk/collections/london-stories/londons-grime-stars/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"city_museum"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('london_museum_grime_history', 'London Museum — Grime from the corner to the mainstream', 'museum', 'https://www.londonmuseum.org.uk/blog/grime-music-from-the-corner-to-the-mainstream/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"city_museum"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('london_museum_dub', 'London Museum — Dub in London', 'museum', 'https://www.londonmuseum.org.uk/collections/london-stories/dub-london-shops-sound-systems-legends/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"city_museum"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('london_museum_dub_records', 'London Museum — 10 records that tell the story of Dub London', 'museum', 'https://www.londonmuseum.org.uk/blog/10-records-that-tell-the-story-of-dub-london/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"city_museum"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('jpf_city_pop', 'Japan Foundation Sydney — A brief introduction to city pop', 'cultural_institution', 'https://sydney.jpf.go.jp/media-releases/hiroshi-nagai-paintings-for-music/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"cultural_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('japan_culture_plastic_love', 'Agency for Cultural Affairs / Media Arts Current — Plastic Love revival', 'cultural_institution', 'https://mediag.bunka.go.jp/article/article-19013/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"government_cultural_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('wmg_plastic_love', 'Warner Music Japan — Plastic Love', 'partner', 'https://wmg.jp/mariya/discography/25074', 'proprietary', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"first_party_label"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('sony_ymo_1979', 'Sony Music Japan — YMO 1979 live archive', 'partner', 'https://www.sonymusic.co.jp/artist/YellowMagicOrchestra/info/581187', 'proprietary', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"first_party_label"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('sony_ymo_archive', 'Sony Music Japan — YMO early video/archive note', 'partner', 'https://www.sonymusic.co.jp/artist/YellowMagicOrchestra/info/502976', 'proprietary', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"first_party_label"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('utada_profile', 'Hikaru Utada official profile', 'partner', 'https://www.utadahikaru.jp/profile/', 'proprietary', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"first_party_artist"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('utada_automatic', 'Hikaru Utada official — Automatic / time will tell', 'partner', 'https://www.utadahikaru.jp/music/sv14gs_6upck/', 'proprietary', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"first_party_artist"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('wikidata_geo', 'Wikidata — geographic structured data', 'geographic_metadata', 'https://www.wikidata.org/', 'cc0', 'allowed', 'restricted', 'allowed', 'needs_review', '{"authority":"community_structured_data","notes":"Structured Wikidata data is CC0. Media linked from Wikidata has separate per-file rights and is not cleared by this source record."}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('musicbrainz_geo', 'MusicBrainz — core area metadata', 'music_metadata', 'https://musicbrainz.org/', 'cc0', 'allowed', 'restricted', 'allowed', 'needs_review', '{"authority":"community_music_metadata","notes":"Core MusicBrainz area data is CC0. Supplementary data has different terms; this seed uses only core area identity fields/MBIDs."}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('motown_museum_funk_brothers', 'Motown Museum — Tribute to an Original Funk Brother / Funk Brothers instrumentation', 'museum', 'https://www.motownmuseum.org/henry-hank-cosby-tribute/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"first_party_museum"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('detroit_historical_demf_tech', 'Detroit Historical Society — Flashback to the 2002 Detroit Electronic Music Festival', 'museum', 'https://www.detroithistorical.org/learn/online-research/blog/flashback-2002-detroit-electronic-music-festival', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"local_history_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('smithsonian_nyahbinghi', 'Smithsonian Folkways — Nyabingi: Medley / three-part Nyahbinghi drum ensemble', 'cultural_institution', 'https://folkways.si.edu/group-of-maroons-of-accompong/nyabingi-medley/caribbean-world/music/track/smithsonian', 'unknown', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"national_cultural_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('jamaica_gleaner_studio_one', 'Jamaica Gleaner — Studio One where sweet lyrics come from', 'editorial', 'https://old.jamaica-gleaner.com/gleaner/20070729/ent/ent5.html', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"local_editorial_archive"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('jamaica_gleaner_sound_system', 'Jamaica Gleaner — The evolution of Jamaican sound system culture', 'editorial', 'https://past.jamaica-gleaner.com/article/entertainment/20190203/string-sound-evolution-jcan-sound-system-culture', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"local_editorial_archive"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('fela_kalakuta_museum', 'Fela Kuti official archive — Kalakuta Museum', 'partner', 'https://felakuti.com/gb/legacy/kalakuta-museum', 'proprietary', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"first_party_artist_archive"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('fela_1972_shrine', 'Fela Kuti official history — 1972 / Africa Shrine', 'partner', 'https://felakuti.com/story/1972', 'proprietary', 'manual_reference', 'restricted', 'conditional', 'needs_review', '{"authority":"first_party_artist_archive"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('london_museum_dub_project', 'London Museum — Dub London project / Ariwa Sounds masterclass', 'museum', 'https://www.londonmuseum.org.uk/collections/projects/curating-london/dub-london-bassline-of-a-city/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"city_museum"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('yamaha_sakamoto_synth', 'Yamaha — Sakamoto and Yamaha Synthesizers', 'archive', 'https://usa.yamaha.com/products/contents/music_production/synth_50th/anecdotes/011.html', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"first_party_manufacturer_archive"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('yamaha_jpop_synth', 'Yamaha — Japanese Pop Music and Yamaha Synthesizers', 'archive', 'https://usa.yamaha.com/products/contents/music_production/synth_50th/anecdotes/012.html', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"first_party_manufacturer_archive"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('roland_ymo_808', 'Roland — How Yellow Magic Orchestra Launched the 808 Revolution', 'archive', 'https://articles.roland.com/yellow-magic-orchestra-808-revolution/', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"first_party_manufacturer_archive"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('musicbrainz_artist_identity', 'MusicBrainz — core artist identity metadata', 'music_metadata', 'https://musicbrainz.org/', 'cc0', 'allowed', 'restricted', 'allowed', 'needs_review', '{"authority":"community_music_metadata","notes":"Used for stable artist MBIDs, aliases, type and area identity. MusicBrainz core data is CC0; linked external media is not implicitly cleared."}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('musicbrainz_recording_identity', 'MusicBrainz — core recording and release identity metadata', 'music_metadata', 'https://musicbrainz.org/', 'cc0', 'allowed', 'restricted', 'allowed', 'needs_review', '{"authority":"community_music_metadata","notes":"Used for recording/release identity, dates and relationship metadata. This does not grant rights to the audio recording."}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('wikidata_identity', 'Wikidata — structured artist and cultural identity data', 'music_metadata', 'https://www.wikidata.org/', 'cc0', 'allowed', 'restricted', 'allowed', 'needs_review', '{"authority":"community_structured_data","notes":"Structured Wikidata data is CC0. Linked media carries separate rights."}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('jamaica_jis_rocksteady', 'Jamaica Information Service — Rock Steady', 'cultural_institution', 'https://jis.gov.jm/jamaica/rock-steady/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"government_cultural_information"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('jamaica_jis_roots_reggae', 'Jamaica Information Service — Black History in Roots Reggae Music', 'cultural_institution', 'https://jis.gov.jm/jamaica/black-history-in-roots-reggae-music/', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"government_cultural_information"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('kcl_grime_and_gaming', 'King’s College London — Grime and Gaming', 'academic', 'https://www.kcl.ac.uk/research/grime-and-gaming', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"academic_research"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('westminster_bass_culture', 'University of Westminster — Bass Culture / Black Music Research Unit', 'academic', 'https://www.westminster.ac.uk/news/mykaell-riley-demonstrates-the-importance-of-reggae-in-bafta-winning-documentary', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"academic_research"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('nippon_city_pop', 'Nippon.com — A Guide to City Pop', 'editorial', 'https://www.nippon.com/en/japan-topics/g00631/a-guide-to-city-pop-the-soundtrack-for-japan%E2%80%99s-bubble-era-generation.html', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"japan_public_interest_editorial"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('japan_embassy_city_pop', 'Embassy of Japan in Singapore — The Resurgence of City Pop', 'cultural_institution', 'https://www.sg.emb-japan.go.jp/JCC/E-Magazine-May-2023-City-Pop.html', 'unknown', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"government_cultural_information"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('studio_one_official', 'Studio One — About Us', 'partner', 'https://studioonerecords.com/pages/about-us', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"first_party_music_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('ariwa_official_story', 'Ariwa Sounds — Ariwa Story', 'partner', 'https://www.ariwa.com/ariwa-story', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"first_party_music_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('ariwa_official_catalogue', 'Ariwa Sounds — Catalogue', 'partner', 'https://www.ariwa.com/catalogue', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"first_party_music_institution"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('detroit_news_music_institute', 'The Detroit News — Detroit underground key scenes: Music Institute', 'editorial', 'https://content-static.detroitnews.com/projects/detroit-underground-key-scenes/embed.html', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"local_newspaper"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

insert into public.world_sources (source_key, name, source_type, homepage_url, license_class, ingestion_permission, media_reuse_permission, commercial_use_permission, review_status, metadata)
values ('rbma_music_institute', 'Red Bull Music Academy Daily — Nightclubbing: The Music Institute', 'editorial', 'https://daily.redbullmusicacademy.com/2017/05/music-institute-nightclubbing/', 'proprietary', 'manual_reference', 'restricted', 'unknown', 'needs_review', '{"authority":"music_history_editorial"}'::jsonb)
on conflict (source_key) do update set
  name=excluded.name, source_type=excluded.source_type, homepage_url=excluded.homepage_url,
  license_class=excluded.license_class, ingestion_permission=excluded.ingestion_permission,
  media_reuse_permission=excluded.media_reuse_permission, commercial_use_permission=excluded.commercial_use_permission,
  review_status='needs_review', metadata=excluded.metadata, updated_at=now();

-- Remove ROLLBACK only during an explicitly authorized isolated/staging source-registry load.

