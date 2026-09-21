# Artist backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- None.

## Candidate

Ordered by priority from the audit. Convert to bounded tasks once questions are answered.

### P1
2. Audit `archive/` migration tables for active schema (Q3) — database agent handoff

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
- Music ownership resolved by CP-026; ARTIST-002 established the browser transport/server-gate contract.
- ARTIST-004 adopted `requireArtistMusicUser` across all artist-music API route files.
- EPK remains free and unrestricted under CP-033; no subscription-gating task is needed.
- ARTIST-003 implemented the CP-034 contract review/signing UI with artist-scoped navigation, owner/counterparty authorization, and focused regression coverage.

## Production launch triage — 2026-09-16

- **ARTIST-003 (P2)** — non-blocking for initial launch unless QA-003 records a direct dependency from a core journey.
