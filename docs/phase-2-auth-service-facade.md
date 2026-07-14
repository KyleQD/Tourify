# Phase 2 — Auth, Acting Context, Permissions, and Service Facade

## Purpose

Phase 2 creates the code foundation that lets Tourify stop treating hiring as venue-only logic.
All hiring and onboarding writes should now resolve a `HiringEntity` before touching real data.

This phase does **not** rebuild UI and does **not** add new schema beyond the Phase 1 migration.

## Files added or replaced

```txt
types/hiring-entity.ts
types/hiring-service.ts
lib/auth/hiring-permissions.ts
lib/auth/acting-context.ts
lib/services/hiring-onboarding.service.ts
```

## Important implementation notes

### 1. `resolveHiringEntity()` is the migration bridge

New code should pass:

```ts
entityType: "venue" | "organization" | "artist"
entityId: string
```

Legacy code may still pass:

```ts
venueId: string
```

The resolver normalizes legacy venue scope into:

```ts
{
  entityType: "venue",
  entityId: venueId
}
```

### 2. Permission checks use the Phase 1 RPC

`lib/auth/hiring-permissions.ts` calls:

```sql
public.can_manage_hiring(user_id, entity_type, entity_id)
```

Before moving to Phase 3, verify that this RPC is aligned with Tourify's actual RBAC tables.

### 3. The service facade is intentionally central

All future API routes and dashboard components should call:

```ts
HiringOnboardingService
```

Do not keep duplicating approval/candidate/token/workflow logic across API routes.

### 4. Approval bridge now has one owner

`HiringOnboardingService.approveApplication()` handles:

```txt
validate permission
load scoped application
approve application
create candidate
create token invitation
bootstrap workflow
create employment assignment shell
write audit event
```

### 5. No mock data

Every method queries or writes Supabase tables. Empty states must come from empty query results.

## Required Cursor validation

After adding these files:

```bash
pnpm typecheck
pnpm lint
```

Then search the repo for venue-only onboarding calls:

```bash
grep -R "venue_id" app/api/admin/onboarding app/api/admin/applications components/admin components/hiring lib/services -n
```

Do not replace all of them in Phase 2. Just identify what Phase 3 and Phase 4 must update.

## Known integration points to verify

Depending on the repo, Cursor may need to adjust:

```txt
@/lib/supabase/server import path
actual venues table name
actual organizations table name
actual artists table name
actual RBAC function/table names
employment_assignments required columns
staff_invitations token column name
```

If your repo uses `invitation_token` instead of `token` in `staff_invitations`, keep the DB column aligned with the token API before Phase 3.
