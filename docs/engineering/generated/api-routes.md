# API route map

<!-- generated: do not edit -->

- Source SHA: `1072fcf45259e44d583e3f1f7c452f2f44b74584`
- Branch: `release/clean-snapshot`
- Working tree: clean
- Generated at: 2026-09-20T11:38:41.456Z
- Generator: `control-plane.mjs generate`

## Route handlers (945)

| Route | Methods | Source |
| --- | --- | --- |
| `/api/account/delete` | POST | `app/api/account/delete/route.ts` |
| `/api/accounts` | DELETE, GET, POST, PUT | `app/api/accounts/route.ts` |
| `/api/accounts/check-slug` | GET | `app/api/accounts/check-slug/route.ts` |
| `/api/achievements` | GET, POST | `app/api/achievements/route.ts` |
| `/api/achievements/resume` | GET, POST | `app/api/achievements/resume/route.ts` |
| `/api/achievements/resume/export` | GET | `app/api/achievements/resume/export/route.ts` |
| `/api/admin/analytics/data-quality` | GET | `app/api/admin/analytics/data-quality/route.ts` |
| `/api/admin/analytics/export` | GET | `app/api/admin/analytics/export/route.ts` |
| `/api/admin/analytics/freshness` | GET | `app/api/admin/analytics/freshness/route.ts` |
| `/api/admin/analytics/top-performers` | GET | `app/api/admin/analytics/top-performers/route.ts` |
| `/api/admin/applications` | GET, PATCH, POST | `app/api/admin/applications/route.ts` |
| `/api/admin/applications/[id]` | PATCH | `app/api/admin/applications/[id]/route.ts` |
| `/api/admin/applications/[id]/audit` | GET | `app/api/admin/applications/[id]/audit/route.ts` |
| `/api/admin/artists` | GET, POST | `app/api/admin/artists/route.ts` |
| `/api/admin/artists/[id]` | DELETE, GET, PATCH | `app/api/admin/artists/[id]/route.ts` |
| `/api/admin/assets/search` | GET | `app/api/admin/assets/search/route.ts` |
| `/api/admin/audit` | GET | `app/api/admin/audit/route.ts` |
| `/api/admin/calendar` | GET, POST | `app/api/admin/calendar/route.ts` |
| `/api/admin/calendar/export` | GET | `app/api/admin/calendar/export/route.ts` |
| `/api/admin/calendar/token` | GET, POST | `app/api/admin/calendar/token/route.ts` |
| `/api/admin/capabilities` | POST | `app/api/admin/capabilities/route.ts` |
| `/api/admin/communications` | GET, PATCH, POST | `app/api/admin/communications/route.ts` |
| `/api/admin/content-hub/analytics` | GET | `app/api/admin/content-hub/analytics/route.ts` |
| `/api/admin/content-hub/integrations` | DELETE, GET | `app/api/admin/content-hub/integrations/route.ts` |
| `/api/admin/content-hub/integrations/sync` | POST | `app/api/admin/content-hub/integrations/sync/route.ts` |
| `/api/admin/content-hub/moderation` | GET | `app/api/admin/content-hub/moderation/route.ts` |
| `/api/admin/content-hub/moderation/[id]` | PATCH | `app/api/admin/content-hub/moderation/[id]/route.ts` |
| `/api/admin/content-hub/overview` | GET | `app/api/admin/content-hub/overview/route.ts` |
| `/api/admin/content-hub/posts` | GET | `app/api/admin/content-hub/posts/route.ts` |
| `/api/admin/content/[id]` | PATCH | `app/api/admin/content/[id]/route.ts` |
| `/api/admin/content/music` | GET | `app/api/admin/content/music/route.ts` |
| `/api/admin/content/music/certifications` | GET, PATCH | `app/api/admin/content/music/certifications/route.ts` |
| `/api/admin/content/music/rights/disputes` | GET, PATCH, POST | `app/api/admin/content/music/rights/disputes/route.ts` |
| `/api/admin/content/music/rights/review` | GET, PATCH | `app/api/admin/content/music/rights/review/route.ts` |
| `/api/admin/content/posts` | GET | `app/api/admin/content/posts/route.ts` |
| `/api/admin/contracts` | GET | `app/api/admin/contracts/route.ts` |
| `/api/admin/contracts/obligations` | GET | `app/api/admin/contracts/obligations/route.ts` |
| `/api/admin/creator-cooperative/ops` | GET, POST | `app/api/admin/creator-cooperative/ops/route.ts` |
| `/api/admin/creator-digital-commons/ops` | GET, POST | `app/api/admin/creator-digital-commons/ops/route.ts` |
| `/api/admin/creator-federation/ops` | GET, POST | `app/api/admin/creator-federation/ops/route.ts` |
| `/api/admin/creator-interoperability-convention/ops` | GET, POST | `app/api/admin/creator-interoperability-convention/ops/route.ts` |
| `/api/admin/creator-interoperability-institution/ops` | GET, POST | `app/api/admin/creator-interoperability-institution/ops/route.ts` |
| `/api/admin/creator-interoperability-organization/ops` | GET, POST | `app/api/admin/creator-interoperability-organization/ops/route.ts` |
| `/api/admin/creator-multilateral-treaty-operations/ops` | GET, POST | `app/api/admin/creator-multilateral-treaty-operations/ops/route.ts` |
| `/api/admin/creator-protocol-constitution/ops` | GET, POST | `app/api/admin/creator-protocol-constitution/ops/route.ts` |
| `/api/admin/creator-public-infrastructure/ops` | GET, POST | `app/api/admin/creator-public-infrastructure/ops/route.ts` |
| `/api/admin/creator-treaty-system-legacy/ops` | GET, POST | `app/api/admin/creator-treaty-system-legacy/ops/route.ts` |
| `/api/admin/creator-treaty-system-renewal/ops` | GET, POST | `app/api/admin/creator-treaty-system-renewal/ops/route.ts` |
| `/api/admin/dashboard/command-center` | GET | `app/api/admin/dashboard/command-center/route.ts` |
| `/api/admin/dashboard/stats` | GET | `app/api/admin/dashboard/stats/route.ts` |
| `/api/admin/effective-capabilities` | GET | `app/api/admin/effective-capabilities/route.ts` |
| `/api/admin/entity-grants` | DELETE, GET, POST | `app/api/admin/entity-grants/route.ts` |
| `/api/admin/error-reporting` | POST | `app/api/admin/error-reporting/route.ts` |
| `/api/admin/event-claims` | GET, POST | `app/api/admin/event-claims/route.ts` |
| `/api/admin/event-merges` | GET, POST | `app/api/admin/event-merges/route.ts` |
| `/api/admin/event-providers` | GET | `app/api/admin/event-providers/route.ts` |
| `/api/admin/event-sync` | GET | `app/api/admin/event-sync/route.ts` |
| `/api/admin/events` | GET, POST | `app/api/admin/events/route.ts` |
| `/api/admin/events/[id]` | DELETE, GET, PATCH | `app/api/admin/events/[id]/route.ts` |
| `/api/admin/events/[id]/advancing` | GET, PATCH, POST | `app/api/admin/events/[id]/advancing/route.ts` |
| `/api/admin/events/[id]/advancing/export` | GET | `app/api/admin/events/[id]/advancing/export/route.ts` |
| `/api/admin/events/[id]/analytics` | GET | `app/api/admin/events/[id]/analytics/route.ts` |
| `/api/admin/events/[id]/communication-settings` | GET, PATCH | `app/api/admin/events/[id]/communication-settings/route.ts` |
| `/api/admin/events/[id]/communications` | GET, PATCH, POST | `app/api/admin/events/[id]/communications/route.ts` |
| `/api/admin/events/[id]/day-sheet` | GET, POST | `app/api/admin/events/[id]/day-sheet/route.ts` |
| `/api/admin/events/[id]/day-sheet/acknowledge` | POST | `app/api/admin/events/[id]/day-sheet/acknowledge/route.ts` |
| `/api/admin/events/[id]/day-sheet/distribute` | POST | `app/api/admin/events/[id]/day-sheet/distribute/route.ts` |
| `/api/admin/events/[id]/documents` | DELETE, GET, PATCH, POST | `app/api/admin/events/[id]/documents/route.ts` |
| `/api/admin/events/[id]/export` | GET | `app/api/admin/events/[id]/export/route.ts` |
| `/api/admin/events/[id]/group-chats` | GET, POST | `app/api/admin/events/[id]/group-chats/route.ts` |
| `/api/admin/events/[id]/participants` | DELETE, GET, POST | `app/api/admin/events/[id]/participants/route.ts` |
| `/api/admin/events/[id]/provision` | POST | `app/api/admin/events/[id]/provision/route.ts` |
| `/api/admin/events/[id]/publish` | POST | `app/api/admin/events/[id]/publish/route.ts` |
| `/api/admin/events/[id]/readiness` | GET, POST | `app/api/admin/events/[id]/readiness/route.ts` |
| `/api/admin/events/[id]/secure-uploads` | DELETE, GET, POST | `app/api/admin/events/[id]/secure-uploads/route.ts` |
| `/api/admin/events/[id]/setup-completeness` | GET | `app/api/admin/events/[id]/setup-completeness/route.ts` |
| `/api/admin/events/[id]/task-messages` | GET, PATCH, POST | `app/api/admin/events/[id]/task-messages/route.ts` |
| `/api/admin/events/[id]/tour-assignments` | DELETE, GET, POST, PUT | `app/api/admin/events/[id]/tour-assignments/route.ts` |
| `/api/admin/events/[id]/vendor-requests` | GET | `app/api/admin/events/[id]/vendor-requests/route.ts` |
| `/api/admin/events/[id]/work-mode` | GET, POST | `app/api/admin/events/[id]/work-mode/route.ts` |
| `/api/admin/events/export` | GET | `app/api/admin/events/export/route.ts` |
| `/api/admin/exports/calendar-feeds` | GET | `app/api/admin/exports/calendar-feeds/route.ts` |
| `/api/admin/exports/jobs` | GET | `app/api/admin/exports/jobs/route.ts` |
| `/api/admin/exports/tour-book` | GET | `app/api/admin/exports/tour-book/route.ts` |
| `/api/admin/features` | GET, POST | `app/api/admin/features/route.ts` |
| `/api/admin/features/[key]` | DELETE, PATCH | `app/api/admin/features/[key]/route.ts` |
| `/api/admin/finances` | DELETE, GET, PATCH, POST | `app/api/admin/finances/route.ts` |
| `/api/admin/finances/budget-rollup` | GET | `app/api/admin/finances/budget-rollup/route.ts` |
| `/api/admin/finances/budget-workspace` | GET | `app/api/admin/finances/budget-workspace/route.ts` |
| `/api/admin/finances/commands` | POST | `app/api/admin/finances/commands/route.ts` |
| `/api/admin/finances/commitments` | GET | `app/api/admin/finances/commitments/route.ts` |
| `/api/admin/finances/expenses` | GET | `app/api/admin/finances/expenses/route.ts` |
| `/api/admin/finances/reconciliation` | GET | `app/api/admin/finances/reconciliation/route.ts` |
| `/api/admin/finances/scope-search` | GET | `app/api/admin/finances/scope-search/route.ts` |
| `/api/admin/finances/settlements` | GET, PATCH, POST | `app/api/admin/finances/settlements/route.ts` |
| `/api/admin/institutional/ops` | GET, POST | `app/api/admin/institutional/ops/route.ts` |
| `/api/admin/job-postings` | GET, POST | `app/api/admin/job-postings/route.ts` |
| `/api/admin/job-postings/[id]` | GET, PATCH | `app/api/admin/job-postings/[id]/route.ts` |
| `/api/admin/licensing/ops` | GET, POST | `app/api/admin/licensing/ops/route.ts` |
| `/api/admin/lodging` | DELETE, GET, POST, PUT | `app/api/admin/lodging/route.ts` |
| `/api/admin/logistics/alerts` | GET | `app/api/admin/logistics/alerts/route.ts` |
| `/api/admin/logistics/backline` | GET, POST | `app/api/admin/logistics/backline/route.ts` |
| `/api/admin/logistics/catering` | GET, PATCH, POST | `app/api/admin/logistics/catering/route.ts` |
| `/api/admin/logistics/commands` | POST | `app/api/admin/logistics/commands/route.ts` |
| `/api/admin/logistics/comms-plans` | GET, POST | `app/api/admin/logistics/comms-plans/route.ts` |
| `/api/admin/logistics/comms-thread` | GET, POST | `app/api/admin/logistics/comms-thread/route.ts` |
| `/api/admin/logistics/communications-command-center` | GET | `app/api/admin/logistics/communications-command-center/route.ts` |
| `/api/admin/logistics/equipment/catalog` | GET, POST | `app/api/admin/logistics/equipment/catalog/route.ts` |
| `/api/admin/logistics/equipment/reservations` | GET, POST | `app/api/admin/logistics/equipment/reservations/route.ts` |
| `/api/admin/logistics/items` | GET, POST | `app/api/admin/logistics/items/route.ts` |
| `/api/admin/logistics/items/[id]` | DELETE, PUT | `app/api/admin/logistics/items/[id]/route.ts` |
| `/api/admin/logistics/items/[id]/equipment` | DELETE, POST | `app/api/admin/logistics/items/[id]/equipment/route.ts` |
| `/api/admin/logistics/items/[id]/status` | POST | `app/api/admin/logistics/items/[id]/status/route.ts` |
| `/api/admin/logistics/items/bulk` | PUT | `app/api/admin/logistics/items/bulk/route.ts` |
| `/api/admin/logistics/metrics` | GET | `app/api/admin/logistics/metrics/route.ts` |
| `/api/admin/logistics/plans` | GET | `app/api/admin/logistics/plans/route.ts` |
| `/api/admin/logistics/plans/[tourId]` | GET | `app/api/admin/logistics/plans/[tourId]/route.ts` |
| `/api/admin/logistics/plans/[tourId]/hydrate` | POST | `app/api/admin/logistics/plans/[tourId]/hydrate/route.ts` |
| `/api/admin/logistics/plans/[tourId]/preview-hydration` | POST | `app/api/admin/logistics/plans/[tourId]/preview-hydration/route.ts` |
| `/api/admin/logistics/plans/[tourId]/validate` | POST | `app/api/admin/logistics/plans/[tourId]/validate/route.ts` |
| `/api/admin/logistics/site-map-templates` | GET | `app/api/admin/logistics/site-map-templates/route.ts` |
| `/api/admin/logistics/site-maps` | GET, POST | `app/api/admin/logistics/site-maps/route.ts` |
| `/api/admin/logistics/site-maps/[id]` | DELETE, GET, PUT | `app/api/admin/logistics/site-maps/[id]/route.ts` |
| `/api/admin/logistics/site-maps/[id]/activity` | GET, POST | `app/api/admin/logistics/site-maps/[id]/activity/route.ts` |
| `/api/admin/logistics/site-maps/[id]/collaborators` | DELETE, GET | `app/api/admin/logistics/site-maps/[id]/collaborators/route.ts` |
| `/api/admin/logistics/site-maps/[id]/elements` | GET, POST | `app/api/admin/logistics/site-maps/[id]/elements/route.ts` |
| `/api/admin/logistics/site-maps/[id]/elements/[elementId]` | DELETE, GET, PUT | `app/api/admin/logistics/site-maps/[id]/elements/[elementId]/route.ts` |
| `/api/admin/logistics/site-maps/[id]/export` | GET | `app/api/admin/logistics/site-maps/[id]/export/route.ts` |
| `/api/admin/logistics/site-maps/[id]/notes` | GET, PATCH, POST | `app/api/admin/logistics/site-maps/[id]/notes/route.ts` |
| `/api/admin/logistics/site-maps/[id]/public-link` | POST | `app/api/admin/logistics/site-maps/[id]/public-link/route.ts` |
| `/api/admin/logistics/site-maps/[id]/publish-work-mode` | POST | `app/api/admin/logistics/site-maps/[id]/publish-work-mode/route.ts` |
| `/api/admin/logistics/site-maps/[id]/save-template` | POST | `app/api/admin/logistics/site-maps/[id]/save-template/route.ts` |
| `/api/admin/logistics/site-maps/[id]/share` | POST | `app/api/admin/logistics/site-maps/[id]/share/route.ts` |
| `/api/admin/logistics/site-maps/[id]/tasks` | GET, POST | `app/api/admin/logistics/site-maps/[id]/tasks/route.ts` |
| `/api/admin/logistics/site-maps/[id]/tasks/[taskId]` | DELETE, PATCH | `app/api/admin/logistics/site-maps/[id]/tasks/[taskId]/route.ts` |
| `/api/admin/logistics/site-maps/[id]/tents` | GET, POST | `app/api/admin/logistics/site-maps/[id]/tents/route.ts` |
| `/api/admin/logistics/site-maps/[id]/tents/[tentId]` | DELETE, GET, PUT | `app/api/admin/logistics/site-maps/[id]/tents/[tentId]/route.ts` |
| `/api/admin/logistics/site-maps/[id]/versions` | GET | `app/api/admin/logistics/site-maps/[id]/versions/route.ts` |
| `/api/admin/logistics/site-maps/[id]/zones` | GET, POST | `app/api/admin/logistics/site-maps/[id]/zones/route.ts` |
| `/api/admin/logistics/site-maps/[id]/zones/[zoneId]` | DELETE, GET, PUT | `app/api/admin/logistics/site-maps/[id]/zones/[zoneId]/route.ts` |
| `/api/admin/logistics/site-maps/[id]/zones/bulk-assign` | POST | `app/api/admin/logistics/site-maps/[id]/zones/bulk-assign/route.ts` |
| `/api/admin/logistics/site-maps/import` | POST | `app/api/admin/logistics/site-maps/import/route.ts` |
| `/api/admin/logistics/site-maps/issues` | GET, POST | `app/api/admin/logistics/site-maps/issues/route.ts` |
| `/api/admin/logistics/site-maps/issues/[id]` | DELETE, GET, PATCH, PUT | `app/api/admin/logistics/site-maps/issues/[id]/route.ts` |
| `/api/admin/logistics/site-maps/layers` | GET, POST | `app/api/admin/logistics/site-maps/layers/route.ts` |
| `/api/admin/logistics/site-maps/layers/[id]` | DELETE, GET, PATCH, PUT | `app/api/admin/logistics/site-maps/layers/[id]/route.ts` |
| `/api/admin/logistics/site-maps/measurements` | GET, POST | `app/api/admin/logistics/site-maps/measurements/route.ts` |
| `/api/admin/logistics/site-maps/measurements/[id]` | DELETE, GET, PATCH, PUT | `app/api/admin/logistics/site-maps/measurements/[id]/route.ts` |
| `/api/admin/logistics/transport` | GET, PATCH, POST | `app/api/admin/logistics/transport/route.ts` |
| `/api/admin/logistics/vendor/dashboard` | GET, POST | `app/api/admin/logistics/vendor/dashboard/route.ts` |
| `/api/admin/logistics/vendor/inventory` | GET, POST | `app/api/admin/logistics/vendor/inventory/route.ts` |
| `/api/admin/logistics/vendor/workflows` | GET, POST | `app/api/admin/logistics/vendor/workflows/route.ts` |
| `/api/admin/logistics/vendors` | GET, POST | `app/api/admin/logistics/vendors/route.ts` |
| `/api/admin/marketplace/moderation` | GET, PATCH | `app/api/admin/marketplace/moderation/route.ts` |
| `/api/admin/marketplace/orders` | GET | `app/api/admin/marketplace/orders/route.ts` |
| `/api/admin/marketplace/orders/[id]` | GET | `app/api/admin/marketplace/orders/[id]/route.ts` |
| `/api/admin/marketplace/payouts/[id]/retry` | POST | `app/api/admin/marketplace/payouts/[id]/retry/route.ts` |
| `/api/admin/messages/broadcast` | POST | `app/api/admin/messages/broadcast/route.ts` |
| `/api/admin/messages/list` | GET | `app/api/admin/messages/list/route.ts` |
| `/api/admin/messages/threads` | GET | `app/api/admin/messages/threads/route.ts` |
| `/api/admin/music-marketplace/ops` | GET, POST | `app/api/admin/music-marketplace/ops/route.ts` |
| `/api/admin/music/royalties/imports` | GET | `app/api/admin/music/royalties/imports/route.ts` |
| `/api/admin/notifications` | GET, PATCH, POST | `app/api/admin/notifications/route.ts` |
| `/api/admin/onboarding` | GET, POST | `app/api/admin/onboarding/route.ts` |
| `/api/admin/onboarding/add-existing-user` | POST | `app/api/admin/onboarding/add-existing-user/route.ts` |
| `/api/admin/onboarding/candidates` | GET | `app/api/admin/onboarding/candidates/route.ts` |
| `/api/admin/onboarding/candidates/[id]` | PATCH, POST | `app/api/admin/onboarding/candidates/[id]/route.ts` |
| `/api/admin/onboarding/candidates/[id]/credentials` | GET, POST | `app/api/admin/onboarding/candidates/[id]/credentials/route.ts` |
| `/api/admin/onboarding/dashboard` | GET | `app/api/admin/onboarding/dashboard/route.ts` |
| `/api/admin/onboarding/documents/[documentId]/review` | PATCH | `app/api/admin/onboarding/documents/[documentId]/review/route.ts` |
| `/api/admin/onboarding/enhanced-invite` | GET | `app/api/admin/onboarding/enhanced-invite/route.ts` |
| `/api/admin/onboarding/initialize-templates` | POST | `app/api/admin/onboarding/initialize-templates/route.ts` |
| `/api/admin/onboarding/invite-new-user` | POST | `app/api/admin/onboarding/invite-new-user/route.ts` |
| `/api/admin/onboarding/review` | POST | `app/api/admin/onboarding/review/route.ts` |
| `/api/admin/onboarding/templates` | DELETE, GET, POST | `app/api/admin/onboarding/templates/route.ts` |
| `/api/admin/onboarding/templates/[id]` | DELETE, GET, PATCH | `app/api/admin/onboarding/templates/[id]/route.ts` |
| `/api/admin/onboarding/templates/clone` | POST | `app/api/admin/onboarding/templates/clone/route.ts` |
| `/api/admin/onboarding/templates/role-packs` | GET, POST | `app/api/admin/onboarding/templates/role-packs/route.ts` |
| `/api/admin/onboarding/update-status` | PATCH | `app/api/admin/onboarding/update-status/route.ts` |
| `/api/admin/onboarding/workflows` | GET | `app/api/admin/onboarding/workflows/route.ts` |
| `/api/admin/onboarding/workflows/advance` | POST | `app/api/admin/onboarding/workflows/advance/route.ts` |
| `/api/admin/onboarding/workflows/analytics` | GET | `app/api/admin/onboarding/workflows/analytics/route.ts` |
| `/api/admin/organization/communications-settings` | GET, PATCH | `app/api/admin/organization/communications-settings/route.ts` |
| `/api/admin/organization/finance-settings` | GET | `app/api/admin/organization/finance-settings/route.ts` |
| `/api/admin/organization/overview` | GET | `app/api/admin/organization/overview/route.ts` |
| `/api/admin/organization/publication-health` | GET | `app/api/admin/organization/publication-health/route.ts` |
| `/api/admin/organization/security-summary` | GET | `app/api/admin/organization/security-summary/route.ts` |
| `/api/admin/organization/settings` | GET, PATCH | `app/api/admin/organization/settings/route.ts` |
| `/api/admin/organization/ticketing-settings` | GET | `app/api/admin/organization/ticketing-settings/route.ts` |
| `/api/admin/organization/tours-health` | GET | `app/api/admin/organization/tours-health/route.ts` |
| `/api/admin/organization/vendor-governance` | GET | `app/api/admin/organization/vendor-governance/route.ts` |
| `/api/admin/organization/workforce-settings` | GET | `app/api/admin/organization/workforce-settings/route.ts` |
| `/api/admin/publication/audience-preview` | POST | `app/api/admin/publication/audience-preview/route.ts` |
| `/api/admin/publication/deliveries` | GET | `app/api/admin/publication/deliveries/route.ts` |
| `/api/admin/publication/deliveries/export` | GET | `app/api/admin/publication/deliveries/export/route.ts` |
| `/api/admin/publication/deliveries/retry` | POST | `app/api/admin/publication/deliveries/retry/route.ts` |
| `/api/admin/publication/history` | GET | `app/api/admin/publication/history/route.ts` |
| `/api/admin/publication/outbox` | GET, POST | `app/api/admin/publication/outbox/route.ts` |
| `/api/admin/publication/outbox/replay` | POST | `app/api/admin/publication/outbox/replay/route.ts` |
| `/api/admin/publication/publish` | POST | `app/api/admin/publication/publish/route.ts` |
| `/api/admin/publication/share-links` | GET, POST | `app/api/admin/publication/share-links/route.ts` |
| `/api/admin/publication/share-links/[id]/revoke` | POST | `app/api/admin/publication/share-links/[id]/revoke/route.ts` |
| `/api/admin/publication/snapshots/[id]/retract` | POST | `app/api/admin/publication/snapshots/[id]/retract/route.ts` |
| `/api/admin/publication/snapshots/[id]/supersede` | POST | `app/api/admin/publication/snapshots/[id]/supersede/route.ts` |
| `/api/admin/rbac/assign-role` | POST | `app/api/admin/rbac/assign-role/route.ts` |
| `/api/admin/rbac/entity/[entityType]/[entityId]/assignments` | GET | `app/api/admin/rbac/entity/[entityType]/[entityId]/assignments/route.ts` |
| `/api/admin/rbac/entity/[entityType]/[entityId]/audit` | GET | `app/api/admin/rbac/entity/[entityType]/[entityId]/audit/route.ts` |
| `/api/admin/rbac/members` | DELETE, GET | `app/api/admin/rbac/members/route.ts` |
| `/api/admin/rbac/roles` | GET, POST | `app/api/admin/rbac/roles/route.ts` |
| `/api/admin/rbac/roles/[id]` | DELETE | `app/api/admin/rbac/roles/[id]/route.ts` |
| `/api/admin/rentals` | DELETE, GET, POST, PUT | `app/api/admin/rentals/route.ts` |
| `/api/admin/request` | POST | `app/api/admin/request/route.ts` |
| `/api/admin/rights-admin/ops` | GET, POST | `app/api/admin/rights-admin/ops/route.ts` |
| `/api/admin/rights-intelligence/ops` | GET, POST | `app/api/admin/rights-intelligence/ops/route.ts` |
| `/api/admin/staff` | DELETE, GET, PATCH, POST | `app/api/admin/staff/route.ts` |
| `/api/admin/staff-operations/channels` | GET, POST | `app/api/admin/staff-operations/channels/route.ts` |
| `/api/admin/staff-operations/channels/[id]` | GET, PATCH | `app/api/admin/staff-operations/channels/[id]/route.ts` |
| `/api/admin/staff-operations/summary` | GET | `app/api/admin/staff-operations/summary/route.ts` |
| `/api/admin/staff/dashboard` | GET | `app/api/admin/staff/dashboard/route.ts` |
| `/api/admin/staffing/job-postings` | POST | `app/api/admin/staffing/job-postings/route.ts` |
| `/api/admin/staffing/performance` | GET, POST | `app/api/admin/staffing/performance/route.ts` |
| `/api/admin/staffing/shifts` | GET, POST | `app/api/admin/staffing/shifts/route.ts` |
| `/api/admin/staffing/shifts/[id]` | DELETE, PATCH | `app/api/admin/staffing/shifts/[id]/route.ts` |
| `/api/admin/staffing/shifts/publish` | POST | `app/api/admin/staffing/shifts/publish/route.ts` |
| `/api/admin/staffing/zones` | GET, POST | `app/api/admin/staffing/zones/route.ts` |
| `/api/admin/store` | GET, PATCH, POST | `app/api/admin/store/route.ts` |
| `/api/admin/tasks` | GET, PATCH | `app/api/admin/tasks/route.ts` |
| `/api/admin/team-members` | DELETE, GET, PATCH, POST | `app/api/admin/team-members/route.ts` |
| `/api/admin/test` | GET | `app/api/admin/test/route.ts` |
| `/api/admin/ticketing/admissions` | GET | `app/api/admin/ticketing/admissions/route.ts` |
| `/api/admin/ticketing/allocations` | GET | `app/api/admin/ticketing/allocations/route.ts` |
| `/api/admin/ticketing/commands` | POST | `app/api/admin/ticketing/commands/route.ts` |
| `/api/admin/ticketing/enhanced` | DELETE, GET, PATCH, POST | `app/api/admin/ticketing/enhanced/route.ts` |
| `/api/admin/ticketing/guest-approvals` | GET | `app/api/admin/ticketing/guest-approvals/route.ts` |
| `/api/admin/ticketing/inventory` | GET | `app/api/admin/ticketing/inventory/route.ts` |
| `/api/admin/ticketing/read-model` | GET | `app/api/admin/ticketing/read-model/route.ts` |
| `/api/admin/ticketing/refund` | POST | `app/api/admin/ticketing/refund/route.ts` |
| `/api/admin/ticketing/setup` | GET | `app/api/admin/ticketing/setup/route.ts` |
| `/api/admin/tours` | DELETE, GET, PATCH, POST | `app/api/admin/tours/route.ts` |
| `/api/admin/tours/[id]` | DELETE, GET, PATCH | `app/api/admin/tours/[id]/route.ts` |
| `/api/admin/tours/[id]/archive-preview` | POST | `app/api/admin/tours/[id]/archive-preview/route.ts` |
| `/api/admin/tours/[id]/calendar-token` | POST | `app/api/admin/tours/[id]/calendar-token/route.ts` |
| `/api/admin/tours/[id]/collaboration-invites` | DELETE, GET, POST | `app/api/admin/tours/[id]/collaboration-invites/route.ts` |
| `/api/admin/tours/[id]/delete-preview` | POST | `app/api/admin/tours/[id]/delete-preview/route.ts` |
| `/api/admin/tours/[id]/duplicate` | GET, POST | `app/api/admin/tours/[id]/duplicate/route.ts` |
| `/api/admin/tours/[id]/duplicate-preview` | POST | `app/api/admin/tours/[id]/duplicate-preview/route.ts` |
| `/api/admin/tours/[id]/duplicate/[jobId]/resume` | POST | `app/api/admin/tours/[id]/duplicate/[jobId]/resume/route.ts` |
| `/api/admin/tours/[id]/events` | DELETE, GET, POST | `app/api/admin/tours/[id]/events/route.ts` |
| `/api/admin/tours/[id]/export` | GET | `app/api/admin/tours/[id]/export/route.ts` |
| `/api/admin/tours/[id]/grant-admins` | POST | `app/api/admin/tours/[id]/grant-admins/route.ts` |
| `/api/admin/tours/[id]/holds` | GET, POST | `app/api/admin/tours/[id]/holds/route.ts` |
| `/api/admin/tours/[id]/logistics-summary` | GET | `app/api/admin/tours/[id]/logistics-summary/route.ts` |
| `/api/admin/tours/[id]/plan` | GET, PUT | `app/api/admin/tours/[id]/plan/route.ts` |
| `/api/admin/tours/[id]/plan/reconcile-preview` | POST | `app/api/admin/tours/[id]/plan/reconcile-preview/route.ts` |
| `/api/admin/tours/[id]/publish` | POST | `app/api/admin/tours/[id]/publish/route.ts` |
| `/api/admin/tours/[id]/quick-start-events` | POST | `app/api/admin/tours/[id]/quick-start-events/route.ts` |
| `/api/admin/tours/[id]/readiness` | GET, POST | `app/api/admin/tours/[id]/readiness/route.ts` |
| `/api/admin/tours/[id]/stops/impact` | POST | `app/api/admin/tours/[id]/stops/impact/route.ts` |
| `/api/admin/tours/[id]/summary` | GET | `app/api/admin/tours/[id]/summary/route.ts` |
| `/api/admin/tours/[id]/summary/projection` | GET, POST | `app/api/admin/tours/[id]/summary/projection/route.ts` |
| `/api/admin/tours/[id]/tags` | PUT | `app/api/admin/tours/[id]/tags/route.ts` |
| `/api/admin/tours/[id]/transitions/[command]` | POST | `app/api/admin/tours/[id]/transitions/[command]/route.ts` |
| `/api/admin/tours/artists` | DELETE, GET, PATCH, POST | `app/api/admin/tours/artists/route.ts` |
| `/api/admin/tours/bulk` | POST | `app/api/admin/tours/bulk/route.ts` |
| `/api/admin/tours/bulk-preview` | POST | `app/api/admin/tours/bulk-preview/route.ts` |
| `/api/admin/tours/events` | DELETE, POST | `app/api/admin/tours/events/route.ts` |
| `/api/admin/tours/observability` | POST | `app/api/admin/tours/observability/route.ts` |
| `/api/admin/tours/plan/backfill` | POST | `app/api/admin/tours/plan/backfill/route.ts` |
| `/api/admin/tours/plan/quarantine` | GET | `app/api/admin/tours/plan/quarantine/route.ts` |
| `/api/admin/tours/saved-views` | GET, POST | `app/api/admin/tours/saved-views/route.ts` |
| `/api/admin/tours/saved-views/[id]` | DELETE, PATCH | `app/api/admin/tours/saved-views/[id]/route.ts` |
| `/api/admin/tours/tags` | GET, POST | `app/api/admin/tours/tags/route.ts` |
| `/api/admin/tours/team-members` | DELETE, GET, PATCH, POST | `app/api/admin/tours/team-members/route.ts` |
| `/api/admin/tours/teams` | DELETE, GET, PATCH, POST | `app/api/admin/tours/teams/route.ts` |
| `/api/admin/tours/vendors` | DELETE, GET, PATCH, POST | `app/api/admin/tours/vendors/route.ts` |
| `/api/admin/tours/venues` | GET | `app/api/admin/tours/venues/route.ts` |
| `/api/admin/travel-coordination` | DELETE, GET, POST, PUT | `app/api/admin/travel-coordination/route.ts` |
| `/api/admin/travel/documents` | GET | `app/api/admin/travel/documents/route.ts` |
| `/api/admin/travel/flight-lookup` | GET | `app/api/admin/travel/flight-lookup/route.ts` |
| `/api/admin/travel/matrix` | GET | `app/api/admin/travel/matrix/route.ts` |
| `/api/admin/travel/segments` | GET, POST | `app/api/admin/travel/segments/route.ts` |
| `/api/admin/travel/slo` | GET | `app/api/admin/travel/slo/route.ts` |
| `/api/admin/users/search` | GET | `app/api/admin/users/search/route.ts` |
| `/api/admin/vendor-requests` | POST | `app/api/admin/vendor-requests/route.ts` |
| `/api/admin/vendor-requests/[id]` | PATCH | `app/api/admin/vendor-requests/[id]/route.ts` |
| `/api/admin/vendors` | GET | `app/api/admin/vendors/route.ts` |
| `/api/admin/venues` | GET, POST | `app/api/admin/venues/route.ts` |
| `/api/admin/venues/[id]` | GET, PATCH | `app/api/admin/venues/[id]/route.ts` |
| `/api/admin/workforce/attendance` | GET, POST | `app/api/admin/workforce/attendance/route.ts` |
| `/api/admin/workforce/conflicts` | GET | `app/api/admin/workforce/conflicts/route.ts` |
| `/api/admin/workforce/conversions` | GET | `app/api/admin/workforce/conversions/route.ts` |
| `/api/admin/workforce/health` | GET | `app/api/admin/workforce/health/route.ts` |
| `/api/admin/workforce/identity-merge` | GET, POST | `app/api/admin/workforce/identity-merge/route.ts` |
| `/api/admin/workforce/payroll-exports` | GET | `app/api/admin/workforce/payroll-exports/route.ts` |
| `/api/admin/workforce/people` | GET | `app/api/admin/workforce/people/route.ts` |
| `/api/agencies/performance` | GET, POST | `app/api/agencies/performance/route.ts` |
| `/api/agencies/performance/[id]/artists` | DELETE, GET, POST | `app/api/agencies/performance/[id]/artists/route.ts` |
| `/api/agencies/staffing` | GET, POST | `app/api/agencies/staffing/route.ts` |
| `/api/agencies/staffing/[id]/staff` | DELETE, GET, POST | `app/api/agencies/staffing/[id]/staff/route.ts` |
| `/api/agreements/accept` | POST | `app/api/agreements/accept/route.ts` |
| `/api/analytics` | GET | `app/api/analytics/route.ts` |
| `/api/analytics/errors` | GET, POST | `app/api/analytics/errors/route.ts` |
| `/api/analytics/metrics` | GET, POST | `app/api/analytics/metrics/route.ts` |
| `/api/artist-jobs` | GET, POST | `app/api/artist-jobs/route.ts` |
| `/api/artist-jobs/[id]` | DELETE, GET, PATCH, PUT | `app/api/artist-jobs/[id]/route.ts` |
| `/api/artist-jobs/[id]/applications` | GET, PATCH, POST | `app/api/artist-jobs/[id]/applications/route.ts` |
| `/api/artist-jobs/[id]/repost` | POST | `app/api/artist-jobs/[id]/repost/route.ts` |
| `/api/artist-jobs/applications` | GET | `app/api/artist-jobs/applications/route.ts` |
| `/api/artist-jobs/categories` | GET | `app/api/artist-jobs/categories/route.ts` |
| `/api/artist-jobs/saved` | GET, POST | `app/api/artist-jobs/saved/route.ts` |
| `/api/artist/[artistName]` | GET | `app/api/artist/[artistName]/route.ts` |
| `/api/artist/business/overview` | GET | `app/api/artist/business/overview/route.ts` |
| `/api/artist/content/overview` | GET | `app/api/artist/content/overview/route.ts` |
| `/api/artist/epk` | GET, PUT | `app/api/artist/epk/route.ts` |
| `/api/artist/events` | GET, POST | `app/api/artist/events/route.ts` |
| `/api/artist/events/[id]` | DELETE, GET, PATCH | `app/api/artist/events/[id]/route.ts` |
| `/api/artist/events/[id]/collaborate` | POST | `app/api/artist/events/[id]/collaborate/route.ts` |
| `/api/artist/events/[id]/promote` | POST | `app/api/artist/events/[id]/promote/route.ts` |
| `/api/artist/events/[id]/publish` | POST | `app/api/artist/events/[id]/publish/route.ts` |
| `/api/artist/events/[id]/tickets` | GET, POST | `app/api/artist/events/[id]/tickets/route.ts` |
| `/api/artist/feed-stats` | GET | `app/api/artist/feed-stats/route.ts` |
| `/api/artist/music` | DELETE, GET, PATCH, POST | `app/api/artist/music/route.ts` |
| `/api/artist/music/analytics` | GET | `app/api/artist/music/analytics/route.ts` |
| `/api/artist/music/catalog-imports` | GET, POST | `app/api/artist/music/catalog-imports/route.ts` |
| `/api/artist/music/certification` | GET, POST | `app/api/artist/music/certification/route.ts` |
| `/api/artist/music/certification/[caseId]` | PATCH | `app/api/artist/music/certification/[caseId]/route.ts` |
| `/api/artist/music/certification/[caseId]/events` | GET | `app/api/artist/music/certification/[caseId]/events/route.ts` |
| `/api/artist/music/certification/[caseId]/evidence` | POST | `app/api/artist/music/certification/[caseId]/evidence/route.ts` |
| `/api/artist/music/finance/collectibles` | GET, POST | `app/api/artist/music/finance/collectibles/route.ts` |
| `/api/artist/music/generate-preview` | POST | `app/api/artist/music/generate-preview/route.ts` |
| `/api/artist/music/payouts/batches` | PATCH, POST | `app/api/artist/music/payouts/batches/route.ts` |
| `/api/artist/music/payouts/onboarding` | GET, POST | `app/api/artist/music/payouts/onboarding/route.ts` |
| `/api/artist/music/payouts/status` | GET | `app/api/artist/music/payouts/status/route.ts` |
| `/api/artist/music/pin` | POST | `app/api/artist/music/pin/route.ts` |
| `/api/artist/music/preview-jobs` | POST | `app/api/artist/music/preview-jobs/route.ts` |
| `/api/artist/music/rights/agreements` | GET, POST | `app/api/artist/music/rights/agreements/route.ts` |
| `/api/artist/music/rights/claims` | GET, POST | `app/api/artist/music/rights/claims/route.ts` |
| `/api/artist/music/rights/contributions` | GET, POST | `app/api/artist/music/rights/contributions/route.ts` |
| `/api/artist/music/rights/evidence` | GET, POST | `app/api/artist/music/rights/evidence/route.ts` |
| `/api/artist/music/rights/invitations` | GET, PATCH, POST | `app/api/artist/music/rights/invitations/route.ts` |
| `/api/artist/music/rights/parties` | GET, POST | `app/api/artist/music/rights/parties/route.ts` |
| `/api/artist/music/rights/passports` | GET, POST | `app/api/artist/music/rights/passports/route.ts` |
| `/api/artist/music/rights/projects` | GET, POST | `app/api/artist/music/rights/projects/route.ts` |
| `/api/artist/music/rights/protected-derivatives` | GET, POST | `app/api/artist/music/rights/protected-derivatives/route.ts` |
| `/api/artist/music/rights/recordings` | GET, PATCH, POST | `app/api/artist/music/rights/recordings/route.ts` |
| `/api/artist/music/rights/signatures` | GET, PATCH, POST | `app/api/artist/music/rights/signatures/route.ts` |
| `/api/artist/music/rights/works` | GET, POST | `app/api/artist/music/rights/works/route.ts` |
| `/api/artist/music/royalties/allocations` | POST | `app/api/artist/music/royalties/allocations/route.ts` |
| `/api/artist/music/royalties/imports` | GET, POST | `app/api/artist/music/royalties/imports/route.ts` |
| `/api/artist/music/royalties/imports/[id]` | GET | `app/api/artist/music/royalties/imports/[id]/route.ts` |
| `/api/artist/music/royalties/matches` | GET, POST | `app/api/artist/music/royalties/matches/route.ts` |
| `/api/artist/music/royalties/statements` | GET, POST | `app/api/artist/music/royalties/statements/route.ts` |
| `/api/artist/music/upload-url` | POST | `app/api/artist/music/upload-url/route.ts` |
| `/api/artist/music/valuation` | GET, POST | `app/api/artist/music/valuation/route.ts` |
| `/api/artist/public-appearance` | GET, PUT | `app/api/artist/public-appearance/route.ts` |
| `/api/artists` | GET, POST | `app/api/artists/route.ts` |
| `/api/artists/[id]/music` | GET | `app/api/artists/[id]/music/route.ts` |
| `/api/artists/delete` | DELETE | `app/api/artists/delete/route.ts` |
| `/api/assets` | GET, POST | `app/api/assets/route.ts` |
| `/api/auth-debug` | GET | `app/api/auth-debug/route.ts` |
| `/api/auth/check-username` | GET | `app/api/auth/check-username/route.ts` |
| `/api/auth/session` | GET | `app/api/auth/session/route.ts` |
| `/api/auth/signup` | POST | `app/api/auth/signup/route.ts` |
| `/api/badges` | GET, PATCH, POST | `app/api/badges/route.ts` |
| `/api/booking-requests` | GET, PATCH, POST | `app/api/booking-requests/route.ts` |
| `/api/booking-requests/[id]` | GET | `app/api/booking-requests/[id]/route.ts` |
| `/api/booking-requests/[id]/decision` | PATCH | `app/api/booking-requests/[id]/decision/route.ts` |
| `/api/booking-requests/[id]/details` | PATCH | `app/api/booking-requests/[id]/details/route.ts` |
| `/api/booking-requests/[id]/messages` | GET, POST | `app/api/booking-requests/[id]/messages/route.ts` |
| `/api/business/settings` | GET, PATCH, PUT | `app/api/business/settings/route.ts` |
| `/api/calendar/events` | GET | `app/api/calendar/events/route.ts` |
| `/api/calendar/events/[id]` | GET | `app/api/calendar/events/[id]/route.ts` |
| `/api/calendar/me` | GET | `app/api/calendar/me/route.ts` |
| `/api/calendar/org/[orgId]` | GET | `app/api/calendar/org/[orgId]/route.ts` |
| `/api/calendar/tours` | GET | `app/api/calendar/tours/route.ts` |
| `/api/calendar/tours/[id]` | GET | `app/api/calendar/tours/[id]/route.ts` |
| `/api/community/activity` | GET | `app/api/community/activity/route.ts` |
| `/api/community/stats` | GET | `app/api/community/stats/route.ts` |
| `/api/connect/sessions` | POST | `app/api/connect/sessions/route.ts` |
| `/api/connect/sessions/claim` | POST | `app/api/connect/sessions/claim/route.ts` |
| `/api/connect/sessions/confirm` | POST | `app/api/connect/sessions/confirm/route.ts` |
| `/api/connect/telemetry` | POST | `app/api/connect/telemetry/route.ts` |
| `/api/connect/telemetry/summary` | GET | `app/api/connect/telemetry/summary/route.ts` |
| `/api/creator-cooperative/benefits` | GET, POST | `app/api/creator-cooperative/benefits/route.ts` |
| `/api/creator-cooperative/collective` | GET, POST | `app/api/creator-cooperative/collective/route.ts` |
| `/api/creator-cooperative/contributions` | DELETE, GET, POST | `app/api/creator-cooperative/contributions/route.ts` |
| `/api/creator-cooperative/cross-border` | POST | `app/api/creator-cooperative/cross-border/route.ts` |
| `/api/creator-cooperative/entities` | GET | `app/api/creator-cooperative/entities/route.ts` |
| `/api/creator-cooperative/membership` | DELETE, GET, POST | `app/api/creator-cooperative/membership/route.ts` |
| `/api/creator-cooperative/policy` | GET, POST | `app/api/creator-cooperative/policy/route.ts` |
| `/api/creator-cooperative/research` | GET, POST | `app/api/creator-cooperative/research/route.ts` |
| `/api/creator-cooperative/standards` | GET | `app/api/creator-cooperative/standards/route.ts` |
| `/api/creator-cooperative/vault` | GET | `app/api/creator-cooperative/vault/route.ts` |
| `/api/creator-digital-commons/assets` | GET, POST | `app/api/creator-digital-commons/assets/route.ts` |
| `/api/creator-digital-commons/gated` | GET, POST | `app/api/creator-digital-commons/gated/route.ts` |
| `/api/creator-digital-commons/governance` | GET | `app/api/creator-digital-commons/governance/route.ts` |
| `/api/creator-digital-commons/operators` | GET | `app/api/creator-digital-commons/operators/route.ts` |
| `/api/creator-digital-commons/participation` | DELETE, GET, POST | `app/api/creator-digital-commons/participation/route.ts` |
| `/api/creator-digital-commons/protocols` | GET | `app/api/creator-digital-commons/protocols/route.ts` |
| `/api/creator-digital-commons/registry` | GET | `app/api/creator-digital-commons/registry/route.ts` |
| `/api/creator-digital-commons/stewards` | GET | `app/api/creator-digital-commons/stewards/route.ts` |
| `/api/creator-digital-commons/transition` | GET, POST | `app/api/creator-digital-commons/transition/route.ts` |
| `/api/creator-federation/collective` | GET, POST | `app/api/creator-federation/collective/route.ts` |
| `/api/creator-federation/credentials` | DELETE, GET, POST | `app/api/creator-federation/credentials/route.ts` |
| `/api/creator-federation/directory` | GET, POST | `app/api/creator-federation/directory/route.ts` |
| `/api/creator-federation/entities` | GET | `app/api/creator-federation/entities/route.ts` |
| `/api/creator-federation/finance` | GET, POST | `app/api/creator-federation/finance/route.ts` |
| `/api/creator-federation/governance` | GET, POST | `app/api/creator-federation/governance/route.ts` |
| `/api/creator-federation/mandates` | DELETE, GET, POST | `app/api/creator-federation/mandates/route.ts` |
| `/api/creator-federation/membership` | DELETE, GET, POST | `app/api/creator-federation/membership/route.ts` |
| `/api/creator-federation/sovereignty` | POST | `app/api/creator-federation/sovereignty/route.ts` |
| `/api/creator-federation/transfers` | GET, POST | `app/api/creator-federation/transfers/route.ts` |
| `/api/creator-interoperability-convention/approval-packages` | GET, POST | `app/api/creator-interoperability-convention/approval-packages/route.ts` |
| `/api/creator-interoperability-convention/gated` | GET, POST | `app/api/creator-interoperability-convention/gated/route.ts` |
| `/api/creator-interoperability-convention/networks` | GET | `app/api/creator-interoperability-convention/networks/route.ts` |
| `/api/creator-interoperability-convention/recognition` | GET, POST | `app/api/creator-interoperability-convention/recognition/route.ts` |
| `/api/creator-interoperability-convention/status` | GET | `app/api/creator-interoperability-convention/status/route.ts` |
| `/api/creator-interoperability-institution/gated` | GET, POST | `app/api/creator-interoperability-institution/gated/route.ts` |
| `/api/creator-interoperability-institution/participants` | GET, POST | `app/api/creator-interoperability-institution/participants/route.ts` |
| `/api/creator-interoperability-institution/readiness-packages` | GET, POST | `app/api/creator-interoperability-institution/readiness-packages/route.ts` |
| `/api/creator-interoperability-institution/services` | GET, POST | `app/api/creator-interoperability-institution/services/route.ts` |
| `/api/creator-interoperability-institution/status` | GET | `app/api/creator-interoperability-institution/status/route.ts` |
| `/api/creator-interoperability-organization/feasibility-packages` | GET, POST | `app/api/creator-interoperability-organization/feasibility-packages/route.ts` |
| `/api/creator-interoperability-organization/gated` | GET, POST | `app/api/creator-interoperability-organization/gated/route.ts` |
| `/api/creator-interoperability-organization/instruments` | GET, POST | `app/api/creator-interoperability-organization/instruments/route.ts` |
| `/api/creator-interoperability-organization/participant-authority` | GET, POST | `app/api/creator-interoperability-organization/participant-authority/route.ts` |
| `/api/creator-interoperability-organization/status` | GET | `app/api/creator-interoperability-organization/status/route.ts` |
| `/api/creator-multilateral-treaty-operations/gated` | GET, POST | `app/api/creator-multilateral-treaty-operations/gated/route.ts` |
| `/api/creator-multilateral-treaty-operations/readiness-packages` | GET, POST | `app/api/creator-multilateral-treaty-operations/readiness-packages/route.ts` |
| `/api/creator-multilateral-treaty-operations/review-cycles` | GET, POST | `app/api/creator-multilateral-treaty-operations/review-cycles/route.ts` |
| `/api/creator-multilateral-treaty-operations/status` | GET | `app/api/creator-multilateral-treaty-operations/status/route.ts` |
| `/api/creator-protocol-constitution/amendments` | GET, POST | `app/api/creator-protocol-constitution/amendments/route.ts` |
| `/api/creator-protocol-constitution/assets` | GET, POST | `app/api/creator-protocol-constitution/assets/route.ts` |
| `/api/creator-protocol-constitution/constitutions` | GET | `app/api/creator-protocol-constitution/constitutions/route.ts` |
| `/api/creator-protocol-constitution/gated` | GET, POST | `app/api/creator-protocol-constitution/gated/route.ts` |
| `/api/creator-protocol-constitution/governance` | GET | `app/api/creator-protocol-constitution/governance/route.ts` |
| `/api/creator-protocol-constitution/membership` | DELETE, GET, POST | `app/api/creator-protocol-constitution/membership/route.ts` |
| `/api/creator-protocol-constitution/operators` | GET | `app/api/creator-protocol-constitution/operators/route.ts` |
| `/api/creator-protocol-constitution/review` | GET, POST | `app/api/creator-protocol-constitution/review/route.ts` |
| `/api/creator-protocol-constitution/sovereignty` | GET, POST | `app/api/creator-protocol-constitution/sovereignty/route.ts` |
| `/api/creator-protocol-constitution/succession` | GET, POST | `app/api/creator-protocol-constitution/succession/route.ts` |
| `/api/creator-public-infrastructure/conformance` | GET, POST | `app/api/creator-public-infrastructure/conformance/route.ts` |
| `/api/creator-public-infrastructure/credentials` | GET | `app/api/creator-public-infrastructure/credentials/route.ts` |
| `/api/creator-public-infrastructure/directory` | GET | `app/api/creator-public-infrastructure/directory/route.ts` |
| `/api/creator-public-infrastructure/entities` | GET | `app/api/creator-public-infrastructure/entities/route.ts` |
| `/api/creator-public-infrastructure/gated` | GET, POST | `app/api/creator-public-infrastructure/gated/route.ts` |
| `/api/creator-public-infrastructure/governance` | GET | `app/api/creator-public-infrastructure/governance/route.ts` |
| `/api/creator-public-infrastructure/identifiers` | GET, POST | `app/api/creator-public-infrastructure/identifiers/route.ts` |
| `/api/creator-public-infrastructure/participation` | DELETE, GET, POST | `app/api/creator-public-infrastructure/participation/route.ts` |
| `/api/creator-public-infrastructure/rights-resolver` | GET, POST | `app/api/creator-public-infrastructure/rights-resolver/route.ts` |
| `/api/creator-public-infrastructure/trust` | GET | `app/api/creator-public-infrastructure/trust/route.ts` |
| `/api/creator-treaty-system-legacy/custody` | GET, POST | `app/api/creator-treaty-system-legacy/custody/route.ts` |
| `/api/creator-treaty-system-legacy/ethics` | GET, POST | `app/api/creator-treaty-system-legacy/ethics/route.ts` |
| `/api/creator-treaty-system-legacy/gated` | GET, POST | `app/api/creator-treaty-system-legacy/gated/route.ts` |
| `/api/creator-treaty-system-legacy/identifiers` | GET, POST | `app/api/creator-treaty-system-legacy/identifiers/route.ts` |
| `/api/creator-treaty-system-legacy/readiness-packages` | GET, POST | `app/api/creator-treaty-system-legacy/readiness-packages/route.ts` |
| `/api/creator-treaty-system-legacy/status` | GET | `app/api/creator-treaty-system-legacy/status/route.ts` |
| `/api/creator-treaty-system-renewal/archives` | GET, POST | `app/api/creator-treaty-system-renewal/archives/route.ts` |
| `/api/creator-treaty-system-renewal/gated` | GET, POST | `app/api/creator-treaty-system-renewal/gated/route.ts` |
| `/api/creator-treaty-system-renewal/readiness-packages` | GET, POST | `app/api/creator-treaty-system-renewal/readiness-packages/route.ts` |
| `/api/creator-treaty-system-renewal/status` | GET | `app/api/creator-treaty-system-renewal/status/route.ts` |
| `/api/creator-treaty-system-renewal/sunset` | GET, POST | `app/api/creator-treaty-system-renewal/sunset/route.ts` |
| `/api/cron/admin-publication-outbox` | GET, POST | `app/api/cron/admin-publication-outbox/route.ts` |
| `/api/cron/contract-sign-reminders` | GET, POST | `app/api/cron/contract-sign-reminders/route.ts` |
| `/api/cron/event-reminders` | GET, POST | `app/api/cron/event-reminders/route.ts` |
| `/api/cron/events/sync` | POST | `app/api/cron/events/sync/route.ts` |
| `/api/cron/social-analytics` | GET, POST | `app/api/cron/social-analytics/route.ts` |
| `/api/cron/staffing-overview-refresh` | GET, POST | `app/api/cron/staffing-overview-refresh/route.ts` |
| `/api/cron/ticket-invite-expiry` | GET, POST | `app/api/cron/ticket-invite-expiry/route.ts` |
| `/api/cron/workflow-automations` | GET | `app/api/cron/workflow-automations/route.ts` |
| `/api/dashboard/action-center` | GET | `app/api/dashboard/action-center/route.ts` |
| `/api/dashboard/metrics` | POST | `app/api/dashboard/metrics/route.ts` |
| `/api/debug` | GET | `app/api/debug/route.ts` |
| `/api/debug-auth` | GET | `app/api/debug-auth/route.ts` |
| `/api/debug/check-artist-profile` | GET | `app/api/debug/check-artist-profile/route.ts` |
| `/api/debug/db-schema` | GET | `app/api/debug/db-schema/route.ts` |
| `/api/debug/fix-profile` | POST | `app/api/debug/fix-profile/route.ts` |
| `/api/debug/profile-check` | GET | `app/api/debug/profile-check/route.ts` |
| `/api/debug/profiles` | GET | `app/api/debug/profiles/route.ts` |
| `/api/debug/tables` | GET | `app/api/debug/tables/route.ts` |
| `/api/debug/test-direct-query` | GET | `app/api/debug/test-direct-query/route.ts` |
| `/api/discover` | GET | `app/api/discover/route.ts` |
| `/api/employer/vetting/[applicationId]` | GET | `app/api/employer/vetting/[applicationId]/route.ts` |
| `/api/endorsements` | DELETE, GET, POST, PUT | `app/api/endorsements/route.ts` |
| `/api/epk/telemetry` | POST | `app/api/epk/telemetry/route.ts` |
| `/api/events` | GET, POST | `app/api/events/route.ts` |
| `/api/events/[id]` | DELETE, GET, PATCH | `app/api/events/[id]/route.ts` |
| `/api/events/[id]/attendance` | DELETE, GET, POST | `app/api/events/[id]/attendance/route.ts` |
| `/api/events/[id]/claim` | POST | `app/api/events/[id]/claim/route.ts` |
| `/api/events/[id]/finances` | GET | `app/api/events/[id]/finances/route.ts` |
| `/api/events/[id]/group-chats` | GET | `app/api/events/[id]/group-chats/route.ts` |
| `/api/events/[id]/group-chats/[chatId]/messages` | GET, POST | `app/api/events/[id]/group-chats/[chatId]/messages/route.ts` |
| `/api/events/[id]/guestlist` | GET, PATCH, POST | `app/api/events/[id]/guestlist/route.ts` |
| `/api/events/[id]/hq` | GET | `app/api/events/[id]/hq/route.ts` |
| `/api/events/[id]/hq/calendar` | DELETE, POST | `app/api/events/[id]/hq/calendar/route.ts` |
| `/api/events/[id]/hq/permissions` | PATCH | `app/api/events/[id]/hq/permissions/route.ts` |
| `/api/events/[id]/hq/resources` | DELETE, POST | `app/api/events/[id]/hq/resources/route.ts` |
| `/api/events/[id]/incidents` | GET, POST | `app/api/events/[id]/incidents/route.ts` |
| `/api/events/[id]/job-postings` | POST | `app/api/events/[id]/job-postings/route.ts` |
| `/api/events/[id]/jobs` | GET, POST | `app/api/events/[id]/jobs/route.ts` |
| `/api/events/[id]/locations` | DELETE, GET, POST | `app/api/events/[id]/locations/route.ts` |
| `/api/events/[id]/page` | GET | `app/api/events/[id]/page/route.ts` |
| `/api/events/[id]/participants` | DELETE, GET, POST | `app/api/events/[id]/participants/route.ts` |
| `/api/events/[id]/posts` | GET, POST | `app/api/events/[id]/posts/route.ts` |
| `/api/events/[id]/share-message` | POST | `app/api/events/[id]/share-message/route.ts` |
| `/api/events/[id]/staff` | GET, POST | `app/api/events/[id]/staff/route.ts` |
| `/api/events/[id]/staff/[shiftId]` | DELETE, PATCH | `app/api/events/[id]/staff/[shiftId]/route.ts` |
| `/api/events/[id]/staff/invites` | POST | `app/api/events/[id]/staff/invites/route.ts` |
| `/api/events/[id]/tasks` | GET, POST | `app/api/events/[id]/tasks/route.ts` |
| `/api/events/[id]/tasks/[taskId]` | DELETE, PATCH | `app/api/events/[id]/tasks/[taskId]/route.ts` |
| `/api/events/[id]/tour` | POST | `app/api/events/[id]/tour/route.ts` |
| `/api/events/[id]/vendors` | GET, POST | `app/api/events/[id]/vendors/route.ts` |
| `/api/events/[id]/vendors/[vendorId]` | DELETE, PATCH | `app/api/events/[id]/vendors/[vendorId]/route.ts` |
| `/api/events/discover` | GET | `app/api/events/discover/route.ts` |
| `/api/events/me/attending` | GET | `app/api/events/me/attending/route.ts` |
| `/api/events/planner` | GET, POST | `app/api/events/planner/route.ts` |
| `/api/events/planner/publish` | POST | `app/api/events/planner/publish/route.ts` |
| `/api/events/search` | GET | `app/api/events/search/route.ts` |
| `/api/feed/blogs` | GET | `app/api/feed/blogs/route.ts` |
| `/api/feed/collaborations/pending` | GET | `app/api/feed/collaborations/pending/route.ts` |
| `/api/feed/for-you` | GET | `app/api/feed/for-you/route.ts` |
| `/api/feed/music` | GET | `app/api/feed/music/route.ts` |
| `/api/feed/posts` | GET, POST | `app/api/feed/posts/route.ts` |
| `/api/feed/posts/[id]/collaborators` | GET, PATCH | `app/api/feed/posts/[id]/collaborators/route.ts` |
| `/api/feed/rss-news` | GET | `app/api/feed/rss-news/route.ts` |
| `/api/feed/videos` | GET | `app/api/feed/videos/route.ts` |
| `/api/follow` | GET, POST | `app/api/follow/route.ts` |
| `/api/forums` | GET | `app/api/forums/route.ts` |
| `/api/forums/[slug]` | GET | `app/api/forums/[slug]/route.ts` |
| `/api/forums/[slug]/subscribe` | DELETE, POST | `app/api/forums/[slug]/subscribe/route.ts` |
| `/api/forums/[slug]/tags` | GET | `app/api/forums/[slug]/tags/route.ts` |
| `/api/forums/[slug]/threads` | GET, POST | `app/api/forums/[slug]/threads/route.ts` |
| `/api/forums/comments/[id]/vote` | DELETE, POST | `app/api/forums/comments/[id]/vote/route.ts` |
| `/api/forums/threads/[id]/comments` | GET, POST | `app/api/forums/threads/[id]/comments/route.ts` |
| `/api/forums/threads/[id]/vote` | DELETE, POST | `app/api/forums/threads/[id]/vote/route.ts` |
| `/api/groups/threads` | GET, POST | `app/api/groups/threads/route.ts` |
| `/api/groups/threads/[id]` | DELETE, GET, PATCH | `app/api/groups/threads/[id]/route.ts` |
| `/api/groups/threads/[id]/members` | DELETE, PATCH, POST | `app/api/groups/threads/[id]/members/route.ts` |
| `/api/groups/threads/[id]/messages` | GET, POST | `app/api/groups/threads/[id]/messages/route.ts` |
| `/api/groups/threads/[id]/messages/[messageId]/reactions` | POST | `app/api/groups/threads/[id]/messages/[messageId]/reactions/route.ts` |
| `/api/health` | GET, HEAD | `app/api/health/route.ts` |
| `/api/hiring/applications` | GET, POST | `app/api/hiring/applications/route.ts` |
| `/api/hiring/applications/[id]` | PATCH | `app/api/hiring/applications/[id]/route.ts` |
| `/api/hiring/applications/[id]/star` | PATCH | `app/api/hiring/applications/[id]/star/route.ts` |
| `/api/hiring/applications/document` | GET | `app/api/hiring/applications/document/route.ts` |
| `/api/hiring/applications/upload` | POST | `app/api/hiring/applications/upload/route.ts` |
| `/api/hiring/apply/profile-preview` | GET | `app/api/hiring/apply/profile-preview/route.ts` |
| `/api/hiring/candidates/[id]/approve` | POST | `app/api/hiring/candidates/[id]/approve/route.ts` |
| `/api/hiring/candidates/[id]/assignment` | PATCH | `app/api/hiring/candidates/[id]/assignment/route.ts` |
| `/api/hiring/candidates/[id]/onboarding` | PATCH | `app/api/hiring/candidates/[id]/onboarding/route.ts` |
| `/api/hiring/dashboard` | GET | `app/api/hiring/dashboard/route.ts` |
| `/api/hiring/invite` | POST | `app/api/hiring/invite/route.ts` |
| `/api/hiring/job-postings` | GET, POST | `app/api/hiring/job-postings/route.ts` |
| `/api/hiring/job-postings/[id]` | DELETE, GET, PATCH | `app/api/hiring/job-postings/[id]/route.ts` |
| `/api/hiring/job-postings/[id]/repost` | POST | `app/api/hiring/job-postings/[id]/repost/route.ts` |
| `/api/hiring/job-postings/options` | GET | `app/api/hiring/job-postings/options/route.ts` |
| `/api/hiring/onboarding/compliance/[candidateId]` | GET | `app/api/hiring/onboarding/compliance/[candidateId]/route.ts` |
| `/api/hiring/onboarding/sensitive/[candidateId]` | GET | `app/api/hiring/onboarding/sensitive/[candidateId]/route.ts` |
| `/api/hiring/onboarding/upload` | POST | `app/api/hiring/onboarding/upload/route.ts` |
| `/api/hiring/roster` | GET, POST | `app/api/hiring/roster/route.ts` |
| `/api/hiring/roster/[memberId]` | GET, PATCH | `app/api/hiring/roster/[memberId]/route.ts` |
| `/api/hiring/roster/[memberId]/assignment` | POST | `app/api/hiring/roster/[memberId]/assignment/route.ts` |
| `/api/hiring/roster/export` | GET | `app/api/hiring/roster/export/route.ts` |
| `/api/hub` | GET | `app/api/hub/route.ts` |
| `/api/institutional/auctions` | POST | `app/api/institutional/auctions/route.ts` |
| `/api/institutional/bids` | POST | `app/api/institutional/bids/route.ts` |
| `/api/institutional/classifications` | POST | `app/api/institutional/classifications/route.ts` |
| `/api/institutional/data-rooms` | POST | `app/api/institutional/data-rooms/route.ts` |
| `/api/institutional/diligence` | POST | `app/api/institutional/diligence/route.ts` |
| `/api/institutional/funds` | GET, POST | `app/api/institutional/funds/route.ts` |
| `/api/institutional/iois` | POST | `app/api/institutional/iois/route.ts` |
| `/api/institutional/nav` | POST | `app/api/institutional/nav/route.ts` |
| `/api/institutional/opportunities` | GET, POST | `app/api/institutional/opportunities/route.ts` |
| `/api/institutional/organizations` | GET, POST | `app/api/institutional/organizations/route.ts` |
| `/api/institutional/partners/webhooks/[provider]` | POST | `app/api/institutional/partners/webhooks/[provider]/route.ts` |
| `/api/institutional/portfolio` | GET | `app/api/institutional/portfolio/route.ts` |
| `/api/institutional/reports` | POST | `app/api/institutional/reports/route.ts` |
| `/api/institutional/transactions` | POST | `app/api/institutional/transactions/route.ts` |
| `/api/institutional/underwriting` | POST | `app/api/institutional/underwriting/route.ts` |
| `/api/integrations/bandsintown/connect` | POST | `app/api/integrations/bandsintown/connect/route.ts` |
| `/api/integrations/bandsintown/disconnect` | POST | `app/api/integrations/bandsintown/disconnect/route.ts` |
| `/api/integrations/bandsintown/status` | GET | `app/api/integrations/bandsintown/status/route.ts` |
| `/api/invitations` | GET, PATCH, POST | `app/api/invitations/route.ts` |
| `/api/job-applications` | GET, POST | `app/api/job-applications/route.ts` |
| `/api/job-board` | GET | `app/api/job-board/route.ts` |
| `/api/job-postings/[id]` | GET | `app/api/job-postings/[id]/route.ts` |
| `/api/jobs` | GET, POST | `app/api/jobs/route.ts` |
| `/api/jukebox/following-tracks` | GET | `app/api/jukebox/following-tracks/route.ts` |
| `/api/licensing/agreements` | GET, POST | `app/api/licensing/agreements/route.ts` |
| `/api/licensing/approvals` | GET, POST | `app/api/licensing/approvals/route.ts` |
| `/api/licensing/availability` | GET, POST | `app/api/licensing/availability/route.ts` |
| `/api/licensing/briefs` | GET, POST | `app/api/licensing/briefs/route.ts` |
| `/api/licensing/cue-sheets` | GET, POST | `app/api/licensing/cue-sheets/route.ts` |
| `/api/licensing/deliveries` | GET, POST | `app/api/licensing/deliveries/route.ts` |
| `/api/licensing/discovery` | GET, POST | `app/api/licensing/discovery/route.ts` |
| `/api/licensing/invoices` | GET, POST | `app/api/licensing/invoices/route.ts` |
| `/api/licensing/partners/webhooks/[provider]` | POST | `app/api/licensing/partners/webhooks/[provider]/route.ts` |
| `/api/licensing/projects` | GET, POST | `app/api/licensing/projects/route.ts` |
| `/api/licensing/quotes` | GET, POST | `app/api/licensing/quotes/route.ts` |
| `/api/licensing/requests` | GET, POST | `app/api/licensing/requests/route.ts` |
| `/api/licensing/usage` | GET, POST | `app/api/licensing/usage/route.ts` |
| `/api/link-preview` | POST | `app/api/link-preview/route.ts` |
| `/api/locations` | POST | `app/api/locations/route.ts` |
| `/api/marketplace/admin/fee-rules` | GET, PATCH, POST | `app/api/marketplace/admin/fee-rules/route.ts` |
| `/api/marketplace/admin/moderation` | GET, POST | `app/api/marketplace/admin/moderation/route.ts` |
| `/api/marketplace/admin/overview` | GET | `app/api/marketplace/admin/overview/route.ts` |
| `/api/marketplace/admin/webhook-events` | GET, POST | `app/api/marketplace/admin/webhook-events/route.ts` |
| `/api/marketplace/analytics` | GET | `app/api/marketplace/analytics/route.ts` |
| `/api/marketplace/checkout` | POST | `app/api/marketplace/checkout/route.ts` |
| `/api/marketplace/delivery/[orderItemId]` | GET | `app/api/marketplace/delivery/[orderItemId]/route.ts` |
| `/api/marketplace/discover` | GET | `app/api/marketplace/discover/route.ts` |
| `/api/marketplace/integrations` | GET | `app/api/marketplace/integrations/route.ts` |
| `/api/marketplace/integrations/printful` | DELETE, GET, POST | `app/api/marketplace/integrations/printful/route.ts` |
| `/api/marketplace/integrations/printful/webhook` | POST | `app/api/marketplace/integrations/printful/webhook/route.ts` |
| `/api/marketplace/integrations/shopify` | DELETE, GET, POST | `app/api/marketplace/integrations/shopify/route.ts` |
| `/api/marketplace/integrations/shopify/callback` | GET | `app/api/marketplace/integrations/shopify/callback/route.ts` |
| `/api/marketplace/integrations/shopify/webhook` | POST | `app/api/marketplace/integrations/shopify/webhook/route.ts` |
| `/api/marketplace/listings` | GET, POST | `app/api/marketplace/listings/route.ts` |
| `/api/marketplace/listings/[id]` | DELETE, GET, PATCH | `app/api/marketplace/listings/[id]/route.ts` |
| `/api/marketplace/listings/[id]/lifecycle` | POST | `app/api/marketplace/listings/[id]/lifecycle/route.ts` |
| `/api/marketplace/listings/[id]/redirect` | GET | `app/api/marketplace/listings/[id]/redirect/route.ts` |
| `/api/marketplace/listings/import-external` | POST, PUT | `app/api/marketplace/listings/import-external/route.ts` |
| `/api/marketplace/migrations/backfill-artist-merch` | GET, POST | `app/api/marketplace/migrations/backfill-artist-merch/route.ts` |
| `/api/marketplace/migrations/backfill-artist-music` | GET, POST | `app/api/marketplace/migrations/backfill-artist-music/route.ts` |
| `/api/marketplace/moderation` | POST | `app/api/marketplace/moderation/route.ts` |
| `/api/marketplace/order/[token]` | GET | `app/api/marketplace/order/[token]/route.ts` |
| `/api/marketplace/order/[token]/claim` | POST | `app/api/marketplace/order/[token]/claim/route.ts` |
| `/api/marketplace/orders` | GET | `app/api/marketplace/orders/route.ts` |
| `/api/marketplace/orders/[id]/cancel` | POST | `app/api/marketplace/orders/[id]/cancel/route.ts` |
| `/api/marketplace/orders/[id]/refund` | POST | `app/api/marketplace/orders/[id]/refund/route.ts` |
| `/api/marketplace/payouts` | GET | `app/api/marketplace/payouts/route.ts` |
| `/api/marketplace/seller-agreement` | GET, POST | `app/api/marketplace/seller-agreement/route.ts` |
| `/api/marketplace/service-offers` | POST | `app/api/marketplace/service-offers/route.ts` |
| `/api/marketplace/service-orders/[orderItemId]` | GET, PATCH, POST | `app/api/marketplace/service-orders/[orderItemId]/route.ts` |
| `/api/marketplace/service-requests` | GET, POST | `app/api/marketplace/service-requests/route.ts` |
| `/api/marketplace/service-requests/[id]` | GET | `app/api/marketplace/service-requests/[id]/route.ts` |
| `/api/marketplace/service-requests/[id]/action` | POST | `app/api/marketplace/service-requests/[id]/action/route.ts` |
| `/api/marketplace/share-to-feed` | POST | `app/api/marketplace/share-to-feed/route.ts` |
| `/api/marketplace/storefront` | GET, PUT | `app/api/marketplace/storefront/route.ts` |
| `/api/marketplace/tax/quote` | POST | `app/api/marketplace/tax/quote/route.ts` |
| `/api/marketplace/webhook` | POST | `app/api/marketplace/webhook/route.ts` |
| `/api/me/applications` | GET, PATCH | `app/api/me/applications/route.ts` |
| `/api/messages` | GET, POST | `app/api/messages/route.ts` |
| `/api/messages/[conversationId]/accept` | POST | `app/api/messages/[conversationId]/accept/route.ts` |
| `/api/messages/[conversationId]/context` | GET | `app/api/messages/[conversationId]/context/route.ts` |
| `/api/messages/[conversationId]/decline` | POST | `app/api/messages/[conversationId]/decline/route.ts` |
| `/api/messages/[conversationId]/realtime` | GET, POST | `app/api/messages/[conversationId]/realtime/route.ts` |
| `/api/messages/friends` | GET | `app/api/messages/friends/route.ts` |
| `/api/messages/unified-list` | GET | `app/api/messages/unified-list/route.ts` |
| `/api/messages/unread-count` | GET | `app/api/messages/unread-count/route.ts` |
| `/api/messages/user-search` | GET | `app/api/messages/user-search/route.ts` |
| `/api/migrations/create-onboarding` | POST | `app/api/migrations/create-onboarding/route.ts` |
| `/api/migrations/create-profiles` | POST | `app/api/migrations/create-profiles/route.ts` |
| `/api/migrations/create-tables` | POST | `app/api/migrations/create-tables/route.ts` |
| `/api/migrations/setup-policies` | POST | `app/api/migrations/setup-policies/route.ts` |
| `/api/music-marketplace/catalog-links` | POST | `app/api/music-marketplace/catalog-links/route.ts` |
| `/api/music-marketplace/disclosures` | POST | `app/api/music-marketplace/disclosures/route.ts` |
| `/api/music-marketplace/documents` | POST | `app/api/music-marketplace/documents/route.ts` |
| `/api/music-marketplace/flags` | GET | `app/api/music-marketplace/flags/route.ts` |
| `/api/music-marketplace/investor-account` | GET | `app/api/music-marketplace/investor-account/route.ts` |
| `/api/music-marketplace/issuers` | GET, POST | `app/api/music-marketplace/issuers/route.ts` |
| `/api/music-marketplace/market-data` | GET | `app/api/music-marketplace/market-data/route.ts` |
| `/api/music-marketplace/offerings` | GET, POST | `app/api/music-marketplace/offerings/route.ts` |
| `/api/music-marketplace/orders` | GET, POST | `app/api/music-marketplace/orders/route.ts` |
| `/api/music-marketplace/pathway` | POST | `app/api/music-marketplace/pathway/route.ts` |
| `/api/music-marketplace/portfolio` | GET | `app/api/music-marketplace/portfolio/route.ts` |
| `/api/music-marketplace/subscriptions` | GET, POST | `app/api/music-marketplace/subscriptions/route.ts` |
| `/api/music-marketplace/transfers` | GET, POST | `app/api/music-marketplace/transfers/route.ts` |
| `/api/music/certificate/[publicId]` | GET | `app/api/music/certificate/[publicId]/route.ts` |
| `/api/music/certificate/[publicId]/dispute` | POST | `app/api/music/certificate/[publicId]/dispute/route.ts` |
| `/api/music/comment` | GET, POST | `app/api/music/comment/route.ts` |
| `/api/music/cover` | GET | `app/api/music/cover/route.ts` |
| `/api/music/download` | GET | `app/api/music/download/route.ts` |
| `/api/music/favorites` | GET | `app/api/music/favorites/route.ts` |
| `/api/music/history` | GET | `app/api/music/history/route.ts` |
| `/api/music/import` | POST | `app/api/music/import/route.ts` |
| `/api/music/library` | GET, POST | `app/api/music/library/route.ts` |
| `/api/music/like` | GET, POST | `app/api/music/like/route.ts` |
| `/api/music/origin/[publicId]` | GET | `app/api/music/origin/[publicId]/route.ts` |
| `/api/music/play` | POST | `app/api/music/play/route.ts` |
| `/api/music/playback/resolve` | POST | `app/api/music/playback/resolve/route.ts` |
| `/api/music/playlists` | GET, POST | `app/api/music/playlists/route.ts` |
| `/api/music/playlists/[playlistId]` | DELETE, PATCH | `app/api/music/playlists/[playlistId]/route.ts` |
| `/api/music/playlists/[playlistId]/items` | DELETE, PATCH, POST | `app/api/music/playlists/[playlistId]/items/route.ts` |
| `/api/music/profile-featured-track` | GET, PATCH | `app/api/music/profile-featured-track/route.ts` |
| `/api/music/providers/audius/search` | GET | `app/api/music/providers/audius/search/route.ts` |
| `/api/music/providers/audius/stream` | POST | `app/api/music/providers/audius/stream/route.ts` |
| `/api/music/providers/audius/tracks/[trackId]` | GET | `app/api/music/providers/audius/tracks/[trackId]/route.ts` |
| `/api/music/providers/audius/trending` | GET | `app/api/music/providers/audius/trending/route.ts` |
| `/api/music/public-item` | GET | `app/api/music/public-item/route.ts` |
| `/api/music/report` | POST | `app/api/music/report/route.ts` |
| `/api/music/rights/passports/[publicId]` | GET | `app/api/music/rights/passports/[publicId]/route.ts` |
| `/api/music/rights/verify/[publicId]` | GET | `app/api/music/rights/verify/[publicId]/route.ts` |
| `/api/music/share` | POST | `app/api/music/share/route.ts` |
| `/api/music/share-message` | POST | `app/api/music/share-message/route.ts` |
| `/api/music/social-status` | POST | `app/api/music/social-status/route.ts` |
| `/api/music/stream` | GET | `app/api/music/stream/route.ts` |
| `/api/news/feed` | GET | `app/api/news/feed/route.ts` |
| `/api/notifications` | DELETE, GET, PATCH, POST | `app/api/notifications/route.ts` |
| `/api/notifications/analytics` | GET, POST | `app/api/notifications/analytics/route.ts` |
| `/api/notifications/preferences` | GET, PATCH, POST | `app/api/notifications/preferences/route.ts` |
| `/api/notifications/social` | GET, POST | `app/api/notifications/social/route.ts` |
| `/api/notifications/test` | POST | `app/api/notifications/test/route.ts` |
| `/api/onboarding-templates` | GET, POST | `app/api/onboarding-templates/route.ts` |
| `/api/onboarding-templates/[id]` | DELETE, GET, PUT | `app/api/onboarding-templates/[id]/route.ts` |
| `/api/onboarding/[token]` | GET, POST | `app/api/onboarding/[token]/route.ts` |
| `/api/onboarding/create-account` | POST | `app/api/onboarding/create-account/route.ts` |
| `/api/onboarding/submit` | POST | `app/api/onboarding/submit/route.ts` |
| `/api/onboarding/unified` | GET, POST | `app/api/onboarding/unified/route.ts` |
| `/api/onboarding/validate-invitation` | GET | `app/api/onboarding/validate-invitation/route.ts` |
| `/api/opportunities` | GET, POST | `app/api/opportunities/route.ts` |
| `/api/opportunities/sync` | POST | `app/api/opportunities/sync/route.ts` |
| `/api/organization/artist-members` | GET, PATCH, POST | `app/api/organization/artist-members/route.ts` |
| `/api/organization/tour-managers` | GET, POST | `app/api/organization/tour-managers/route.ts` |
| `/api/organizers/[slug]` | GET | `app/api/organizers/[slug]/route.ts` |
| `/api/orgs/invite/accept` | POST | `app/api/orgs/invite/accept/route.ts` |
| `/api/orgs/invite/revoke` | POST | `app/api/orgs/invite/revoke/route.ts` |
| `/api/partners/finance/offerings/[id]/orders` | POST | `app/api/partners/finance/offerings/[id]/orders/route.ts` |
| `/api/payment` | GET, POST | `app/api/payment/route.ts` |
| `/api/photos/[id]` | DELETE, GET, PATCH | `app/api/photos/[id]/route.ts` |
| `/api/photos/[id]/like` | DELETE, POST | `app/api/photos/[id]/like/route.ts` |
| `/api/photos/[id]/tags` | DELETE, GET, POST | `app/api/photos/[id]/tags/route.ts` |
| `/api/photos/albums` | GET, POST | `app/api/photos/albums/route.ts` |
| `/api/photos/albums/[id]` | DELETE, GET, PATCH | `app/api/photos/albums/[id]/route.ts` |
| `/api/photos/marketplace` | GET | `app/api/photos/marketplace/route.ts` |
| `/api/photos/purchase` | POST | `app/api/photos/purchase/route.ts` |
| `/api/photos/purchase/webhook` | POST | `app/api/photos/purchase/webhook/route.ts` |
| `/api/photos/upload` | POST | `app/api/photos/upload/route.ts` |
| `/api/planning/venues/search` | GET | `app/api/planning/venues/search/route.ts` |
| `/api/polls/analytics` | GET | `app/api/polls/analytics/route.ts` |
| `/api/portfolio/upload` | POST | `app/api/portfolio/upload/route.ts` |
| `/api/post-appearance/preview` | POST | `app/api/post-appearance/preview/route.ts` |
| `/api/post-style-profiles` | GET, POST | `app/api/post-style-profiles/route.ts` |
| `/api/post-style-profiles/[id]` | DELETE, PATCH | `app/api/post-style-profiles/[id]/route.ts` |
| `/api/post-style-profiles/[id]/default` | POST | `app/api/post-style-profiles/[id]/default/route.ts` |
| `/api/post-styles/bootstrap` | GET | `app/api/post-styles/bootstrap/route.ts` |
| `/api/posts` | POST | `app/api/posts/route.ts` |
| `/api/posts/[id]` | DELETE | `app/api/posts/[id]/route.ts` |
| `/api/posts/[id]/comments` | GET, POST | `app/api/posts/[id]/comments/route.ts` |
| `/api/posts/[id]/likes` | GET, POST | `app/api/posts/[id]/likes/route.ts` |
| `/api/posts/[id]/poll/vote` | GET, POST | `app/api/posts/[id]/poll/vote/route.ts` |
| `/api/posts/[id]/shares` | POST | `app/api/posts/[id]/shares/route.ts` |
| `/api/posts/create` | POST | `app/api/posts/create/route.ts` |
| `/api/posts/pin` | POST | `app/api/posts/pin/route.ts` |
| `/api/posts/share` | POST | `app/api/posts/share/route.ts` |
| `/api/posts/user/[userId]` | GET | `app/api/posts/user/[userId]/route.ts` |
| `/api/press/releases/[id]` | GET | `app/api/press/releases/[id]/route.ts` |
| `/api/press/releases/[id]/pdf` | GET | `app/api/press/releases/[id]/pdf/route.ts` |
| `/api/press/releases/[id]/share` | POST | `app/api/press/releases/[id]/share/route.ts` |
| `/api/profile` | PATCH | `app/api/profile/route.ts` |
| `/api/profile/[username]` | GET | `app/api/profile/[username]/route.ts` |
| `/api/profile/[username]/recognition` | GET | `app/api/profile/[username]/recognition/route.ts` |
| `/api/profile/avatar` | DELETE, POST | `app/api/profile/avatar/route.ts` |
| `/api/profile/check-url` | GET | `app/api/profile/check-url/route.ts` |
| `/api/profile/check-username` | GET | `app/api/profile/check-username/route.ts` |
| `/api/profile/colors` | DELETE, GET, PUT | `app/api/profile/colors/route.ts` |
| `/api/profile/create` | POST | `app/api/profile/create/route.ts` |
| `/api/profile/current` | GET | `app/api/profile/current/route.ts` |
| `/api/profile/current/posts` | GET | `app/api/profile/current/posts/route.ts` |
| `/api/profile/custom-design` | GET, POST | `app/api/profile/custom-design/route.ts` |
| `/api/profile/update` | PUT | `app/api/profile/update/route.ts` |
| `/api/profile/update-appearance` | PUT | `app/api/profile/update-appearance/route.ts` |
| `/api/profile/update-optimized` | PUT | `app/api/profile/update-optimized/route.ts` |
| `/api/profile/username-available` | GET | `app/api/profile/username-available/route.ts` |
| `/api/promotions` | POST | `app/api/promotions/route.ts` |
| `/api/publication/shared/[token]` | GET, POST | `app/api/publication/shared/[token]/route.ts` |
| `/api/pulse/articles` | GET, POST | `app/api/pulse/articles/route.ts` |
| `/api/pulse/articles/[id]` | DELETE, GET, PATCH | `app/api/pulse/articles/[id]/route.ts` |
| `/api/pulse/articles/[id]/engage` | POST | `app/api/pulse/articles/[id]/engage/route.ts` |
| `/api/rights-admin/cases` | GET, POST | `app/api/rights-admin/cases/route.ts` |
| `/api/rights-admin/claims` | GET, POST | `app/api/rights-admin/claims/route.ts` |
| `/api/rights-admin/deadlines` | GET | `app/api/rights-admin/deadlines/route.ts` |
| `/api/rights-admin/disputes` | GET, POST | `app/api/rights-admin/disputes/route.ts` |
| `/api/rights-admin/dmca` | GET, POST | `app/api/rights-admin/dmca/route.ts` |
| `/api/rights-admin/mandates` | GET, POST | `app/api/rights-admin/mandates/route.ts` |
| `/api/rights-admin/matches` | POST | `app/api/rights-admin/matches/route.ts` |
| `/api/rights-admin/observations` | GET, POST | `app/api/rights-admin/observations/route.ts` |
| `/api/rights-admin/partners/webhooks/[provider]` | POST | `app/api/rights-admin/partners/webhooks/[provider]/route.ts` |
| `/api/rights-admin/platform-policies` | GET, POST | `app/api/rights-admin/platform-policies/route.ts` |
| `/api/rights-admin/registrations` | GET, POST | `app/api/rights-admin/registrations/route.ts` |
| `/api/rights-admin/settlements` | GET, POST | `app/api/rights-admin/settlements/route.ts` |
| `/api/rights-admin/usage` | GET, POST | `app/api/rights-admin/usage/route.ts` |
| `/api/rights-intelligence/alerts` | GET | `app/api/rights-intelligence/alerts/route.ts` |
| `/api/rights-intelligence/benchmarks` | GET, POST | `app/api/rights-intelligence/benchmarks/route.ts` |
| `/api/rights-intelligence/clean-rooms` | GET, POST | `app/api/rights-intelligence/clean-rooms/route.ts` |
| `/api/rights-intelligence/cohorts` | GET, POST | `app/api/rights-intelligence/cohorts/route.ts` |
| `/api/rights-intelligence/collective` | GET, POST | `app/api/rights-intelligence/collective/route.ts` |
| `/api/rights-intelligence/consents` | DELETE, GET, POST | `app/api/rights-intelligence/consents/route.ts` |
| `/api/rights-intelligence/datasets` | GET | `app/api/rights-intelligence/datasets/route.ts` |
| `/api/rights-intelligence/education` | GET | `app/api/rights-intelligence/education/route.ts` |
| `/api/rights-intelligence/groups` | GET, POST | `app/api/rights-intelligence/groups/route.ts` |
| `/api/rights-intelligence/groups/[id]/proposals` | GET, POST | `app/api/rights-intelligence/groups/[id]/proposals/route.ts` |
| `/api/rights-intelligence/metrics` | GET | `app/api/rights-intelligence/metrics/route.ts` |
| `/api/search` | unknown | `app/api/search/route.ts` |
| `/api/search/enhanced` | GET | `app/api/search/enhanced/route.ts` |
| `/api/search/global` | unknown | `app/api/search/global/route.ts` |
| `/api/search/unified` | GET | `app/api/search/unified/route.ts` |
| `/api/settings` | GET, PUT | `app/api/settings/route.ts` |
| `/api/settings/capabilities` | GET, PUT | `app/api/settings/capabilities/route.ts` |
| `/api/settings/certifications` | DELETE, GET, POST, PUT | `app/api/settings/certifications/route.ts` |
| `/api/settings/certifications/upload` | POST | `app/api/settings/certifications/upload/route.ts` |
| `/api/settings/experience` | DELETE, GET, POST, PUT | `app/api/settings/experience/route.ts` |
| `/api/settings/portfolio` | DELETE, GET, POST, PUT | `app/api/settings/portfolio/route.ts` |
| `/api/settings/profile` | GET, PUT | `app/api/settings/profile/route.ts` |
| `/api/settings/profile/full` | GET | `app/api/settings/profile/full/route.ts` |
| `/api/settings/skills/top` | PUT | `app/api/settings/skills/top/route.ts` |
| `/api/setup-storage` | POST | `app/api/setup-storage/route.ts` |
| `/api/site-maps/public/[token]` | GET | `app/api/site-maps/public/[token]/route.ts` |
| `/api/site-maps/shared` | GET | `app/api/site-maps/shared/route.ts` |
| `/api/skills/endorse` | DELETE, GET, POST | `app/api/skills/endorse/route.ts` |
| `/api/social/all-users` | GET | `app/api/social/all-users/route.ts` |
| `/api/social/follow` | GET, POST | `app/api/social/follow/route.ts` |
| `/api/social/follow-request` | GET, POST | `app/api/social/follow-request/route.ts` |
| `/api/social/friend-search` | GET | `app/api/social/friend-search/route.ts` |
| `/api/social/oauth/callback` | GET | `app/api/social/oauth/callback/route.ts` |
| `/api/social/oauth/start` | GET | `app/api/social/oauth/start/route.ts` |
| `/api/social/relationship` | GET, POST | `app/api/social/relationship/route.ts` |
| `/api/social/simple-connection-request` | POST | `app/api/social/simple-connection-request/route.ts` |
| `/api/social/simple-suggestions` | GET | `app/api/social/simple-suggestions/route.ts` |
| `/api/social/suggested` | GET | `app/api/social/suggested/route.ts` |
| `/api/social/suggestions` | GET | `app/api/social/suggestions/route.ts` |
| `/api/staff/ops` | GET | `app/api/staff/ops/route.ts` |
| `/api/staffing/employee-overview` | GET | `app/api/staffing/employee-overview/route.ts` |
| `/api/staffing/employees` | GET | `app/api/staffing/employees/route.ts` |
| `/api/staffing/health` | GET | `app/api/staffing/health/route.ts` |
| `/api/staffing/invitations/[token]` | GET, POST | `app/api/staffing/invitations/[token]/route.ts` |
| `/api/staffing/ops-actions` | POST | `app/api/staffing/ops-actions/route.ts` |
| `/api/staffing/permissions` | GET | `app/api/staffing/permissions/route.ts` |
| `/api/storage/ensure` | POST | `app/api/storage/ensure/route.ts` |
| `/api/stripe/connect` | GET, POST | `app/api/stripe/connect/route.ts` |
| `/api/subscriptions/checkout` | POST | `app/api/subscriptions/checkout/route.ts` |
| `/api/subscriptions/portal` | POST | `app/api/subscriptions/portal/route.ts` |
| `/api/subscriptions/tiers/sync` | POST | `app/api/subscriptions/tiers/sync/route.ts` |
| `/api/subscriptions/webhook` | POST | `app/api/subscriptions/webhook/route.ts` |
| `/api/test-db` | GET | `app/api/test-db/route.ts` |
| `/api/test-header-url` | GET | `app/api/test-header-url/route.ts` |
| `/api/test-rss` | GET | `app/api/test-rss/route.ts` |
| `/api/test-venues` | GET | `app/api/test-venues/route.ts` |
| `/api/ticketing` | unknown | `app/api/ticketing/route.ts` |
| `/api/ticketing/allocations` | GET, POST | `app/api/ticketing/allocations/route.ts` |
| `/api/ticketing/box-office` | GET, POST | `app/api/ticketing/box-office/route.ts` |
| `/api/ticketing/check-in` | GET, POST | `app/api/ticketing/check-in/route.ts` |
| `/api/ticketing/config` | GET, POST | `app/api/ticketing/config/route.ts` |
| `/api/ticketing/delivery` | GET, POST | `app/api/ticketing/delivery/route.ts` |
| `/api/ticketing/enhanced` | GET, POST | `app/api/ticketing/enhanced/route.ts` |
| `/api/ticketing/events/[eventId]/allocations` | PATCH, POST | `app/api/ticketing/events/[eventId]/allocations/route.ts` |
| `/api/ticketing/events/[eventId]/attendees` | GET | `app/api/ticketing/events/[eventId]/attendees/route.ts` |
| `/api/ticketing/events/[eventId]/eligible-recipients` | GET | `app/api/ticketing/events/[eventId]/eligible-recipients/route.ts` |
| `/api/ticketing/events/[eventId]/invites` | POST | `app/api/ticketing/events/[eventId]/invites/route.ts` |
| `/api/ticketing/events/[eventId]/invites/[inviteId]/[action]` | POST | `app/api/ticketing/events/[eventId]/invites/[inviteId]/[action]/route.ts` |
| `/api/ticketing/events/[eventId]/sales-orders` | DELETE, GET, PATCH, POST | `app/api/ticketing/events/[eventId]/sales-orders/route.ts` |
| `/api/ticketing/events/[eventId]/workspace` | GET | `app/api/ticketing/events/[eventId]/workspace/route.ts` |
| `/api/ticketing/invites/[token]` | GET | `app/api/ticketing/invites/[token]/route.ts` |
| `/api/ticketing/invites/[token]/accept` | POST | `app/api/ticketing/invites/[token]/accept/route.ts` |
| `/api/ticketing/invites/[token]/decline` | POST | `app/api/ticketing/invites/[token]/decline/route.ts` |
| `/api/ticketing/reports` | GET | `app/api/ticketing/reports/route.ts` |
| `/api/ticketing/settlements` | GET, POST | `app/api/ticketing/settlements/route.ts` |
| `/api/ticketing/transfers` | GET, POST | `app/api/ticketing/transfers/route.ts` |
| `/api/ticketing/verify` | GET | `app/api/ticketing/verify/route.ts` |
| `/api/ticketing/wallet` | GET | `app/api/ticketing/wallet/route.ts` |
| `/api/ticketing/webhook` | POST | `app/api/ticketing/webhook/route.ts` |
| `/api/tours` | GET, POST | `app/api/tours/route.ts` |
| `/api/tours/[id]` | DELETE, GET, PATCH | `app/api/tours/[id]/route.ts` |
| `/api/tours/[id]/assign-user` | POST | `app/api/tours/[id]/assign-user/route.ts` |
| `/api/tours/[id]/assign-user-to-team` | POST | `app/api/tours/[id]/assign-user-to-team/route.ts` |
| `/api/tours/[id]/events` | GET, POST | `app/api/tours/[id]/events/route.ts` |
| `/api/tours/[id]/events/[eventId]` | DELETE, GET, PATCH | `app/api/tours/[id]/events/[eventId]/route.ts` |
| `/api/tours/[id]/invites` | GET, POST | `app/api/tours/[id]/invites/route.ts` |
| `/api/tours/[id]/jobs` | DELETE, GET, PATCH, POST | `app/api/tours/[id]/jobs/route.ts` |
| `/api/tours/[id]/team` | GET, POST | `app/api/tours/[id]/team/route.ts` |
| `/api/tours/[id]/team/[memberId]` | DELETE, GET, PATCH | `app/api/tours/[id]/team/[memberId]/route.ts` |
| `/api/tours/[id]/vendors` | GET, POST | `app/api/tours/[id]/vendors/route.ts` |
| `/api/tours/[id]/vendors/[vendorId]` | DELETE, GET, PATCH | `app/api/tours/[id]/vendors/[vendorId]/route.ts` |
| `/api/tours/invitations/[token]` | GET, POST | `app/api/tours/invitations/[token]/route.ts` |
| `/api/tours/planner` | GET, POST | `app/api/tours/planner/route.ts` |
| `/api/tours/planner/artists` | GET | `app/api/tours/planner/artists/route.ts` |
| `/api/tours/planner/crew` | GET | `app/api/tours/planner/crew/route.ts` |
| `/api/tours/planner/venues` | GET | `app/api/tours/planner/venues/route.ts` |
| `/api/upload-profile-image` | DELETE, POST | `app/api/upload-profile-image/route.ts` |
| `/api/upload/signed-url` | POST | `app/api/upload/signed-url/route.ts` |
| `/api/ux/telemetry` | POST | `app/api/ux/telemetry/route.ts` |
| `/api/venue/analytics` | GET | `app/api/venue/analytics/route.ts` |
| `/api/venue/analytics/export` | GET | `app/api/venue/analytics/export/route.ts` |
| `/api/venue/booking-requests` | GET, PATCH | `app/api/venue/booking-requests/route.ts` |
| `/api/venue/current` | GET | `app/api/venue/current/route.ts` |
| `/api/venue/documents/[id]` | GET | `app/api/venue/documents/[id]/route.ts` |
| `/api/venue/documents/bulk-delete` | DELETE | `app/api/venue/documents/bulk-delete/route.ts` |
| `/api/venue/equipment` | DELETE, GET, PATCH, POST | `app/api/venue/equipment/route.ts` |
| `/api/venue/events` | GET, POST | `app/api/venue/events/route.ts` |
| `/api/venue/events/[id]` | GET, PATCH | `app/api/venue/events/[id]/route.ts` |
| `/api/venue/events/[id]/ticketing-setup` | GET, POST | `app/api/venue/events/[id]/ticketing-setup/route.ts` |
| `/api/venue/finances` | DELETE, GET, PATCH, POST | `app/api/venue/finances/route.ts` |
| `/api/venue/finances/export` | GET | `app/api/venue/finances/export/route.ts` |
| `/api/venue/finances/payout` | GET, POST | `app/api/venue/finances/payout/route.ts` |
| `/api/venue/hiring` | GET, POST | `app/api/venue/hiring/route.ts` |
| `/api/venue/hiring/applications` | GET | `app/api/venue/hiring/applications/route.ts` |
| `/api/venue/hiring/applications/[id]` | PATCH | `app/api/venue/hiring/applications/[id]/route.ts` |
| `/api/venue/hiring/audit` | GET | `app/api/venue/hiring/audit/route.ts` |
| `/api/venue/hiring/job-postings` | GET, POST | `app/api/venue/hiring/job-postings/route.ts` |
| `/api/venue/hiring/job-postings/[id]` | PATCH | `app/api/venue/hiring/job-postings/[id]/route.ts` |
| `/api/venue/integrations` | GET, POST | `app/api/venue/integrations/route.ts` |
| `/api/venue/notification-routing` | GET, PATCH | `app/api/venue/notification-routing/route.ts` |
| `/api/venue/onboarding/summary` | GET | `app/api/venue/onboarding/summary/route.ts` |
| `/api/venue/permissions` | GET | `app/api/venue/permissions/route.ts` |
| `/api/venue/roles` | GET, POST | `app/api/venue/roles/route.ts` |
| `/api/venue/roles/[id]` | DELETE, PATCH | `app/api/venue/roles/[id]/route.ts` |
| `/api/venue/shifts` | GET, POST | `app/api/venue/shifts/route.ts` |
| `/api/venue/shifts/[id]` | DELETE, PATCH | `app/api/venue/shifts/[id]/route.ts` |
| `/api/venue/shifts/assignments` | POST | `app/api/venue/shifts/assignments/route.ts` |
| `/api/venue/shifts/requests` | GET, POST | `app/api/venue/shifts/requests/route.ts` |
| `/api/venue/shifts/swaps` | GET, POST | `app/api/venue/shifts/swaps/route.ts` |
| `/api/venue/site-maps/[id]` | GET | `app/api/venue/site-maps/[id]/route.ts` |
| `/api/venue/site-maps/[id]/save` | PUT | `app/api/venue/site-maps/[id]/save/route.ts` |
| `/api/venue/staff-onboarding` | GET, POST | `app/api/venue/staff-onboarding/route.ts` |
| `/api/venue/staff-profiles` | GET | `app/api/venue/staff-profiles/route.ts` |
| `/api/venue/team` | DELETE, GET, PATCH, POST | `app/api/venue/team/route.ts` |
| `/api/venue/ticketing` | GET | `app/api/venue/ticketing/route.ts` |
| `/api/venue/user-roles` | GET, POST | `app/api/venue/user-roles/route.ts` |
| `/api/venue/user-roles/[userId]/[roleId]` | DELETE | `app/api/venue/user-roles/[userId]/[roleId]/route.ts` |
| `/api/venues` | GET, POST, PUT | `app/api/venues/route.ts` |
| `/api/venues/[id]` | DELETE, GET, PUT | `app/api/venues/[id]/route.ts` |
| `/api/venues/[id]/reviews` | GET, PATCH, POST | `app/api/venues/[id]/reviews/route.ts` |
| `/api/venues/[id]/venue-kit` | GET | `app/api/venues/[id]/venue-kit/route.ts` |
| `/api/venues/delete` | DELETE | `app/api/venues/delete/route.ts` |
| `/api/webhooks/music-marketplace/[partner]` | POST | `app/api/webhooks/music-marketplace/[partner]/route.ts` |
| `/api/webhooks/music-royalty-payouts` | POST | `app/api/webhooks/music-royalty-payouts/route.ts` |
| `/api/webhooks/supabase/notifications` | POST | `app/api/webhooks/supabase/notifications/route.ts` |
| `/api/work-mode/assignments` | GET | `app/api/work-mode/assignments/route.ts` |
| `/api/work-mode/assignments/[id]` | GET | `app/api/work-mode/assignments/[id]/route.ts` |
| `/api/work-mode/assignments/[id]/actions` | POST | `app/api/work-mode/assignments/[id]/actions/route.ts` |
| `/api/work-mode/assignments/[id]/respond` | POST | `app/api/work-mode/assignments/[id]/respond/route.ts` |
| `/api/work-mode/communications/[id]/respond` | POST | `app/api/work-mode/communications/[id]/respond/route.ts` |
| `/api/work-mode/events/[eventId]` | GET | `app/api/work-mode/events/[eventId]/route.ts` |
| `/api/work-mode/overview` | GET | `app/api/work-mode/overview/route.ts` |
| `/api/work/site-maps/[id]` | GET | `app/api/work/site-maps/[id]/route.ts` |
| `/api/workflows/threads` | GET, POST | `app/api/workflows/threads/route.ts` |
| `/api/workflows/threads/[id]/events` | GET | `app/api/workflows/threads/[id]/events/route.ts` |
| `/api/workflows/threads/[id]/messages` | GET, POST | `app/api/workflows/threads/[id]/messages/route.ts` |
| `/api/workflows/threads/[id]/participants` | GET, PATCH, POST | `app/api/workflows/threads/[id]/participants/route.ts` |
| `/api/workflows/threads/[id]/tasks` | GET, PATCH, POST | `app/api/workflows/threads/[id]/tasks/route.ts` |
| `/api/workforce/requests/notify` | POST | `app/api/workforce/requests/notify/route.ts` |
| `/api/world/globe` | GET | `app/api/world/globe/route.ts` |
| `/api/world/pilot` | GET | `app/api/world/pilot/route.ts` |
| `/api/world/pilot/[slug]` | GET | `app/api/world/pilot/[slug]/route.ts` |
| `/api/world/pilot/search` | GET | `app/api/world/pilot/search/route.ts` |
