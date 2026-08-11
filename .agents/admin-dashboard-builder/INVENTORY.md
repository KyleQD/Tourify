# Admin Dashboard Builder — Inventory

Seeded from live sidebar (`optimized-sidebar.tsx`) + `app/admin/**/page.tsx` crawl (2026-07-19).  
Docs under `docs/implementation/onboarding-rebuild/**` are **not** inventory items.

Status of work lives in [PROGRESS.md](PROGRESS.md). This file is the ordered surface map.

---

## 1. Dashboard home

| ID | Route / surface | Path |
|----|-----------------|------|
| `dash-home` | `/admin/dashboard` | `app/admin/dashboard/page.tsx` |
| `dash-entry` | `/admin` redirect | `app/admin/page.tsx` |

## 2. Operations

| ID | Route / surface | Path |
|----|-----------------|------|
| `ops-tours` | `/admin/dashboard/tours` | `app/admin/dashboard/tours/page.tsx` |
| `ops-tours-id` | `/admin/dashboard/tours/[id]` | `app/admin/dashboard/tours/[id]/page.tsx` |
| `ops-tours-create` | `/admin/dashboard/tours/create` | `app/admin/dashboard/tours/create/page.tsx` |
| `ops-tours-builder` | `/admin/dashboard/tours/builder` | `app/admin/dashboard/tours/builder/page.tsx` |
| `ops-tours-quick-start` | Tour Builder quick-start and collaboration flow | `app/admin/dashboard/tours/builder/page.tsx` |
| `ops-tours-planner` | `/admin/dashboard/tours/planner` (redirect) | `app/admin/dashboard/tours/planner/page.tsx` |
| `ops-events` | `/admin/dashboard/events` | `app/admin/dashboard/events/page.tsx` |
| `ops-events-create` | `/admin/dashboard/events/create` | `app/admin/dashboard/events/create/page.tsx` |
| `ops-events-planner` | `/admin/dashboard/events/planner` (redirect) | `app/admin/dashboard/events/planner/page.tsx` |
| `ops-events-id` | `/admin/dashboard/events/[id]` | `app/admin/dashboard/events/[id]/page.tsx` |
| `ops-events-hq` | `/admin/dashboard/events/[id]/hq` | `app/admin/dashboard/events/[id]/hq/page.tsx` |
| `ops-events-advancing` | `/admin/dashboard/events/[id]/advancing` | `app/admin/dashboard/events/[id]/advancing/page.tsx` |
| `ops-events-day-sheet` | `/admin/dashboard/events/[id]/day-sheet` | `app/admin/dashboard/events/[id]/day-sheet/page.tsx` |
| `ops-events-check-in` | `/admin/dashboard/events/[id]/check-in` | `app/admin/dashboard/events/[id]/check-in/page.tsx` |
| `ops-events-command` | `/admin/dashboard/events/[id]/command-center` | `app/admin/dashboard/events/[id]/command-center/page.tsx` |
| `ops-calendar` | `/admin/dashboard/calendar` | `app/admin/dashboard/calendar/page.tsx` |
| `ops-logistics` | `/admin/dashboard/logistics` | `app/admin/dashboard/logistics/page.tsx` |
| `ops-logistics-sitemap-redirect` | `/admin/dashboard/logistics/site-maps-enhanced` | `app/admin/dashboard/logistics/site-maps-enhanced/page.tsx` |

## 3. Workforce

| ID | Route / surface | Path |
|----|-----------------|------|
| `wf-hiring` | `/admin/dashboard/hiring` | `app/admin/dashboard/hiring/page.tsx` |
| `wf-hiring-templates` | `/admin/dashboard/hiring/templates` | `app/admin/dashboard/hiring/templates/page.tsx` |
| `wf-hiring-templates-new` | `/admin/dashboard/hiring/templates/new` | `app/admin/dashboard/hiring/templates/new/page.tsx` |
| `wf-hiring-templates-id` | `/admin/dashboard/hiring/templates/[id]` | `app/admin/dashboard/hiring/templates/[id]/page.tsx` |
| `wf-scheduling` | Staff scheduling tab (`/admin/dashboard/staff?tab=scheduling`) | `app/admin/dashboard/staff/page.tsx` + scheduling components |
| `wf-applications` | `/admin/dashboard/applications` | `app/admin/dashboard/applications/page.tsx` |
| `wf-applications-id` | `/admin/dashboard/applications/[id]` | `app/admin/dashboard/applications/[id]/page.tsx` |
| `wf-candidates` | `/admin/dashboard/candidates` | `app/admin/dashboard/candidates/page.tsx` |
| `wf-roster` | `/admin/dashboard/roster` | `app/admin/dashboard/roster/page.tsx` |
| `wf-organization` | `/admin/dashboard/organization` | `app/admin/dashboard/organization/page.tsx` |
| `wf-rbac` | `/admin/dashboard/rbac` | `app/admin/dashboard/rbac/page.tsx` |
| `wf-staff` | `/admin/dashboard/staff` | `app/admin/dashboard/staff/page.tsx` |
| `wf-onboarding-redirect` | `/admin/dashboard/onboarding` | `app/admin/dashboard/onboarding/page.tsx` |
| `wf-jobs-legacy` | `/admin/dashboard/jobs` | `app/admin/dashboard/jobs/page.tsx` |
| `wf-jobs-new` | `/admin/dashboard/jobs/new` | `app/admin/dashboard/jobs/new/page.tsx` |
| `wf-jobs-id` | `/admin/dashboard/jobs/[id]` | `app/admin/dashboard/jobs/[id]/page.tsx` |

