# ADMIN-001 Baseline

## Overview

The Tourify Admin surface is a large, mature subsystem spanning organization-level administration, tour production operations, event logistics, ticketing, finance, hiring, and platform-level administration. The admin area represents the largest functional domain in the codebase.

---

## Counts Summary

| Category | Count |
|----------|-------|
| Admin page routes (`app/admin/**/page.tsx`) | 79 |
| Admin API routes (`app/api/admin/**/route.ts`) | 289 |
| Admin components (`components/admin/**/*.tsx/ts`) | 258 |
| Admin domain lib files (`lib/admin/**/*.ts`) | 281 |
| Admin test files (`__tests__/admin/**`) | 244 |
| Auth core files (`lib/auth/**/*.ts`) | 31 |
| **Total** | **1182** |

---

## 1. Page Routes (79)

Routes are organized under `app/admin/` with these major branches:

| Route Group | Path(s) | Purpose |
|-------------|---------|---------|
| Dashboard | `app/admin/dashboard/` | Org-level command center, KPIs, summary views |
| Events | `app/admin/events/` | Event management, event detail tabs, event operations |
| Tours | `app/admin/tours/`, `app/admin/tour/` | Tour lifecycle, tour planning, tour stops, tour routes |
| Ticketing | `app/admin/ticketing/` | Ticket inventory, admissions, guest approvals |
| Logistics | `app/admin/logistics/` | Site maps, travel, transport, equipment, catering, backline |
| Finance | `app/admin/finance/` | Budget, expense, commitments, reconciliation |
| Hiring | `app/admin/hiring/` | Job postings, candidates, onboarding, agencies |
| Staffing | `app/admin/staffing/` | Staffing matrix, role templates, conflict resolution |
| Communications | `app/admin/communications/` | Message boards, notifications |
| Calendar | `app/admin/calendar/` | Calendar sync, schedule views |
| Analytics | `app/admin/analytics/` | Reports, data quality, export jobs |
| Permissions | `app/admin/permissions/` | Team permissions, grants, capability gates |
| Onboarding | `app/admin/onboarding/` | New user/org onboarding wizard |
| Music Ops | `app/admin/music/` | Music licensing, certification, marketplace |
| Settings | `app/admin/settings/` | Org settings, profile |

### Notable Route Groups

- `app/admin/events/[eventId]/` — deep event detail with sub-tabs for logistics, ticketing, staffing, finance, communications
- `app/admin/tours/[tourId]/` — tour detail with plan, route, logistics, staffing, finance sub-tabs
- `app/admin/logistics/site-maps/` — site map builder, editor, viewer, collaboration
- `app/admin/hiring/` — full hiring pipeline from job posting to onboarding

---

## 2. API Routes (289)

All admin API routes live under `app/api/admin/` and cover:

| Domain | Route Prefix | Purpose |
|--------|-------------|---------|
| Events | `app/api/admin/events/` | Event CRUD, operations, setup, readiness |
| Tours | `app/api/admin/tours/`, `app/api/admin/tour/` | Tour lifecycle, planning, bulk commands, route management |
| Ticketing | `app/api/admin/ticketing/` | Ticket inventory, allocations, admissions, guest approvals |
| Logistics | `app/api/admin/logistics/` | Site maps, travel, transport, equipment, catering |
| Finance | `app/api/admin/finance/` | Budget, expense, commitments, reconciliation, settlements |
| Hiring | `app/api/admin/hiring/` | Job postings, applications, candidates, onboarding |
| Staffing | `app/api/admin/staffing/` | Staffing matrix, assignments, conflict resolution |
| Communications | `app/api/admin/communications/` | Message boards, notifications |
| Calendar | `app/api/admin/calendar/` | Calendar events, sync |
| Analytics | `app/api/admin/analytics/` | Reports, data quality, exports |
| Permissions | `app/api/admin/permissions/` | Grants, role management, team permissions |
| Platform | `app/api/admin/platform/` | Platform-level admin (org management, health) |
| Publication | `app/api/admin/publication/` | Event/tour publication lifecycle, outbox |
| Settings | `app/api/admin/settings/` | Org settings, profile |
| Music | `app/api/admin/music/` | Music licensing, certification |

