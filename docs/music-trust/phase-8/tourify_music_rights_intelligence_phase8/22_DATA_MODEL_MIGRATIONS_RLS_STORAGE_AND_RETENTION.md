# Data Model, Migrations, RLS, Storage and Retention

Implement Phase 8 in additive, isolated domains that reference canonical Phase 7 records rather than copying the catalog or rights ledger.

## Core tables

`intelligence_consents`, `intelligence_purposes`, `intelligence_dataset_versions`, `intelligence_cohorts`, `intelligence_cohort_memberships`, `intelligence_metric_definitions`, `intelligence_metric_runs`, `intelligence_benchmark_releases`, `policy_sources`, `policy_versions`, `contract_term_observations`, `education_alerts`, `negotiation_groups`, `negotiation_memberships`, `negotiation_proposals`, `negotiation_votes`, `representation_mandates`, `intelligence_audit_events`, `intelligence_outbox_events`.

## RLS

Artists see their consent, private insights and approved group records. Organization users require active authority. Analysts use restricted service paths. Participants never receive row-level peer data.

## Storage

Restricted benchmark review packages, legal memos, governance documents and research datasets use private buckets with short-lived URLs and access logging.

## Retention

Separate source retention, derived datasets, released aggregates, policy archives, group records, legal holds and opt-out obligations.

## Migration process

Create through installed Supabase CLI after audit; validate grants, RLS, views, functions, triggers, advisors, backfills and rollback.

## Existing-system integration

- Consume versioned Phase 7 events, reconciled official-source mirrors and approved aggregate extracts.
- Never mutate source administration, claim, enforcement, licence, payment or Rights Passport records from an intelligence workflow.
- Keep upload, playback, entitlement, marketplace, profile, feed, EPK, analytics and mobile behavior unchanged unless a separately tested display adapter is added.

## Stop conditions

Stop publication or negotiation activity when consent is invalid, a cohort is too small, one participant dominates the statistic, source data is stale, re-identification risk is unacceptable, competitively sensitive information may be exposed, legal approval is missing, or an output could be understood as a coordinated price or legal instruction.

## Completion evidence

Codex must record audited repository paths, deployed database objects, migrations, RLS tests, route tests, privacy and competition reviews, feature flags, monitoring, rollback instructions and task-level evidence in `phase-8-execution-plan.json`.
