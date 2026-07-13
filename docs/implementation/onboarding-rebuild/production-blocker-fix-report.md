# Production Blocker Fix Report

**Date:** 2026-06-24  
**Scope:** Tourify Universal Hiring & Onboarding rebuild — production blocker fix pass  
**Reference:** `docs/hiring-onboarding-implementation-review.md`

---

## Executive Summary

**Status: Ready for real-data staging validation (with caveats).**

All ten targeted production blockers from the implementation review were addressed in code. The hiring/onboarding path now has:

- Working upload and compliance API routes
- PII redaction before JSON persistence
- Employer scope copied on public job applications
- A single canonical approval orchestrator (`approveStaffApplication` → `HiringOnboardingService.approveApplication`)
- Work Mode permissions applied on approval shells and onboarding completion
- Audit tab backed by real `hiring_audit_events` queries
- Next.js 15-compatible route/page param types on hiring/onboarding surfaces
- Phase 13 test wiring and documentation in the main tree
- Fixed `server-only` leak from `artist-jobs.service.ts`

**Remaining before production deploy:**

1. Apply the three hiring migrations to a Supabase preview/branch DB and run SQL checks (CLI auth failed in this environment).
2. Configure Phase 13 smoke-test env vars and run against preview + running app.
3. Resolve pre-existing repo build failures unrelated to hiring (`app/admin/dashboard/components/events/*` imports deleted local UI shims).

---

## Blockers Fixed

| # | Blocker | Status | Notes |
|---|---------|--------|-------|
| 1 | Missing Phase 11 upload/compliance routes | **Fixed** | Added `app/api/hiring/onboarding/upload/route.ts` and `app/api/hiring/onboarding/compliance/[candidateId]/route.ts` |
| 2 | Raw PII in onboarding JSON | **Fixed** | `HiringOnboardingService.submitTokenOnboarding` redacts via `redactSensitiveResponses()` + safe summaries; token route delegates to service |
| 3 | Job application employer scope | **Fixed** | `app/api/job-applications/route.ts` copies `employer_entity_type/id` from posting with venue fallback |
| 4 | Split approval paths | **Fixed** | New `lib/services/hiring-application-approval.service.ts`; admin + hiring routes delegate to `approveStaffApplication()` |
| 5 | Work Mode on onboarding completion | **Fixed** | `submitTokenOnboarding` upserts `staff_members` + `employment_assignments` with `resolveWorkModePermissions()` |
| 6 | Audit tab data | **Fixed** | `GET /api/hiring/dashboard?view=audit` → `HiringOnboardingService.listAuditEvents()` |
| 7 | Next.js 15 param types | **Fixed** | Updated hiring/onboarding routes and pages to `params: Promise<...>` |
| 8 | Phase 13 test wiring | **Fixed** | Added scripts, copied test to `__tests__/hiring/`, copied docs |
| 9 | Migration verification | **Not verified here** | Supabase CLI password auth failed — migrations exist in repo, not confirmed applied |
| 10 | Build blocker (`server-only`) | **Fixed** | Moved `applyToJob` to `lib/services/artist-jobs.server.ts` |

---

## Blockers Remaining

