# Discover Domain Questions

**Audit Date:** 2026-09-09  
**Auditor:** discover agent  

---

## 1. Search Consolidation

### Q1.1: Which search endpoint should be the canonical implementation?

**Context:** 4+ search implementations exist with different behavior.

**Options:**
- `/api/search/global` (FTS-based, most modern)
- `/api/search/enhanced` (creator capabilities)
- New unified endpoint

**Owner Decision Needed:** Yes  
**Priority:** P1  
**Related:** WS-2.3

---

### Q1.2: Should legacy ILIKE search be deprecated or removed?

**Context:** Legacy search uses ILIKE while FTS infrastructure exists.

**Options:**
- Deprecate with warning period
- Remove immediately
- Keep as fallback for edge cases

**Owner Decision Needed:** Yes  
**Priority:** P1  
**Related:** WS-3.2

---

### Q1.3: Should venue search RPC be consolidated with global search?

**Context:** `search_public_venues` RPC exists separately from global search.

**Options:**
- Consolidate into global search
- Keep separate (venue-specific optimizations)
- Hybrid approach

**Owner Decision Needed:** Yes  
**Priority:** P2  
**Related:** WS-2.3

---

## 2. FTS Infrastructure

### Q2.1: Should world history search be moved to server-side FTS?

**Context:** World history search is client-side from static JSON.

**Options:**
- Move to server-side FTS (better scalability)
- Keep client-side (simpler, no DB load)
- Hybrid (precompute + client-side)

**Owner Decision Needed:** Yes  
**Priority:** P2  
**Related:** WS-3.2

---

### Q2.2: Are there missing FK indexes that need attention?

**Context:** WS-3.2 mentions missing FK indexes.

**Options:**
- Audit and add missing indexes
- Defer to database agent
- Document and prioritize

**Owner Decision Needed:** Yes  
**Priority:** P2  
**Related:** WS-3.2

---

## 3. Rate Limiting

### Q3.1: Should rate limiting be added to all search endpoints?

**Context:** Only legacy search has explicit rate limiting.

**Options:**
- Add rate limiting to all search endpoints
- Add rate limiting only to high-traffic endpoints
- Defer to infrastructure team

**Owner Decision Needed:** Yes  
**Priority:** P2  
**Related:** WS-1.3

---

### Q3.2: What rate limits should apply to search endpoints?

**Context:** No documented rate limits for search.

**Options:**
- Per-IP limits
- Per-user limits
- Hybrid (anonymous vs authenticated)

**Owner Decision Needed:** Yes  
**Priority:** P2  
**Related:** WS-1.3

---

## 4. World Data Access

### Q4.1: Should world data be accessible to authenticated users?

**Context:** World tables are service-role only.

**Options:**
- Add authenticated read access
- Keep service-role only (admin/SEO only)
- Hybrid (some tables, not all)

**Owner Decision Needed:** Yes  
**Priority:** P2  

---

### Q4.2: Should world history search be server-side?

**Context:** World history search is client-side from static JSON.

**Options:**
- Move to server-side FTS
- Keep client-side
- Hybrid (precompute + client-side)

**Owner Decision Needed:** Yes  
**Priority:** P2  

---

## 5. API Contracts

### Q5.1: Should Zod contracts be added to search/discover routes?

**Context:** No contracts exist. WS-2.3 wants contracts for all new/edited routes.

**Options:**
- Add Zod contracts now
- Add contracts during consolidation
- Defer to later phase

**Owner Decision Needed:** Yes  
**Priority:** P2  
**Related:** WS-2.3

---

### Q5.2: Should search/discover contracts be shared with other domains?

**Context:** Search results may be reused across domains.

**Options:**
- Shared contracts in `packages/api-contracts/`
- Domain-specific contracts
- Hybrid (shared types, domain-specific routes)

**Owner Decision Needed:** Yes  
**Priority:** P3  

---

## 6. Testing

### Q6.1: What test coverage is required for search consolidation?

**Context:** Search tests exist but integration tests are missing.

**Options:**
- Unit tests only
- Unit + integration tests
- Unit + integration + e2e tests

**Owner Decision Needed:** Yes  
**Priority:** P2  

---

### Q6.2: Should world history search have server-side tests?

**Context:** World history search is client-side.

**Options:**
- Add server-side tests
- Keep client-side tests only
- Add both

**Owner Decision Needed:** Yes  
**Priority:** P3  

---

## 7. Mobile

### Q7.1: Should mobile discover share components with web?

**Context:** Mobile discover has separate implementation.

**Options:**
- Share components where possible
- Keep separate implementations
- Hybrid (shared logic, platform-specific UI)

**Owner Decision Needed:** Yes  
**Priority:** P3  

---

## 8. News

### Q8.1: Should news feed have rate limiting?

**Context:** News feed API has no explicit rate limiting.

**Options:**
- Add rate limiting
- Defer (low traffic)
- Monitor and add if needed

**Owner Decision Needed:** Yes  
**Priority:** P3  

---

## Summary

| Question | Priority | Owner | Status |
|----------|----------|-------|--------|
| Q1.1 | P1 | TBD | Open |
| Q1.2 | P1 | TBD | Open |
| Q1.3 | P2 | TBD | Open |
| Q2.1 | P2 | TBD | Open |
| Q2.2 | P2 | TBD | Open |
| Q3.1 | P2 | TBD | Open |
| Q3.2 | P2 | TBD | Open |
| Q4.1 | P2 | TBD | Open |
| Q4.2 | P2 | TBD | Open |
| Q5.1 | P2 | TBD | Open |
| Q5.2 | P3 | TBD | Open |
| Q6.1 | P2 | TBD | Open |
| Q6.2 | P3 | TBD | Open |
| Q7.1 | P3 | TBD | Open |
| Q8.1 | P3 | TBD | Open |

---

*Generated by discover agent audit on 2026-09-09*
