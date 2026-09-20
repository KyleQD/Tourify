# Venue backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- VENUE-001: Audit Venue workspace — baseline, gaps, and questions. Status: active → completing.

## Candidate

Derived from VENUE-001 gap analysis (GAPS.md) and questions (QUESTIONS.md):

### P1 (security / correctness)
- **VENUE-002**: Apply staged venues/RBAC RLS baseline through gated pipeline (WS-1.1)
- **VENUE-003**: Standardize venue API authorization to one wrapper pattern (WS-1.7 follow-up)
- **VENUE-004**: Document and test booking lifecycle state machine

### P2 (product completion / quality)
- **VENUE-005**: Consolidate venue component trees (`app/venue/components/` + `components/venue/`)
- **VENUE-006**: Create `__tests__/venue/` with API, RLS, and booking lifecycle tests
- **VENUE-007**: Adopt React Query on venue dashboards (WS-3.1)
- **VENUE-008**: Add Zod API contracts to venue routes (WS-2.3)
- **VENUE-009**: Define venue kit end-to-end behavior (build vs drop)
- **VENUE-010**: Add ISR/cache-headers to public `/venues/[slug]` profiles (WS-3.4)

### P3 (scale / cleanup)
- **VENUE-011**: Mobile venue surfaces decision and implementation
- **VENUE-012**: Venue notification routing verification
- **VENUE-013**: Venue identity bridge consolidation review
- **VENUE-014**: Rate limiting evaluation for venue public read routes

## Done

- Control-plane bootstrap created.
- VENUE-001: Audit complete — BASELINE.md, GAPS.md, QUESTIONS.md delivered.

## Production launch triage — 2026-09-16

- **VENUE-002 (blocked/P2)** — do not resume without a new live caller seam; escalate only from QA-003 evidence.