## 4. Commerce

| ID | Route / surface | Path |
|----|-----------------|------|
| `com-ticketing` | `/admin/dashboard/ticketing` | `app/admin/dashboard/ticketing/page.tsx` |
| `com-ticketing-enhanced` | `/admin/dashboard/ticketing/enhanced` (redirect) | `app/admin/dashboard/ticketing/enhanced/page.tsx` |
| `com-finances` | `/admin/dashboard/finances` | `app/admin/dashboard/finances/page.tsx` |
| `com-marketplace` | `/admin/dashboard/marketplace` | `app/admin/dashboard/marketplace/page.tsx` |
| `com-marketplace-orders` | `/admin/dashboard/marketplace/orders` | `app/admin/dashboard/marketplace/orders/page.tsx` |
| `com-marketplace-order-id` | `/admin/dashboard/marketplace/orders/[id]` | `app/admin/dashboard/marketplace/orders/[id]/page.tsx` |
| `com-store` | `/admin/dashboard/store` | `app/admin/dashboard/store/page.tsx` |
| `com-inventory` | `/admin/dashboard/inventory` | `app/admin/dashboard/inventory/page.tsx` |

## 5. Network

| ID | Route / surface | Path |
|----|-----------------|------|
| `net-artists` | `/admin/dashboard/artists` | `app/admin/dashboard/artists/page.tsx` |
| `net-artists-new` | `/admin/dashboard/artists/new` | `app/admin/dashboard/artists/new/page.tsx` |
| `net-artists-id` | `/admin/dashboard/artists/[id]` | `app/admin/dashboard/artists/[id]/page.tsx` |
| `net-venues` | `/admin/dashboard/venues` | `app/admin/dashboard/venues/page.tsx` |
| `net-venues-id` | `/admin/dashboard/venues/[id]` | `app/admin/dashboard/venues/[id]/page.tsx` |
| `net-agencies` | `/admin/dashboard/agencies` | `app/admin/dashboard/agencies/page.tsx` |
| `net-network` | `/admin/dashboard/network` | `app/admin/dashboard/network/page.tsx` |
| `net-communications` | `/admin/dashboard/communications` | `app/admin/dashboard/communications/page.tsx` |

## 6. Content

| ID | Route / surface | Path |
|----|-----------------|------|
| `cnt-content` | `/admin/dashboard/content` | `app/admin/dashboard/content/page.tsx` |
| `cnt-music` | `/admin/dashboard/music` | `app/admin/dashboard/music/page.tsx` |
| `cnt-epk` | `/admin/dashboard/epk` | `app/admin/dashboard/epk/page.tsx` |
| `cnt-website` | `/admin/dashboard/website` | `app/admin/dashboard/website/page.tsx` |
| `cnt-feed` | `/admin/dashboard/feed` | `app/admin/dashboard/feed/page.tsx` |

## 7. Insights & System

| ID | Route / surface | Path |
|----|-----------------|------|
| `sys-analytics` | `/admin/dashboard/analytics` | `app/admin/dashboard/analytics/page.tsx` |
| `sys-connect` | `/admin/dashboard/connect` | `app/admin/dashboard/connect/page.tsx` |
| `sys-features` | `/admin/dashboard/features` | `app/admin/dashboard/features/page.tsx` |
| `sys-audit` | `/admin/dashboard/settings/audit` | `app/admin/dashboard/settings/audit/page.tsx` |
| `sys-settings` | `/admin/dashboard/settings` | `app/admin/dashboard/settings/page.tsx` |
| `sys-settings-redirect` | `/admin/settings` redirect | `app/admin/settings/page.tsx` |

## 8. Orphan / alternate product routes

