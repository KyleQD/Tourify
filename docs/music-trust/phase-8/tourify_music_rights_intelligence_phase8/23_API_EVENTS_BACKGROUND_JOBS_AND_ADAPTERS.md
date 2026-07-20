# APIs, Events, Background Jobs and Adapters

Use Next.js route handlers, colocated Zod, existing auth helpers, RORO utilities and outbox-driven asynchronous work.

## API families

Consent, private insights, cohort eligibility, benchmark releases, policy alerts, contract observations, education, group readiness, proposals, votes, mandates, complaints and admin approvals.

## Events

`intelligence.consent.activated`, `intelligence.consent.withdrawn`, `cohort.rebuild.requested`, `benchmark.release.approved`, `benchmark.release.revoked`, `policy.alert.published`, `group.formation.approved`, `group.proposal.opened`, `mandate.activated`.

## Jobs

Dataset extraction, consent filtering, cohort rebuild, privacy testing, metric calculation, release review, policy freshness, opt-out propagation, export scanning and notification.

## Idempotency

Every run has input dataset version, policy version, idempotency key, attempt record, output hash and compensating action.

## Adapters

Policy sources, research partners, privacy services and approved representative entities must remain behind interfaces and signed webhooks.

## Existing-system integration

- Consume versioned Phase 7 events, reconciled official-source mirrors and approved aggregate extracts.
- Never mutate source administration, claim, enforcement, licence, payment or Rights Passport records from an intelligence workflow.
- Keep upload, playback, entitlement, marketplace, profile, feed, EPK, analytics and mobile behavior unchanged unless a separately tested display adapter is added.

## Stop conditions

Stop publication or negotiation activity when consent is invalid, a cohort is too small, one participant dominates the statistic, source data is stale, re-identification risk is unacceptable, competitively sensitive information may be exposed, legal approval is missing, or an output could be understood as a coordinated price or legal instruction.

## Completion evidence

Codex must record audited repository paths, deployed database objects, migrations, RLS tests, route tests, privacy and competition reviews, feature flags, monitoring, rollback instructions and task-level evidence in `phase-8-execution-plan.json`.
