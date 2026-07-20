# Privacy, Anonymization and Differential Privacy

Phase 8 should treat pseudonymization as an access-control technique, not as proof that data is anonymous.

## Privacy assessment

For every dataset, evaluate direct identifiers, quasi-identifiers, rare catalog characteristics, geography, genre, revenue bands, time ranges and external datasets that could enable re-identification.

## Release techniques

Suppression, generalization, top/bottom coding, minimum cohort size, contribution limits, dominance limits, time lag, noise addition, query budgets and differential privacy where suitable.

## Differential privacy

Define adjacency, privacy unit, epsilon/delta budget, composition accounting, clipping bounds, utility checks and disclosure language. Do not market a generic vendor label as a privacy guarantee without evaluation.

## Attack testing

Run singling-out, linkage, differencing, repeated-query, small-cell, outlier and auxiliary-data attacks before release.

## Jurisdiction controls

Pseudonymized data may remain personal data under privacy law. Retention, deletion, access, processor and international-transfer duties remain until counsel determines otherwise.

## Existing-system integration

- Consume versioned Phase 7 events, reconciled official-source mirrors and approved aggregate extracts.
- Never mutate source administration, claim, enforcement, licence, payment or Rights Passport records from an intelligence workflow.
- Keep upload, playback, entitlement, marketplace, profile, feed, EPK, analytics and mobile behavior unchanged unless a separately tested display adapter is added.

## Stop conditions

Stop publication or negotiation activity when consent is invalid, a cohort is too small, one participant dominates the statistic, source data is stale, re-identification risk is unacceptable, competitively sensitive information may be exposed, legal approval is missing, or an output could be understood as a coordinated price or legal instruction.

## Completion evidence

Codex must record audited repository paths, deployed database objects, migrations, RLS tests, route tests, privacy and competition reviews, feature flags, monitoring, rollback instructions and task-level evidence in `phase-8-execution-plan.json`.
