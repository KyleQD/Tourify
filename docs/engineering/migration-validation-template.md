# Migration validation template (REL-102 / SEC-005)

Create one versioned JSON manifest in `docs/engineering/migration-validation/`
for every governed migration, using the migration basename for the manifest
basename. The PR checklist is supporting human review; the JSON manifest is the
machine-enforced source of validation state.

## Identity

- Migration file(s):
- Author:
- Domains touched (tours / finance / tickets / logistics / …):
- Feature flag (if any):
- Last deployed/reviewed commit SHA:
- Hosted migration-history export location:
- Validation manifest:
- Validation status (`planned` → `isolated_validated` → `staging_validated` → `production_verified`):

## Preflight

- [ ] Dry-run on representative snapshot (row counts recorded below)
- [ ] Expected update/backfill count:
- [ ] Lock budget / batch size:
- [ ] Statement timeout:
- [ ] Resume strategy and durable cursor/checkpoint:
- [ ] Interrupted-batch resume and idempotent replay tested:
- [ ] Unresolved / quarantine strategy documented (never guess `org_id`)
- [ ] Expand-only confirmed (or irreversible step justified)

## Constraints & indexes

- [ ] New FKs/checks are validated not-valid → validate pattern when needed
- [ ] Indexes use `CONCURRENTLY` when required on large tables
- [ ] RLS policies added/replaced in same release train as drops

## Rollback / forward-fix

- [ ] Rollback plan:
- [ ] Forward-fix plan if rollback unsafe:

## Postflight queries

```sql
-- Preserve preflight/postflight row counts by organization.
select org_id, count(*) as rows
from public.<table>
group by org_id
order by org_id;

-- Unresolved tenant keys and quarantine must both be reviewed.
select count(*) as null_org_rows
from public.<table>
where org_id is null;

select source_table, issue_code, count(*) as unresolved_rows
from public.admin_tenant_key_quarantine
where resolved_at is null
group by source_table, issue_code
order by source_table, issue_code;

-- Parent/child ownership mismatches. Replace names with the affected pair.
select count(*) as parent_org_mismatches
from public.<child_table> child
join public.<parent_table> parent on parent.id = child.<parent_id>
where child.org_id is distinct from parent.org_id;

-- Constraint validation state.
select conrelid::regclass as relation, conname, contype, convalidated
from pg_constraint
where conrelid in ('public.<table>'::regclass)
order by relation::text, conname;

-- RLS and policy inventory for affected relations.
select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('<table>');

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('<table>')
order by tablename, policyname;

-- Effective table grants.
select table_name, grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('<table>')
order by table_name, grantee, privilege_type;

-- Hosted migration history; compare with the exact local file set.
select to_jsonb(m)->>'version' as version, to_jsonb(m)->>'name' as name
from supabase_migrations.schema_migrations m
order by version;
```

- [ ] Postflight results attached (gist/CI artifact — no production dumps in git)
- [ ] Dual-read compare (if dual-path) within tolerance
- [ ] App smoke on pilot org
- [ ] Supabase Security Advisor results attached/dispositioned
- [ ] Supabase Performance Advisor results attached/dispositioned

## Sign-off

- Engineering:
- Security/data (if RLS/finance/tickets):
- Verification owner:
- Evidence IDs (isolated / staging / production; access-controlled, no dumps):

## Machine-enforced exception format

An exceptional inline marker is valid only when its identifier resolves to an
unexpired entry in that migration's JSON manifest:

```sql
-- migration-validation: blocking-constraint-reviewed REL102-001
```

The matching manifest entry must include a unique ID, supported exception type,
owner, rationale, issue, expiry date, and evidence reference. Free-form markers
do not bypass the scanner.
