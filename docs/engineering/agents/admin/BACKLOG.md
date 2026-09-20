# Admin backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- `ADMIN-001` — read-only audit of admin workspace: baseline, gaps, questions. BASELINE.md, GAPS.md, QUESTIONS.md produced; awaiting product owner answers on Q001-Q013.
- `ADMUX-0102` — replace custom mobile/collapsed-sidebar behavior with accessible, client-routed navigation.

## Candidate

- `ADMUX-0103` — acting-organization scope behavior, after the first navigation slice is stable.
- WS-0.8 — admin gate split (P0 blocker from DEVELOPMENT_BACKLOG.md); blocked on Q001 answer.
- WS-1.7 — admin guard sweep (P0 blocker from DEVELOPMENT_BACKLOG.md); blocked on Q002 answer.

## Blocked

- `ADM-B01` — independent CI/staging migration-chain evidence is still required; local-only evidence cannot close it.

## Done

- Control-plane bootstrap created.
- `ADMUX-W01` — implemented and locally verified `ADMUX-0101` first-level IA, route reachability, and direct destination search; canonical audit status was not promoted.

## P0 production launch task — 2026-09-16

- **ADMIN-003** — finish canonical server-side guard coverage for all production admin APIs, prove tenant/resource denials, and reduce the undocumented exception registry to zero.
  - 2026-09-17 batch: canonicalized the event-discovery platform routes (`event-merges`, `event-claims`, `event-providers`, `event-sync`) with `withPlatformAdmin`; local denial/contract tests pass. Remaining legacy routes and hosted launch evidence remain open.
