You are implementing Phase 10 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 10 files only. Do not start Phase 11.

Add or merge:
- types/hiring-roster-work-mode.ts
- lib/hiring/work-mode-permissions.ts
- lib/hiring/roster-schema.ts
- lib/services/hiring-roster.service.ts
- components/hiring/team-roster-panel.tsx
- components/hiring/roster-filters.tsx
- components/hiring/roster-member-detail-drawer.tsx
- components/hiring/roster-assignment-dialog.tsx
- components/hiring/work-mode-permissions-card.tsx
- app/api/hiring/roster/route.ts
- app/api/hiring/roster/[memberId]/route.ts
- app/api/hiring/roster/[memberId]/assignment/route.ts
- app/api/hiring/roster/export/route.ts
- app/admin/dashboard/roster/page.tsx

Critical:
1. Do not add mock roster members, mock Work Mode assignments, or fake staff activity.
2. All roster data must come from staff_members and employment_assignments.
3. All reads and writes must be scoped by employer_entity_type and employer_entity_id.
4. Client components must not create staff_members or employment_assignments directly.
5. If the repo already has a role_templates permission resolver, use it before the fallback in work-mode-permissions.ts.
6. If staff_shift_assignments does not exist, remove or defer that insert block and keep only staff_members.assigned_zone updates.
7. If profiles relationship names differ, adapt HiringRosterService mapping only.
8. If Supabase auth/session helpers differ, merge with the existing route helper from Phase 4.

Run:
pnpm typecheck
pnpm lint

Real-data validation:
1. Complete onboarding for one candidate.
2. Confirm staff_members row exists.
3. Confirm employment_assignments row exists with Work Mode permissions.
4. Load /api/hiring/roster for venue, organization, and artist scopes.
5. Update a roster member status.
6. Assign a shift or zone.
7. Export CSV.

Stop after Phase 10 validation. Do not start Phase 11 upload/PII/compliance file handling.
