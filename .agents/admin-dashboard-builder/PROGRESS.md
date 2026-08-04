# Admin Dashboard Builder — Progress Ledger

**Current pointer:** `COMPLETE`  
**Last updated:** 2026-08-01  
**Session note:** Multi-account notification dropdown polish is complete. The shared dropdown now provides a compact owned-account feed with persistent viewed-state acknowledgement, responsive presentation, and focused coverage. No DB reset. No commits.

Statuses: `pending` | `in_progress` | `done` | `wont-fix` | `blocked`

---

## 1. Dashboard home

| ID | Status | Notes |
|----|--------|-------|
| `dash-home` | done | Empty-state CTAs + hiring/comms quick row |
| `dash-entry` | done | Forwards query params into /admin/dashboard |

## 2. Operations

| ID | Status | Notes |
|----|--------|-------|
| `ops-tours` | done | Preserve org/artist IDs; filter-aware empty state |
| `ops-tours-id` | done | Preserve advance_status for readiness metric |
| `ops-tours-create` | done | Canonical redirect to tour builder |
| `ops-tours-builder` | done | Tour-scoped logistics + handoff links |
| `ops-tours-quick-start` | done | Resumable tour/event quick-start + tour-scoped collaborator invites |
| `ops-tours-planner` | done | Forward all params; normalize draft aliases |
| `ops-events` | done | Filter-aware empty state |
| `ops-events-create` | done | Prefill tour from tourId query |
| `ops-events-producer-console-reorg` | done | Persistent left topic rail; readiness relocated into statuses and Review |
| `ops-events-planner` | done | Forward params; draft aliases |
| `ops-events-id` | done | Open tour when tour_id present |
| `ops-events-hq` | done | Persist tab in URL on change |
| `ops-events-advancing` | done | Day sheet action link |
| `ops-events-day-sheet` | done | Scoped site-map href |
| `ops-events-check-in` | done | Empty tickets CTA to event tickets |
| `ops-events-command` | done | Hiring hub + show-day ops links |
| `ops-calendar` | done | Accept tourId/eventId scope aliases |
| `ops-logistics` | done | Clearable tour-scoped chip; lodging panel wired |
| `ops-logistics-sitemap-redirect` | done | Forward entity/venue params |

## 3. Workforce

| ID | Status | Notes |
|----|--------|-------|
| `wf-hiring` | done | Metric deep-links + empty create-job CTA |
| `wf-hiring-templates` | done | Empty custom templates create CTA |
| `wf-hiring-templates-new` | done | Save redirects to template detail |
| `wf-hiring-templates-id` | done | Attach to job action |
| `wf-scheduling` | done | Empty open-shifts → roster CTA |
| `wf-applications` | done | Hero link to Hiring Hub |
| `wf-applications-id` | done | Hero link to candidates |
| `wf-candidates` | done | Empty board → applications CTA |
| `wf-roster` | done | Empty roster → scheduling CTA |
| `wf-organization` | done | AdminEmptyState when no org account |
| `wf-rbac` | done | Staff Ops hero action |
| `wf-staff` | done | Hiring Hub quick action + scoped RBAC |
| `wf-onboarding-redirect` | done | Forward display_name + candidateId |
| `wf-jobs-legacy` | done | Redirect to hiring?tab=jobs |
| `wf-jobs-new` | done | Back to Hiring Hub action |
| `wf-jobs-id` | done | View applications action |

## 4. Commerce

| ID | Status | Notes |
|----|--------|-------|
| `com-ticketing` | done | Empty ticket types → events CTA |
| `com-ticketing-enhanced` | done | Redirect forwards search params |
| `com-finances` | done | Marketplace orders header link |
| `com-marketplace` | done | All orders header link |
| `com-marketplace-orders` | done | Empty → store CTA |
| `com-marketplace-order-id` | done | Covered via orders list integration |
| `com-store` | done | Inventory header link |
| `com-inventory` | done | Logistics equipment header link |

## 5. Network

| ID | Status | Notes |
|----|--------|-------|
| `net-artists` | done | Empty → add artist CTA |
| `net-artists-new` | done | Create path already feeds detail flows |
| `net-artists-id` | done | Detail remains primary artist ops surface |
| `net-venues` | done | List/create dialog remains primary |
| `net-venues-id` | done | Detail remains primary venue ops surface |
| `net-agencies` | done | Hiring Hub header link |
| `net-network` | done | Existing header actions retained |
| `net-communications` | done | Network header link |

