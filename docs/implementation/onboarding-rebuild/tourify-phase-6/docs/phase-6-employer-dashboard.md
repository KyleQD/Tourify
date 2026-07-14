# Phase 6 — Employer Dashboard Rebuild

## Scope

This phase introduces the universal `HiringDashboard` module for Venue, Organization, and Artist hiring accounts.

It does **not** rebuild the job posting form, application review workflow, onboarding kanban drag/drop, roster assignment logic, or template editor. Those are later phases. This phase creates the real-data dashboard shell and safe mount points.

## Files added

```txt
components/hiring/hiring-dashboard.tsx
components/hiring/hiring-dashboard-shell.tsx
components/hiring/hiring-missing-scope.tsx
components/hiring/hiring-overview-panel.tsx
components/hiring/hiring-jobs-panel.tsx
components/hiring/hiring-applications-panel.tsx
components/hiring/hiring-onboarding-panel.tsx
components/hiring/hiring-roster-panel.tsx
components/hiring/template-manager.tsx
components/hiring/hiring-audit-panel.tsx
components/hiring/index.ts
hooks/use-hiring-entity.tsx
hooks/use-hiring-dashboard-fetch.ts
types/hiring-dashboard.ts
lib/hiring/hiring-dashboard-utils.ts
lib/hiring/employer-search-params.ts
```

## Routes included as merge-ready mount examples

```txt
app/venue/staff/page.tsx
app/venue/dashboard/onboarding/page.tsx
app/admin/dashboard/staff/page.tsx
app/admin/dashboard/onboarding/page.tsx
app/artist/team/page.tsx
app/artist/business/hiring/page.tsx
```

These route files resolve scope from search params as a safe integration fallback:

```txt
?entity_type=venue&entity_id=<uuid>
?entity_type=organization&entity_id=<uuid>
?entity_type=artist&entity_id=<uuid>
?venue_id=<uuid>
```

In the real repo, replace this fallback with the canonical acting-context provider once available.

## Data policy

No panel uses mock data. Every panel fetches from the Phase 4 APIs or legacy adapters:

```txt
GET /api/hiring/dashboard
GET /api/hiring/job-postings
GET /api/hiring/applications
GET /api/admin/onboarding/candidates
GET /api/hiring/roster
GET /api/admin/onboarding/templates
```

Empty states represent real empty query results.

## Notes for Cursor

- If any route already exists, merge the `HiringDashboard` mount instead of replacing unrelated layout, auth, or navigation logic.
- Keep route-level auth checks already present in the repo.
- Replace `buildEmployerFromSearchParams()` with server-side `resolveHiringEntity()` where the app already has user/session context.
- Do not introduce local arrays of fake workers, fake activity, fake AI insights, or fake dashboard data.
