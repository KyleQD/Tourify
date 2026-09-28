# SEC-001 — Deployed database security inventory

**Status:** Blocked on read-only isolated-branch and hosted exports  
**Last repository review:** 2026-07-21

## Strict finding

The previous artifact was a regular-expression count of SQL text. It did not inventory the deployed database and therefore did not satisfy SEC-001. It scanned 330 migrations even though the repository currently contains 378 top-level migration files, omitted functions, triggers, grants, and hosted migration history, and could not detect superseded or manually changed objects.

No deployed database state, row count, advisor result, or policy result is inferred from repository files.

## Canonical export and comparison

Use the read-only inventory at `docs/admin-feature-specs/revalidation/sql/SEC-001-security-inventory.sql`. It emits one normalized JSON document containing:

- every `public` table, partitioned table, view, materialized view, foreign table, and sequence;
- actual RLS-enabled and force-RLS flags, owners, and view `security_invoker` state;
- every policy, role binding, command, `USING` expression, and `WITH CHECK` expression;
- every function/procedure identity, owner, language, security mode, volatility, leakproof/parallel flags, and local configuration;
- every non-internal trigger and definition;
- effective schema, relation, sequence, and routine grants, including defaults and grant option;
- every row in `supabase_migrations.schema_migrations`, normalized to version and name.

Run the exact query first on a cost-confirmed isolated Supabase branch built from the repository migration set and then on Tourify Demo. Save each result as JSON and compare them with:

```text
node scripts/security/compare-sec001-inventories.mjs repository.json hosted.json --output sec001-drift.md
```

The comparator fails closed on missing, unexpected, or definition-changed objects. Its output is deterministic apart from export metadata and names identities rather than dumping table data.

## Secure evidence handling

- Raw hosted exports and drift reports may expose security architecture. Store them in an access-controlled security/release artifact location, never in the public repository or application logs.
- Create files with owner-only permissions. The comparator uses mode `0600` when it writes a report.
- Record project reference, branch, UTC export time, migration commit, reviewer, Security Advisor result, Performance Advisor result, and disposition in the release evidence system.
- Do not place database passwords, access tokens, connection strings, row data, function bodies, or secret configuration values in the export or report.
- A difference is not waived implicitly. Product/security must classify it as expected, forward-fix it additively, or block promotion.

## Review gates

SEC-001 becomes complete only when all of the following evidence exists:

1. The repository migration set applies cleanly to an isolated branch without resetting Tourify Demo.
2. The canonical export succeeds on that branch and on Tourify Demo.
3. The comparator reports no unexplained drift.
4. All exposed `public` relations have an explicit reviewed RLS/view-access disposition.
5. `SECURITY DEFINER` routines, public/authenticated execute grants, and non-internal triggers are reviewed.
6. Hosted migration versions reconcile to local migration files, including known no-op/duplicate artifacts.
7. Supabase Security and Performance Advisor findings are attached and dispositioned.
8. Product/security approvers sign the evidence with date and migration commit.

## Non-destructive guarantee

The canonical inventory is `SELECT`-only. It does not reset, recreate, truncate, delete, update, insert, alter, grant, revoke, or drop anything. Any remediation discovered by comparison must be a separately generated expand-only migration and must pass the migration safety gate before manual promotion.
