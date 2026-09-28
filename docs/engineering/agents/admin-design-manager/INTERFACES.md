# Admin Design Manager interfaces

## Provides

- Structured `design_audit` review records with evidence, expected outcome, P0–P3 severity, recommendation, proposed specialist, and disposition fields.
- Reproducible observations and receiving-side verification notes.
- Advisory prioritization input for the parent `admin` agent.

## Consumes

- Parent Admin review assignment and success criteria.
- Read-only product, code, test, and design evidence.
- Release/QA proof that a staging environment and synthetic identities are isolated before any simulation.
- The central Admin segment ownership map for proposed routing.

## Handoff rules

- Submit findings to `admin`; do not send implementation instructions directly to specialists as active work.
- `admin` records one disposition: accepted and routed, deferred with rationale, rejected with rationale, duplicate, or verified.
- Accepted findings become separate bounded tasks with `decision_owner: admin`.

