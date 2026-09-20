# Work questions (WORK-001 audit)

Prioritized questions for the product owner on how to build or fix each gap. Each question states the gap(s) it addresses, the build/fix/drop stance, sequencing, and what the owner decides.

## P1 — blocks live verification or current product behavior

### Q1. Approve and apply the staged hiring PII + worker check-in/out SQL through the gated pipeline
- **Gaps:** M1, M2, M8 (+ shares the convened WS-1.1 staged set with database/venue: `20260823210000_harden_hiring_onboarding_pii.sql`, `20260823170000_worker_checkin_contract.sql`).
- **Stance:** fix (apply) + verify.
- **Decision needed:** Do we green-light the gated apply of the hiring PII hardening migration and the worker check-in contract (with the venues/RBAC + webhook + money-path companions in the same batch or separately)? Who signs off the manifest postflight checks (no authenticated-wide SELECT on hiring tables; vault readable only via `can_view_hiring_pii`; applicant self-read intact)?
- **Sequencing:** First. Blocks the PII vault (`staff_onboarding_sensitive_vault`), the sensitive-field endpoint, and `FEATURE_WORK_MODE_WORKER_ACTIONS=1` for check-in/out + acknowledge. Must be coordinated with the database agent (pipeline owner) via handoff.

### Q2. Which hiring surface is canonical: `/api/hiring/**`, `/api/admin/**`, or `/api/venue/hiring/**`?
- **Gaps:** I1, I2, I6, R4.
- **Stance:** fix (consolidate or formally document parity).
- **Decision needed:** For applications, job postings, roster, and audit we now have three employer-facing route families (`/api/hiring/*` polymorphic org/venue, `/api/admin/*` platform-admin, `/api/venue/hiring/*` venue-specific), plus legacy `/api/job-applications` and artist-jobs. Which is the canonical surface going forward? Do we consolidate (move admin/venue under the hiring domain), or ratify parallel surfaces with an explicit parity contract and per-route owner?
- **Sequencing:** Second. The answer decides where I1–I6 consolidation work lands and avoids building new surfaces on a soon-to-be-retired path.

### Q3. Publish the staffing persona matrix (WS-1.1 accept criterion)
- **Gaps:** M3.
- **Stance:** build (documentation + fixtures).
- **Decision needed:** Which staffing personas are in scope — Organization Owner, Operations Manager, Workforce Manager, Finance Manager, Worker (assigned/active), Artist, venue staff, revoked member, cross-organization, unauthenticated? Where should the canonical matrix live (`docs/organization-personas.md`, per-domain agent states, or a new registry row) and who owns it?
- **Sequencing:** Parallel with Q1 (needed for the same WS-1.1 acceptance pass). Work can draft the worker/workforce rows; QA owns the matrix registry if it sits outside the work working set.

## P2 — consolidation and surface completion

### Q4. Reconcile the overlapping data model families
- **Gaps:** I3, I4, I5 (+ archive-sourced legacy tables: `staff_applications`, `staff_jobs`, `event_crew_assignments` from `archive/`).
- **Stance:** build + fix + drop.
- **Decision needed:** For each family — assignments (`employment_assignments` vs `staff_shift_assignments` vs `event_crew_assignments`), onboarding (`staff_onboarding_candidates` vs `staff_onboarding` vs `onboarding_responses` vs `worker_onboarding_profiles` vs `onboarding_templates`/`onboarding_flows`), applications (`job_applications` vs `artist_job_applications` vs `staff_applications` vs `collaboration_applications`), jobs (`job_posting_templates` vs `artist_jobs` vs `staff_jobs`) — which table is the source of truth, which are compat views/bridges, and which can be retired? This maps to the WS-1.1 migration-reconciliation intent.
- **Sequencing:** After Q1/Q2 (schema changes must ride the gated pipeline; surface consolidation changes which tables the canonical routes read).

