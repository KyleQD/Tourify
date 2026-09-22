# Discover Domain Baseline

**Audit Date:** 2026-09-09  
**Auditor:** discover agent  
**Scope:** Search, discovery, world data, directories, news, recommendations  

---

## 1. Domain Inventory

### 1.1 Search Systems (4 implementations)

| System | Route | Strategy | Rate Limited | FTS |
|--------|-------|----------|--------------|-----|
| Legacy Search | `/api/search` | ILIKE + rate limiter | ✅ | ❌ |
| Unified Search | `/api/search/unified` | Reshape over legacy | ❌ | ❌ |
| Global Search | `/api/search/global` | FTS (`global_search_vector`) | ❌ | ✅ |
| Enhanced Search | `/api/search/enhanced` | Creator capabilities | ❌ | ✅ |
| Venue Search RPC | `search_public_venues` | Supabase function | ❌ | ✅ |

**Source Files:**
- `app/api/search/route.ts` (legacy)
- `app/api/search/unified/route.ts` (thin reshape)
- `app/api/search/global/route.ts` (global search service)
- `app/api/search/enhanced/route.ts` (enhanced search)
- `app/api/events/discover/route.ts` (events discover)
- `supabase/migrations/20260823110000_public_venue_search_rpc.sql` (RPC)

**Lib Files:**
- `lib/search/global-search-service.ts` (main global search logic)
- `lib/search/global-search-types.ts` (types)
- `lib/search/global-search-ranking.ts` (ranking/dedup)
- `lib/search/global-search-profile-action.ts` (relationship actions)

**Components:**
- `components/search/enhanced-search.tsx`
- `components/search/enhanced-account-search.tsx`
- `components/search/enhanced-profile-search.tsx`
- `components/search/account-search.tsx`
- `components/search/global-search-results.tsx`
- `components/search/search-result-item.tsx`
- `components/search/search-suggestions.tsx`
- `components/search/mobile-search-modal.tsx`
- `components/search/index.ts`

**Tests:**
- `__tests__/search/enhanced-account-search-interaction.test.tsx`
- `__tests__/search/global-search-results.test.ts`
- `__tests__/search/global-search-ranking.test.ts`
- `__tests__/search/global-search-profile-action.test.ts`

---

### 1.2 Discover API & Lib

**API Routes:**
- `app/api/discover/route.ts` (main discover sections: for_you, trending, upcoming, people, artists, venues, organizations, suggestions, hire_matches, new_music, trending_music)

**Lib Files (12):**
- `lib/discover/types.ts` (DiscoverProfile, DiscoverEvent, DiscoverMusicTrack, DiscoverAlbum, DiscoverTour, DiscoverTourStop)
- `lib/discover/enrich.ts` (attachTopTracksToArtists, fetchTopAlbumsByGenre)
- `lib/discover/normalize.ts` (normalizeEventsFromDiscover, normalizeProfilesFromEnhanced, normalizeMusicTracks)
- `lib/discover/ranking.ts` (rankTopSongs, selectTopAlbumsByGenre, rankNewArtists)
- `lib/discover/location-match.ts` (tokenizeLocation, matchesLocationFields, buildLocationOrFilter, sortEventsByLocationBoost)
- `lib/discover/tours.ts` (fetchDiscoverTours, fetchPublicTourBySlug)
- `lib/discover/tour-selection.ts` (selectDiscoverTours - pure helper)
- `lib/discover/ticket-price.ts` (formatTicketPriceLabel)
- `lib/discover/__tests__/` (4 test files)

**Components (10):**
- `components/discover/discover-page-client.tsx`
- `components/discover/discover-masthead.tsx`
- `components/discover/discover-section.tsx`
- `components/discover/artist-card.tsx`
- `components/discover/venue-card.tsx`
- `components/discover/event-card.tsx`
- `components/discover/tour-card.tsx`
- `components/discover/song-card.tsx`
- `components/discover/album-card.tsx`
- `components/discover/rotating-words.tsx`

