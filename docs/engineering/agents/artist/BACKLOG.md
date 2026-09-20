# Artist backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- ARTIST-001: Audit complete — awaiting product owner answers to QUESTIONS.md (16 questions, P1–P3)

## Candidate

Ordered by priority from the audit. Convert to bounded tasks once questions are answered.

### P1 (awaiting product owner answers)
1. Standardize artist API auth patterns (Q2) — create `requireArtistProfile` wrapper
2. Audit `archive/` migration tables for active schema (Q3) — database agent handoff
3. Decide music domain ownership boundary (Q1) — cross-agent coordination
4. Build artist contract viewing/signing UI or defer (Q4)
5. Implement EPK subscription gating or confirm free tier (Q5)

### P2 (can start without answers)
6. Refactor artist music page monolith into focused components (Q6)
7. Clean up artist features redirect pages (Q7)
8. Add artist dashboard layout with sidebar navigation (Q8)
9. Add server-side validation for profile updates (Q9)
10. Standardize toast system to sonner (Q10)

### P3 (future sprints)
11. Add Upstash rate limiting to EPK API routes (Q11)
12. Remove dead code: page-simple-broken, page-optimized, debug-auth (Q12)
13. Add per-section error boundaries for music, events, business (Q13)
14. Build artist-specific test suite — EPK, profile save, events CRUD (Q14)
15. Verify artist store page integration with marketplace (Q15)
16. Harden artist context with tests (Q16)

## Done

- Control-plane bootstrap created.
- ARTIST-001 audit completed: BASELINE.md, GAPS.md, QUESTIONS.md produced.

## Production launch triage — 2026-09-16

- **ARTIST-003 (P2)** — non-blocking for initial launch unless QA-003 records a direct dependency from a core journey.