### Q5. Expand the work working set to include the worker API it already consumes
- **Gaps:** R1.
- **Stance:** build (metadata change only, zero production risk).
- **Decision needed:** Add `app/api/work-mode/**`, `hooks/use-work-mode.ts`, `hooks/use-hiring-*`, `types/hiring-roster-work-mode.ts`, `lib/ux/client-telemetry` (work-mode flows) to `docs/engineering/agents/work/WORKING_SET.json` + `ARCHITECTURE.md` so future tasks can see the worker data path — or move the worker actions under `/api/hiring/**` so they live inside the existing boundary?
- **Sequencing:** Any time; recommended before the next work implementation task.

### Q6. Define the work-mode publication type contract
- **Gaps:** R2.
- **Stance:** fix.
- **Decision needed:** Ratify a single enum/const for `work_mode_publications.publication_type` (`site_map`, `day_sheet`, `task`, `document`, `travel`, `itinerary`, `lodging`, `transport`, `pay`, `payroll`, `compensation`, `contacts`, `run_of_show`, …) shared between the admin publisher side and the worker reader side, so a typo can never silently empty a Work Mode view; and decide whether the check-in view should read from `day_sheet_receipts`-style state.
- **Sequencing:** With Q4 (publication tables are part of the connected-worker schema family).

## P3 — backlog hygiene / drop candidates

### Q7. Resolve where the hiring audit panel reads from
- **Gaps:** M5.
- **Stance:** build or drop.
- **Decision needed:** Is `hiring-audit-panel` wired to `/api/admin/applications/[id]/audit`, `/api/venue/hiring/audit`, or an unlisted route? If it has no consumer in the work working set, either expose an audit route under `/api/hiring/**` or document the panel as a shared component owned by admin/venue.
- **Sequencing:** After Q2's canonical-surface answer.

### Q8. Keep or retire the legacy universal onboarding stack
- **Gaps:** I3 (legacy leg).
- **Stance:** drop or document.
- **Decision needed:** `/api/onboarding/**`, `/api/onboarding-templates/**`, `/api/migrations/create-onboarding`, and `app/api/venue/staff-onboarding` overlap with candidate onboarding (`/api/hiring/onboarding/**`) and admin onboarding (`/api/admin/onboarding/**`). Are these legacy paths still called anywhere, or can they be retired with the Prisma-era cleanup (WS-1.2 notes)?
- **Sequencing:** Low priority; do not touch until Q2/Q4 answer which surface and tables survive.

### Q9. Close the work packet ledger entry
- **Gaps:** I9.
- **Stance:** fix (paperwork).
- **Decision needed:** Who owns completing `docs/work-packets/TA-PH0.md` acceptance (presenter lifecycle/tour-scope contract fields, five-city E2E failing closed, seeded auth entry)? Mark it done, or convert the remaining unchecked items into a follow-up task for the work agent?
- **Sequencing:** Any time; it is the area's only bounded work packet and its checklist is all-unchecked.

## Owner answer flow

Owner answers become follow-up task records owned by this agent (per WORK-001 acceptance criteria). Suggested mapping after answers:

| Owner answer | Follow-up task (owner: work) |
| --- | --- |
| Q1 approved | Apply-and-verify check-in contract + PII vault integration tests (`worker_shift_check_in/out`, `can_view_hiring_pii`) |
| Q2 canonical surface | Consolidation task moving non-canonical routes/components to the chosen surface |
| Q3 persona list | Draft staffing persona rows + map existing routes/RLS to each persona |
| Q4 truth table | Data-model reconciliation task (bridge/retire decision records) |
| Q5 | Working-set expansion (metadata only) |
| Q6 | Publication-type enum + shared contract module |
| Q7/Q8 | Audit-panel wiring or drop decision; legacy onboarding retirement |
| Q9 | TA-PH0 completion or task conversion |

## Owner direction — 2026-09-10

- Staged hiring PII and worker check-in migrations are approved for the gated
  manual pipeline, with postflight evidence required.
- Keep hiring surfaces separate where their responsibilities differ and publish
  an explicit parity/ownership contract before consolidation.
- Treat the staffing data-model recommendation as provisional until Database
  validates exact canonical tables: assignment tables for shift placement,
  separate employment records, and one model each for onboarding, applications,
  and job postings with evidence-based compatibility bridges.
