# Frontend Dashboard UX Audit and Streamlining

Date: 2026-04-09
Scope: General/Candidate dashboards, Venue/Employer dashboards, Staff/Admin dashboards, and cross-account routing/navigation.

## 1) Route and flow inventory

### General/Candidate
- `/dashboard` via `app/dashboard/page.tsx`
- `/dashboard/bookings` via `app/dashboard/bookings/page.tsx`
- `/jobs` with tabs (`all`, `collaborations`, `saved`, `applications`, `staffing`) via `app/jobs/page.tsx`
- Staffing applications card via `components/jobs/my-staffing-applications.tsx`

Primary journeys:
- Discover jobs -> filter -> open role -> apply
- Check submitted applications and status
- Return to dashboard quick actions and recent activity

### Venue/Employer
- `/venue/dashboard` via `app/venue/dashboard/page.tsx`
- `/venue/dashboard/jobs` via `app/venue/dashboard/jobs/page.tsx`
- `/venue/staff` and staff child pages via `app/venue/staff/page.tsx`
- Venue shell via `app/venue/components/layouts/app-shell.tsx`

Primary journeys:
- Post job -> manage postings -> review applicants
- Browse board opportunities and benchmark roles
- Track staffing applications from the venue perspective

### Staff/Admin
- `/admin/dashboard` via `app/admin/dashboard/page.tsx`
- `/admin/dashboard/staff` via `app/admin/dashboard/staff/page.tsx`
- `/admin/dashboard/jobs` via `app/admin/dashboard/jobs/page.tsx`
- `/admin/applications` via `app/admin/applications/page.tsx`
- Admin dashboard shell via `app/admin/dashboard/layout.tsx`

Primary journeys:
- Monitor platform health and key KPIs
- Review and process applications
- Run staffing operations and onboarding

### Cross-account navigation and guards
- Navigation config: `components/layout/navigation-sidebar.tsx`
- Account routing helpers: `lib/navigation/account-dashboard-routes.ts`
- Middleware/session protection: `middleware.ts`
- Dashboard links in jobs surface: `app/jobs/page.tsx`

## 2) Findings matrix (severity, impact, effort)

| ID | Finding | Severity | User impact | Effort |
|---|---|---|---|---|
| UX-01 | Role nav pointed to non-existent dashboards for several roles | Critical | Navigation dead ends and 404 risk | Low |
| UX-02 | Candidate-facing staffing card linked directly into admin workflow path | High | Role confusion and inaccessible path for non-admin users | Low |
| UX-03 | Venue jobs relied on seeded/mock-first state | High | Data trust issues and inconsistent operations | Medium |
| UX-04 | `/admin/applications` used a different shell than dashboard | High | Context loss (sidebar/breadcrumbs) and flow interruption | Low |
| UX-05 | Dashboard action naming and status chips inconsistent between surfaces | Medium | Slower comprehension and reduced scannability | Low |
| UX-06 | Limited UX instrumentation for tabs/help/discovery actions | Medium | No reliable way to measure UX changes | Low |
| UX-07 | Monolithic pages make rapid UX iteration risky (`dashboard`, `staff`, `applications`) | Medium | Slower delivery and inconsistent UX updates | Medium |

## 3) Quick wins implemented (this pass)

### QW-01: Navigation consistency and dead-link reduction
- Updated role navigation targets to existing, supported routes in `components/layout/navigation-sidebar.tsx`
- Replaced several stale dashboard roots (for manager/tour/event/crew/vendor mappings) with stable admin/venue/artist routes
- Aligned artist dashboard entry to `/artist` and analytics to `/artist/dashboard/analytics`

### QW-02: Role-safe staffing links
- Removed admin-only workflow link from candidate staffing card in `components/jobs/my-staffing-applications.tsx`
- Replaced with account-safe applications path (`/jobs?tab=applications`)
- Added normalized staffing status badge labels/colors for better state readability

### QW-03: Admin shell continuity for applications
- Added `app/admin/applications/layout.tsx` to wrap applications inside dashboard shell
- Updated `app/admin/applications/page.tsx` loading/no-venue/error wrappers so they render as in-shell cards instead of full-screen takeover blocks

### QW-04: Venue jobs data fidelity
- Replaced seeded mock arrays in `app/venue/dashboard/jobs/page.tsx` with API-backed loading from:
  - `/api/admin/job-postings?venue_id=<id>` (venue postings)
  - `/api/job-board` (available roles)
  - `/api/job-applications` (application history)
- Added loading/failure states for tab panels and real applications rendering

### QW-05: Dashboard UX telemetry bootstrap
- Added client telemetry helper in `lib/analytics/ux-event-client.ts`
- Instrumented admin dashboard view/help/shortcut/tab interactions in `app/admin/dashboard/components/optimized-dashboard-client.tsx`
- Instrumented jobs tab changes in `app/jobs/page.tsx`
- Instrumented job application milestone events in `app/jobs/page.tsx` (`job_apply_started`, `job_apply_succeeded`, `job_apply_failed`)
- Instrumented admin review decision events in `app/admin/applications/page.tsx` (`admin_application_review_submitted`, `admin_application_review_failed`)

### QW-06: Shared hiring status primitive
- Added reusable `ApplicationStatusBadge` component in `components/hiring/application-status-badge.tsx`
- Reused it across:
  - `components/jobs/my-staffing-applications.tsx`
  - `app/admin/applications/page.tsx`
  - `components/admin/enhanced-application-review.tsx`

