# Phase 13 — Real-Data Testing and Acceptance Validation

## Purpose

Phase 13 proves the universal hiring/onboarding rebuild works against real Supabase data. This phase should not add new product behavior. It validates that the end-to-end system works for Venue, Organization, Artist, direct invite, and eligibility-gated flows.

## What this phase validates

- Hiring APIs respond for `venue`, `organization`, and `artist` employer scopes.
- Job postings have `employer_entity_type` and `employer_entity_id`.
- Applications copy employer scope from postings.
- Approval creates candidate + invitation token server-side.
- Token onboarding resolves entity-scoped templates.
- Completed onboarding creates `staff_members`.
- Completed onboarding creates or preserves `employment_assignments` for Work Mode.
- Staff documents are private, scoped, and reviewable.
- Sensitive fields are not stored in normal onboarding JSON responses.
- Legacy venue rows are backfilled and continue working.

## Required scenarios

### 1. Venue hires security guards

1. Create or use a venue hiring scope.
2. Create a security job with required guard card/license fields.
3. Submit an authenticated application.
4. Approve the application.
5. Confirm `staff_onboarding_candidates` and `staff_invitations` are created.
6. Open `/onboarding/hire/{token}`.
7. Complete onboarding with ID and guard card uploads.
8. Confirm `staff_members` and `employment_assignments` rows exist.

### 2. Venue hires bartenders

1. Create or use a venue hiring scope.
2. Create bartender job with age and alcohol-server permit requirements.
3. Confirm missing permit blocks completion.
4. Upload permit.
5. Complete onboarding.
6. Confirm roster and Work Mode rows.

### 3. Artist hires tour crew

1. Create or use an artist hiring scope.
2. Create FOH engineer, tour manager, merch, or photo/video role.
3. Submit and approve an application.
4. Complete token onboarding.
5. Confirm `staff_members.employer_entity_type = 'artist'`.
6. Confirm Work Mode permissions match the role.

### 4. Organization staffs third-party venue

1. Create or use an organization hiring scope.
2. Set `scope.venueId` for the third-party venue/event context.
3. Create and approve an application.
4. Complete onboarding.
5. Confirm staff belongs to the organization, while shift/zone context can reference the venue.

### 5. Direct invite

1. Create a candidate/invite without a job application.
2. Open `/onboarding/hire/{token}`.
3. Complete onboarding.
4. Confirm roster and Work Mode rows are created.

### 6. Eligibility gate enforce mode

1. Set `FEATURE_HIRING_ELIGIBILITY_GATE=enforce`.
2. Approve a worker missing a required credential.
3. Confirm approval returns `409` or equivalent blocked result.
4. Confirm audit event is written.
5. Confirm no candidate/token/roster rows are created for the blocked approval.

## Environment variables for smoke script

The smoke script only runs scenarios that have env vars configured. Configure as many as you have real data for.

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

PHASE13_VENUE_SECURITY_ENTITY_ID=...
PHASE13_VENUE_SECURITY_DISPLAY_NAME="Venue Security Test"
PHASE13_VENUE_SECURITY_JOB_POSTING_ID=...
PHASE13_VENUE_SECURITY_APPLICATION_ID=...
PHASE13_VENUE_SECURITY_CANDIDATE_ID=...
PHASE13_VENUE_SECURITY_INVITATION_TOKEN=...

PHASE13_VENUE_BARTENDER_ENTITY_ID=...
PHASE13_ARTIST_CREW_ENTITY_ID=...
PHASE13_ORG_STAFFING_ENTITY_ID=...
PHASE13_ORG_STAFFING_VENUE_ID=...
PHASE13_DIRECT_INVITE_ENTITY_ID=...
PHASE13_ELIGIBILITY_ENFORCE_ENTITY_ID=...
```

## Commands

```bash
pnpm typecheck
pnpm lint
pnpm test tests/hiring/phase-13-real-data.spec.ts
pnpm tsx scripts/hiring/phase-13-real-data-smoke-test.ts
```

## SQL checks

Run:

```txt
supabase/tests/phase_13_hiring_real_data_checks.sql
```

Every query in that file is designed to reveal mismatches. Empty result sets are good for the violation checks.

## Acceptance criteria

Phase 13 passes when:

- Venue, Organization, and Artist API scopes resolve.
- `/api/onboarding/{token}` returns a candidate-specific, employer-scoped template.
- `/onboarding/hire/{token}` can complete a real worker onboarding submission.
- Completed onboarding has a `staff_members` row.
- Completed onboarding has an `employment_assignments` row.
- Staff documents are private and scoped.
- No production onboarding dashboard uses mock data.
- Legacy `/onboarding/{token}` redirects correctly.
- `venue_id` compatibility still works during migration.
