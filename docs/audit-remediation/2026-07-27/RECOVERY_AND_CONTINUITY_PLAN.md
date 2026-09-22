# Tourify production recovery and continuity plan

**Production Supabase project:** `auqddrodjezjlypkzfpi`  
**Accountable owner:** Kyle Daley  
**Status:** PROVISIONAL — backup window and recovery drill not yet verified  
**Last updated:** July 28, 2026

This plan never authorizes resetting, restoring over, recreating, or replaying
all migrations against the production project.

Kyle Daley explicitly reconfirmed on July 28, 2026 that the current Supabase
production database must never be restored. Every recovery drill and any real
recovery attempt must target a separately provisioned isolated project.

## Recovery objectives

| Objective | Provisional target | Current evidence |
|---|---:|---|
| Database RPO | At most 24 hours with verified daily backups; target at most 15 minutes if PITR is approved and enabled | Unverified |
| Database RTO | Restore and validate an isolated replacement within 4 hours | Unverified until drill |
| Storage-object RPO | At most 24 hours after an independent object-copy process exists | Not implemented |
| Configuration RTO | Reconstruct Auth, Storage, Realtime, functions, secrets, and deployment configuration within 4 hours | Not tested |

RPO is the maximum acceptable data-loss interval. RTO is the target time to
restore service. These are operating targets, not proven guarantees, until a
timed drill passes.

## Backup coverage

Supabase database backups cover the database and Storage metadata. They do not
restore the underlying files deleted from Storage. The recovery bundle must
therefore cover:

1. Postgres data and schema through verified daily backups or PITR.
2. Storage objects through a separately versioned/exported object inventory and
   copy process.
3. Storage bucket definitions and policies.
4. Auth configuration, redirect URLs, providers, templates, hooks, and MFA
   settings.
5. Edge Functions, Cron, Realtime publications, extensions, and database
   settings.
6. Vercel environment variable names and environment assignments. Secret values
   stay in the approved secret manager and never enter Git.
7. Third-party webhook/provider configuration.

Reference:
<https://supabase.com/docs/guides/platform/backups>

## Required production evidence

From **Supabase Dashboard → Database → Backups**, record:

- Backup mode: daily backups or PITR.
- Most recent successful backup or latest recovery point.
- Earliest available restore point.
- PITR retention if enabled.
- Any warning, failed backup, or restore limitation.
- Confirmation date and owner.

Do not click Restore while collecting evidence.

## Recovery decision

Use this order:

1. Stop deployments, migration workflows, backfills, workers, and capability
   rollouts.
2. Preserve logs, request IDs, affected versions, checksums, and timestamps.
3. Disable affected application capabilities using server-side flags.
4. Determine whether an application rollback or additive forward fix is safer
   than database restoration.
5. Restore only when corruption or loss cannot be corrected safely in place.
6. Prefer restoration or cloning into a newly provisioned isolated project.
7. Validate the replacement before changing any application environment.
8. Never restore over production merely to test recovery.

## Restore-to-new-project procedure

1. Record the incident start, last known good time, and selected recovery point.
2. Obtain explicit release/database approval from Kyle Daley and, when
   available, an independent reviewer.
3. Provision a new isolated Supabase project or supported recovery target.
4. Restore the selected database backup into that new target.
5. Reapply required non-database configuration from the registry.
6. Restore or reconcile Storage objects separately.
7. Run schema checks, migration-history comparison, grants, RLS personas,
   advisors, row-count bands, data-integrity checks, and critical journeys.
8. Generate and compare database types.
9. Keep all marketplace connectors, polls, finance offerings, backfills, and
   outbound workers disabled initially.
10. Prepare an application deployment that points to the replacement target.
11. Obtain explicit cutover approval.
12. Canary with internal accounts, then expand in controlled stages.
13. Preserve the original project read-only for investigation; do not delete it.

## Stop conditions

Stop recovery or cutover if:

- The target, backup, or recovery timestamp is ambiguous.
- Storage objects and database metadata cannot be reconciled.
- Migration history differs without explanation.
- Any cross-tenant authorization result changes.
- Counts, nulls, duplicates, or orphan checks exceed tolerance.
- Critical Auth, upload, feed, hiring, finance, or admin journeys fail.
- Monitoring or a rollback path is unavailable.

## First recovery drill

The first drill is non-production and uses no production writes:

1. Confirm the production backup window.
2. Provision a new isolated recovery target.
3. Restore or clone into that target using the supported Supabase workflow.
4. Do not connect public production traffic.
5. Measure provisioning and restoration time.
6. Run the Phase 2 schema, migration, RLS, grant, advisor, and journey bundle.
7. Test configuration reconstruction with non-production secrets.
8. Produce a Storage object/metadata reconciliation report.
9. Record achieved RPO/RTO and every manual dependency.
10. Delete nothing as part of the drill; retirement is a separate program.

The drill passes only when another engineer could reproduce it from the retained
evidence and no unexplained data, schema, authorization, or object difference
remains.

## Cadence

- Verify the backup dashboard monthly and before every production database
  batch.
- Run a restore-to-new-project drill quarterly and after material Auth, Storage,
  finance, rights, or hiring changes.
- Review this plan after every incident or failed drill.
- Require an independent reviewer before a real restore or production cutover
  whenever one is available.

## PITR decision

PITR is recommended for production because daily backups can allow nearly a day
of data loss. Enabling PITR may require an eligible paid plan, a compute add-on,
and recurring cost. It must not be enabled until Kyle Daley explicitly approves
the displayed cost and retention period.

Decision status: `PENDING_DASHBOARD_EVIDENCE_AND_COST_APPROVAL`.
