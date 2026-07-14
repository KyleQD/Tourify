# Tourify Phase 1 — Hiring Entity Database + RBAC Foundation

## Purpose

Phase 1 upgrades Tourify's hiring/onboarding database foundation from venue-only scope to universal employer scope.

The new universal scope is:

```ts
employer_entity_type: "venue" | "organization" | "artist"
employer_entity_id: string
```

This lets the same hiring/onboarding module support:

- Venue staff hiring
- Organization staff hiring
- Artist tour/team hiring

## Files in this phase

```txt
supabase/migrations/20260625000000_polymorphic_hiring_entity.sql
docs/hiring-rbac-foundation.md
.cursor/rules/phase_1_database_rbac.md
PHASE_1_IMPLEMENTATION_NOTES.md
```

## What the migration does

### 1. Adds universal employer columns

Adds these columns to core hiring tables:

```sql
employer_entity_type text
employer_entity_id uuid
```

Core tables:

```txt
job_posting_templates
job_applications
staff_onboarding_candidates
staff_invitations
staff_onboarding_templates
onboarding_workflows
hiring_audit_events
hiring_eligibility_snapshots
employment_assignments
staff_members
```

### 2. Keeps legacy venue compatibility

The migration does **not** drop `venue_id`.

Existing venue-scoped data is backfilled:

```sql
employer_entity_type = 'venue'
employer_entity_id = venue_id
```

This allows the old venue flows to keep working while new APIs transition to `HiringEntity`.

### 3. Adds indexes

Indexes support common employer-scoped queries for:

- job listings
- applications by status
- onboarding candidates by status
- invitations by token
- roster lookups
- employment assignments
- templates
- workflows

### 4. Adds `can_manage_hiring()`

The migration creates:

```sql
public.can_manage_hiring(user_id uuid, entity_type text, entity_id uuid)
```

This function is used by RLS and should also be mirrored by TypeScript permission helpers.

It checks common membership/ownership tables if they exist:

```txt
entity_memberships
venues / venue_members
organizations / organization_members
artists / artist_members
```

If your repo uses a different canonical RBAC table, update this function before relying on it in production.

### 5. Adds employer-scoped RLS policies

Core tables get an additive policy:

```sql
public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id)
```

Workers also get own-record read policies where `user_id` or `applicant_id` exists.

## Important implementation notes

### Do not remove `venue_id` yet

Keep `venue_id` for at least two release cycles.

Existing routes may still depend on:

```txt
?venue_id=
```

Legacy APIs should map that into:

```txt
entity_type=venue
entity_id=<venue_id>
```

### Do not trust client-submitted employer scope

When applicants apply to a job, backend APIs must copy employer scope from the job posting row:

```txt
job_posting_templates.employer_entity_type
job_posting_templates.employer_entity_id
```

The client should never be trusted to submit employer scope for an application.

### Token onboarding is special

Worker token onboarding should verify the invitation token server-side.

Token routes may need service-role access for secure lookup, but they must still audit writes and never expose cross-employer data.

## Cursor implementation prompt

```txt
Implement Phase 1 only.

Add the migration file exactly as provided. Do not reset the database. Do not drop venue_id. Apply the migration to a branch or preview Supabase database first.

After the migration, inspect can_manage_hiring() and update its membership-table probes to match the actual Tourify RBAC schema if needed.

Then run:
- Supabase migration validation
- TypeScript check
- Existing API tests

Do not start Phase 2 service work until this database foundation is confirmed.
```
