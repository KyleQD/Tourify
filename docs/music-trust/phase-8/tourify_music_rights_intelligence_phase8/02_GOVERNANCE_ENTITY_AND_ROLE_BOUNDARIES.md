# Governance, Entity and Role Boundaries

Tourify must identify exactly which legal and operational role it performs for each Phase 8 surface.

## Possible Tourify roles

Software provider, data processor, benchmark administrator, research publisher, education provider, meeting facilitator or technical service provider. Each role needs a written responsibility matrix.

## Roles not assumed

Union, labor organization, CMO, publisher, licensing collective, bargaining representative, attorney, investment adviser, rate bureau, trade association or agent with power to bind artists.

## Separate approval packages

Collective licensing, labor organizing, representation, lobbying coalitions and standard-setting each require their own counsel memo, entity analysis, participant agreement, conflicts policy, funding model and jurisdiction matrix.

## Governance bodies

Create a Data Governance Committee, Privacy Review, Competition Review, Editorial/Policy Review and Model Risk Review. The same person should not unilaterally approve cohort construction, benchmark publication and negotiation use.

## Decision records

Every release or group feature stores decision owner, counsel approval reference, approved purpose, prohibited uses, jurisdictions, review date, stop conditions and compensating action.

## Existing-system integration

- Consume versioned Phase 7 events, reconciled official-source mirrors and approved aggregate extracts.
- Never mutate source administration, claim, enforcement, licence, payment or Rights Passport records from an intelligence workflow.
- Keep upload, playback, entitlement, marketplace, profile, feed, EPK, analytics and mobile behavior unchanged unless a separately tested display adapter is added.

## Stop conditions

Stop publication or negotiation activity when consent is invalid, a cohort is too small, one participant dominates the statistic, source data is stale, re-identification risk is unacceptable, competitively sensitive information may be exposed, legal approval is missing, or an output could be understood as a coordinated price or legal instruction.

## Completion evidence

Codex must record audited repository paths, deployed database objects, migrations, RLS tests, route tests, privacy and competition reviews, feature flags, monitoring, rollback instructions and task-level evidence in `phase-8-execution-plan.json`.
