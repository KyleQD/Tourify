---
description: Phase 6 rules for the universal employer HiringDashboard module.
globs: ["components/hiring/**", "app/**/staff/**", "app/**/onboarding/**", "app/artist/**/hiring/**", "hooks/use-hiring-*.ts*", "types/hiring-dashboard.ts"]
alwaysApply: false
---

# Phase 6 — Employer Dashboard Rules

- Use `HiringEntity` for dashboard scope. Do not introduce new `venueId`-only dashboard props.
- Do not add mock data to production dashboard components.
- Empty states must come from real API responses.
- Dashboard panels may be client islands, but route pages should remain server components where possible.
- Preserve existing route auth, layout, and navigation wrappers when merging.
- If an existing page already resolves acting context, prefer that over search-param fallback.
- Do not build Phase 7 job form, Phase 8 review logic, or Phase 9 kanban drag/drop in this phase.
- Do not create staff members or employment assignments from dashboard UI.