| Item | Severity | Detail |
|------|----------|--------|
| Migrations not applied/verified on preview DB | **High** | `supabase db push --dry-run` failed: password authentication failed. Must apply `20260625000000`, `20260625010000`, `20260625020000` manually on preview branch. |
| Phase 13 smoke test env | **High** | Requires `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and scenario entity IDs. |
| Pre-existing build failures | **Medium** | `app/admin/dashboard/components/events/slack-integration.tsx` imports deleted `../ui/*` components. Unrelated to hiring rebuild. |
| Pre-existing typecheck noise | **Medium** | `@prisma/client`, deleted admin UI paths, EPK editor types — existed before this pass. |
| Credentials vault for raw PII | **Low (deferred)** | Redaction summaries stored; TODO in `sensitive-field-utils.ts` for vault routing when vault integration is complete. |
| `hiring_audit_events` schema duality | **Low** | Service writes employer-scoped rows with `application_id` required; non-application events (e.g. job posting created) skip audit insert when no application ID. |

---

## Files Changed

### New files

- `app/api/hiring/onboarding/upload/route.ts`
- `app/api/hiring/onboarding/compliance/[candidateId]/route.ts`
- `lib/services/hiring-application-approval.service.ts`
- `lib/services/artist-jobs.server.ts`
- `lib/hiring/resolve-employer-from-application.ts`
- `docs/phase-13-real-data-testing.md` (copied from phase package)
- `__tests__/hiring/phase-13-real-data.test.ts` (copied from `tests/hiring/phase-13-real-data.spec.ts`)
- `docs/implementation/onboarding-rebuild/production-blocker-fix-report.md` (this file)

### Modified files

- `app/api/onboarding/[token]/route.ts` — delegates POST to `HiringOnboardingService.submitTokenOnboarding`
- `app/api/job-applications/route.ts` — employer scope on insert
- `app/api/admin/applications/route.ts` — approve action delegates to `approveStaffApplication`
- `app/api/hiring/applications/route.ts` — bulk approve uses orchestrator
- `app/api/hiring/applications/[id]/route.ts` — approve uses orchestrator; Next 15 params
- `app/api/hiring/dashboard/route.ts` — `view=audit` support
- `app/api/admin/onboarding/documents/[documentId]/review/route.ts` — Next 15 params
- `app/api/hiring/roster/[memberId]/route.ts` — Next 15 params
- `app/api/hiring/roster/[memberId]/assignment/route.ts` — Next 15 params
- `lib/services/hiring-onboarding.service.ts` — audit insert fix, Work Mode, PII redaction, `listAuditEvents`, enhanced `submitTokenOnboarding`
- `lib/hiring/sensitive-field-utils.ts` — safe summary objects (`submitted`, `redacted`, `last4`, `document_id`)
- `lib/services/artist-jobs.service.ts` — removed server-only dynamic import
- `app/api/artist-jobs/[id]/applications/route.ts` — uses `applyToArtistJob` from server module
- `app/admin/dashboard/jobs/new/page.tsx` — Next 15 searchParams
- `app/admin/dashboard/roster/page.tsx` — Next 15 searchParams
- `app/onboarding/hire/[token]/page.tsx` — Next 15 params
- `app/onboarding/[token]/page.tsx` — Next 15 params
- `package.json` — added `typecheck`, `test:hiring-phase-13`
- `vitest.config.ts` — includes `tests/hiring/**/*.spec.ts`

---

## Commands Run and Outputs

### `npm run lint`

```
Exit code: 0
```

Warnings only (pre-existing). No new hiring-specific lint errors.

### `npm run typecheck`

```
Command: NODE_OPTIONS='--max-old-space-size=8192' tsc --noEmit
Exit code: 1
```

Many `TS6053` errors for missing `.next/types/**` files when `.next` is stale/partial. Pre-existing source errors also remain in admin event components, Prisma, EPK editor. **Hiring-specific Next 15 param errors on modified routes were addressed.**

Recommendation: run `npm run build` first to regenerate `.next/types`, then typecheck.

### `npm run build`

```
Exit code: 1
```

**Original blocker (FIXED):** `server-only` import via `artist-jobs.service.ts` → `app/artist/collaborations/page.tsx` — no longer appears.

**Current failure (pre-existing):**

```
./app/admin/dashboard/components/events/slack-integration.tsx:5:24
Type error: Cannot find module '../ui/button'
```

Same class of error for other deleted `app/admin/dashboard/components/ui/*` imports.

### `npm run test:hiring-phase-13`

```
Exit code: 0
Test Files  1 passed (1)
Tests       2 passed (2)
```

### `npx tsx scripts/hiring/phase-13-real-data-smoke-test.ts`

```
Exit code: 1
Error: Missing required environment variable: NEXT_PUBLIC_APP_URL
```

Expected until preview/staging env vars are configured per `docs/phase-13-real-data-testing.md`.

### Supabase migration verification

```
Command: supabase db push --dry-run
Exit code: failed
Error: password authentication failed for user "postgres"
```

Could not apply migrations or run `supabase/tests/phase_13_hiring_real_data_checks.sql` in this environment.

---

## Migration Verification Status

| Migration | In repo | Applied on preview DB |
|-----------|---------|----------------------|
| `20260625000000_polymorphic_hiring_entity.sql` | Yes | **Not confirmed** |
| `20260625010000_seed_global_staff_onboarding_templates.sql` | Yes | **Not confirmed** |
| `20260625020000_staff_onboarding_storage_compliance.sql` | Yes | **Not confirmed** |

**Manual steps required:**

1. Link Supabase CLI to preview/branch project with valid credentials.
2. Run `supabase db push` (never reset production).
3. Execute `supabase/tests/phase_13_hiring_real_data_checks.sql` in SQL editor.
4. Confirm `can_manage_hiring()` exists and `has_entity_permission` probes match live RBAC.
5. Confirm storage buckets `staff-documents`, etc. have `public = false`.

---

## Phase 13 Test Status

| Test | Result |
|------|--------|
| `npm run test:hiring-phase-13` (vitest) | **PASS** (2/2) |
| `npx tsx scripts/hiring/phase-13-real-data-smoke-test.ts` | **BLOCKED** — missing env vars |
| `supabase/tests/phase_13_hiring_real_data_checks.sql` | **NOT RUN** — no DB connection |

---

## Architecture Notes (Post-Fix)

### Canonical approval flow

```
Admin UI / Hiring UI
  → POST /api/admin/applications (approve)
  → POST /api/hiring/applications/[id] (approve)
  → approveStaffApplication()
      → eligibility gate (enforce/shadow)
      → HiringOnboardingService.approveApplication()
          → candidate + invitation + workflow + employment_assignment shell
      → contracts, notifications, metrics, side effects
```

### Canonical onboarding completion flow

```
/onboarding/hire/[token]
  → POST /api/onboarding/[token]
  → HiringOnboardingService.submitTokenOnboarding()
      → redactSensitiveResponses()
      → staff_members upsert with resolveWorkModePermissions()
      → employment_assignments upsert/update with permissions
```

### Upload flow

```
OnboardingUploadField / SecureOnboardingUploadField
  → POST /api/hiring/onboarding/upload
  → HiringOnboardingUploadService.uploadDocument()
      → token or authenticated session validation
      → private bucket write + staff_documents metadata row
```

---

## Staging Validation Readiness

| Criterion | Ready? |
|-----------|--------|
| Upload routes exist | Yes |
| PII redaction wired | Yes |
| Employer scope on applications | Yes |
| Single approval path | Yes |
| Work Mode on completion | Yes |
| Audit tab API | Yes |
| Phase 13 unit tests | Yes |
| Migrations applied | **No — human step** |
| Smoke test env configured | **No — human step** |
| Full repo build green | **No — pre-existing admin UI imports** |

**Verdict:** The hiring/onboarding rebuild is **ready for real-data staging validation** once migrations are applied on a preview database, Phase 13 env vars are set, and the smoke script is run against a deployed preview URL. Production deploy should wait until staging E2E passes and pre-existing build blockers are resolved.

---

## Recommended Next Steps

1. Apply the three Supabase migrations on a preview branch.
2. Set Phase 13 env vars from `docs/phase-13-real-data-testing.md` and run the smoke script.
3. Run full E2E: create job → apply → approve → `/onboarding/hire/{token}` → upload document → complete onboarding → verify roster + Work Mode assignment.
4. Fix or exclude broken `app/admin/dashboard/components/events/*` imports so `npm run build` passes repo-wide.
5. Wire credentials vault when available (replace redaction-only path for SSN/bank/tax).
