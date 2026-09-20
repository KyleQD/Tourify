# Discover Domain Gaps

**Audit Date:** 2026-09-09  
**Auditor:** discover agent  

---

## 1. Critical Gaps

### GAP-001: Search Endpoint Proliferation (WS-2.3)

**Severity:** High  
**Impact:** Maintenance burden, inconsistent behavior, unclear contract  

**Current State:**
- 4+ search implementations:
  - `/api/search` (legacy ILIKE)
  - `/api/search/unified` (thin reshape)
  - `/api/search/global` (FTS)
  - `/api/search/enhanced` (creator capabilities)
  - `search_public_venues` RPC

**Gap:** No consolidation path. Each endpoint has different behavior, rate limiting, and response shapes.

**Evidence:**
- `app/api/search/route.ts` - ILIKE queries
- `app/api/search/unified/route.ts` - 10-line reshape
- `app/api/search/global/route.ts` - FTS queries
- `app/api/search/enhanced/route.ts` - creator capabilities
- `app/api/events/discover/route.ts` - events discover

**Acceptance Criteria:**
- [ ] Single search endpoint with clear contract
- [ ] Legacy search deprecated or removed
- [ ] All clients migrated to unified endpoint
- [ ] Zod contracts for search request/response

---

### GAP-002: FTS Underutilization (WS-3.2)

**Severity:** High  
**Impact:** Search performance at scale  

**Current State:**
- 10+ tables have `global_search_vector` tsvector columns
- Legacy search still uses ILIKE
- World history search is client-side from static JSON

**Gap:** FTS infrastructure exists but is not fully leveraged.

**Evidence:**
- `20260801221454_global_search_indexes.sql` - GIN indexes on 10+ tables
- `app/api/search/route.ts` - still uses ILIKE
- `lib/world/history/search.ts` - client-side search from JSON

**Acceptance Criteria:**
- [ ] Legacy ILIKE search migrated to FTS
- [ ] World history search moved to server-side FTS
- [ ] Search performance benchmarks documented

---

### GAP-003: Rate Limiting Gaps (WS-1.3)

**Severity:** Medium  
**Impact:** Abuse potential on search endpoints  

**Current State:**
- Only legacy search has explicit rate limiting
- Global search, enhanced search, and venue search RPC lack rate limiting

**Gap:** Inconsistent rate limiting across search surfaces.

**Evidence:**
- `app/api/search/route.ts` - has rate limiter
- `app/api/search/global/route.ts` - no rate limiter
- `app/api/search/enhanced/route.ts` - no rate limiter
- `search_public_venues` RPC - grants to anon/authenticated

**Acceptance Criteria:**
- [ ] Rate limiting on all search endpoints
- [ ] Rate limits documented
- [ ] Abuse monitoring in place

---

## 2. Medium Gaps

### GAP-004: API Contract Gaps

**Severity:** Medium  
**Impact:** Type safety, documentation, client generation  

**Current State:**
- No Zod contracts for search or discover routes
- WS-2.3 wants contracts for all new/edited routes

**Gap:** No type-safe contracts for search/discover APIs.

**Evidence:**
- No files in `packages/api-contracts/` for search/discover
- Search routes return untyped JSON

**Acceptance Criteria:**
- [ ] Zod contracts for search request/response
- [ ] Zod contracts for discover request/response
- [ ] Client generation from contracts

---

### GAP-005: World Data Access Restrictions

**Severity:** Medium  
**Impact:** Limited user access to world data  

**Current State:**
- World tables (world_radio_stations, etc.) are service-role only
- No authenticated user access for world data
- World history search is client-side

**Gap:** World data is not accessible to authenticated users.

**Evidence:**
- `supabase/migrations/20260822021740_world_music_knowledge_media_foundation.sql` - RLS policies
- `lib/world/history/search.ts` - client-side search

**Acceptance Criteria:**
- [ ] Authenticated read access for world data
- [ ] Server-side world history search
- [ ] RLS policies for user-facing world data

---

### GAP-006: Test Coverage Gaps

**Severity:** Medium  
**Impact:** Regression risk, maintenance burden  

**Current State:**
- Search tests exist (4 files)
- World tests exist (1 file)
- Discover lib tests exist (4 files)
- Missing: integration tests for search endpoints, news feed API tests, discover page rendering tests, world history search tests

**Gap:** Incomplete test coverage for search/discover surfaces.

**Evidence:**
- `__tests__/search/` - 4 files
- `__tests__/world/` - 1 file
- `lib/discover/__tests__/` - 4 files

**Acceptance Criteria:**
- [ ] Integration tests for search endpoints
- [ ] News feed API tests
- [ ] Discover page rendering tests
- [ ] World history search tests

---

## 3. Low Gaps

### GAP-007: Mobile Discover Parity

**Severity:** Low  
**Impact:** Feature parity between web and mobile  

**Current State:**
- Mobile discover tab exists at `apps/mobile/app/(tabs)/discover.tsx`
- Separate implementation from web discover

**Gap:** Mobile discover may not have full feature parity with web.

**Evidence:**
- `apps/mobile/app/(tabs)/discover.tsx`

**Acceptance Criteria:**
- [ ] Mobile discover feature parity audit
- [ ] Shared components where possible

---

### GAP-008: World History Search Performance

**Severity:** Low  
**Impact:** Search quality for world history  

**Current State:**
- World history search is client-side from static JSON
- No server-side FTS for world history

**Gap:** World history search may not scale or provide optimal results.

**Evidence:**
- `lib/world/history/search.ts` - loads JSON into memory

**Acceptance Criteria:**
- [ ] Server-side FTS for world history
- [ ] Search quality benchmarks

---

## 4. Gap Priority Matrix

| Gap | Severity | Effort | Priority |
|-----|----------|--------|----------|
| GAP-001 | High | High | P1 |
| GAP-002 | High | Medium | P1 |
| GAP-003 | Medium | Low | P2 |
| GAP-004 | Medium | Medium | P2 |
| GAP-005 | Medium | Medium | P2 |
| GAP-006 | Medium | Medium | P2 |
| GAP-007 | Low | Low | P3 |
| GAP-008 | Low | Medium | P3 |

---

*Generated by discover agent audit on 2026-09-09*
