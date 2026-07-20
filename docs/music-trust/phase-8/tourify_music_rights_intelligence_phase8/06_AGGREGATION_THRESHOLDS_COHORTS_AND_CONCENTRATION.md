# Aggregation Thresholds, Cohorts and Concentration

Cohorts must be analytically meaningful without exposing or allowing inference about any participant.

## Cohort dimensions

Genre, territory, career stage, catalog age, rights type, revenue band, distribution model and organization type may be used only after privacy and competition review.

## Minimum controls

Configurable minimum participant count, minimum independent-control count, maximum participant contribution weight, minimum time lag, minimum observation count and outlier suppression.

## Dynamic release gate

A statistic is suppressed if opt-outs, corrections, mergers, ownership changes or data concentration make the cohort unsafe after it was scheduled.

## No reverse lookup

Do not publish combinations of filters that allow users to isolate a known artist, label, publisher, manager or transaction.

## Cohort registry

Store definition version, inclusion logic, excluded entities, thresholds, legal basis, permitted metrics, review date and publication destinations.

## Existing-system integration

- Consume versioned Phase 7 events, reconciled official-source mirrors and approved aggregate extracts.
- Never mutate source administration, claim, enforcement, licence, payment or Rights Passport records from an intelligence workflow.
- Keep upload, playback, entitlement, marketplace, profile, feed, EPK, analytics and mobile behavior unchanged unless a separately tested display adapter is added.

## Stop conditions

Stop publication or negotiation activity when consent is invalid, a cohort is too small, one participant dominates the statistic, source data is stale, re-identification risk is unacceptable, competitively sensitive information may be exposed, legal approval is missing, or an output could be understood as a coordinated price or legal instruction.

## Completion evidence

Codex must record audited repository paths, deployed database objects, migrations, RLS tests, route tests, privacy and competition reviews, feature flags, monitoring, rollback instructions and task-level evidence in `phase-8-execution-plan.json`.
