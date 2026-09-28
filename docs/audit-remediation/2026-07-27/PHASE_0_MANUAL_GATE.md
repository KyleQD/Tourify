# Phase 0 manual completion gate

No shared-database write is authorized by this document.

## 1. Confirm the production project

In Vercel, open project `tourify-beta-k2`, then:

1. Open **Settings → Environment Variables**.
2. Filter to the **Production** environment.
3. Reveal only `NEXT_PUBLIC_SUPABASE_URL`.
4. Confirm whether its hostname is exactly
   `auqddrodjezjlypkzfpi.supabase.co`.
5. Record the confirmation date and reviewer below. Do not paste database
   passwords, service-role keys, access tokens, or connection strings.

```text
Production URL hostname:
Confirmed by:
Confirmed at:
Result: MATCH / MISMATCH
```

If it is a mismatch, stop. Do not change either environment and do not run a
migration.

## 2. Confirm backup and PITR readiness

In the Supabase dashboard for the confirmed production project:

1. Open **Database → Backups**.
2. Record whether scheduled backups and Point in Time Recovery are available
   and enabled.
3. Record the oldest recoverable point, expected restore owner, recovery-time
   expectation, and the person authorized to initiate recovery.
4. Do not start a restore or download user data.

```text
Scheduled backups:
PITR:
Oldest recoverable point:
Restore owner:
Recovery-time expectation:
Confirmed by:
Confirmed at:
```

## 3. Export migration history without changing it

In the confirmed project’s Supabase SQL editor, run this read-only query:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

Export the result as JSON. Do not edit migration history. Save the exported
array as:

`docs/audit-remediation/2026-07-27/evidence/remote-migrations.json`

The importer also accepts an object containing `project_ref`, `captured_at`,
and a `migrations` array, as shown in `remote-migrations.template.json`.

Then run:

```sh
npm run audit:migration-reconciliation
```

The importer fails closed unless the snapshot identifies
`auqddrodjezjlypkzfpi` and contains exactly 180 unique remote versions.

## 4. Assign accountable owners

Record names for:

```text
Release lead:
Database lead:
Security lead:
QA lead:
Platform lead:
Feed/social owner:
Music/artist owner:
Marketplace owner:
Hiring/logistics owner:
Auth/storage owner:
```

Recorded July 28, 2026: Kyle Daley is temporarily acting in every listed role.
See `owners.json`. Independent review is still expected for an actual
production restore or sensitive production release when available.

Phase 0 exits only after all four sections have evidence and the release lead
explicitly approves starting disposable Phase 2 work. Shared production writes
remain separately approval-gated.
