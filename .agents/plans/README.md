# Admin Production Readiness — Phase Plans

Each file in this folder is a self-contained, ordered roadmap for one phase of the admin build-out.
Complete them in order; each phase assumes the previous is done.

## Continuous build-out agents

### Admin dashboard

For additive, one-task-at-a-time improvement across every admin page and component (resume across sessions):

- Skill: [`.agents/skills/admin-dashboard-builder/SKILL.md`](../skills/admin-dashboard-builder/SKILL.md)
- Ledger: [`.agents/admin-dashboard-builder/PROGRESS.md`](../admin-dashboard-builder/PROGRESS.md)
- Inventory: [`.agents/admin-dashboard-builder/INVENTORY.md`](../admin-dashboard-builder/INVENTORY.md)

Invoke with: *Use the admin-dashboard-builder skill. Resume from the progress ledger and keep going.* Hard rules: never reset the database; no auto-commits unless asked.

### Venue pages

For additive, one-task-at-a-time improvement across venue ops, public `/venues`, and admin venue bridge:

- Skill: [`.agents/skills/venue-pages-builder/SKILL.md`](../skills/venue-pages-builder/SKILL.md)
- Ledger: [`.agents/venue-pages-builder/PROGRESS.md`](../venue-pages-builder/PROGRESS.md)
- Inventory: [`.agents/venue-pages-builder/INVENTORY.md`](../venue-pages-builder/INVENTORY.md)
- IA source: [`docs/audits/venue-canonical-ia.md`](../../docs/audits/venue-canonical-ia.md)

Invoke with: *Use the venue-pages-builder skill. Resume from the progress ledger and keep going.* Hard rules: never reset the database; no auto-commits unless asked; prefer `VenueOperationsShell` canonical routes.

### Admin feature specs (tour management program)

For full acceptance-criteria delivery of every task ID in docs `00`–`14` (Master Roadmap phases 0→6, additive, resume across sessions):

- Skill: [`.agents/skills/admin-feature-spec-builder/SKILL.md`](../skills/admin-feature-spec-builder/SKILL.md)
- Ledger: [`.agents/admin-feature-spec-builder/PROGRESS.md`](../admin-feature-spec-builder/PROGRESS.md)
- Inventory: [`.agents/admin-feature-spec-builder/INVENTORY.md`](../admin-feature-spec-builder/INVENTORY.md)
- Specs: [`docs/admin-feature-specs/`](../../docs/admin-feature-specs/)

Invoke with: *Use the admin-feature-spec-builder skill. Resume from the progress ledger and keep going.* Hard rules: never reset the database; no auto-commits unless asked; one task ID at a time until AC met; phase gates from Master Roadmap (not strict filename order).

| # | File | Focus | Estimate |
|---|------|--------|----------|
| 0 | [phase-0-data-integrity.md](phase-0-data-integrity.md) | Schema fixes, broken routes, security blockers | 1–2 days |
| 1 | [phase-1-navigation-shell.md](phase-1-navigation-shell.md) | Condensed nav, shared UI shell, auth consistency | 1–2 days |
| 2 | [phase-2-events.md](phase-2-events.md) | Full event lifecycle: planner → publish → analytics | 3–4 days |
| 3 | [phase-3-tours-advancing.md](phase-3-tours-advancing.md) | Tours + advancing workspace + day sheets + calendar sync | 3–5 days |
| 4 | [phase-4-workforce.md](phase-4-workforce.md) | Staff roster, scheduling/shifts, RBAC, applications | 3–4 days |
| 5 | [phase-5-logistics.md](phase-5-logistics.md) | Site map subsystems, travel, equipment, comms | 2–3 days |
| 6 | [phase-6-finance-commerce.md](phase-6-finance-commerce.md) | Finances, ticketing, marketplace, store, inventory | 4–5 days |
| 7 | [phase-7-communications.md](phase-7-communications.md) | Unified messaging, group threads, attachments, realtime | 2–3 days |
| 8 | [phase-8-directory-content.md](phase-8-directory-content.md) | Artists/venues/agencies CRUD, content moderation, analytics | 3–4 days |
| 9 | [phase-9-hardening.md](phase-9-hardening.md) | RLS audit, a11y, perf, E2E tests, docs | 3–4 days |

## Design system reference (use everywhere)

- Card style: `bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm`
- Gradient accent: `bg-gradient-to-br from-purple-600/20 to-blue-600/20`
- Existing shared helpers: `AdminPageHeader`, `AdminStatCard`, `AdminEmptyState`, `AdminErrorCard`, `AdminPageSkeleton`
- Number/date helpers: `formatSafeDate`, `formatSafeCurrency`, `formatSafeNumber` from `lib/`
- Status badge helper: `statusBadgeClass`
- Design token: dark `slate-950/95` sidebar, purple-to-blue gradients on accents

## Verification checklist (apply at the end of every phase)

- [ ] `npm run build` produces zero TypeScript errors
- [ ] `npm run lint` produces zero new errors
- [ ] All touched flows exercised manually against a seeded local DB
- [ ] No page renders mock/fallback/"coming soon" data that hasn't been replaced
- [ ] Pending Supabase migrations applied locally (`supabase db push`)