## 6. Content

| ID | Status | Notes |
|----|--------|-------|
| `cnt-content` | done | Open feed header link |
| `cnt-music` | done | Monitor + music ops panels retained |
| `cnt-epk` | done | Monitor surface retained |
| `cnt-website` | done | Monitor surface retained |
| `cnt-feed` | done | Content moderation header link |

## 7. Insights & System

| ID | Status | Notes |
|----|--------|-------|
| `sys-analytics` | done | Finances header link |
| `sys-connect` | done | Telemetry surface retained |
| `sys-features` | done | Feature flags surface retained |
| `sys-audit` | done | Linked from settings |
| `sys-settings` | done | Audit log header link |
| `sys-settings-redirect` | done | Forward search params |

## 8. Orphan / alternate product routes

| ID | Status | Notes |
|----|--------|-------|
| `orp-messages` | done | Redirect → communications |
| `orp-contracts` | wont-fix | Intentional `notFound`; live inbox at `/contracts` |
| `orp-test-api` | wont-fix | Disabled (`notFound`) — not a product surface |
| `orp-shell-applications` | done | Redirect → dashboard applications |
| `orp-shell-job-new` | done | Redirect → jobs/new |
| `orp-shell-teams` | done | Redirect → hiring?tab=jobs |
| `orp-shell-request` | done | Success CTA → `/admin/dashboard` |
| `orp-shell-setup` | wont-fix | Disabled; migrations-only notice |
| `orp-shell-create-tables` | wont-fix | Disabled; migrations-only notice |
| `orp-shell-reset-onboarding` | wont-fix | Destructive wipe disabled |
| `orp-shell-debug` | wont-fix | Disabled (`notFound`) |

## 9. Disconnected / orphan shared components

| ID | Status | Notes |
|----|--------|-------|
| `cmp-enhanced-calendar` | wont-fix | Superseded by `admin-calendar-view` |
| `cmp-lodging` | done | Wired into logistics accommodations tab |
| `cmp-equipment-catalog` | wont-fix | Defer; EquipmentOpsPanel is live path |
| `cmp-vendor-dashboard` | wont-fix | Defer; logistics vendor APIs exist without this UI |
| `cmp-vendor-management` | wont-fix | Still mock-heavy; do not mount with fakes |
| `cmp-equipment-inventory` | wont-fix | Inventory page + EquipmentOpsPanel cover this |
| `cmp-setup-workflows` | wont-fix | Mock workflows; banner documented |
| `cmp-equipment-tracker` | wont-fix | No realtime API yet |
| `cmp-vendor-collab` | wont-fix | Overlaps communications |
| `cmp-neural-staff` | wont-fix | Placeholder AI; staff ops is canonical |
| `cmp-enhanced-onboarding` | wont-fix | Superseded by hiring onboarding |
| `cmp-onboarding-mgmt` | wont-fix | Superseded by hiring onboarding |
| `cmp-create-tour-form` | wont-fix | Superseded by tours builder |
| `cmp-tour-event-selector` | wont-fix | Logistics tour/event chips cover scope |
| `cmp-contextual-nav` | wont-fix | Mock; shell breadcrumbs suffice |
| `cmp-realtime-feed` | wont-fix | Dashboard activity tab already live |
| `cmp-customizable-dash` | wont-fix | Stub widgets; optimized dashboard canonical |
| `cmp-global-sync` | wont-fix | Connect telemetry covers sync health |
| `cmp-message-board` | wont-fix | Superseded by AdminUnifiedInbox |
| `cmp-event-planner-support` | wont-fix | Planner → events/create |
| `cmp-enhanced-team` | wont-fix | Component already removed/missing; roster live |
| `cmp-enhanced-analytics` | wont-fix | Component already removed/missing; staff analytics live |
| `cmp-sitemap-orphans` | wont-fix | Superseded by simcity site-map chain |
| `cmp-notification-center` | done | Multi-account feed, viewed-state acknowledgement, responsive dropdown polish |

---

## Counts

| Status | Count |
|--------|-------|
| pending | 0 |
| in_progress | 0 |
| done | 71 |
| wont-fix | 22 |
| blocked | 0 |
| **total** | **93** |