**Pages:**
- `app/discover/page.tsx` (main discover page)
- `app/discover/events/page.tsx`
- `app/discover/users/page.tsx`
- `app/discover/world/page.tsx`

---

### 1.3 World Data Layer

**Lib Files (19):**
- `lib/world/history/contracts.ts` (WorldHistoryEntityType, WorldHistoryEntity, WorldHistoryPilotBundle, WorldHistoryPlace, WorldHistorySource, WorldPlaceKnowledgeSnapshot)
- `lib/world/history/search.ts` (searchWorldHistory - client-side search from static JSON)
- `lib/world/history/graph.ts`
- `lib/world/history/pilot-corpus.ts`
- `lib/world/history/supabase-world-history-repository.ts`
- `lib/world/history/supabase-world-reader.ts`
- `lib/world/history/supabase-reader-contract.ts`
- `lib/world/history/static-reference-data.ts`
- `lib/world/history/static-pilot-repository.ts`
- `lib/world/history/repository.ts`
- `lib/world/history/project-pilot-profile.ts`
- `lib/world/history/project-world-place-response.ts`
- `lib/world/history/quality.ts`
- `lib/world/history/world-place-contract.ts`
- `lib/world/globe/build-globe-index.ts` (builds GlobeIndex from seed data)
- `lib/world/globe/types.ts`
- `lib/world/editorial/authorization.ts`
- `lib/world/editorial/permissions.ts`
- `lib/world/console/db.ts`

**Components:**
- `components/world/WorldHistoryPreview.tsx`
- `components/world/globe/GlobeExperience.tsx`
- `components/world/globe/globe-scene.ts`
- `components/world/globe/WorldEntryLink.tsx`

**Database Tables (service-role only):**
- `world_radio_stations` (publication_status, review_status, playback_status)
- `world_radio_station_places` (station_id, place_id, relation_type_id)
- `world_radio_streams` (station_id, health_status, availability_status)

**Internal Console:**
- `app/internal/world/console/` (6 files: page, sidebar, stats, radio, ingestion, pilot)

**Tests:**
- `__tests__/world/globe-index.test.ts`

---

### 1.4 News System

**API Routes:**
- `/api/news/feed` (cursor-based pagination, category/sort/query params)

**Lib Files:**
- `lib/news/types.ts` (NewsCategory, NewsFeedItem, NewsSortMode)

**Components (7):**
- `components/news/news-page.tsx` (main news client component)
- `components/news/news-masthead.tsx`
- `components/news/news-item-card.tsx`
- `components/news/news-top-stories.tsx`
- `components/news/news-filters.tsx`
- `components/news/news-feed-list.tsx`
- `components/news/community-stories.tsx`

**Pages:**
- `app/news/page.tsx`
- `app/news/loading.tsx`

---

### 1.5 Mobile

**Files:**
- `apps/mobile/app/(tabs)/discover.tsx` (mobile discover tab)

---

## 2. FTS Infrastructure

### 2.1 Global Search Vectors (10 tables)

Tables with `global_search_vector` tsvector columns + GIN indexes:
1. `profiles` (username, full_name, bio, location)
2. `artist_profiles` (artist_name, url_slug, bio)
3. `venue_profiles` (venue_name, url_slug, description, city/state/country)
4. `organizer_accounts` (organization_name, url_slug, description)
5. `events` (title, description, venue_name/city/state/genre)
6. `events_v2` (title, description, venue_label/name/city/state)
7. `artist_events` (title, description, venue_name/city/state)
8. `tours` (name, description)
9. `artist_music` (title, description, type/genre)
10. `posts` (account_display_name, content, location)
11. `artist_jobs` (title, description, type/location/city/state/genre)
12. `job_posting_templates` (title, description, department/location/role_type)

**Migration:** `20260801221454_global_search_indexes.sql`

### 2.2 World Search Documents

Tables with `search_document` tsvector columns:
1. `world_places` (name, display_name, canonical_path, country_code/admin1_code)
2. `world_music_knowledge_entities` (canonical_name, entity_type, short_description)
3. `world_radio_stations` (name, description)

