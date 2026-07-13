# Phase 1 Implementation Notes

## Phase status

This package contains the Phase 1 foundation for the Tourify Universal Hiring & Onboarding rebuild.

Phase 1 covers:

- Additive database migration
- Universal employer scope columns
- Venue data backfill
- Employer-scoped indexes
- `can_manage_hiring()` SQL RPC
- Baseline RLS policies
- Cursor rules for database/RBAC handling

It does **not** include Phase 2 TypeScript services yet.

## Install paths

Copy files into the repo using these paths:

```txt
supabase/migrations/20260625000000_polymorphic_hiring_entity.sql
docs/hiring-rbac-foundation.md
.cursor/rules/phase_1_database_rbac.md
```

## Preflight checklist

Before running the migration:

- Confirm a database backup exists.
- Confirm this is applied to a Supabase branch/preview first.
- Confirm existing tables use the expected names or adjust the table list.
- Inspect the `can_manage_hiring()` function and align membership probes with your actual RBAC schema.

## Run checklist

After adding the migration:

```txt
supabase db diff
supabase migration up
pnpm typecheck
pnpm test
```

Use the equivalent commands for your repo if different.

## Validation SQL

After migration, run these quick checks in SQL editor:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'job_posting_templates'
  and column_name in ('employer_entity_type', 'employer_entity_id');
```

```sql
select employer_entity_type, count(*)
from job_posting_templates
group by employer_entity_type;
```

```sql
select proname
from pg_proc
where proname = 'can_manage_hiring';
```

## Expected output

Existing venue rows should show:

```txt
employer_entity_type = venue
employer_entity_id = old venue_id
```

## Known adaptation point

The SQL RPC `can_manage_hiring()` checks several likely membership tables, but Tourify may already have a more specific permission system.

If the repo has a canonical function such as:

```txt
hasEntityPermission()
has_perm()
canReviewStaffingApplications()
```

then update `can_manage_hiring()` to call or mirror that exact logic.

Do not bypass permission checks at the API layer.

## Pause point

Stop after Phase 1 is applied and validated.

Do not proceed to Phase 2 until:

- Migration applies cleanly.
- Existing venue hiring routes still work.
- Existing job application reads/writes still work.
- RLS does not block legitimate admin access.
- `can_manage_hiring()` returns true for at least one known venue admin.