### QW-07: Shared hiring state primitives
- Added reusable `HiringStateCard` in `components/hiring/hiring-state-card.tsx`
- Reused loading/error/empty cards in:
  - `app/admin/applications/page.tsx`
  - `app/venue/dashboard/jobs/page.tsx`
- Standardized retry and CTA patterns for hiring-related empty/failure surfaces

### QW-08: Shared review action primitives
- Added reusable `ApplicationReviewActions` in `components/hiring/application-review-actions.tsx`
- Reused action groups in:
  - `app/admin/applications/page.tsx` (list-level and detail-modal approve/reject controls)
  - `components/admin/enhanced-application-review.tsx` (quick icon actions and detail action row)
- Centralized approve/reject/shortlist/message button patterns to reduce duplicated interaction logic
- Added `createDefaultReviewData` helper in `app/admin/applications/page.tsx` to unify review state initialization/reset logic

### QW-09: Shared applicant identity primitives
- Added reusable `ApplicationApplicantSummary` in `components/hiring/application-applicant-summary.tsx`
- Reused applicant identity blocks in:
  - `app/admin/applications/page.tsx` (list cards and detail modal)
  - `components/admin/enhanced-application-review.tsx` (auto-screening rows and main application rows)
- Standardized avatar/name/contact/applied-date presentation across admin hiring views

### QW-10: Shared job summary primitives
- Added reusable `ApplicationJobSummary` in `components/hiring/application-job-summary.tsx`
- Reused job metadata blocks in:
  - `app/admin/applications/page.tsx` (list context row and job detail card)
  - `components/admin/enhanced-application-review.tsx` (application rows and detail panel)
- Removed repeated per-render job lookup usage in detail panel with a single derived `selectedJobPosting` value

### QW-11: Shared rating primitives
- Added reusable `ApplicationRating` in `components/hiring/application-rating.tsx`
- Reused rating UI in:
  - `app/admin/applications/page.tsx` (list-level application rating)
  - `components/admin/enhanced-application-review.tsx` (list and detail rating display)
- Removed duplicate inline star-render logic from `enhanced-application-review`

### QW-12: Shared insights badge primitives
- Added reusable `ApplicationInsightsBadges` in `components/hiring/application-insights-badges.tsx`
- Reused insights chips in:
  - `app/admin/applications/page.tsx` (onboarding and contract badges)
  - `components/admin/enhanced-application-review.tsx` (eligible/blocked and re-review badges)
- Standardized the semantics and styling of operational insight chips across hiring review surfaces

### QW-13: Shared form response primitives
- Added reusable `ApplicationResponsesList` in `components/hiring/application-responses-list.tsx`
- Reused responses rendering in:
  - `app/admin/applications/page.tsx` (application detail modal)
  - `components/admin/enhanced-application-review.tsx` (application detail dialog)
- Removed duplicate key-label formatting and response-block rendering logic

### QW-13: Shared application response rendering
- Added reusable `ApplicationResponsesList` in `components/hiring/application-responses-list.tsx`
- Reused response rendering in:
  - `app/admin/applications/page.tsx` (application detail modal)
  - `components/admin/enhanced-application-review.tsx` (application detail dialog)
- Removed duplicated response-label formatting and response block rendering logic

## 4) Foundational streamlining plan (next phases)

### Phase A: Shared hiring flow modules
- Extract shared hiring primitives for:
  - status badges
  - review cards
  - empty/loading states
  - filter/search bars
- Candidate modules:
  - `components/jobs/my-staffing-applications.tsx`
  - `app/jobs/page.tsx`
- Admin modules:
  - `app/admin/applications/page.tsx`
  - `app/admin/dashboard/staff/page.tsx`

### Phase B: Route IA normalization
- Keep one canonical home per account type in `lib/navigation/account-dashboard-routes.ts`
- Extend account-path validation in guards/middleware to reduce cross-account deep-link drift

### Phase C: Page decomposition
- Break monoliths into feature panels/hooks:
  - `app/dashboard/page.tsx`
  - `app/admin/dashboard/staff/page.tsx`
  - `app/admin/applications/page.tsx`
- Target panel ownership: list, details, actions, audit, analytics

## 5) UX telemetry and KPI framework

### Event taxonomy (minimum viable)
- `admin_dashboard_viewed`
- `admin_dashboard_tab_changed`
- `admin_dashboard_help_opened`
- `admin_dashboard_shortcuts_opened`
- `jobs_tab_changed`
- `staffing_application_status_viewed` (next step)
- `staffing_apply_clicked` (next step)
- `hiring_review_submitted` (next step)

### KPI targets
- Activation: % of dashboard sessions with >=1 key action (tab switch/help/cta)
- Flow completion:
  - Candidate: view role -> apply completion rate
  - Admin: pending application -> reviewed decision completion rate
  - Venue: posting created -> first applicant received
- Efficiency:
  - Median time from dashboard entry to first key action
  - Median time from application pending to review decision
- Reliability:
  - Dashboard data-load error rate per surface
  - Empty-state frequency for key tabs

## 6) Priority backlog (recommended next implementation order)

1. Extract shared hiring status/empty/loading components
2. Consolidate duplicated application review logic between admin staff and applications pages
3. Add role-aware CTA rendering on all staffing cards and jobs operational links
4. Expand telemetry to apply/review/contract milestones and build simple dashboard for KPI reporting
5. Reduce monolithic page complexity through panel-level components and data hooks