**Migrations:** `20260822021738_world_shared_geography_foundation.sql`, `20260822021740_world_music_knowledge_media_foundation.sql`

### 2.3 Client-Side Search

- `lib/world/history/search.ts` loads `data/world/reference/search-index.json` and performs in-memory search
- No server-side FTS for world history search

---

## 3. Data Flow Patterns

### 3.1 Discover Page Flow

```
app/discover/page.tsx
  → components/discover/discover-page-client.tsx
    → fetch('/api/discover')
      → lib/discover/*.ts (normalize, rank, enrich)
        → Supabase (artist_music, profiles, artist_profiles, events_v2, tours, tour_events, tour_artists)
```

### 3.2 Search Flow (Legacy)

```
app/search/page.tsx
  → components/search/account-search.tsx or enhanced-search.tsx
    → fetch('/api/search') or fetch('/api/search/enhanced')
      → ILIKE queries on profiles, artist_profiles, venue_profiles, organizer_accounts
        → Rate limiter (legacy only)
```

### 3.3 Global Search Flow

```
components/search/global-search-results.tsx
  → fetch('/api/search/global')
    → lib/search/global-search-service.ts
      → FTS queries using global_search_vector columns
        → lib/search/global-search-ranking.ts (rank, dedup)
          → lib/search/global-search-profile-action.ts (relationship actions)
```

### 3.4 World History Flow

```
app/discover/world/page.tsx
  → lib/world/history/search.ts (client-side from static JSON)
  → lib/world/globe/build-globe-index.ts (server-side from seed data)
    → data/world/reference/places.json
    → data/world/pilots/*.json
```

### 3.5 News Flow

```
app/news/page.tsx
  → components/news/news-page.tsx
    → fetch('/api/news/feed')
      → lib/news/types.ts
```

---

## 4. API Contract Status

**No discover-specific contracts found in `packages/api-contracts/`.**

Search routes do not use Zod contracts. Discover routes do not use Zod contracts.

---

## 5. Test Coverage

### 5.1 Search Tests (4 files)
- `__tests__/search/enhanced-account-search-interaction.test.tsx`
- `__tests__/search/global-search-results.test.ts`
- `__tests__/search/global-search-ranking.test.ts`
- `__tests__/search/global-search-profile-action.test.ts`

### 5.2 World Tests (1 file)
- `__tests__/world/globe-index.test.ts`

### 5.3 Discover Tests (in lib/discover/__tests__/)
- 4 test files for discover lib functions

### 5.4 Missing Tests
- No integration tests for search endpoints
- No tests for news feed API
- No tests for discover page rendering
- No tests for world history search (client-side)

---

## 6. Key Observations

### 6.1 Search Duplication
- 4+ search implementations with overlapping functionality
- Legacy ILIKE search coexists with FTS-based global search
- Unified search is a thin reshape over legacy search
- No consolidation path documented

### 6.2 FTS Underutilization
- 10+ tables have `global_search_vector` columns
- Legacy search still uses ILIKE instead of FTS
- World history search is client-side from static JSON

### 6.3 World Data Access
- World tables (world_radio_stations, etc.) are service-role only
- No authenticated user access for world data
- World history search is client-side, not server-side

### 6.4 Rate Limiting Gaps
- Only legacy search has explicit rate limiting
- Global search, enhanced search, and venue search RPC lack rate limiting
- WS-1.3 targeted auth/money/upload surfaces; search may need coverage

### 6.5 API Contract Gaps
- No Zod contracts for any search or discover routes
- WS-2.3 wants contracts for all new/edited routes

---

## 7. Backlog Items (from DEVELOPMENT_BACKLOG.md)

| ID | Description | Status |
|----|-------------|--------|
| WS-2.3 | Endpoint consolidation (search ×4 → one) | Planned |
| WS-3.2 | Database scale mechanics (FTS/ILIKE scaling) | Planned |
| WS-1.3 | Rate limiting & abuse controls | Planned |

---

*Generated by discover agent audit on 2026-09-09*
