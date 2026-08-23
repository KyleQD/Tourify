-- =====================================================================
-- P5 (v1.1 contract) — extend the relation-registry domain vocabulary.
--
-- This is the previously missing governed step behind the "MANUAL PUSH
-- REQUIRED" note in suite 06_sql/P5/: the venue/event/org/content/ranking
-- domains were added to world_entity_place_facts and the TypeScript
-- contracts, but the world_relation_types registry constraint was never
-- widened in lineage, so the venue_place seed fails fresh replays.
--
-- Additive widening only: no existing domain value is removed or repurposed.
-- Timestamped immediately before the first v1.1 seed (20260823213001) so
-- replay order matches dependency order.
-- =====================================================================

alter table public.world_relation_types
  drop constraint if exists world_relation_types_domain_check;

alter table public.world_relation_types
  add constraint world_relation_types_domain_check
  check (domain in (
    'artist_place', 'track_place', 'cultural_place', 'cultural_graph',
    'radio_place', 'venue_place', 'event_place', 'org_place',
    'content_place', 'ranking'
  ));