---

## 3. Components (258)

Located in `components/admin/`, organized by domain:

| Directory | Component Count | Purpose |
|-----------|----------------|---------|
| `components/admin/logistics/` | ~50 | Site map builder, travel ops, transport, equipment, catering, vendor dashboard, communications command center |
| `components/admin/events/` | ~20 | Event panels, event operations, event chats |
| `components/admin/finance/` | ~8 | Budget workspace, expense ops, commitments, reconciliation |
| `components/admin/ticketing/` | ~6 | Admissions devices, allocation matrix, guest approvals, inventory ledger, read model, setup |
| `components/admin/onboarding/` | ~6 | Onboarding wizard, step components |
| `components/admin/analytics/` | ~5 | Data quality alerts, freshness, calendar feeds, tour book, export jobs |
| `components/admin/agencies/` | 2 | Performance agency manager, staffing agency manager |
| `components/admin/communication/` | 1 | Message board |
| `components/admin/operations/` | 1 | Event operations card |
| `components/admin/states/` | 1 | Admin data state renderer |
| `components/admin/` (root) | ~40+ | Band hub, calendar, search, permissions matrix, job posting, candidate manager, etc. |

### Notable Components

- `components/admin/logistics/site-map-builder/` — full site map editor with element library, tool palette, inspector, collaboration
- `components/admin/logistics/travel/` — travel ops hub, documents, party matrix, commands
- `components/admin/logistics/communications-command-center.tsx` — comms hub
- `components/admin/band-hub.tsx` — band/artist coordination
- `components/admin/enhanced-global-search.tsx` — cross-domain search
- `components/admin/realtime-activity-feed.tsx` — live activity feed
- `components/admin/capability-gate.tsx` — UI-level capability gating
- `components/admin/permissions-matrix.tsx` — permission visualization
- `components/admin/team-permissions-editor.tsx` — team permission management

---

## 4. Domain Lib Files (281)

Located in `lib/admin/`, covering business logic:

| Domain | File Count | Purpose |
|--------|-----------|---------|
| Tour management | ~40 | Tour lifecycle, planning, bulk commands, route constraints, readiness |
| Event management | ~30 | Event operations, readiness, setup, versioning, closeout |
| Logistics | ~30 | Site maps, transport, equipment, travel, vendor domain |
| Finance | ~15 | Budget, expense, finance scope, tenant keys, settlements |
| Hiring | ~15 | Application pipeline, onboarding templates, identity conversion |
| Publication | ~15 | Publication lifecycle, outbox, share links, field policy |
| Staffing | ~10 | Staffing matrix, role templates, conflict resolution, operations |
| Ticketing | ~10 | Ticketing command service, admissions, read model |
| Comms | ~5 | Communications domain, message board |
| Auth/Security | ~10 | Entity grants, separation of duties, capability-aware UI, route policy |

### Notable Lib Files

- `lib/admin/admin-operations-contracts.ts` — central operation contracts
- `lib/admin/capability-aware-ui.ts` — UI capability awareness
- `lib/admin/separation-of-duties.ts` — SoD enforcement
- `lib/admin/entity-grants.ts` — entity-level grant management
- `lib/admin/state-aware-authorization.ts` — state-based auth
- `lib/admin/publication-lifecycle.ts` — publication state machine
- `lib/admin/tour-lifecycle.ts` — tour state machine
- `lib/admin/event-readiness-engine.ts` — event readiness checks
- `lib/admin/api-route-registry.ts` — API route registration

---

## 5. Auth Core (31 files)

Located in `lib/auth/`, the authorization layer:

