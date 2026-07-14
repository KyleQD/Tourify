# Tourify Hiring & Onboarding Staging Validation Report

**Date:** 2026-06-25 (re-run after manual migration apply)  
**Scope:** Staging validation pass (Phases 0–13) — no new features, no production deploy  
**Reference:** `docs/implementation/onboarding-rebuild/production-blocker-fix-report.md`, `docs/hiring-onboarding-implementation-review.md`

---

## Executive Summary

**Status: Staging blocked**

Database migrations were **successfully applied manually** on the linked Supabase project (`auqddrodjezjlypkzfpi`). Live probes confirm employer-scope columns, `can_manage_hiring()`, private staff storage buckets, global onboarding templates, and zero backfill violations. Phase 13 **global** smoke checks are green (10 pass / 0 fail / 1 warn). However, staging is **not fully validated** because:

1. **`npm run build` fails** on pre-existing `@prisma/client` errors (repo-wide, not hiring-specific).
2. **No `PHASE13_*` scenario env vars** are configured — venue/org/artist API and E2E flows were not exercised.
3. **Supabase CLI `db push --dry-run` still fails** with DB password auth (migrations were applied via SQL Editor instead).
4. **Full hire → onboard → roster/Work Mode E2E** was not run for venue, organization, or artist.

---

## Commands Run

| Command | Result | Key output |
|---------|--------|------------|
| `npm run lint` | **PASS** | Exit 0; warnings only |
| `npm run build` | **FAIL** | `app/lib/actions/ticket-type.actions.ts:5` — `@prisma/client` has no exported member `PrismaClient` |
| `npx tsc --noEmit` | **FAIL** | 9 errors — see Build / Typecheck / Lint |
| `npm run test:hiring-phase-13` | **PASS** | 2/2 tests |
| `source .env.local && npx tsx scripts/hiring/phase-13-real-data-smoke-test.ts` | **PASS (global only)** | 10 pass / 0 fail / 1 warn / 0 skip |
| `supabase db push --dry-run` | **FAIL** | `password authentication failed for user "postgres" (SQLSTATE 28P01)` |
| Live DB schema probe (service role) | **PASS** | All hiring tables + employer columns present |
| Phase 13 backfill violation probes | **PASS** | 0 rows missing employer scope on venue-scoped records |

### Repo fixes applied during validation passes

| File | Change |
|------|--------|
| `app/admin/dashboard/components/events/*.tsx` | `../ui/*` → `@/components/ui/*` |
| `app/api/artist-jobs/[id]/applications/route.ts` | Added `ArtistJobsService` import |
| `supabase/migrations/20260625010000_seed_global_staff_onboarding_templates.sql` | Legacy schema guards: `fields` column, `venue_id` drop NOT NULL |
| `supabase/migrations/20260625020000_staff_onboarding_storage_compliance.sql` | Legacy `owner_user_id` + dynamic RLS policies |
| `scripts/hiring/phase-13-real-data-smoke-test.ts` | Check `staff_onboarding_candidates.onboarding_responses` column instead of non-existent table |

---

## Migration Verification

### Supabase CLI

```
supabase db push --dry-run
→ failed SASL auth (FATAL: password authentication failed for user "postgres" (SQLSTATE 28P01))
host=aws-0-us-east-2.pooler.supabase.com user=postgres.auqddrodjezjlypkzfpi
```

CLI auth remains broken. Migrations were applied **manually in Supabase SQL Editor** (user-confirmed; errors resolved for `fields`, `user_id`, `venue_id NOT NULL`).

**To fix CLI for future pushes:** reset DB password in Dashboard → re-run `supabase link --project-ref auqddrodjezjlypkzfpi`.

### Manual migrations applied (verified via service role)

| Migration | Status | Evidence |
|-----------|--------|----------|
| `20260609000200_employment_assignments.sql` | **Applied** | `employment_assignments` table queryable |
| `20260625000000_polymorphic_hiring_entity.sql` | **Applied** | `employer_entity_type/id` on `job_applications`; `can_manage_hiring()` RPC returns `false` for probe user (function exists) |
| `20260625010000_seed_global_staff_onboarding_templates.sql` | **Applied** | Global templates: General Staff, Security Guard, Bartender |
| `20260625020000_staff_onboarding_storage_compliance.sql` | **Applied** | Private buckets: `staff-documents`, `staff-certifications`, `staff-id-documents`, `staff-waivers` (all `public: false`) |

### Schema verification checklist

| Check | Result |
|-------|--------|
| `employer_entity_type` / `employer_entity_id` on hiring tables | **Present** on `job_applications` (probed) |
| Existing `venue_id` data backfilled | **Pass** — 0 violation rows on templates, applications, candidates, staff_members |
| `venue_id` column dropped | **No** — `venue_id` still present on `job_applications` |
| `can_manage_hiring()` exists | **Yes** — RPC callable |
| RLS policies on hiring tables | **Applied** via Phase 1/11 migrations (not exhaustively enumerated; `staff_documents` employer policies added) |
| Staff document buckets private | **Yes** — all four staff buckets `public: false` |
| Seeded onboarding templates | **Yes** — 3 global templates with `fields` JSONB |
| `staff_documents` safely altered | **Yes** — table exists; `user_id` added/backfilled from legacy `owner_user_id` |
| Destructive migration | **None observed** — additive-only changes |

