# Non-Destructive Integration Checklist

Use this checklist before every Phase 8 migration, route, worker, page, release or partner integration.

## Canonical system preservation

- No new music catalog table replaces `artist_music`.
- No new audio bucket or player path.
- No change to `resolveMusicAccess` unless independently required and regression tested.
- No intelligence workflow mutates Phase 7 source cases or external-source mirrors.

## Database

- Additive migration created with installed Supabase CLI.
- Existing enum and ID types audited.
- RLS enabled and tested.
- Views use security-invoker where exposed.
- Backfill is explicit, resumable and nonblocking.
- Rollback or compensating migration documented.

## Privacy and competition

- Consent and purpose resolved.
- Cohort, concentration, freshness and privacy checks passed.
- No current/future individual commercial data exposed.
- Competition and privacy approval attached.
- Emergency revocation tested.

## Release

- Feature and jurisdiction flags.
- Monitoring and alerts.
- User disclosure.
- Opt-out and correction path.
- Regression suite green.
- Operational owner and incident playbook.

## Existing-system integration

- Consume versioned Phase 7 events, reconciled official-source mirrors and approved aggregate extracts.
- Never mutate source administration, claim, enforcement, licence, payment or Rights Passport records from an intelligence workflow.
- Keep upload, playback, entitlement, marketplace, profile, feed, EPK, analytics and mobile behavior unchanged unless a separately tested display adapter is added.

## Stop conditions

Stop publication or negotiation activity when consent is invalid, a cohort is too small, one participant dominates the statistic, source data is stale, re-identification risk is unacceptable, competitively sensitive information may be exposed, legal approval is missing, or an output could be understood as a coordinated price or legal instruction.

## Completion evidence

Codex must record audited repository paths, deployed database objects, migrations, RLS tests, route tests, privacy and competition reviews, feature flags, monitoring, rollback instructions and task-level evidence in `phase-8-execution-plan.json`.