| File | Purpose |
|------|---------|
| `admin.ts` | Core admin auth helpers |
| `admin-capabilities.ts` | Admin capability definitions and checks |
| `admin-context.ts` | Admin context creation |
| `admin-profile-gates.ts` | Profile-based admin gating |
| `admin-acting-context-envelope.ts` | Acting context for admin operations |
| `platform-admin.ts` | Platform-level admin auth |
| `route-guards.ts` | Route-level auth guards |
| `api-auth.ts` | API route auth middleware |
| `role-based-auth.tsx` | Role-based auth components |
| `org-command.ts` | Org-scoped command auth |
| `session-init.ts` | Session initialization |
| `acting-context.ts` | Acting context utilities |

### Security Patterns

- `admin-capabilities.ts` — capability-based access control
- `admin-profile-gates.ts` — profile-level gating (org membership, role)
- `platform-admin.ts` — platform admin role (superadmin)
- `route-guards.ts` — route-level guard middleware
- `org-command.ts` — org-scoped mutation authorization
- `separation-of-duties.ts` (in `lib/admin/`) — SoD enforcement

---

## 6. Tests (244 files)

Located in `__tests__/admin/`, covering:

| Area | Notable Tests |
|------|--------------|
| Auth/Security | `admin-request.test.ts`, `admin-owner-org-scope-migration.test.ts`, `admin-route-capability-matrix.test.ts`, `admin-acting-context-envelope.test.ts`, `grant-tour-admins-scope.test.ts`, `resolve-authorized-org.test.ts`, `org-scoped-mutation.test.ts` |
| Publication | `publication-lifecycle.test.ts`, `publication-outbox.test.ts`, `publication-share-links.test.ts`, `publication-field-policy.test.ts`, `pub-work-mode-assignments.test.ts` |
| Tour Lifecycle | `tour-lifecycle` (various), `tour-bulk-command.test.ts`, `tour-route-constraints.test.ts`, `tour-transition.test.ts`, `tour-delete-eligibility.test.ts` |
| Event | `event-readiness-engine.test.ts`, `event-closeout.test.ts`, `event-producer-builder.test.ts`, `event-setup-checklist.test.ts`, `event-version-diff.test.ts` |
| Finance | `finance-domain.test.ts`, `finance-reversal-rules.test.ts`, `finance-tenant-keys.test.ts` |
| Logistics | `logistics-command-schemas.test.ts`, `site-map-*.test.ts`, `equipment-*.test.ts` |
| Ticketing | `ticketing-domain.test.ts`, `ticketing-admissions.test.ts`, `ticketing-read-model.test.ts`, `tix102-foundation-rls-contract.test.ts` |
| Data Protection | `protected-data-policy.test.ts`, `protected-aggregate-policy.test.ts` |
| Navigation | `admin-navigation-ia.test.ts` |

---

## 7. Evidence Sources

| Source | Status | Location |
|--------|--------|----------|
| admin-dashboard-builder ledger | COMPLETE | `.agents/admin-dashboard-builder/INVENTORY.md` |
| admin-feature-spec-builder ledger | COMPLETE (362 items, phases 0-6) | `.agents/admin-feature-spec-builder/INVENTORY.md` |
| admin-ui-wiring ledger | MOSTLY COMPLETE (W0 remote-schema pending, W0 supabase-branch blocked) | `.agents/admin-ui-wiring/` |
| Generated routes map | 368 web routes (includes admin subset) | `docs/engineering/generated/routes.md` |
| Generated API routes map | 938 API routes (includes admin subset) | `docs/engineering/generated/api-routes.md` |
| Generated components map | 1927 TSX/JSX files (includes admin subset) | `docs/engineering/generated/components.md` |
| Generated permissions map | Auth core files | `docs/engineering/generated/permissions.md` |
| Generated database objects map | 676 objects (includes admin-related) | `docs/engineering/generated/database-objects.md` |
| DEVELOPMENT_BACKLOG.md | WS-0.8 (admin gate split), WS-1.7 (admin guard sweep) | `docs/DEVELOPMENT_BACKLOG.md` |