### Phase 13 SQL checks (`supabase/tests/phase_13_hiring_real_data_checks.sql`)

Run manually in SQL Editor after migrations. Equivalent API probes (2026-06-25):

| Check | Rows returned | Pass |
|-------|---------------|------|
| `job_posting_templates_missing_employer_scope` | 0 | **Yes** |
| `job_applications_missing_employer_scope` | 0 | **Yes** |
| `staff_onboarding_candidates_missing_employer_scope` | 0 | **Yes** |
| `staff_members_missing_employer_scope` | 0 | **Yes** |

Remaining checks in the SQL file (Work Mode gaps, completed candidates without roster, invitation scope mismatches, staff_documents scope) require running the full SQL file in Dashboard — not executed programmatically in this pass.

---

## RBAC Verification

### SQL function (`20260625000000_polymorphic_hiring_entity.sql`)

| Entity | Permission probe | Fallback tables |
|--------|------------------|-----------------|
| Venue | `has_entity_permission(..., 'Venue', ..., 'ASSIGN_EVENT_ROLES' \| 'MANAGE_MEMBERS')` | `venue_profiles`, `venues`, `venue_members`, `entity_memberships` |
| Organization | `has_entity_permission(..., 'Organizer', ...)` | `organizer_accounts`, `organization_members`, `entity_memberships` |
| Artist | `has_entity_permission(..., 'Artist', ...)` | `artist_profiles`, `artist_members`, `entity_memberships` |

Live DB: `has_entity_permission` RPC present; `can_manage_hiring` RPC present and returns boolean.

### TypeScript mirror (`lib/auth/hiring-permissions.ts`)

| Check | Match |
|-------|-------|
| RPC call `can_manage_hiring` with `p_user_id`, `p_entity_type`, `p_entity_id` | **Yes** |
| Legacy fallback `ASSIGN_EVENT_ROLES` / `MANAGE_MEMBERS` via `hasEntityPermission` | **Yes** |
| Entity type mapping: venue→Venue, organization→Organizer, artist→Artist | **Yes** |

### Route guards (`lib/api/hiring-route-helpers.ts`)

All `/api/hiring/*` routes resolve actor via `resolveHiringActorFromRequest({ requirePermission: true })` where writes are involved. No direct service-role client in `app/api/hiring/**`.

**No RBAC code changes required** — SQL and TS align with live `has_entity_permission` schema.

---

## Build / Typecheck / Lint

### Lint

**PASS** (exit 0)

### Build

**FAIL** — hiring UI import blockers **fixed**; remaining failure is pre-existing:

| Category | File | Error |
|----------|------|-------|
| Pre-existing unrelated | `app/lib/actions/ticket-type.actions.ts:5` | `PrismaClient` not exported from `@prisma/client` |
| Pre-existing unrelated | `lib/prisma.ts:1` | Same |

### Typecheck (`npx tsc --noEmit`)

**FAIL** — 9 errors:

| Category | File | Error |
|----------|------|-------|
| Pre-existing unrelated | `app/lib/actions/ticket-type.actions.ts`, `lib/prisma.ts` | PrismaClient export |
| Pre-existing unrelated | `components/epk/epk-editor-tabs.tsx` | RefObject / ChangeEvent types (lines 176, 198, 329) |
| Pre-existing unrelated | `lib/services/account-management.service.ts` | Implicit `any` on `rel` (372, 375) |
| Hiring-related | `lib/services/hiring-application-approval.service.ts:293` | `SendHireContractResult` cast to `Record<string, unknown>` |

---

## Phase 13 Test Results

### Unit tests

| Pass | Fail | Skip |
|------|------|------|
| **2** | **0** | **0** |

### Smoke script (`source .env.local && npx tsx scripts/hiring/phase-13-real-data-smoke-test.ts`)

| Pass | Fail | Warn | Skip |
|------|------|------|------|
| **10** | **0** | **1** | **0** |

#### Passed global checks

- All 9 core hiring tables queryable
- `staff_onboarding_candidates.onboarding_responses` JSONB column exists
- Staff buckets, templates, employer columns (via prior probes)

#### Warned (scenario checks not run)

| Scenario | Reason |
|----------|--------|
| All 6 documented scenarios | No `PHASE13_*_ENTITY_ID` env vars in `.env.local` |

Skipped scenario list (env not configured):

- `PHASE13_VENUE_SECURITY_*` — venue security guards
- `PHASE13_VENUE_BARTENDER_*` — venue bartenders
- `PHASE13_ARTIST_CREW_*` — artist tour crew
- `PHASE13_ORG_STAFFING_*` — organization third-party venue
- `PHASE13_DIRECT_INVITE_*` — direct invite
- `PHASE13_ELIGIBILITY_ENFORCE_*` — eligibility gate enforce mode

