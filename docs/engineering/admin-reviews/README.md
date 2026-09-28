# Admin review records

This directory stores advisory review evidence from `admin-design-manager` and `admin-tour-manager`. Reviews are inputs to the parent `admin` agent; they do not authorize implementation, task activation, release approval, or production changes.

## Allowed writers

- `admin-design-manager` writes only `design/**`.
- `admin-tour-manager` writes only `tour-simulations/**`.
- `admin` owns the schema, template, disposition, and task routing.

Managers may inspect product behavior and evidence, but they must not edit product code, tests, schema, migrations, task records, generated state, or release state.

## Record workflow

1. Copy `TEMPLATE.json` into the manager's review-specific directory.
2. Record the reviewer, review type, source SHA, non-production environment, actor goal, evidence, expected outcome, severity, recommendation, and proposed specialist.
3. Submit the review to `admin`.
4. `admin` records exactly one disposition:
   - `accepted_and_routed`
   - `deferred_with_rationale`
   - `rejected_with_rationale`
   - `duplicate`
   - `verified`
5. If accepted, `admin` creates or updates a bounded task with `decision_owner: admin` and records its ID. A finding never dispatches work automatically.
6. Verification records the receiving-side result. UI journey claims require UI evidence; seeds or API calls may prepare state but do not prove the journey.

## Severity

- **P0:** active security, tenant-isolation, data-loss, or launch-stopping failure.
- **P1:** major workflow failure with no safe practical recovery.
- **P2:** material usability, effectiveness, or efficiency problem with a workaround.
- **P3:** minor inconsistency or optimization opportunity.

## Environment safety

Use local inspection or a proven isolated staging environment with campaign-owned synthetic identities. Never use production. Stop when environment isolation, actor identity, or evidence provenance cannot be proven. Evidence must contain no production secrets or personal data.

The files under `design/` and `tour-simulations/` are explicitly marked examples. They demonstrate routing and verified closure shape; they do not assert current product defects and are not real tasks.

