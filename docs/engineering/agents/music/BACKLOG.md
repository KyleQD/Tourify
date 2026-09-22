# Music backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- **MUSIC-004**: Music worker deployment framework. Status: framework contract and inventory reconciliation implemented; scheduling and dependent-worker activation remain blocked on schema reconciliation and product/operations approval for Q2.

## P1 follow-ups

- **GAP-01**: Reconcile rights, certification, trust/origin, royalty, and finance schema from the pre-reconciliation archive into the active migration chain through the DB process.
- **GAP-02**: Define and implement Music worker scheduling, retry/DLQ, health, and registration.
- **GAP-04/05**: Add route-level regression and staged end-to-end payout coverage for the launch slice.

## Candidate

- **GAP-03**: Add fixture-backed integration tests for preview, origin, royalty-import, trust, rights-anchor, and derivative workers.
- **GAP-06**: Verify trust reconciliation end to end after schema and scheduling are available.
- **GAP-07**: Resolve feature-flag and release policy for trust, rights, certification, royalties, licensing, marketplace, and public verification surfaces.
- **GAP-08**: Extract a shared Music service boundary only where route tests show repeated behavior.
- **GAP-09**: Decide ownership or retirement of creator governance/treaty readiness subsystems.
- **GAP-10**: Decide whether Venue Music is a product surface or a deliberate redirect.
- **GAP-11**: Define and verify the Admin Music workflow.
- **GAP-12**: Choose an analytics aggregation strategy based on launch volume/latency targets.
- **GAP-13**: Teach the generated permissions inventory about Marketplace auth adoption or annotate verified contracts.
- **GAP-14**: Define Audius route resilience, fallback, and production dependency policy.
- **GAP-15**: Decide whether rights anchor and protected derivatives are launch features, staged stubs, or future work.

## Done or superseded

- Control-plane bootstrap created.
- **MUSIC-001**: Audit baseline, gaps, questions, and current boundary reconciliation produced.
- **MUSIC-002**: Unsigned/generic-secret royalty webhook fallbacks removed; dedicated-secret HMAC verification tested.
- **MUSIC-003**: Music↔Marketplace ownership boundary and artist auth handoff established.
- **ARTIST-004**: All 33 Artist Music handlers adopted the artist-profile auth contract.
- **MUSIC-005**: All 13 Music Marketplace handlers adopted Marketplace account/acting-context auth.
- Initial Audius “no tests” finding superseded by adapter/error unit coverage.

## Decision dependencies

- **Q1** (schema promotion/reconciliation) blocks rights, certification, trust, royalty, and worker deployment claims.
- **Q2** (worker launch set/runtime/cadence) blocks MUSIC-004 completion.
- **Q3/Q4** (launch slice and feature-flag policy) determine test and release sequencing.
- **Q5** (licensing/governance ownership) determines long-term Music boundary.
- **Q6/Q7** (venue/admin surfaces) determine whether those pages become implementation tasks.
- **Q8/Q9** (analytics and trust freshness) determine scaling and operations work.
- **Q10/Q11** (Audius and mobile) determine integration and parity scope.

## Deferred from initial production launch — 2026-09-16

- **MUSIC-004 (blocked/P2)** — resume worker deployment only after RELEASE-005 certifies a stable core launch and product/operations explicitly authorize the worker subset.
