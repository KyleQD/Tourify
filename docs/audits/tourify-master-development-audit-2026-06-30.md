# Tourify Master Development Audit

Date: 2026-06-30
Scope: Read-only source audit of Tourify routing, visible user-facing feature surfaces, account model, component families, API/data dependencies, and completion status.

## Read-only boundary

- This audit did not delete files.
- This audit did not edit existing files.
- This audit did not reset or mutate the database.
- These audit files were added as new Markdown documents under `docs/audits/`.
- The worktree already contained many unrelated modified, deleted, and untracked files before this audit package was generated.

## Source-of-truth account model

Tourify should model one person as one login/email/user profile. That user always has a default General account. The same user may also create or be granted attached Artist, Venue, and Admin account contexts.

Admin remains the user-facing account type. Organization is the entity managed inside Admin. The organization creator always has master permissions and can grant master permissions or customized permissions to other invited Admin users.

Crew, staff, and volunteers are not account types. They are General users hired through Jobs. After approval and onboarding, they receive Work Mode access for the relevant assignment.

Venue has its own first-class hiring/workforce tools. A Venue manages its own venue-side staff, crew, volunteers, shifts, tasks, documents, site maps, and event-day operations. A Venue may host events created by the Venue, hosted by an Admin organization, or booked by an Artist. Venue can communicate and collaborate with Admin and Artist accounts while preserving its own workforce control.

## Audit method

Visible component count means user-facing navigation items, feature tiles, dashboard cards, tabs, quick actions, and sidebar items. Routed/imported component counts are included as implementation support, but visible surfaces are the primary product metric.

Status labels:

- Complete: built, routed, connected to real data, permissioned, and has usable states.
- Mostly Built: core path exists, but still has smaller gaps.
- Partial: visible and partially functional, but missing key workflow/data/permission pieces.
- Shell/Mock: visible but mostly static, placeholder, mock, or aspirational.
- Broken/Mislinked: visible item points to a missing or wrong route.
- Duplicate/Legacy: overlapping or older implementation exists and needs consolidation.
- Missing: expected product capability is absent.

## Platform inventory

| Metric | Current count |
|---|---:|
| Page routes | 279 |
| API routes | 421 |
| Layout files | 13 |
| Loading files | 36 |
| Error files | 9 |
| Component files under `components/` | 807 |
| All SQL files | 505 |
| SQL files under `supabase/` | 437 |
| SQL files under `supabase/migrations/` | 318 |

## Account inventory

| Account area | Page routes | API routes | Distinct routed component imports | Visible items audited | Estimated completion |
|---|---:|---:|---:|---:|---:|
| General | 94 | 269 | 76 | 60 core/dialog items | 60-65% |
| Artist | 51 | 14 | 60 | 39 core feature items, plus 21 global artist panel items | 55-60% |
| Venue | 61 | 5 | 134 | 59 core items, plus duplicated/legacy venue nav surfaces | 40-45% |
| Admin | 67 | 133 | 122 | 52 current dashboard/sidebar items | 55-65% |
| Work Mode | Cross-account | Shared hiring/staffing APIs | Shared account/hiring components | 6 current widget items, 10 required dashboard areas | 30-35% |
| Business legacy | 6 | 0 | 15 | Legacy/orphan surface | Recommend absorption |

## Completion score model

Weighted estimate used for each account:

- User workflow: 40%
- Data/API connection: 25%
- Routing/auth/permissions: 20%
- Tests/error/empty/loading states: 10%
- Consistency/polish: 5%

## Cross-account findings

1. Account naming mismatch: code still canonicalizes `admin` to `organization` in some places. Product model requires Admin as the account context and Organization as the managed entity.
2. Work Mode exists as a widget and permission concept, but not as the worker-facing dashboard the product requires.
3. Venue has the largest visible surface and the most duplicated component surface. It mixes live services, route-local components, copied component trees, mock data, and generic feature grids.
4. Artist is directionally strong but has several visible feature tiles pointing to unresolved routes.
5. General has the strongest identity/profile/jobs foundation, but the global feature dialog contains many unresolved or non-account-specific links.
6. `/business/*` should not become a fifth profile type. Mark it legacy and absorb useful pieces into Artist business tools, Admin organization operations, or Venue operations as appropriate.
7. Supabase/RLS/storage policies need a dedicated production readiness pass before shipping workforce, onboarding, payroll, documents, site maps, or admin permissions.

## Route-health findings

| Surface | Visible links checked | Resolved | Missing/mislinked |
|---|---:|---:|---:|
| Artist feature page | 15 | 8 | 7 |
| Artist global panel | 21 | 18 | 3 |
| Venue feature grid | 36 | 10 | 26 |
| Venue owner sidebar route links | 13 | 10 | 3 |
| General/global feature dialog | 24 | 9 | 15 |
| Admin optimized sidebar | 30 leaf links | 30 | 0 |

## Highest-priority roadmap

1. Correct account naming and permissions: Admin account, Organization entity, master permissions, custom permissions.
2. Build the dedicated General-user Work Mode dashboard.
3. Build Venue Hiring/Workforce as a first-class Venue feature using shared Work Mode primitives.
4. Normalize Artist feature routes and remove or redirect broken tiles.
5. Clean Venue navigation: replace generic creator links with `/venue/...` destinations or remove them.
6. Consolidate duplicate Venue component trees.
7. Absorb `/business/*` into Artist/Admin/Venue contexts and mark the legacy routes for retirement.
8. Run a Supabase security/readiness audit for RLS, storage policies, service-role isolation, onboarding documents, payroll data, and cross-account collaboration.

## Deliverable index

- General account audit: `docs/audits/tourify-general-account-audit-2026-06-30.md`
- Artist account audit: `docs/audits/tourify-artist-account-audit-2026-06-30.md`
- Venue account audit: `docs/audits/tourify-venue-account-audit-2026-06-30.md`
- Admin account audit: `docs/audits/tourify-admin-account-audit-2026-06-30.md`
- Work Mode audit: `docs/audits/tourify-work-mode-audit-2026-06-30.md`

