# Cursor Prompt — Implement Phase 2 Only

You are implementing Phase 2 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 2 files only. Do not start Phase 3.

## Add or update these files

```txt
types/hiring-entity.ts
types/hiring-service.ts
lib/auth/hiring-permissions.ts
lib/auth/acting-context.ts
lib/services/hiring-onboarding.service.ts
docs/phase-2-auth-service-facade.md
.cursor/rules/phase_2_auth_service_facade.md
```

## Tasks

1. Add the files exactly as provided.
2. If `types/hiring-entity.ts` already exists from Phase 0, merge carefully and preserve exports used by current code.
3. Compare `lib/auth/acting-context.ts` with any existing acting context file. If one exists, merge `resolveHiringEntity()` instead of deleting unrelated existing context logic.
4. Verify that `lib/auth/hiring-permissions.ts` uses the Phase 1 `can_manage_hiring()` RPC or the repo's canonical RBAC function.
5. Verify Supabase table and column names used by `HiringOnboardingService` against the current schema.
6. Do not reset the database.
7. Do not remove `venue_id` compatibility.
8. Do not rebuild UI yet.
9. Run:

```bash
pnpm typecheck
pnpm lint
```

10. Report any schema mismatches before proceeding.

## Phase 2 success criteria

- `HiringEntity` is importable.
- `resolveHiringEntity()` can normalize `entity_type/entity_id` and legacy `venue_id`.
- Permission helpers call real RBAC, not mock logic.
- `HiringOnboardingService` is importable.
- Approval bridge logic lives in one service facade.
- No mock data is introduced.

Stop after Phase 2 validation.
