# Discover state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b` (dirty shared worktree)
- Last reviewed at: 2026-09-10
- Active task: DISC-002 (canonical search — focused verification passed; local smoke pending)
- Confidence: implementation and focused verification re-checked

## Durable facts

- Mission: Own search, discovery, world data, directories, news, and recommendations.
- Default working set is recorded in `WORKING_SET.json`.
- **Search infrastructure:** 4+ implementations (legacy ILIKE, unified reshape, global FTS, enhanced creator, venue RPC).
- **FTS infrastructure:** 10+ tables have `global_search_vector` tsvector columns with GIN indexes.
- **World data:** Service-role only access for world tables; world history search is client-side from static JSON.
- **API contracts:** No Zod contracts for search/discover routes.
- **Test coverage:** Search tests (4 files), world tests (1 file), discover lib tests (4 files); missing integration tests.
- **Canonical local search:** `/api/search` now owns the FTS-backed `GlobalSearchResponse` contract, with a 60 requests/minute shared rate-limit bucket. `/api/search/global` is an alias and `/api/search/unified` is a response-shape compatibility adapter. `/api/search/enhanced` remains a compatibility surface for creator-only filters and shares that same limit.

## Current focus

- DISC-001 baseline audit complete. Deliverables: BASELINE.md, GAPS.md, QUESTIONS.md.
- Key gaps: search consolidation (WS-2.3), FTS underutilization (WS-3.2), rate limiting gaps (WS-1.3).
- DISC-002 canonical endpoint implementation re-verified: 12 focused tests, focused ESLint, scoped diff check, and agents:validate passed on 2026-09-10; local Supabase and configured-Redis smoke evidence remains with Release/QA.

## Known risks

- The repository was already heavily modified at bootstrap.
- Generated maps describe topology, not behavioral correctness.
- Search endpoint proliferation creates maintenance burden and inconsistent behavior.
- World data access restrictions limit user-facing features.

Update this file only when a task establishes a durable fact future work needs.

## Production launch graph — 2026-09-16

- DISC-002 remains P1 and is a core launch dependency. It requires one canonical search contract, authorization-aware result filtering, Redis-backed rate limiting, and deployed Supabase/429 staging evidence.
