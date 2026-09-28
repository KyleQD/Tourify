---
description: >
  Phase 1 rules for Tourify universal hiring/onboarding database migration and RBAC foundation.
globs: ["supabase/migrations/**", "lib/auth/**", "types/**", "app/api/**"]
alwaysApply: false
---

# Tourify Phase 1 — Database + RBAC Rules

## Absolute rules

- Never reset the database.
- Never drop legacy `venue_id` columns in this phase.
- All schema changes must be additive.
- All new hiring/onboarding writes must support `employer_entity_type` and `employer_entity_id`.
- Existing venue-only flows must continue to work during the migration window.
- No production code may bypass `can_manage_hiring()` or the TypeScript hiring permission helpers once Phase 2 is implemented.

## Universal employer scope

Use this scope for every hiring/onboarding table:

```ts
employer_entity_type: "venue" | "organization" | "artist"
employer_entity_id: string
```

The legacy mapping is:

```txt
venue_id → employer_entity_type = "venue"
venue_id → employer_entity_id = venue_id
```

## Migration behavior

The Phase 1 migration must:

1. Add universal employer columns.
2. Backfill from `venue_id`.
3. Add employer-scope indexes.
4. Add `can_manage_hiring()`.
5. Add RLS policies using `can_manage_hiring()`.

## RBAC expectation

The canonical SQL helper is:

```sql
public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id)
```

TypeScript permission helpers in Phase 2 must mirror this logic.

## Client trust boundary

Never trust `employer_entity_type` or `employer_entity_id` from applicant-submitted payloads.

For job applications, derive employer scope from the job posting row.

For admin/hiring routes, resolve employer scope from authenticated acting context, not arbitrary client payload alone.

## Token onboarding boundary

Token onboarding APIs may use service role only after validating the token server-side.

Token onboarding must resolve:

```txt
token → invitation → candidate → employer_entity_type + employer_entity_id → template
```

It must not load a global default template without entity resolution.