Configure per `docs/phase-13-real-data-testing.md` using staging-safe test entity IDs.

---

## Manual E2E Results

**Not executed** — blocked by missing `PHASE13_*` scenario configuration and no authenticated staging test session in this pass.

| Flow | Status | Blocker |
|------|--------|---------|
| Venue (10-step hire → onboard → Work Mode) | **Not run** | No `PHASE13_VENUE_*` IDs; no browser session |
| Organization | **Not run** | No `PHASE13_ORG_STAFFING_*` IDs |
| Artist | **Not run** | No `PHASE13_ARTIST_CREW_*` IDs |

### Legacy compatibility

| Route / behavior | Code | Staging HTTP probe (`demo.tourify.live`) |
|------------------|------|----------------------------------------|
| `/onboarding/[token]` → `/onboarding/hire/[token]` | `app/onboarding/[token]/page.tsx` redirects via `buildHireOnboardingPath` | 307 → `/login?redirectTo=...` (auth middleware) |
| `/onboarding?token=` → hire flow | `app/onboarding/page.tsx:41-43` | 307 → `/login?redirectTo=...` (auth middleware) |
| Legacy `venue_id` job postings | `app/api/admin/job-postings/route.ts` | Code present; not API-tested |
| Universal hiring APIs | `/api/hiring/*` | Not tested without entity scope + auth |

Redirect logic is correct in code; live staging requires login before onboarding pages load.

---

## Security Checks

| Check | Status | Notes |
|-------|--------|-------|
| PII redaction in onboarding JSON | **Code verified** | `lib/hiring/sensitive-field-utils.ts`, `HiringOnboardingService.submitTokenOnboarding` — not E2E tested |
| Storage privacy | **Pass (DB)** | All staff buckets `public: false` |
| RLS via `can_manage_hiring()` | **Applied (DB)** | Function deployed; policies in Phase 1/11 migrations |
| Service-role route guards | **Pass (code)** | `/api/hiring/*` uses authenticated actor + permission checks |
| Cross-account data leaks | **Not tested** | Requires scenario env vars + E2E |
| Credentials vault | **Deferred** | TODO at `lib/hiring/sensitive-field-utils.ts:84` |

---

## Remaining Blockers

| # | Blocker | Severity | Path / action |
|---|---------|----------|---------------|
| 1 | No `PHASE13_*` scenario env vars | **Staging blocker** | Add to `.env.local` per `docs/phase-13-real-data-testing.md` |
| 2 | Full E2E not run (venue/org/artist) | **Staging blocker** | Manual QA or scripted flow after env config |
| 3 | Pre-existing Prisma build failure | **Build blocker** | `app/lib/actions/ticket-type.actions.ts`, `lib/prisma.ts` |
| 4 | Supabase CLI DB password auth | **Ops blocker** | Does not block DB (manual apply succeeded); fix for future CLI pushes |
| 5 | Deployed staging requires login for onboarding URLs | **QA note** | Use authenticated session or public token route bypass for E2E |

---

## Safe-to-Defer Items

| Item | Classification | Rationale |
|------|----------------|-----------|
| `app/api/admin/job-postings/route.ts` → `AdminOnboardingStaffService` | **Safe to defer** | Legacy venue path; canonical path is `/api/hiring/job-postings` |
| `app/admin/dashboard/staff/page.tsx` fallback helpers | **Safe to defer** | Legacy UI; `/admin/dashboard/hiring` is universal entry |
| No `app/artist/business/hiring/page.tsx` | **Safe to defer** | Use `/admin/dashboard/hiring?entity_type=artist&entity_id=` |
| Credentials vault TODO | **Safe to defer** (production concern) | Redaction summaries in place |
| `hiring_audit_events.application_id NOT NULL` | **Safe to defer** | `supabase/migrations/20260330120000_hiring_audit_events.sql`; service skips non-application events |
| `hiring-application-approval.service.ts:293` typecheck | **Safe to defer** | Does not block Next.js build (Prisma fails first) |
| `onboarding_responses` as standalone table (old smoke script) | **Fixed** | `scripts/hiring/phase-13-real-data-smoke-test.ts` now checks JSONB column |

---

## Production Recommendation

**Ready for staging QA** (hiring DB + global smoke checks) — **not production ready**

The database foundation for universal hiring is in place on the linked Supabase project. Global Phase 13 smoke checks pass. To reach **“staging validated”**:

1. Add `PHASE13_*` entity IDs to `.env.local` (one venue, one org, one artist + optional job/application/token IDs).
2. Re-run smoke script — all 6 scenarios should exercise `/api/hiring/dashboard`, `/api/hiring/applications`, `/api/hiring/roster`, token onboarding.
3. Run manual E2E for venue, organization, and artist (10 steps each).
4. Fix Prisma build for deployable preview builds (`npm run build` green).

**Production:** **Not production ready** — E2E flows unverified, build not green, credentials vault not integrated.