| ID | Route / surface | Path | Notes |
|----|-----------------|------|-------|
| `orp-messages` | `/admin/dashboard/messages` | `app/admin/dashboard/messages/page.tsx` | Legacy vs communications |
| `orp-contracts` | `/admin/dashboard/contracts` | `app/admin/dashboard/contracts/page.tsx` | Intentional `notFound` — likely `wont-fix` |
| `orp-test-api` | `/admin/dashboard/test-api` | `app/admin/dashboard/test-api/page.tsx` | Dev tool |
| `orp-shell-applications` | `/admin/applications` | `app/admin/(dashboard-shell)/applications/page.tsx` | Alt mount |
| `orp-shell-job-new` | `/admin/job-postings/new` | `app/admin/(dashboard-shell)/job-postings/new/page.tsx` | |
| `orp-shell-teams` | `/admin/teams/[jobId]` | `app/admin/(dashboard-shell)/teams/[jobId]/page.tsx` | |
| `orp-shell-request` | `/admin/request` | `app/admin/(dashboard-shell)/request/page.tsx` | Access request |
| `orp-shell-setup` | `/admin/setup` | `app/admin/(dashboard-shell)/setup/page.tsx` | Dev/ops |
| `orp-shell-create-tables` | `/admin/create-tables` | `app/admin/(dashboard-shell)/create-tables/page.tsx` | Destructive-adjacent — prefer `wont-fix` unless safety fix |
| `orp-shell-reset-onboarding` | `/admin/reset-onboarding` | `app/admin/(dashboard-shell)/reset-onboarding/page.tsx` | Destructive — prefer `wont-fix` unless safety fix |
| `orp-shell-debug` | `/admin/debug` | `app/admin/(dashboard-shell)/debug/page.tsx` | Dev tool |

## 9. Disconnected / orphan shared components

From `docs/architecture/admin-audit.md` disconnected registry (re-verify imports before wiring).

| ID | Component | Suggested home |
|----|-----------|----------------|
| `cmp-enhanced-calendar` | `components/admin/enhanced-calendar.tsx` | Calendar page |
| `cmp-lodging` | `components/admin/lodging-management.tsx` | Logistics accommodations |
| `cmp-equipment-catalog` | `components/admin/logistics/equipment-catalog.tsx` | Logistics equipment |
| `cmp-vendor-dashboard` | `components/admin/logistics/vendor-dashboard.tsx` | Logistics vendors |
| `cmp-vendor-management` | `components/admin/logistics/vendor-management.tsx` | Logistics vendors |
| `cmp-equipment-inventory` | `components/admin/logistics/equipment-inventory-manager.tsx` | Logistics equipment |
| `cmp-setup-workflows` | `components/admin/logistics/automated-setup-workflows.tsx` | Logistics workflows |
| `cmp-equipment-tracker` | `components/admin/logistics/real-time-equipment-tracker.tsx` | Logistics (defer if no API) |
| `cmp-vendor-collab` | `components/admin/logistics/vendor-collaboration-hub.tsx` | Logistics / vendor comms |
| `cmp-neural-staff` | `components/admin/neural-staff-command.tsx` | Staff neural-command tab |
| `cmp-enhanced-onboarding` | `components/admin/enhanced-onboarding-system.tsx` | Hiring / onboarding |
| `cmp-onboarding-mgmt` | `components/admin/onboarding-management.tsx` | Hiring / onboarding |
| `cmp-create-tour-form` | `components/admin/create-tour-form.tsx` | Tours create |
| `cmp-tour-event-selector` | `components/admin/tour-event-selector.tsx` | Shell / logistics context |
| `cmp-contextual-nav` | `components/admin/contextual-navigation.tsx` | Admin shell |
| `cmp-realtime-feed` | `components/admin/realtime-activity-feed.tsx` | Dashboard home |
| `cmp-customizable-dash` | `components/admin/customizable-dashboard.tsx` | Dashboard home |
| `cmp-global-sync` | `components/admin/platform/global-sync-dashboard.tsx` | Connect / settings |
| `cmp-message-board` | `components/admin/communication/message-board.tsx` | Communications |
| `cmp-event-planner-support` | `components/admin/event-planner-support.tsx` | Events create/planner |
| `cmp-enhanced-team` | `components/admin/enhanced-team-management.tsx` | Staff (dead import cleanup) |
| `cmp-enhanced-analytics` | `components/admin/enhanced-analytics-dashboard.tsx` | Staff analytics |
| `cmp-sitemap-orphans` | Orphan `logistics/site-map-builder/*` files superseded by simcity chain | Audit connect vs delete |
| `cmp-notification-center` | Shared multi-account notification dropdown | Global/admin header chrome |

## Walk order

Agents must process IDs in section order 1 → 9, and top-to-bottom within each section, unless the current pointer already points mid-list after a resume.
