# Admin Feature Spec Rerun — Manual SQL Queue

No SQL in this queue has been applied to a hosted Supabase project by this rerun. Every file is intended for explicit human review and manual execution in migration timestamp order.

## Safety rules

1. Do not run `supabase db reset`, recreate the project, truncate tables, or delete production rows.
2. Reconcile the hosted migration history before executing a file.
3. Validate the unchanged file on an isolated Supabase branch first when branching is available.
4. Paste and execute one complete migration at a time. Do not extract only the data-changing statements from its transaction.
5. Record the applied timestamp only after the transaction succeeds and the post-checks pass.
6. Update the matching `docs/engineering/migration-validation/<migration>.json` only with real, access-controlled evidence IDs. Staging requires `isolated_validated`; production requires `staging_validated`.

## SEC-001 — read-only security inventory

- File: `docs/admin-feature-specs/revalidation/sql/SEC-001-security-inventory.sql`
- Type: read-only evidence query, not a migration
- Run unchanged on: (1) an isolated branch built from the repository migration set, then (2) Tourify Demo
- Expected output: one normalized JSON cell containing relations/RLS, policies, routines, triggers, grants, and migration versions
- Compare: `node scripts/security/compare-sec001-inventories.mjs repository.json hosted.json --output sec001-drift.md`
- Storage: keep both raw exports and the drift report in access-controlled release/security evidence; do not commit hosted exports
- Block promotion on: query failure, unexplained drift, exposed relations without reviewed RLS, unsafe routine grants, migration-history mismatch, or undispositioned advisor findings

## SEC-004 — isolated fixture preflight

- File: `docs/admin-feature-specs/revalidation/sql/SEC-004-isolated-fixture-preflight.sql`
- Type: SELECT-only relation/RLS readiness query, not a seed and not a migration
- Run on: the disposable or isolated security-test database only
- Current expected blocker: canonical `contracts` and `contract_obligations` do not exist yet
- Never seed the synthetic two-organization fixture into Tourify Demo

## Queue

| Order | Migration | Purpose | Local validation | Hosted status |
|---|---|---|---|---|
| 1 | `supabase/migrations/20260721203929_admin_publication_outbox_claim_org_scope.sql` | Scope publication outbox claims to the acting organization | Safety scan and planned v1 manifest pass; isolated evidence pending | not applied |
| 2 | `supabase/migrations/20260721214919_admin_role_capability_aliases_sec003.sql` | Add canonical role defaults and documented manager aliases without replacing existing permissions | Focused tests, lint, safety scan, and planned v1 manifest pass; isolated evidence pending | not applied |
| 3 | `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` | Make committed publication content immutable and limit direct child edits to drafts | Focused tests, safety scan, and planned v1 manifest pass; isolated evidence pending | not applied |
| 4 | `supabase/migrations/20260721221325_admin_publication_outbox_hardening_pub101.sql` | Scope outbox worker mutations, recover stale claims, validate idempotency reuse, and reset dead-letter replay budget | 31 focused tests, lint, safety scan, and planned v1 manifest pass; isolated evidence pending | not applied |
| 5 | `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql` | Derive publication child ownership from canonical parents, quarantine ambiguity, add composite org FKs, and restrict sensitive direct reads | 47 focused tests, lint, safety scan, and planned v1 manifest pass; isolated parse/timing/RLS pending | not applied |
| 6 | `supabase/migrations/20260721235608_admin_feature_flag_governance_rel008.sql` | Add governed definitions, organization/environment assignments, immutable reasoned history, fail-closed RLS, and safe-default-off seeds while preserving legacy flags | 6 focused tests, lint, safety scan, and planned v1 manifest pass; isolated parse/RLS/advisors pending | not applied |
| 7 | `supabase/migrations/20260722002848_admin_signed_acting_context_sec101.sql` | Add a canonical per-auth-session acting-context record, epoch/CAS switch, expiry/revocation, membership/capability version binding, restricted own-session resolver, and immutable audit trail while leaving compatibility sessions untouched | Safety scan, planned v1 manifest, 3 static SQL contract tests, and 4 envelope tests pass; isolated SQL/RLS/CAS verification pending | not applied |

## Post-check for governed feature flags

After migration `20260721235608_admin_feature_flag_governance_rel008.sql`, inspect definitions, RLS, and grants without changing rows:

```sql
select key, owner, environments, safe_default, state, expires_at, removal_issue
from public.admin_feature_flag_definitions
order by key;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'admin_feature_flag_definitions',
    'admin_org_feature_flag_assignments',
    'admin_feature_flag_change_history'
  )
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like 'admin%feature_flag%'
order by table_name, grantee, privilege_type;
```

On an isolated branch, use two organizations to prove assignment isolation, version conflict, duplicate idempotency rejection, required reasons, immutable history, and disable-without-delete. Do not infer assignments from legacy arrays and do not run destructive cleanup on Tourify Demo.

## Post-check for signed acting context

After migration `20260722002848_admin_signed_acting_context_sec101.sql`, inspect
the additive objects without reading session hashes or changing rows:

```sql
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('admin_acting_context_sessions', 'admin_acting_context_audit')
order by c.relname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('admin_acting_context_sessions', 'admin_acting_context_audit')
order by table_name, grantee, privilege_type;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'admin_switch_acting_context',
    'admin_resolve_acting_context',
    'admin_revoke_acting_context'
  )
order by p.proname;

select count(*) as canonical_context_rows
from public.admin_acting_context_sessions;
```

Immediately after migration, `canonical_context_rows` must be zero: no legacy
selection is inferred. On an isolated branch only, test two browser-session JWTs,
expected epoch `0` creation, same-session CAS increment, stale epoch denial result,
cross-session isolation, eight-hour maximum expiry, reasoned revocation, membership
removal, role-permission version changes, direct table denial, and append-only audit.
Do not expose session hashes in committed or public artifacts.

## Post-check for role aliases

After migration `20260721214919_admin_role_capability_aliases_sec003.sql`, inspect only the affected catalog rows:

```sql
select role, perms
from public.org_role_permissions
where role in (
  'owner', 'admin', 'tour_manager', 'production', 'production_manager',
  'department_manager', 'finance', 'finance_manager', 'ticketing',
  'ticketing_manager', 'viewer', 'worker'
)
order by role;
```

This query is read-only. Existing permissions outside the canonical set should still be present because the migration uses set union semantics.

## Post-check for publication immutability

After migration `20260721215705_admin_publication_snapshot_immutability_adr005.sql`, confirm the guards and replacement policies exist:

```sql
select event_object_table, trigger_name
from information_schema.triggers
where trigger_name like 'guard_admin_publication_%'
order by event_object_table, trigger_name;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and policyname in (
    'pub102_snapshots_insert',
    'pub102_sections_insert', 'pub102_sections_update',
    'pub102_audiences_insert', 'pub102_audiences_update',
    'pub102_recipients_insert', 'pub102_recipients_update'
  )
order by tablename, policyname;
```

These checks are read-only. Test lifecycle transitions on an isolated branch before using the migration against Tourify Demo.

## Post-check for outbox hardening

After migration `20260721221325_admin_publication_outbox_hardening_pub101.sql`, verify the scoped functions and inspect queue health without changing rows:

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'admin_publication_outbox_claim_for_org',
    'admin_publication_outbox_mark_delivered_for_org',
    'admin_publication_outbox_mark_failed_for_org',
    'admin_publication_outbox_replay_for_org'
  )
order by p.proname;

select org_id, status, count(*) as rows,
       min(available_at) as oldest_available_at,
       min(locked_at) filter (where status = 'processing') as oldest_processing_lock
from public.admin_publication_outbox
group by org_id, status
order by org_id, status;
```

On an isolated branch, also attempt a same-key/same-payload replay (must return the original row), a same-key/different-payload replay (must fail), and an organization-mismatched completion/replay (must fail). No production row needs to be deleted for these checks.

## Post-check for publication ownership and RLS

After migration `20260721221811_admin_publication_parent_scope_rls_pub102.sql`, inspect quarantine and validation state:

```sql
select source_table, issue_code, count(*) as rows
from public.admin_publication_ownership_quarantine
where resolved_at is null
group by source_table, issue_code
order by source_table, issue_code;

select conrelid::regclass as relation, conname, convalidated
from pg_constraint
where conname like 'admin_publication_%_org_fk'
order by relation::text, conname;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename like 'admin_publication_%'
order by tablename, policyname;
```

Any unresolved quarantine row or `convalidated = false` result blocks promotion. Resolve ownership with a separately reviewed, deterministic forward-fix migration; do not remove the source record or edit applied migration history.
