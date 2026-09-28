# Work decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DOMAIN-014 — Merge-mode source order must equal the unified merge key

- Date: 2026-09-25
- Status: accepted
- Task: WORK-009
- Decision: `GET /api/jobs` merge mode orders **both** merge sources by `created_at DESC` with a deterministic `id` tiebreak and ignores `sort_by` / `sort_order` for the `unified` list. `sort_by` / `sort_order` still order the non-merged `artist_jobs` list, whose response shape is unchanged. The tiebreak also makes shared-`created_at` pages contiguous and duplicate-free.
- Evidence: `mergeUnifiedJobsByDate` (`lib/rebuild/unified-jobs-list.ts:118-125`) is the unified contract and sorts `created_at` DESC. A merge-mode per-source window of `page * perPage` rows only covers the unified slice when the source order agrees with the merge order, so honouring `sort_by=title|payment_amount` or `sort_order=asc` could fetch a window that excludes the newest listing — the same truncation as the removed 400-row cap, one layer down. Proven by a disposable revert: 2 of the 3 new tests in `__tests__/jobs/unified-jobs-pagination.test.ts` fail without the fix, all 8 pass with it.
- Consequences: `?merge=1&sort_by=…` no longer re-orders the unified board, and the route doc comment says so. The in-repo caller (`app/jobs/page.tsx`) always requests `created_at`/desc, so no client change is needed. The new contract is asserted by a test so a future change cannot silently reintroduce the divergence.

## DOMAIN-015 — The retired workforce surface is deleted, never migrated forward

- Date: 2026-09-25
- Status: accepted
- Task: WORK-005, WORK-007 (DB-008 code-drift cluster)
- Decision: `staff_applications`, `staff_jobs`, `get_staff_dashboard_stats` and `calculate_ai_match_score` are **not** schema gaps. They exist only in archived or backup SQL, the repository names canonical replacements (`staff_members` from `20260823070000_staff_members_canonical_roster.sql`; `organization_people` for crew/contractors; `job_board_postings` / `organization_job_postings` for postings), and every consumer module was re-verified as having zero importers. Hand them off for deletion; do not ask the database lane to recreate them. `job_board_postings` / `organization_job_postings` / `increment` are the exception: their consumers are entry-reachable, so they need a repoint or a genuinely new additive migration.
- Evidence: import-graph walk from 1,441 Next entry points. `lib/services/staff-job-board.service.ts`, `lib/services/staff-management.service.ts`, `lib/services/session-management.service.ts`, `lib/services/event-participants.service.ts`, `components/industry-job-postings.tsx`, `components/staff-job-board.tsx`, `components/skills-matcher.tsx`, `components/messages.tsx` and `lib/venue/staff-management.service.ts` all have zero importers. The only `staff_applications` match in the live `lib/services/hiring-onboarding.service.ts` is a comment at line 345, not a query. Recorded as HF-WORK-034-VERIFIED-DEAD-STAFF-MODULES.
- Consequences: the work domain does not own a schema migration for these objects, so the 68 + 48 + 12 + 4 diagnostic hits attributed to them are cleared by deletion, not by a new migration. Do not add new hiring/staffing tables until the database lane reconciles the out-of-band DDL behind `lib/database.types.ts`.

## DOMAIN-016 — The Wave 34 lane grant is narrower than WORKING_SET.json, and the grant governs

- Date: 2026-09-25
- Status: accepted
- Task: WORK-005, WORK-008, WORK-009
- Decision: When a wave's file grant and `docs/engineering/agents/work/WORKING_SET.json` disagree, the wave grant governs for that round. This round's grant covers `app/jobs/**`, `app/api/jobs/**`, `app/work/**`, `app/worker/**`, `app/api/work/**`, `app/api/worker/**`, `components/work-mode/**`, `components/work/**`, `lib/work/**`, `lib/worker/**`, `lib/jobs/**` and `lib/organizations/job-postings-identity.ts` — and **not** `app/api/hiring/**`, `lib/hiring/**`, `lib/work-mode/**`, `app/staffing/**` or `components/hiring/**`, which `WORKING_SET.json` does list. A cross-lane defect in a withheld path is handed off with an exact `file:line` and a proven recipe, never edited.
- Evidence: the `job_posting_templates.application_form_template` drift had exactly one remaining code reference, `app/api/hiring/apply/profile-preview/route.ts:31`, inside the work domain's working set but outside the wave grant. The canonical embed already exists twice in the repo (`app/api/job-postings/[id]/route.ts:16`, `app/api/venue/hiring/job-postings/route.ts:60`), so the fix is a one-line repoint; it is handed off as HF-WORK-034-HIRING-JOB-POSTING-TEMPLATES-COLUMN rather than applied. Same reasoning kept `lib/work-mode/read-model.ts` and `app/api/work-mode/**` read-only this round even though prior tasks edited them.
- Consequences: GAPS R1 is now a live cost, not a documentation nit: the worker's primary data path (`app/api/work-mode/**`, `lib/work-mode/**`) and the hiring route family can be read but not fixed during a wave that withholds them. Either the grant or `WORKING_SET.json` must be reconciled before the next work implementation task, and the standing recommendation is to rename the declared paths to `lib/work-mode/**` and `app/api/work-mode/**` explicitly so a glob like `lib/work/**` cannot be mistaken for coverage.
