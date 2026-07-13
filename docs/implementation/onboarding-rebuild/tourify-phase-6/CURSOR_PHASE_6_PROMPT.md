You are implementing Phase 6 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 6 files only. Do not start Phase 7.

Add or merge:
- types/hiring-dashboard.ts
- hooks/use-hiring-entity.tsx
- hooks/use-hiring-dashboard-fetch.ts
- lib/hiring/hiring-dashboard-utils.ts
- lib/hiring/employer-search-params.ts
- components/hiring/hiring-dashboard.tsx
- components/hiring/hiring-dashboard-shell.tsx
- components/hiring/hiring-missing-scope.tsx
- components/hiring/hiring-overview-panel.tsx
- components/hiring/hiring-jobs-panel.tsx
- components/hiring/hiring-applications-panel.tsx
- components/hiring/hiring-onboarding-panel.tsx
- components/hiring/hiring-roster-panel.tsx
- components/hiring/template-manager.tsx
- components/hiring/hiring-audit-panel.tsx
- components/hiring/index.ts

Merge route mount examples carefully:
- app/venue/staff/page.tsx
- app/venue/dashboard/onboarding/page.tsx
- app/admin/dashboard/staff/page.tsx
- app/admin/dashboard/onboarding/page.tsx
- app/artist/team/page.tsx
- app/artist/business/hiring/page.tsx

Critical:
1. Preserve existing auth, layout, and route wrappers.
2. If the repo already has an acting-context provider, use it instead of search-param fallback.
3. Do not add mock staff, mock candidates, mock jobs, mock activity, or mock AI insights.
4. Verify Phase 4 APIs return compatible response shapes.
5. Do not create staff_members or employment_assignments from client dashboard components.
6. Do not build Phase 7 job form, Phase 8 application review actions, or Phase 9 kanban drag/drop yet.

Run:
pnpm typecheck
pnpm lint

Test with real scope URLs:
/admin/dashboard/staff?entity_type=venue&entity_id=<venue_id>
/admin/dashboard/onboarding?entity_type=organization&entity_id=<organization_id>
/artist/business/hiring?entity_type=artist&entity_id=<artist_id>
/venue/staff?venue_id=<venue_id>

Stop after Phase 6 validation.
