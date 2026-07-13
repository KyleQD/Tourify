# Phase 0 Implementation Notes

## Files included

```txt
types/hiring-entity.ts
types/hiring-onboarding.ts
docs/onboarding-boundaries.md
.cursor/rules/admin_onboarding_phase_0_addendum.md
patches/profile-type-typo.patch
```

## Install order

1. Copy `types/hiring-entity.ts` into the repo.
2. Copy `types/hiring-onboarding.ts` into the repo.
3. Copy `docs/onboarding-boundaries.md` into the repo.
4. Copy `.cursor/rules/admin_onboarding_phase_0_addendum.md` into the repo.
5. Apply the typo patch manually to the file that currently contains:

```ts
export type ProfileCategory = "Person" | "Place" | "Thing";n
```

Change it to:

```ts
export type ProfileCategory = "Person" | "Place" | "Thing";
```

## Expected result

The repo now has a canonical `HiringEntity` abstraction and universal hiring/onboarding types that future phases can use.

No database migration is included in Phase 0. Phase 1 will add the polymorphic Supabase columns, backfill, indexes, and RLS RPC.

## Cursor prompt for this phase

```txt
Implement Phase 0 only. Add the included files exactly as provided. Apply the profile type typo patch if that typo exists in the repo. Do not modify database migrations yet. Do not change runtime logic yet. After adding these files, run TypeScript check and report any import path or duplicate type conflicts.
```
