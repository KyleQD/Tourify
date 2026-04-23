# Tourify rebuild — Phase 0.1 dependency map and safe migration plan

**Status:** Living document for strangler rebuild (merged plan).  
**Rules:** No database reset; no duplicate conceptual tables without legacy mapping and deprecation path.

---

## 1. Core tables (Postgres) — inventory

| Domain | Table | Primary migration references |
|--------|--------|------------------------------|
| Artist gig board | `artist_job_categories`, `artist_jobs`, `artist_job_applications`, `artist_job_saves`, `artist_job_views` | `20241220000000_artist_jobs_system.sql`, `20250120000010_extend_artist_jobs_for_collaborations.sql`, `20260423190222_ensure_artist_job_categories_seed.sql` |
| Venue staffing | `job_posting_templates`, `job_applications`, `application_form_templates`, onboarding tables (`onboarding_workflows`, `onboarding_steps`, `staff_onboarding_candidates`, …) | `20250818120000_admin_staffing_core.sql` |
| Hiring compliance | `staff_documents`, `agreement_acceptances`, `hiring_audit_events`, `hiring_eligibility_snapshots` | `20260409120000_job_views_staff_docs_agreements.sql`, `20260409183000_hiring_eligibility_gate.sql`, `20260330120000_hiring_audit_events.sql` |
| Venue roster | `venue_team_members` (and related venue tables) | `20250814123000_venue_core.sql`, types in `types/database.types.ts` |
| Team comms | `team_communications`, legacy `staff_messages` | `20250818120000_admin_staffing_core.sql`, `20260416000323_team_comms_fanout_and_rls_cleanup.sql` |
| Events | `events_v2`, `event_participants`, HQ resource tables | `20260413120000_event_hq_tables.sql`, `20260413210000_event_communications_system.sql` |
| Event comms | `event_bulletins`, `event_group_chats`, `event_group_messages`, `event_documents` | `20260413210000_event_communications_system.sql` |
| Notifications | `notifications`, `notification_preferences` | `20250210000001_comprehensive_notification_system.sql`, `20260415235824_notification_ecosystem_prefs_rls_outbound.sql` |
| Logistics (adjacent) | tasks / logistics domain | `20260413200100_logistics_domain_tables.sql`, `20250818122010_logistics_tasks_align.sql` |

**Proposed “unified” names from rebuild spec → mapping**

| Rebuild spec name | Map to existing | Notes |
|--------------------|-----------------|-------|
| `events` | `events_v2` | Do not introduce a second events root. |
| `jobs` (unified) | `artist_jobs` **+** `job_posting_templates` | Facade API or migration bridge; single new `jobs` table only after backfill + cutover plan. |
| `applications` | `artist_job_applications` **+** `job_applications` | Different status enums; normalize in API layer. |
| `event_teams` / `event_team_members` | `event_participants` + `venue_team_members` + HQ metadata | Extend existing; avoid duplicate roster. |
| `shifts` | `staff_shifts` (staffing core) | Align UI to this table where possible. |
| `tasks` | Logistics / event task tables | See logistics migrations. |
| `event_channels` / `messages` | `event_group_chats` / `event_group_messages` **or** `team_communications` | Prefer extending group chats + venue `team_communications` before new channel tables. |
| `documents` | `venue_documents`, secure uploads, `event_documents` | Unify visibility rules in app layer. |
| `onboarding_checklists` / `tasks` / `user_onboarding_progress` | `onboarding_flows`, `staff_onboarding_candidates`, unified onboarding service | No matches found in repo for exact names — extend existing onboarding schema vs create parallel tables. |

---

## 2. API routes — inventory

