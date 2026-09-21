# Admin backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- `ADMIN-003` — production admin guard convergence, resource-scope classification, and hosted denial evidence. IN PROGRESS.
- `ADMUX-0102` — replace custom mobile/collapsed-sidebar behavior with accessible, client-routed navigation.

## Candidate

- `ADMUX-0103` — acting-organization scope behavior, after the first navigation slice is stable.
- Owner answers to ADMIN-001 Q006–Q011 and Q013 become bounded admin follow-up tasks if and when product chooses to pursue them; they do not block the completed audit.

## Blocked

- `ADM-B01` — independent CI/staging migration-chain evidence is still required; local-only evidence cannot close it.

## Done

- Control-plane bootstrap created.
- `ADMIN-001` — read-only baseline/gaps/questions audit completed 2026-09-20; all thirteen questions are preserved with non-decisional dispositions, bounded context rebuilt, and control-plane validation passed with 0 errors.
- `ADMIN-002` — implemented the WS-0.8 platform/organization gate split under CP-014 and CP-043.
- `ADMUX-W01` — implemented and locally verified `ADMUX-0101` first-level IA, route reachability, and direct destination search; canonical audit status was not promoted.

## P0 production launch task — 2026-09-16

- **ADMIN-003** — finish canonical server-side guard coverage for all production admin APIs, prove tenant/resource denials, and reduce the undocumented exception registry to zero.
  - 2026-09-17 batch: canonicalized the event-discovery platform routes (`event-merges`, `event-claims`, `event-providers`, `event-sync`) with `withPlatformAdmin`; local denial/contract tests pass. Remaining legacy routes and hosted launch evidence remain open.
