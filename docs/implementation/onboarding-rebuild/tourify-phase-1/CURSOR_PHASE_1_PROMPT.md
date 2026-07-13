# Cursor Prompt — Phase 1

```txt
You are implementing Phase 1 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 1 files only. Do not start Phase 2.

Tasks:
1. Add `supabase/migrations/20260625000000_polymorphic_hiring_entity.sql`.
2. Add `docs/hiring-rbac-foundation.md`.
3. Add `.cursor/rules/phase_1_database_rbac.md`.
4. Review the SQL function `public.can_manage_hiring()` and compare its membership-table probes with the actual Tourify RBAC schema.
5. If the repo has a canonical RBAC function/table, adapt `can_manage_hiring()` to match it.
6. Do not reset the database.
7. Do not drop `venue_id`.
8. Run the migration on a Supabase preview/branch database first.
9. Validate that existing venue hiring data is backfilled into `employer_entity_type='venue'` and `employer_entity_id=venue_id`.
10. Run TypeScript checks and existing tests.

Stop after Phase 1 validation. Report any table-name or RBAC mismatch before editing Phase 2 files.
```