| Path area | Role |
|-----------|------|
| [`app/api/artist-jobs/*`](app/api/artist-jobs/route.ts) | Artist job CRUD, applications, saves, categories |
| [`app/api/admin/job-postings`](app/api/admin/job-postings/route.ts) | Admin job postings |
| [`app/actions/staffing/create-job-posting.ts`](app/actions/staffing/create-job-posting.ts) | RBAC-scoped create |
| [`app/api/admin/events/[id]/communications`](app/api/admin/events/[id]/communications/route.ts) | Event bulletins |
| [`app/api/admin/events/[id]/group-chats`](app/api/admin/events/[id]/group-chats/route.ts) | Group chats/messages |
| [`app/api/admin/communications`](app/api/admin/communications/route.ts) | `team_communications` (admin auth) |
| [`app/api/events/[id]/hq`](app/api/events/[id]/hq/route.ts) | Event HQ aggregate |
| [`app/venue/actions/document-actions.ts`](app/venue/actions/document-actions.ts) | Venue document upload |

**New (Phase 2 in rebuild):** [`app/api/jobs/route.ts`](app/api/jobs/route.ts) — **facade** GET merging artist + optional venue staff postings (no duplicate persistence).

---

## 3. UI surfaces — inventory and mock audit

| Surface | Path | Verdict |
|---------|------|---------|
| Artist jobs | `app/artist/features/jobs/page.tsx` | Functional — API-backed |
| Public jobs | `app/jobs/page.tsx` | Functional — mixed tabs; confirm staffing tab APIs |
| Venue jobs | `app/venue/dashboard/jobs/page.tsx` | Functional — `useCurrentVenue`, create modal |
| Venue staff hub | `app/venue/staff/page.tsx` | **Needs improvement** — mock teams, inline mock communications tab |
| Venue comms panel | `app/venue/components/venue-team-communications-panel.tsx` | **Implemented Phase 0.3** — `team_communications` |
| Staff communications component | `app/venue/components/staff-communications.tsx` | Duplicate of `components/venue/venue/staff-communications.tsx`; still mock if used alone |
| Team communication | `app/venue/components/teams/team-communication.tsx` | Mock |
| Scheduler / contracts / onboarding wizard | `app/venue/staff/components/*` | Mock / TODO |
| Enhanced staff management | `app/venue/staff/enhanced-staff-management/page.tsx` | **Fixed** — uses `useCurrentVenue` for `venueId` |
| Admin event HQ | `app/admin/dashboard/events/[id]/hq/page.tsx` | Functional — real fetches |
| Command center | `app/admin/dashboard/events/[id]/command-center/page.tsx` | **Added** — shell + links + HQ fetch |
| Artist team collaboration | `app/artist/events/components/team-collaboration.tsx` | Partial — depends on parent props |

---

## 4. Duplicated or overlapping logic

- **Two job domains:** `artist_jobs` vs `job_posting_templates` — keep both until unified `jobs` migration; facade documents union.
- **Two staff communication UIs:** Inline mocks on `venue/staff/page.tsx` vs `StaffCommunications` component — consolidate on `VenueTeamCommunicationsPanel`.
- **Admin vs venue auth for comms:** `/api/admin/communications` uses admin auth; venue staff use **browser Supabase** + RLS on `team_communications` (beta policies).

---

## 5. SAFE migration / refactor plan (no deletions in Phase 0.1)

| Step | Action | Risk |
|------|--------|------|
| A | Ship facade `GET /api/jobs` + docs | Low |
| B | Wire venue communications tab to `team_communications` | Low — additive UI |
| C | Add `COMMENT ON TABLE` migration for legacy map | Low |
| D | Tighten RLS on `team_communications` by venue | **Medium** — requires policy design + staging tests |
| E | Deprecate duplicate `components/venue/venue/staff-communications.tsx` | Low after re-exports |
| F | Remove mock arrays from `venue/staff/page.tsx` | **Medium** — UX regression if not replaced |

**Not approved for immediate deletion:** Any `_disabled` API folders until 0.2 sign-off.

---

## 6. Exit criteria for Phase 0.1

- [x] This document committed and reviewed.
- [ ] Stakeholder sign-off on rows in section 5 marked Medium+ before RLS tighten or mass mock removal.

---

## 7. References

- Merged plan: `.cursor/plans/jobs_hiring_comms_audit_e0758d2c.plan.md` (local)
- Smoke checklist: `scripts/hiring-stack-smoke-checklist.txt`
