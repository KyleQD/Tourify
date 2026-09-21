# Permissions map

<!-- generated: do not edit -->

- Source SHA: `a1ca86033dea52dbcce0b2529765850044f3d9ad`
- Branch: `release/clean-snapshot`
- Working tree: dirty (3 entries)
- Generated at: 2026-09-21T22:14:03.391Z
- Generator: `control-plane.mjs generate`

Static detection is a routing aid, not an authorization audit. Missing markers require review; detected markers do not prove correct scope.

## Core files

- `middleware.ts`
- `lib/auth/__tests__/acting-context.test.ts`
- `lib/auth/__tests__/admin-profile-gates.test.ts`
- `lib/auth/__tests__/auth-email-redirect-node.test.ts`
- `lib/auth/__tests__/auth-errors.test.ts`
- `lib/auth/__tests__/normalize-account-type.test.ts`
- `lib/auth/__tests__/request-public-origin.test.ts`
- `lib/auth/__tests__/route-guards.test.ts`
- `lib/auth/__tests__/session-init.test.ts`
- `lib/auth/__tests__/tourify-auth-helpers.test.ts`
- `lib/auth/acting-context.ts`
- `lib/auth/admin-acting-context-envelope.ts`
- `lib/auth/admin-capabilities.ts`
- `lib/auth/admin-context.ts`
- `lib/auth/admin-profile-gates.ts`
- `lib/auth/admin.ts`
- `lib/auth/agent-service-core.ts`
- `lib/auth/agent-service.ts`
- `lib/auth/api-auth.ts`
- `lib/auth/auth-email-redirect.ts`
- `lib/auth/hiring-entity-resolver.ts`
- `lib/auth/hiring-permissions.ts`
- `lib/auth/index.ts`
- `lib/auth/mobile-redirect.ts`
- `lib/auth/mobile-request-auth.ts`
- `lib/auth/normalize-account-type.ts`
- `lib/auth/org-command.ts`
- `lib/auth/platform-admin.ts`
- `lib/auth/production-auth.ts`
- `lib/auth/public-site-origin.ts`
- `lib/auth/request-public-origin.ts`
- `lib/auth/role-based-auth.tsx`
- `lib/auth/route-guards.ts`
- `lib/auth/server.ts`
- `lib/auth/session-init.ts`
- `lib/auth/tourify-auth-helpers.ts`
- `lib/supabase/auth-cookie-options.ts`
- `lib/supabase/auth.ts`
- `lib/supabase/client.ts`
- `lib/supabase/hiring-service-client.ts`
- `lib/supabase/index.ts`
- `lib/supabase/middleware.ts`
- `lib/supabase/optimized-client.ts`
- `lib/supabase/postgrest-error.ts`
- `lib/supabase/server.ts`
- `lib/supabase/service-role-allowlist.ts`
- `lib/supabase/service-role-job.ts`
- `lib/supabase/service-role.ts`
- `lib/supabase/tourify-session-cookie.ts`

## API route indicators (946)

| Source | Detected indicators |
| --- | --- |
| `app/api/account/delete/route.ts` | session/auth, service role, rate limit |
| `app/api/accounts/check-slug/route.ts` | session/auth, service role |
| `app/api/accounts/route.ts` | session/auth, organization |
| `app/api/achievements/resume/export/route.ts` | session/auth |
| `app/api/achievements/resume/route.ts` | session/auth |
| `app/api/achievements/route.ts` | session/auth |
| `app/api/admin/analytics/data-quality/route.ts` | admin, entity/RBAC |
| `app/api/admin/analytics/export/route.ts` | admin, entity/RBAC |
| `app/api/admin/analytics/freshness/route.ts` | admin, entity/RBAC |
| `app/api/admin/analytics/top-performers/route.ts` | manual review required |
| `app/api/admin/applications/[id]/audit/route.ts` | session/auth |
| `app/api/admin/applications/[id]/route.ts` | session/auth |
| `app/api/admin/applications/route.ts` | session/auth, venue, entity/RBAC, service role |
| `app/api/admin/artists/[id]/route.ts` | admin, organization, artist, entity/RBAC |
| `app/api/admin/artists/route.ts` | admin, organization, artist, entity/RBAC, service role |
| `app/api/admin/assets/search/route.ts` | admin, entity/RBAC |
| `app/api/admin/audit/route.ts` | admin, entity/RBAC |
| `app/api/admin/calendar/export/route.ts` | admin, entity/RBAC |
| `app/api/admin/calendar/route.ts` | session/auth, admin, entity/RBAC |
| `app/api/admin/calendar/token/route.ts` | admin, entity/RBAC, service role |
| `app/api/admin/capabilities/route.ts` | session/auth, entity/RBAC |
| `app/api/admin/communications/route.ts` | admin, organization, venue, entity/RBAC, service role |
| `app/api/admin/content-hub/analytics/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/content-hub/integrations/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/content-hub/integrations/sync/route.ts` | session/auth, admin, entity/RBAC |
| `app/api/admin/content-hub/moderation/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/content-hub/moderation/route.ts` | admin, entity/RBAC |
| `app/api/admin/content-hub/overview/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/content-hub/posts/route.ts` | admin, entity/RBAC |
| `app/api/admin/content/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/content/music/certifications/route.ts` | rate limit |
| `app/api/admin/content/music/rights/disputes/route.ts` | rate limit |
| `app/api/admin/content/music/rights/review/route.ts` | rate limit |
| `app/api/admin/content/music/route.ts` | admin, entity/RBAC |
| `app/api/admin/content/posts/route.ts` | admin, entity/RBAC |
| `app/api/admin/contracts/obligations/route.ts` | admin, entity/RBAC |
| `app/api/admin/contracts/route.ts` | admin, entity/RBAC |
| `app/api/admin/creator-cooperative/ops/route.ts` | manual review required |
| `app/api/admin/creator-digital-commons/ops/route.ts` | manual review required |
| `app/api/admin/creator-federation/ops/route.ts` | manual review required |
| `app/api/admin/creator-interoperability-convention/ops/route.ts` | manual review required |
| `app/api/admin/creator-interoperability-institution/ops/route.ts` | manual review required |
| `app/api/admin/creator-interoperability-organization/ops/route.ts` | manual review required |
| `app/api/admin/creator-multilateral-treaty-operations/ops/route.ts` | manual review required |
| `app/api/admin/creator-protocol-constitution/ops/route.ts` | manual review required |
| `app/api/admin/creator-public-infrastructure/ops/route.ts` | manual review required |
| `app/api/admin/creator-treaty-system-legacy/ops/route.ts` | manual review required |
| `app/api/admin/creator-treaty-system-renewal/ops/route.ts` | manual review required |
| `app/api/admin/dashboard/command-center/route.ts` | admin, entity/RBAC |
| `app/api/admin/dashboard/stats/route.ts` | manual review required |
| `app/api/admin/effective-capabilities/route.ts` | admin, entity/RBAC |
| `app/api/admin/entity-grants/route.ts` | admin, entity/RBAC |
| `app/api/admin/error-reporting/route.ts` | session/auth |
| `app/api/admin/event-claims/route.ts` | service role |
| `app/api/admin/event-merges/route.ts` | service role |
| `app/api/admin/event-providers/route.ts` | manual review required |
| `app/api/admin/event-sync/route.ts` | service role |
| `app/api/admin/events/[id]/advancing/export/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/advancing/route.ts` | admin, entity/RBAC, service role |
| `app/api/admin/events/[id]/analytics/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/communication-settings/route.ts` | admin, entity/RBAC, service role |
| `app/api/admin/events/[id]/communications/route.ts` | admin, entity/RBAC, service role |
| `app/api/admin/events/[id]/day-sheet/acknowledge/route.ts` | manual review required |
| `app/api/admin/events/[id]/day-sheet/distribute/route.ts` | admin, entity/RBAC, service role |
| `app/api/admin/events/[id]/day-sheet/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/documents/route.ts` | admin, entity/RBAC, service role |
| `app/api/admin/events/[id]/export/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/group-chats/route.ts` | service role |
| `app/api/admin/events/[id]/participants/route.ts` | session/auth, entity/RBAC |
| `app/api/admin/events/[id]/provision/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/publish/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/readiness/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/secure-uploads/route.ts` | service role |
| `app/api/admin/events/[id]/setup-completeness/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/task-messages/route.ts` | service role |
| `app/api/admin/events/[id]/tour-assignments/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/vendor-requests/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/[id]/work-mode/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/export/route.ts` | admin, entity/RBAC |
| `app/api/admin/events/route.ts` | admin, entity/RBAC |
| `app/api/admin/exports/calendar-feeds/route.ts` | admin, entity/RBAC |
| `app/api/admin/exports/jobs/route.ts` | admin, entity/RBAC |
| `app/api/admin/exports/tour-book/route.ts` | admin, entity/RBAC |
| `app/api/admin/features/[key]/route.ts` | admin, entity/RBAC |
| `app/api/admin/features/route.ts` | admin, entity/RBAC |
| `app/api/admin/finances/budget-rollup/route.ts` | admin, entity/RBAC |
| `app/api/admin/finances/budget-workspace/route.ts` | admin, entity/RBAC |
| `app/api/admin/finances/commands/route.ts` | entity/RBAC |
| `app/api/admin/finances/commitments/route.ts` | admin, entity/RBAC |
| `app/api/admin/finances/expenses/route.ts` | admin, entity/RBAC |
| `app/api/admin/finances/reconciliation/route.ts` | admin, entity/RBAC |
| `app/api/admin/finances/route.ts` | admin, entity/RBAC |
| `app/api/admin/finances/scope-search/route.ts` | admin, entity/RBAC |
| `app/api/admin/finances/settlements/route.ts` | admin, entity/RBAC |
| `app/api/admin/institutional/ops/route.ts` | manual review required |
| `app/api/admin/job-postings/[id]/route.ts` | manual review required |
| `app/api/admin/job-postings/route.ts` | manual review required |
| `app/api/admin/licensing/ops/route.ts` | manual review required |
| `app/api/admin/lodging/route.ts` | session/auth, admin, organization, entity/RBAC |
| `app/api/admin/logistics/alerts/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/backline/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/logistics/catering/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/logistics/commands/route.ts` | entity/RBAC |
| `app/api/admin/logistics/comms-plans/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/logistics/comms-thread/route.ts` | admin, organization, entity/RBAC, service role |
| `app/api/admin/logistics/communications-command-center/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/logistics/equipment/catalog/route.ts` | session/auth |
| `app/api/admin/logistics/equipment/reservations/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/logistics/items/[id]/equipment/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/items/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/items/[id]/status/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/items/bulk/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/items/route.ts` | session/auth, admin, organization, entity/RBAC |
| `app/api/admin/logistics/metrics/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/logistics/plans/[tourId]/hydrate/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/plans/[tourId]/preview-hydration/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/plans/[tourId]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/plans/[tourId]/validate/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/plans/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-map-templates/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/activity/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/collaborators/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/elements/[elementId]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/elements/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/export/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/notes/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/public-link/route.ts` | admin, entity/RBAC, service role |
| `app/api/admin/logistics/site-maps/[id]/publish-work-mode/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/save-template/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/share/route.ts` | session/auth, admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/tasks/[taskId]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/tasks/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/tents/[tentId]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/tents/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/versions/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/zones/[zoneId]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/zones/bulk-assign/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/[id]/zones/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/import/route.ts` | session/auth |
| `app/api/admin/logistics/site-maps/issues/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/issues/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/layers/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/layers/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/measurements/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/measurements/route.ts` | admin, entity/RBAC |
| `app/api/admin/logistics/site-maps/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/logistics/transport/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/logistics/vendor/dashboard/route.ts` | session/auth |
| `app/api/admin/logistics/vendor/inventory/route.ts` | session/auth, admin |
| `app/api/admin/logistics/vendor/workflows/route.ts` | session/auth, admin |
| `app/api/admin/logistics/vendors/route.ts` | admin, entity/RBAC |
| `app/api/admin/marketplace/moderation/route.ts` | manual review required |
| `app/api/admin/marketplace/orders/[id]/route.ts` | manual review required |
| `app/api/admin/marketplace/orders/route.ts` | manual review required |
| `app/api/admin/marketplace/payouts/[id]/retry/route.ts` | manual review required |
| `app/api/admin/messages/broadcast/route.ts` | session/auth, service role |
| `app/api/admin/messages/list/route.ts` | service role |
| `app/api/admin/messages/threads/route.ts` | session/auth, service role |
| `app/api/admin/music-marketplace/ops/route.ts` | manual review required |
| `app/api/admin/music/royalties/imports/route.ts` | manual review required |
| `app/api/admin/notifications/route.ts` | admin, entity/RBAC |
| `app/api/admin/onboarding/add-existing-user/route.ts` | manual review required |
| `app/api/admin/onboarding/candidates/[id]/credentials/route.ts` | manual review required |
| `app/api/admin/onboarding/candidates/[id]/route.ts` | manual review required |
| `app/api/admin/onboarding/candidates/route.ts` | session/auth |
| `app/api/admin/onboarding/dashboard/route.ts` | manual review required |
| `app/api/admin/onboarding/documents/[documentId]/review/route.ts` | session/auth |
| `app/api/admin/onboarding/enhanced-invite/route.ts` | manual review required |
| `app/api/admin/onboarding/initialize-templates/route.ts` | manual review required |
| `app/api/admin/onboarding/invite-new-user/route.ts` | session/auth, admin, entity/RBAC |
| `app/api/admin/onboarding/review/route.ts` | manual review required |
| `app/api/admin/onboarding/route.ts` | manual review required |
| `app/api/admin/onboarding/templates/[id]/route.ts` | manual review required |
| `app/api/admin/onboarding/templates/clone/route.ts` | manual review required |
| `app/api/admin/onboarding/templates/role-packs/route.ts` | manual review required |
| `app/api/admin/onboarding/templates/route.ts` | manual review required |
| `app/api/admin/onboarding/update-status/route.ts` | manual review required |
| `app/api/admin/onboarding/workflows/advance/route.ts` | session/auth, admin, entity/RBAC |
| `app/api/admin/onboarding/workflows/analytics/route.ts` | manual review required |
| `app/api/admin/onboarding/workflows/route.ts` | manual review required |
| `app/api/admin/organization/communications-settings/route.ts` | admin, entity/RBAC |
| `app/api/admin/organization/finance-settings/route.ts` | admin, entity/RBAC |
| `app/api/admin/organization/overview/route.ts` | admin, entity/RBAC |
| `app/api/admin/organization/publication-health/route.ts` | admin, entity/RBAC |
| `app/api/admin/organization/security-summary/route.ts` | admin, entity/RBAC |
| `app/api/admin/organization/settings/route.ts` | admin, entity/RBAC |
| `app/api/admin/organization/ticketing-settings/route.ts` | admin, entity/RBAC |
| `app/api/admin/organization/tours-health/route.ts` | admin, entity/RBAC |
| `app/api/admin/organization/vendor-governance/route.ts` | admin, entity/RBAC |
| `app/api/admin/organization/workforce-settings/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/audience-preview/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/deliveries/export/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/deliveries/retry/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/deliveries/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/history/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/outbox/replay/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/outbox/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/publish/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/share-links/[id]/revoke/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/share-links/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/snapshots/[id]/retract/route.ts` | admin, entity/RBAC |
| `app/api/admin/publication/snapshots/[id]/supersede/route.ts` | admin, entity/RBAC |
| `app/api/admin/rbac/assign-role/route.ts` | session/auth, admin, entity/RBAC |
| `app/api/admin/rbac/entity/[entityType]/[entityId]/assignments/route.ts` | admin, entity/RBAC |
| `app/api/admin/rbac/entity/[entityType]/[entityId]/audit/route.ts` | admin, entity/RBAC |
| `app/api/admin/rbac/members/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/rbac/roles/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/rbac/roles/route.ts` | admin, entity/RBAC |
| `app/api/admin/rentals/route.ts` | session/auth |
| `app/api/admin/request/route.ts` | session/auth |
| `app/api/admin/rights-admin/ops/route.ts` | manual review required |
| `app/api/admin/rights-intelligence/ops/route.ts` | manual review required |
| `app/api/admin/staff-operations/channels/[id]/route.ts` | session/auth, admin, organization, entity/RBAC, service role |
| `app/api/admin/staff-operations/channels/route.ts` | session/auth, admin, entity/RBAC, service role |
| `app/api/admin/staff-operations/summary/route.ts` | admin, entity/RBAC |
| `app/api/admin/staff/dashboard/route.ts` | session/auth, venue |
| `app/api/admin/staff/route.ts` | admin, entity/RBAC |
| `app/api/admin/staffing/job-postings/route.ts` | manual review required |
| `app/api/admin/staffing/performance/route.ts` | session/auth, venue, entity/RBAC |
| `app/api/admin/staffing/shifts/[id]/route.ts` | session/auth, entity/RBAC |
| `app/api/admin/staffing/shifts/publish/route.ts` | session/auth, admin, venue, entity/RBAC |
| `app/api/admin/staffing/shifts/route.ts` | session/auth, admin, venue, entity/RBAC |
| `app/api/admin/staffing/zones/route.ts` | session/auth, venue, entity/RBAC |
| `app/api/admin/store/route.ts` | manual review required |
| `app/api/admin/tasks/route.ts` | admin, entity/RBAC |
| `app/api/admin/team-members/route.ts` | session/auth, admin, venue, entity/RBAC |
| `app/api/admin/test/route.ts` | session/auth |
| `app/api/admin/ticketing/admissions/route.ts` | admin, entity/RBAC |
| `app/api/admin/ticketing/allocations/route.ts` | admin, entity/RBAC |
| `app/api/admin/ticketing/commands/route.ts` | entity/RBAC |
| `app/api/admin/ticketing/enhanced/route.ts` | admin, entity/RBAC |
| `app/api/admin/ticketing/guest-approvals/route.ts` | admin, entity/RBAC |
| `app/api/admin/ticketing/inventory/route.ts` | admin, entity/RBAC |
| `app/api/admin/ticketing/read-model/route.ts` | admin, entity/RBAC |
| `app/api/admin/ticketing/refund/route.ts` | admin, entity/RBAC, service role |
| `app/api/admin/ticketing/setup/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/archive-preview/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/calendar-token/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/collaboration-invites/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/delete-preview/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/duplicate-preview/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/duplicate/[jobId]/resume/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/duplicate/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/events/route.ts` | admin, organization, entity/RBAC |
| `app/api/admin/tours/[id]/export/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/grant-admins/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/holds/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/logistics-summary/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/plan/reconcile-preview/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/plan/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/publish/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/quick-start-events/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/readiness/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/stops/impact/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/summary/projection/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/summary/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/tags/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/[id]/transitions/[command]/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/artists/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/bulk-preview/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/bulk/route.ts` | entity/RBAC |
| `app/api/admin/tours/events/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/observability/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/plan/backfill/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/plan/quarantine/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/saved-views/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/saved-views/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/tags/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/team-members/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/teams/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/vendors/route.ts` | admin, entity/RBAC |
| `app/api/admin/tours/venues/route.ts` | admin, entity/RBAC |
| `app/api/admin/travel-coordination/route.ts` | session/auth, admin, organization, entity/RBAC |
| `app/api/admin/travel/documents/route.ts` | admin, entity/RBAC |
| `app/api/admin/travel/flight-lookup/route.ts` | session/auth |
| `app/api/admin/travel/matrix/route.ts` | admin, entity/RBAC |
| `app/api/admin/travel/segments/route.ts` | admin, entity/RBAC |
| `app/api/admin/travel/slo/route.ts` | admin, entity/RBAC |
| `app/api/admin/users/search/route.ts` | admin, entity/RBAC |
| `app/api/admin/vendor-requests/[id]/route.ts` | admin, entity/RBAC |
| `app/api/admin/vendor-requests/route.ts` | admin, entity/RBAC |
| `app/api/admin/vendors/route.ts` | admin, entity/RBAC |
| `app/api/admin/venues/[id]/route.ts` | manual review required |
| `app/api/admin/venues/route.ts` | session/auth, admin, entity/RBAC |
| `app/api/admin/workforce/attendance/route.ts` | admin, entity/RBAC |
| `app/api/admin/workforce/conflicts/route.ts` | admin, entity/RBAC |
| `app/api/admin/workforce/conversions/route.ts` | admin, entity/RBAC |
| `app/api/admin/workforce/health/route.ts` | admin, entity/RBAC |
| `app/api/admin/workforce/identity-merge/route.ts` | admin, entity/RBAC |
| `app/api/admin/workforce/payroll-exports/route.ts` | admin, entity/RBAC |
| `app/api/admin/workforce/people/route.ts` | admin, entity/RBAC |
| `app/api/agencies/performance/[id]/artists/route.ts` | manual review required |
| `app/api/agencies/performance/route.ts` | manual review required |
| `app/api/agencies/staffing/[id]/staff/route.ts` | manual review required |
| `app/api/agencies/staffing/route.ts` | manual review required |
| `app/api/agreements/accept/route.ts` | session/auth |
| `app/api/analytics/errors/route.ts` | session/auth, admin, service role, rate limit |
| `app/api/analytics/metrics/route.ts` | session/auth |
| `app/api/analytics/route.ts` | session/auth |
| `app/api/artist-jobs/[id]/applications/route.ts` | session/auth, service role |
| `app/api/artist-jobs/[id]/repost/route.ts` | service role |
| `app/api/artist-jobs/[id]/route.ts` | session/auth |
| `app/api/artist-jobs/applications/route.ts` | session/auth |
| `app/api/artist-jobs/categories/route.ts` | manual review required |
| `app/api/artist-jobs/route.ts` | session/auth, service role |
| `app/api/artist-jobs/saved/route.ts` | session/auth |
| `app/api/artist/[artistName]/route.ts` | session/auth |
| `app/api/artist/business/overview/route.ts` | session/auth |
| `app/api/artist/content/overview/route.ts` | session/auth |
| `app/api/artist/epk/route.ts` | manual review required |
| `app/api/artist/events/[id]/collaborate/route.ts` | manual review required |
| `app/api/artist/events/[id]/promote/route.ts` | manual review required |
| `app/api/artist/events/[id]/publish/route.ts` | manual review required |
| `app/api/artist/events/[id]/route.ts` | manual review required |
| `app/api/artist/events/[id]/tickets/route.ts` | manual review required |
| `app/api/artist/events/route.ts` | manual review required |
| `app/api/artist/feed-stats/route.ts` | session/auth |
| `app/api/artist/music/analytics/route.ts` | artist |
| `app/api/artist/music/catalog-imports/route.ts` | artist, rate limit |
| `app/api/artist/music/certification/[caseId]/events/route.ts` | artist |
| `app/api/artist/music/certification/[caseId]/evidence/route.ts` | artist, rate limit |
| `app/api/artist/music/certification/[caseId]/route.ts` | artist, rate limit |
| `app/api/artist/music/certification/route.ts` | artist, rate limit |
| `app/api/artist/music/finance/collectibles/route.ts` | artist |
| `app/api/artist/music/generate-preview/route.ts` | artist |
| `app/api/artist/music/payouts/batches/route.ts` | artist |
| `app/api/artist/music/payouts/onboarding/route.ts` | artist |
| `app/api/artist/music/payouts/status/route.ts` | artist |
| `app/api/artist/music/pin/route.ts` | artist |
| `app/api/artist/music/preview-jobs/route.ts` | artist |
| `app/api/artist/music/rights/agreements/route.ts` | artist, rate limit |
| `app/api/artist/music/rights/claims/route.ts` | artist |
| `app/api/artist/music/rights/contributions/route.ts` | artist |
| `app/api/artist/music/rights/evidence/route.ts` | artist, rate limit |
| `app/api/artist/music/rights/invitations/route.ts` | artist, rate limit |
| `app/api/artist/music/rights/parties/route.ts` | artist |
| `app/api/artist/music/rights/passports/route.ts` | artist, rate limit |
| `app/api/artist/music/rights/projects/route.ts` | artist, rate limit |
| `app/api/artist/music/rights/protected-derivatives/route.ts` | artist, rate limit |
| `app/api/artist/music/rights/recordings/route.ts` | artist |
| `app/api/artist/music/rights/signatures/route.ts` | artist, rate limit |
| `app/api/artist/music/rights/works/route.ts` | artist |
| `app/api/artist/music/route.ts` | artist, rate limit |
| `app/api/artist/music/royalties/allocations/route.ts` | artist |
| `app/api/artist/music/royalties/imports/[id]/route.ts` | artist |
| `app/api/artist/music/royalties/imports/route.ts` | artist |
| `app/api/artist/music/royalties/matches/route.ts` | artist |
| `app/api/artist/music/royalties/statements/route.ts` | artist |
| `app/api/artist/music/upload-url/route.ts` | artist, service role, rate limit |
| `app/api/artist/music/valuation/route.ts` | artist |
| `app/api/artist/public-appearance/route.ts` | manual review required |
| `app/api/artists/[id]/music/route.ts` | manual review required |
| `app/api/artists/delete/route.ts` | session/auth |
| `app/api/artists/route.ts` | session/auth |
| `app/api/assets/route.ts` | manual review required |
| `app/api/auth-debug/route.ts` | session/auth |
| `app/api/auth/check-username/route.ts` | service role, rate limit |
| `app/api/auth/session/route.ts` | session/auth |
| `app/api/auth/signup/route.ts` | manual review required |
| `app/api/badges/route.ts` | session/auth |
| `app/api/booking-requests/[id]/decision/route.ts` | manual review required |
| `app/api/booking-requests/[id]/details/route.ts` | manual review required |
| `app/api/booking-requests/[id]/messages/route.ts` | manual review required |
| `app/api/booking-requests/[id]/route.ts` | manual review required |
| `app/api/booking-requests/route.ts` | session/auth, venue, service role |
| `app/api/business/settings/route.ts` | session/auth |
| `app/api/calendar/events/[id]/route.ts` | service role |
| `app/api/calendar/events/route.ts` | service role |
| `app/api/calendar/me/route.ts` | session/auth |
| `app/api/calendar/org/[orgId]/route.ts` | service role |
| `app/api/calendar/tours/[id]/route.ts` | service role |
| `app/api/calendar/tours/route.ts` | service role |
| `app/api/community/activity/route.ts` | service role |
| `app/api/community/stats/route.ts` | service role |
| `app/api/connect/sessions/claim/route.ts` | session/auth |
| `app/api/connect/sessions/confirm/route.ts` | session/auth |
| `app/api/connect/sessions/route.ts` | manual review required |
| `app/api/connect/telemetry/route.ts` | manual review required |
| `app/api/connect/telemetry/summary/route.ts` | service role |
| `app/api/creator-cooperative/benefits/route.ts` | manual review required |
| `app/api/creator-cooperative/collective/route.ts` | manual review required |
| `app/api/creator-cooperative/contributions/route.ts` | manual review required |
| `app/api/creator-cooperative/cross-border/route.ts` | manual review required |
| `app/api/creator-cooperative/entities/route.ts` | manual review required |
| `app/api/creator-cooperative/membership/route.ts` | manual review required |
| `app/api/creator-cooperative/policy/route.ts` | manual review required |
| `app/api/creator-cooperative/research/route.ts` | manual review required |
| `app/api/creator-cooperative/standards/route.ts` | manual review required |
| `app/api/creator-cooperative/vault/route.ts` | manual review required |
| `app/api/creator-digital-commons/assets/route.ts` | manual review required |
| `app/api/creator-digital-commons/gated/route.ts` | manual review required |
| `app/api/creator-digital-commons/governance/route.ts` | manual review required |
| `app/api/creator-digital-commons/operators/route.ts` | manual review required |
| `app/api/creator-digital-commons/participation/route.ts` | manual review required |
| `app/api/creator-digital-commons/protocols/route.ts` | manual review required |
| `app/api/creator-digital-commons/registry/route.ts` | manual review required |
| `app/api/creator-digital-commons/stewards/route.ts` | manual review required |
| `app/api/creator-digital-commons/transition/route.ts` | manual review required |
| `app/api/creator-federation/collective/route.ts` | manual review required |
| `app/api/creator-federation/credentials/route.ts` | organization |
| `app/api/creator-federation/directory/route.ts` | manual review required |
| `app/api/creator-federation/entities/route.ts` | manual review required |
| `app/api/creator-federation/finance/route.ts` | manual review required |
| `app/api/creator-federation/governance/route.ts` | manual review required |
| `app/api/creator-federation/mandates/route.ts` | manual review required |
| `app/api/creator-federation/membership/route.ts` | organization |
| `app/api/creator-federation/sovereignty/route.ts` | manual review required |
| `app/api/creator-federation/transfers/route.ts` | manual review required |
| `app/api/creator-interoperability-convention/approval-packages/route.ts` | manual review required |
| `app/api/creator-interoperability-convention/gated/route.ts` | manual review required |
| `app/api/creator-interoperability-convention/networks/route.ts` | manual review required |
| `app/api/creator-interoperability-convention/recognition/route.ts` | manual review required |
| `app/api/creator-interoperability-convention/status/route.ts` | manual review required |
| `app/api/creator-interoperability-institution/gated/route.ts` | manual review required |
| `app/api/creator-interoperability-institution/participants/route.ts` | manual review required |
| `app/api/creator-interoperability-institution/readiness-packages/route.ts` | manual review required |
| `app/api/creator-interoperability-institution/services/route.ts` | manual review required |
| `app/api/creator-interoperability-institution/status/route.ts` | manual review required |
| `app/api/creator-interoperability-organization/feasibility-packages/route.ts` | manual review required |
| `app/api/creator-interoperability-organization/gated/route.ts` | manual review required |
| `app/api/creator-interoperability-organization/instruments/route.ts` | manual review required |
| `app/api/creator-interoperability-organization/participant-authority/route.ts` | manual review required |
| `app/api/creator-interoperability-organization/status/route.ts` | organization |
| `app/api/creator-multilateral-treaty-operations/gated/route.ts` | manual review required |
| `app/api/creator-multilateral-treaty-operations/readiness-packages/route.ts` | manual review required |
| `app/api/creator-multilateral-treaty-operations/review-cycles/route.ts` | manual review required |
| `app/api/creator-multilateral-treaty-operations/status/route.ts` | manual review required |
| `app/api/creator-protocol-constitution/amendments/route.ts` | manual review required |
| `app/api/creator-protocol-constitution/assets/route.ts` | manual review required |
| `app/api/creator-protocol-constitution/constitutions/route.ts` | manual review required |
| `app/api/creator-protocol-constitution/gated/route.ts` | manual review required |
| `app/api/creator-protocol-constitution/governance/route.ts` | manual review required |
| `app/api/creator-protocol-constitution/membership/route.ts` | organization |
| `app/api/creator-protocol-constitution/operators/route.ts` | manual review required |
| `app/api/creator-protocol-constitution/review/route.ts` | manual review required |
| `app/api/creator-protocol-constitution/sovereignty/route.ts` | manual review required |
| `app/api/creator-protocol-constitution/succession/route.ts` | manual review required |
| `app/api/creator-public-infrastructure/conformance/route.ts` | manual review required |
| `app/api/creator-public-infrastructure/credentials/route.ts` | manual review required |
| `app/api/creator-public-infrastructure/directory/route.ts` | entity/RBAC |
| `app/api/creator-public-infrastructure/entities/route.ts` | manual review required |
| `app/api/creator-public-infrastructure/gated/route.ts` | rate limit |
| `app/api/creator-public-infrastructure/governance/route.ts` | manual review required |
| `app/api/creator-public-infrastructure/identifiers/route.ts` | manual review required |
| `app/api/creator-public-infrastructure/participation/route.ts` | manual review required |
| `app/api/creator-public-infrastructure/rights-resolver/route.ts` | manual review required |
| `app/api/creator-public-infrastructure/trust/route.ts` | manual review required |
| `app/api/creator-treaty-system-legacy/custody/route.ts` | manual review required |
| `app/api/creator-treaty-system-legacy/ethics/route.ts` | manual review required |
| `app/api/creator-treaty-system-legacy/gated/route.ts` | manual review required |
| `app/api/creator-treaty-system-legacy/identifiers/route.ts` | manual review required |
| `app/api/creator-treaty-system-legacy/readiness-packages/route.ts` | manual review required |
| `app/api/creator-treaty-system-legacy/status/route.ts` | manual review required |
| `app/api/creator-treaty-system-renewal/archives/route.ts` | manual review required |
| `app/api/creator-treaty-system-renewal/gated/route.ts` | manual review required |
| `app/api/creator-treaty-system-renewal/readiness-packages/route.ts` | manual review required |
| `app/api/creator-treaty-system-renewal/status/route.ts` | manual review required |
| `app/api/creator-treaty-system-renewal/sunset/route.ts` | manual review required |
| `app/api/cron/admin-publication-outbox/route.ts` | service role |
| `app/api/cron/contract-sign-reminders/route.ts` | service role |
| `app/api/cron/event-reminders/route.ts` | service role |
| `app/api/cron/events/sync/route.ts` | entity/RBAC, service role |
| `app/api/cron/social-analytics/route.ts` | service role |
| `app/api/cron/staffing-overview-refresh/route.ts` | service role |
| `app/api/cron/ticket-invite-expiry/route.ts` | manual review required |
| `app/api/cron/workflow-automations/route.ts` | manual review required |
| `app/api/dashboard/action-center/route.ts` | session/auth |
| `app/api/dashboard/metrics/route.ts` | manual review required |
| `app/api/debug-auth/route.ts` | session/auth |
| `app/api/debug/check-artist-profile/route.ts` | service role |
| `app/api/debug/db-schema/route.ts` | service role |
| `app/api/debug/fix-profile/route.ts` | session/auth |
| `app/api/debug/profile-check/route.ts` | session/auth |
| `app/api/debug/profiles/route.ts` | manual review required |
| `app/api/debug/route.ts` | manual review required |
| `app/api/debug/tables/route.ts` | service role |
| `app/api/debug/test-direct-query/route.ts` | service role |
| `app/api/discover/route.ts` | session/auth |
| `app/api/employer/vetting/[applicationId]/route.ts` | session/auth |
| `app/api/endorsements/route.ts` | session/auth |
| `app/api/epk/telemetry/route.ts` | manual review required |
| `app/api/events/[id]/attendance/route.ts` | session/auth |
| `app/api/events/[id]/claim/route.ts` | session/auth, service role |
| `app/api/events/[id]/finances/route.ts` | manual review required |
| `app/api/events/[id]/group-chats/[chatId]/messages/route.ts` | service role |
| `app/api/events/[id]/group-chats/route.ts` | service role |
| `app/api/events/[id]/guestlist/route.ts` | manual review required |
| `app/api/events/[id]/hq/calendar/route.ts` | service role |
| `app/api/events/[id]/hq/permissions/route.ts` | session/auth, service role |
| `app/api/events/[id]/hq/resources/route.ts` | service role |
| `app/api/events/[id]/hq/route.ts` | venue, service role |
| `app/api/events/[id]/incidents/route.ts` | manual review required |
| `app/api/events/[id]/job-postings/route.ts` | session/auth, entity/RBAC |
| `app/api/events/[id]/jobs/route.ts` | manual review required |
| `app/api/events/[id]/locations/route.ts` | manual review required |
| `app/api/events/[id]/page/route.ts` | session/auth |
| `app/api/events/[id]/participants/route.ts` | manual review required |
| `app/api/events/[id]/posts/route.ts` | session/auth |
| `app/api/events/[id]/route.ts` | manual review required |
| `app/api/events/[id]/share-message/route.ts` | session/auth, service role |
| `app/api/events/[id]/staff/[shiftId]/route.ts` | admin, entity/RBAC |
| `app/api/events/[id]/staff/invites/route.ts` | admin, entity/RBAC |
| `app/api/events/[id]/staff/route.ts` | admin, entity/RBAC |
| `app/api/events/[id]/tasks/[taskId]/route.ts` | manual review required |
| `app/api/events/[id]/tasks/route.ts` | manual review required |
| `app/api/events/[id]/tour/route.ts` | session/auth, service role |
| `app/api/events/[id]/vendors/[vendorId]/route.ts` | manual review required |
| `app/api/events/[id]/vendors/route.ts` | manual review required |
| `app/api/events/discover/route.ts` | service role |
| `app/api/events/me/attending/route.ts` | session/auth |
| `app/api/events/planner/publish/route.ts` | session/auth |
| `app/api/events/planner/route.ts` | session/auth |
| `app/api/events/route.ts` | manual review required |
| `app/api/events/search/route.ts` | manual review required |
| `app/api/feed/blogs/route.ts` | service role |
| `app/api/feed/collaborations/pending/route.ts` | session/auth |
| `app/api/feed/for-you/route.ts` | session/auth |
| `app/api/feed/music/route.ts` | manual review required |
| `app/api/feed/posts/[id]/collaborators/route.ts` | session/auth |
| `app/api/feed/posts/route.ts` | session/auth, venue, artist, service role |
| `app/api/feed/rss-news/route.ts` | manual review required |
| `app/api/feed/videos/route.ts` | service role |
| `app/api/follow/route.ts` | session/auth |
| `app/api/forums/[slug]/route.ts` | session/auth |
| `app/api/forums/[slug]/subscribe/route.ts` | manual review required |
| `app/api/forums/[slug]/tags/route.ts` | manual review required |
| `app/api/forums/[slug]/threads/route.ts` | manual review required |
| `app/api/forums/comments/[id]/vote/route.ts` | manual review required |
| `app/api/forums/route.ts` | manual review required |
| `app/api/forums/threads/[id]/comments/route.ts` | manual review required |
| `app/api/forums/threads/[id]/vote/route.ts` | manual review required |
| `app/api/groups/threads/[id]/members/route.ts` | session/auth, service role |
| `app/api/groups/threads/[id]/messages/[messageId]/reactions/route.ts` | session/auth, service role |
| `app/api/groups/threads/[id]/messages/route.ts` | session/auth, service role |
| `app/api/groups/threads/[id]/route.ts` | session/auth, service role |
| `app/api/groups/threads/route.ts` | session/auth, service role |
| `app/api/health/readyz/route.ts` | session/auth |
| `app/api/health/route.ts` | session/auth |
| `app/api/hiring/applications/[id]/route.ts` | manual review required |
| `app/api/hiring/applications/[id]/star/route.ts` | manual review required |
| `app/api/hiring/applications/document/route.ts` | session/auth, service role |
| `app/api/hiring/applications/route.ts` | manual review required |
| `app/api/hiring/applications/upload/route.ts` | session/auth |
| `app/api/hiring/apply/profile-preview/route.ts` | session/auth |
| `app/api/hiring/candidates/[id]/approve/route.ts` | entity/RBAC |
| `app/api/hiring/candidates/[id]/assignment/route.ts` | entity/RBAC |
| `app/api/hiring/candidates/[id]/onboarding/route.ts` | entity/RBAC |
| `app/api/hiring/dashboard/route.ts` | manual review required |
| `app/api/hiring/invite/route.ts` | manual review required |
| `app/api/hiring/job-postings/[id]/repost/route.ts` | manual review required |
| `app/api/hiring/job-postings/[id]/route.ts` | manual review required |
| `app/api/hiring/job-postings/options/route.ts` | manual review required |
| `app/api/hiring/job-postings/route.ts` | manual review required |
| `app/api/hiring/onboarding/compliance/[candidateId]/route.ts` | session/auth |
| `app/api/hiring/onboarding/sensitive/[candidateId]/route.ts` | manual review required |
| `app/api/hiring/onboarding/upload/route.ts` | session/auth |
| `app/api/hiring/roster/[memberId]/assignment/route.ts` | entity/RBAC |
| `app/api/hiring/roster/[memberId]/route.ts` | entity/RBAC |
| `app/api/hiring/roster/export/route.ts` | entity/RBAC |
| `app/api/hiring/roster/route.ts` | entity/RBAC |
| `app/api/hub/route.ts` | session/auth |
| `app/api/institutional/auctions/route.ts` | manual review required |
| `app/api/institutional/bids/route.ts` | manual review required |
| `app/api/institutional/classifications/route.ts` | manual review required |
| `app/api/institutional/data-rooms/route.ts` | manual review required |
| `app/api/institutional/diligence/route.ts` | manual review required |
| `app/api/institutional/funds/route.ts` | manual review required |
| `app/api/institutional/iois/route.ts` | manual review required |
| `app/api/institutional/nav/route.ts` | manual review required |
| `app/api/institutional/opportunities/route.ts` | manual review required |
| `app/api/institutional/organizations/route.ts` | manual review required |
| `app/api/institutional/partners/webhooks/[provider]/route.ts` | service role |
| `app/api/institutional/portfolio/route.ts` | manual review required |
| `app/api/institutional/reports/route.ts` | manual review required |
| `app/api/institutional/transactions/route.ts` | manual review required |
| `app/api/institutional/underwriting/route.ts` | manual review required |
| `app/api/integrations/bandsintown/connect/route.ts` | session/auth, artist, service role |
| `app/api/integrations/bandsintown/disconnect/route.ts` | session/auth, service role |
| `app/api/integrations/bandsintown/status/route.ts` | session/auth |
| `app/api/invitations/route.ts` | service role |
| `app/api/job-applications/route.ts` | session/auth, service role |
| `app/api/job-board/route.ts` | manual review required |
| `app/api/job-postings/[id]/route.ts` | manual review required |
| `app/api/jobs/route.ts` | session/auth, service role |
| `app/api/jukebox/following-tracks/route.ts` | session/auth |
| `app/api/licensing/agreements/route.ts` | manual review required |
| `app/api/licensing/approvals/route.ts` | manual review required |
| `app/api/licensing/availability/route.ts` | manual review required |
| `app/api/licensing/briefs/route.ts` | manual review required |
| `app/api/licensing/cue-sheets/route.ts` | manual review required |
| `app/api/licensing/deliveries/route.ts` | manual review required |
| `app/api/licensing/discovery/route.ts` | manual review required |
| `app/api/licensing/invoices/route.ts` | manual review required |
| `app/api/licensing/partners/webhooks/[provider]/route.ts` | service role |
| `app/api/licensing/projects/route.ts` | manual review required |
| `app/api/licensing/quotes/route.ts` | manual review required |
| `app/api/licensing/requests/route.ts` | manual review required |
| `app/api/licensing/usage/route.ts` | manual review required |
| `app/api/link-preview/route.ts` | manual review required |
| `app/api/locations/route.ts` | session/auth |
| `app/api/marketplace/admin/fee-rules/route.ts` | session/auth, admin, service role |
| `app/api/marketplace/admin/moderation/route.ts` | session/auth, admin, service role |
| `app/api/marketplace/admin/overview/route.ts` | session/auth, admin, service role |
| `app/api/marketplace/admin/webhook-events/route.ts` | session/auth, admin, service role |
| `app/api/marketplace/analytics/route.ts` | manual review required |
| `app/api/marketplace/checkout/route.ts` | session/auth, service role |
| `app/api/marketplace/delivery/[orderItemId]/route.ts` | manual review required |
| `app/api/marketplace/discover/route.ts` | session/auth |
| `app/api/marketplace/integrations/printful/route.ts` | session/auth, service role |
| `app/api/marketplace/integrations/printful/webhook/route.ts` | service role |
| `app/api/marketplace/integrations/route.ts` | session/auth |
| `app/api/marketplace/integrations/shopify/callback/route.ts` | session/auth, service role |
| `app/api/marketplace/integrations/shopify/route.ts` | session/auth, service role |
| `app/api/marketplace/integrations/shopify/webhook/route.ts` | service role |
| `app/api/marketplace/listings/[id]/lifecycle/route.ts` | manual review required |
| `app/api/marketplace/listings/[id]/redirect/route.ts` | manual review required |
| `app/api/marketplace/listings/[id]/route.ts` | session/auth, artist |
| `app/api/marketplace/listings/import-external/route.ts` | manual review required |
| `app/api/marketplace/listings/route.ts` | session/auth, artist |
| `app/api/marketplace/migrations/backfill-artist-merch/route.ts` | session/auth |
| `app/api/marketplace/migrations/backfill-artist-music/route.ts` | session/auth |
| `app/api/marketplace/moderation/route.ts` | session/auth |
| `app/api/marketplace/order/[token]/claim/route.ts` | session/auth, service role |
| `app/api/marketplace/order/[token]/route.ts` | service role |
| `app/api/marketplace/orders/[id]/cancel/route.ts` | service role |
| `app/api/marketplace/orders/[id]/refund/route.ts` | service role |
| `app/api/marketplace/orders/route.ts` | manual review required |
| `app/api/marketplace/payouts/route.ts` | session/auth |
| `app/api/marketplace/seller-agreement/route.ts` | session/auth |
| `app/api/marketplace/service-offers/route.ts` | manual review required |
| `app/api/marketplace/service-orders/[orderItemId]/route.ts` | session/auth |
| `app/api/marketplace/service-requests/[id]/action/route.ts` | manual review required |
| `app/api/marketplace/service-requests/[id]/route.ts` | manual review required |
| `app/api/marketplace/service-requests/route.ts` | session/auth |
| `app/api/marketplace/share-to-feed/route.ts` | manual review required |
| `app/api/marketplace/storefront/route.ts` | session/auth |
| `app/api/marketplace/tax/quote/route.ts` | manual review required |
| `app/api/marketplace/webhook/route.ts` | service role |
| `app/api/me/applications/route.ts` | session/auth |
| `app/api/messages/[conversationId]/accept/route.ts` | session/auth, service role |
| `app/api/messages/[conversationId]/context/route.ts` | session/auth, service role |
| `app/api/messages/[conversationId]/decline/route.ts` | session/auth, service role |
| `app/api/messages/[conversationId]/realtime/route.ts` | service role |
| `app/api/messages/friends/route.ts` | service role |
| `app/api/messages/route.ts` | service role, rate limit |
| `app/api/messages/unified-list/route.ts` | service role |
| `app/api/messages/unread-count/route.ts` | service role |
| `app/api/messages/user-search/route.ts` | session/auth, service role |
| `app/api/migrations/create-onboarding/route.ts` | manual review required |
| `app/api/migrations/create-profiles/route.ts` | manual review required |
| `app/api/migrations/create-tables/route.ts` | manual review required |
| `app/api/migrations/setup-policies/route.ts` | manual review required |
| `app/api/music-marketplace/catalog-links/route.ts` | manual review required |
| `app/api/music-marketplace/disclosures/route.ts` | manual review required |
| `app/api/music-marketplace/documents/route.ts` | manual review required |
| `app/api/music-marketplace/flags/route.ts` | manual review required |
| `app/api/music-marketplace/investor-account/route.ts` | manual review required |
| `app/api/music-marketplace/issuers/route.ts` | manual review required |
| `app/api/music-marketplace/market-data/route.ts` | manual review required |
| `app/api/music-marketplace/offerings/route.ts` | manual review required |
| `app/api/music-marketplace/orders/route.ts` | manual review required |
| `app/api/music-marketplace/pathway/route.ts` | manual review required |
| `app/api/music-marketplace/portfolio/route.ts` | manual review required |
| `app/api/music-marketplace/subscriptions/route.ts` | manual review required |
| `app/api/music-marketplace/transfers/route.ts` | manual review required |
| `app/api/music/certificate/[publicId]/dispute/route.ts` | rate limit |
| `app/api/music/certificate/[publicId]/route.ts` | service role, rate limit |
| `app/api/music/comment/route.ts` | session/auth |
| `app/api/music/cover/route.ts` | service role |
| `app/api/music/download/route.ts` | session/auth |
| `app/api/music/favorites/route.ts` | session/auth |
| `app/api/music/history/route.ts` | session/auth |
| `app/api/music/import/route.ts` | session/auth, artist, rate limit |
| `app/api/music/library/route.ts` | manual review required |
| `app/api/music/like/route.ts` | session/auth |
| `app/api/music/origin/[publicId]/route.ts` | service role, rate limit |
| `app/api/music/play/route.ts` | session/auth |
| `app/api/music/playback/resolve/route.ts` | entity/RBAC, rate limit |
| `app/api/music/playlists/[playlistId]/items/route.ts` | session/auth |
| `app/api/music/playlists/[playlistId]/route.ts` | session/auth |
| `app/api/music/playlists/route.ts` | session/auth |
| `app/api/music/profile-featured-track/route.ts` | session/auth |
| `app/api/music/providers/audius/search/route.ts` | session/auth, rate limit |
| `app/api/music/providers/audius/stream/route.ts` | session/auth, rate limit |
| `app/api/music/providers/audius/tracks/[trackId]/route.ts` | manual review required |
| `app/api/music/providers/audius/trending/route.ts` | session/auth, rate limit |
| `app/api/music/public-item/route.ts` | manual review required |
| `app/api/music/report/route.ts` | session/auth, rate limit |
| `app/api/music/rights/passports/[publicId]/route.ts` | service role, rate limit |
| `app/api/music/rights/verify/[publicId]/route.ts` | service role, rate limit |
| `app/api/music/share-message/route.ts` | session/auth, service role |
| `app/api/music/share/route.ts` | manual review required |
| `app/api/music/social-status/route.ts` | manual review required |
| `app/api/music/stream/route.ts` | session/auth |
| `app/api/news/feed/route.ts` | session/auth |
| `app/api/notifications/analytics/route.ts` | session/auth, service role |
| `app/api/notifications/preferences/route.ts` | session/auth, service role |
| `app/api/notifications/route.ts` | session/auth, service role |
| `app/api/notifications/social/route.ts` | session/auth, service role |
| `app/api/notifications/test/route.ts` | session/auth, service role |
| `app/api/onboarding-templates/[id]/route.ts` | session/auth, admin, service role |
| `app/api/onboarding-templates/route.ts` | session/auth, admin, service role |
| `app/api/onboarding/[token]/route.ts` | session/auth |
| `app/api/onboarding/create-account/route.ts` | session/auth |
| `app/api/onboarding/submit/route.ts` | session/auth |
| `app/api/onboarding/unified/route.ts` | session/auth |
| `app/api/onboarding/validate-invitation/route.ts` | manual review required |
| `app/api/opportunities/route.ts` | session/auth, service role |
| `app/api/opportunities/sync/route.ts` | service role |
| `app/api/organization/artist-members/route.ts` | organization, artist |
| `app/api/organization/tour-managers/route.ts` | session/auth |
| `app/api/organizers/[slug]/route.ts` | session/auth |
| `app/api/orgs/invite/accept/route.ts` | session/auth, rate limit |
| `app/api/orgs/invite/revoke/route.ts` | session/auth, rate limit |
| `app/api/partners/finance/offerings/[id]/orders/route.ts` | manual review required |
| `app/api/payment/route.ts` | session/auth, service role |
| `app/api/photos/[id]/like/route.ts` | session/auth |
| `app/api/photos/[id]/route.ts` | session/auth |
| `app/api/photos/[id]/tags/route.ts` | session/auth |
| `app/api/photos/albums/[id]/route.ts` | session/auth |
| `app/api/photos/albums/route.ts` | session/auth |
| `app/api/photos/marketplace/route.ts` | manual review required |
| `app/api/photos/purchase/route.ts` | session/auth |
| `app/api/photos/purchase/webhook/route.ts` | service role |
| `app/api/photos/upload/route.ts` | session/auth |
| `app/api/planning/venues/search/route.ts` | session/auth, artist, service role, rate limit |
| `app/api/polls/analytics/route.ts` | manual review required |
| `app/api/portfolio/upload/route.ts` | session/auth |
| `app/api/post-appearance/preview/route.ts` | manual review required |
| `app/api/post-style-profiles/[id]/default/route.ts` | manual review required |
| `app/api/post-style-profiles/[id]/route.ts` | manual review required |
| `app/api/post-style-profiles/route.ts` | manual review required |
| `app/api/post-styles/bootstrap/route.ts` | session/auth |
| `app/api/posts/[id]/comments/route.ts` | rate limit |
| `app/api/posts/[id]/likes/route.ts` | manual review required |
| `app/api/posts/[id]/poll/vote/route.ts` | service role |
| `app/api/posts/[id]/route.ts` | session/auth, service role |
| `app/api/posts/[id]/shares/route.ts` | manual review required |
| `app/api/posts/create/route.ts` | manual review required |
| `app/api/posts/pin/route.ts` | session/auth |
| `app/api/posts/route.ts` | manual review required |
| `app/api/posts/share/route.ts` | manual review required |
| `app/api/posts/user/[userId]/route.ts` | session/auth |
| `app/api/press/releases/[id]/pdf/route.ts` | service role |
| `app/api/press/releases/[id]/route.ts` | artist, service role |
| `app/api/press/releases/[id]/share/route.ts` | service role |
| `app/api/profile/[username]/recognition/route.ts` | manual review required |
| `app/api/profile/[username]/route.ts` | session/auth |
| `app/api/profile/avatar/route.ts` | session/auth |
| `app/api/profile/check-url/route.ts` | session/auth |
| `app/api/profile/check-username/route.ts` | session/auth |
| `app/api/profile/colors/route.ts` | session/auth |
| `app/api/profile/create/route.ts` | session/auth |
| `app/api/profile/current/posts/route.ts` | session/auth |
| `app/api/profile/current/route.ts` | session/auth |
| `app/api/profile/custom-design/route.ts` | session/auth |
| `app/api/profile/route.ts` | session/auth |
| `app/api/profile/update-appearance/route.ts` | session/auth |
| `app/api/profile/update-optimized/route.ts` | session/auth |
| `app/api/profile/update/route.ts` | session/auth |
| `app/api/profile/username-available/route.ts` | manual review required |
| `app/api/promotions/route.ts` | session/auth |
| `app/api/publication/shared/[token]/route.ts` | manual review required |
| `app/api/pulse/articles/[id]/engage/route.ts` | service role |
| `app/api/pulse/articles/[id]/route.ts` | manual review required |
| `app/api/pulse/articles/route.ts` | service role |
| `app/api/rights-admin/cases/route.ts` | manual review required |
| `app/api/rights-admin/claims/route.ts` | manual review required |
| `app/api/rights-admin/deadlines/route.ts` | manual review required |
| `app/api/rights-admin/disputes/route.ts` | manual review required |
| `app/api/rights-admin/dmca/route.ts` | manual review required |
| `app/api/rights-admin/mandates/route.ts` | manual review required |
| `app/api/rights-admin/matches/route.ts` | manual review required |
| `app/api/rights-admin/observations/route.ts` | manual review required |
| `app/api/rights-admin/partners/webhooks/[provider]/route.ts` | service role |
| `app/api/rights-admin/platform-policies/route.ts` | manual review required |
| `app/api/rights-admin/registrations/route.ts` | manual review required |
| `app/api/rights-admin/settlements/route.ts` | manual review required |
| `app/api/rights-admin/usage/route.ts` | manual review required |
| `app/api/rights-intelligence/alerts/route.ts` | manual review required |
| `app/api/rights-intelligence/benchmarks/route.ts` | manual review required |
| `app/api/rights-intelligence/clean-rooms/route.ts` | manual review required |
| `app/api/rights-intelligence/cohorts/route.ts` | manual review required |
| `app/api/rights-intelligence/collective/route.ts` | manual review required |
| `app/api/rights-intelligence/consents/route.ts` | manual review required |
| `app/api/rights-intelligence/datasets/route.ts` | manual review required |
| `app/api/rights-intelligence/education/route.ts` | manual review required |
| `app/api/rights-intelligence/groups/[id]/proposals/route.ts` | manual review required |
| `app/api/rights-intelligence/groups/route.ts` | manual review required |
| `app/api/rights-intelligence/metrics/route.ts` | manual review required |
| `app/api/search/enhanced/route.ts` | artist, entity/RBAC, rate limit |
| `app/api/search/global/route.ts` | manual review required |
| `app/api/search/route.ts` | manual review required |
| `app/api/search/unified/route.ts` | manual review required |
| `app/api/settings/capabilities/route.ts` | session/auth, entity/RBAC |
| `app/api/settings/certifications/route.ts` | session/auth |
| `app/api/settings/certifications/upload/route.ts` | session/auth |
| `app/api/settings/experience/route.ts` | session/auth |
| `app/api/settings/portfolio/route.ts` | session/auth |
| `app/api/settings/profile/full/route.ts` | session/auth |
| `app/api/settings/profile/route.ts` | session/auth |
| `app/api/settings/route.ts` | session/auth |
| `app/api/settings/skills/top/route.ts` | session/auth |
| `app/api/setup-storage/route.ts` | session/auth |
| `app/api/site-maps/public/[token]/route.ts` | service role |
| `app/api/site-maps/shared/route.ts` | session/auth |
| `app/api/skills/endorse/route.ts` | session/auth |
| `app/api/social/all-users/route.ts` | session/auth, service role |
| `app/api/social/follow-request/route.ts` | session/auth, service role |
| `app/api/social/follow/route.ts` | session/auth |
| `app/api/social/friend-search/route.ts` | session/auth |
| `app/api/social/oauth/callback/route.ts` | session/auth |
| `app/api/social/oauth/start/route.ts` | session/auth |
| `app/api/social/relationship/route.ts` | session/auth |
| `app/api/social/simple-connection-request/route.ts` | session/auth |
| `app/api/social/simple-suggestions/route.ts` | session/auth |
| `app/api/social/suggested/route.ts` | session/auth, service role |
| `app/api/social/suggestions/route.ts` | session/auth |
| `app/api/staff/ops/route.ts` | session/auth |
| `app/api/staffing/employee-overview/route.ts` | session/auth, rate limit |
| `app/api/staffing/employees/route.ts` | session/auth, rate limit |
| `app/api/staffing/health/route.ts` | session/auth, rate limit |
| `app/api/staffing/invitations/[token]/route.ts` | manual review required |
| `app/api/staffing/ops-actions/route.ts` | session/auth, rate limit |
| `app/api/staffing/permissions/route.ts` | session/auth, entity/RBAC, rate limit |
| `app/api/storage/ensure/route.ts` | manual review required |
| `app/api/stripe/connect/route.ts` | session/auth, entity/RBAC |
| `app/api/subscriptions/checkout/route.ts` | session/auth |
| `app/api/subscriptions/portal/route.ts` | session/auth |
| `app/api/subscriptions/tiers/sync/route.ts` | session/auth |
| `app/api/subscriptions/webhook/route.ts` | service role |
| `app/api/test-db/route.ts` | session/auth |
| `app/api/test-header-url/route.ts` | session/auth |
| `app/api/test-rss/route.ts` | manual review required |
| `app/api/test-venues/route.ts` | manual review required |
| `app/api/ticketing/allocations/route.ts` | session/auth |
| `app/api/ticketing/box-office/route.ts` | session/auth, service role |
| `app/api/ticketing/check-in/route.ts` | session/auth, service role, rate limit |
| `app/api/ticketing/config/route.ts` | session/auth, organization |
| `app/api/ticketing/delivery/route.ts` | session/auth, service role |
| `app/api/ticketing/enhanced/route.ts` | session/auth, service role |
| `app/api/ticketing/events/[eventId]/allocations/route.ts` | session/auth |
| `app/api/ticketing/events/[eventId]/attendees/route.ts` | session/auth |
| `app/api/ticketing/events/[eventId]/eligible-recipients/route.ts` | session/auth |
| `app/api/ticketing/events/[eventId]/invites/[inviteId]/[action]/route.ts` | session/auth, service role |
| `app/api/ticketing/events/[eventId]/invites/route.ts` | session/auth |
| `app/api/ticketing/events/[eventId]/sales-orders/route.ts` | session/auth, service role |
| `app/api/ticketing/events/[eventId]/workspace/route.ts` | session/auth |
| `app/api/ticketing/invites/[token]/accept/route.ts` | session/auth |
| `app/api/ticketing/invites/[token]/decline/route.ts` | session/auth |
| `app/api/ticketing/invites/[token]/route.ts` | manual review required |
| `app/api/ticketing/reports/route.ts` | session/auth |
| `app/api/ticketing/route.ts` | manual review required |
| `app/api/ticketing/settlements/route.ts` | session/auth, organization, venue |
| `app/api/ticketing/transfers/route.ts` | session/auth |
| `app/api/ticketing/verify/route.ts` | service role |
| `app/api/ticketing/wallet/route.ts` | session/auth |
| `app/api/ticketing/webhook/route.ts` | service role |
| `app/api/tours/[id]/assign-user-to-team/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/assign-user/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/events/[eventId]/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/events/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/invites/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/jobs/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/team/[memberId]/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/team/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/vendors/[vendorId]/route.ts` | admin, entity/RBAC |
| `app/api/tours/[id]/vendors/route.ts` | admin, entity/RBAC |
| `app/api/tours/invitations/[token]/route.ts` | session/auth, service role |
| `app/api/tours/planner/artists/route.ts` | manual review required |
| `app/api/tours/planner/crew/route.ts` | manual review required |
| `app/api/tours/planner/route.ts` | admin, entity/RBAC, service role |
| `app/api/tours/planner/venues/route.ts` | manual review required |
| `app/api/tours/route.ts` | manual review required |
| `app/api/upload-profile-image/route.ts` | session/auth, rate limit |
| `app/api/upload/signed-url/route.ts` | session/auth, rate limit |
| `app/api/ux/telemetry/route.ts` | session/auth |
| `app/api/venue/analytics/export/route.ts` | session/auth, venue, service role |
| `app/api/venue/analytics/route.ts` | session/auth, venue, service role |
| `app/api/venue/booking-requests/route.ts` | session/auth, venue, service role |
| `app/api/venue/current/route.ts` | session/auth, venue |
| `app/api/venue/documents/[id]/route.ts` | session/auth, venue, service role |
| `app/api/venue/documents/bulk-delete/route.ts` | session/auth, venue, service role |
| `app/api/venue/equipment/route.ts` | session/auth, venue, service role |
| `app/api/venue/events/[id]/route.ts` | session/auth, venue, service role |
| `app/api/venue/events/[id]/ticketing-setup/route.ts` | session/auth, entity/RBAC, service role |
| `app/api/venue/events/route.ts` | session/auth, venue, service role |
| `app/api/venue/finances/export/route.ts` | session/auth, venue, service role |
| `app/api/venue/finances/payout/route.ts` | session/auth, venue |
| `app/api/venue/finances/route.ts` | session/auth, venue, entity/RBAC, service role |
| `app/api/venue/hiring/applications/[id]/route.ts` | session/auth, venue, service role |
| `app/api/venue/hiring/applications/route.ts` | session/auth, venue, service role |
| `app/api/venue/hiring/audit/route.ts` | session/auth, venue, service role |
| `app/api/venue/hiring/job-postings/[id]/route.ts` | session/auth, venue, service role |
| `app/api/venue/hiring/job-postings/route.ts` | session/auth, venue, service role |
| `app/api/venue/hiring/route.ts` | session/auth, venue, service role |
| `app/api/venue/integrations/route.ts` | session/auth, venue, entity/RBAC, service role |
| `app/api/venue/notification-routing/route.ts` | session/auth, venue, entity/RBAC, service role |
| `app/api/venue/onboarding/summary/route.ts` | session/auth |
| `app/api/venue/permissions/route.ts` | venue, entity/RBAC, service role |
| `app/api/venue/roles/[id]/route.ts` | session/auth, venue, service role |
| `app/api/venue/roles/route.ts` | session/auth, venue, entity/RBAC, service role |
| `app/api/venue/shifts/[id]/route.ts` | session/auth, venue, service role |
| `app/api/venue/shifts/assignments/route.ts` | session/auth, venue, service role |
| `app/api/venue/shifts/requests/route.ts` | session/auth, venue, service role |
| `app/api/venue/shifts/route.ts` | session/auth, venue, service role |
| `app/api/venue/shifts/swaps/route.ts` | session/auth, venue, service role |
| `app/api/venue/site-maps/[id]/route.ts` | session/auth |
| `app/api/venue/site-maps/[id]/save/route.ts` | session/auth, venue, service role |
| `app/api/venue/staff-onboarding/route.ts` | manual review required |
| `app/api/venue/staff-profiles/route.ts` | session/auth, venue, service role |
| `app/api/venue/team/route.ts` | session/auth, venue, service role |
| `app/api/venue/ticketing/route.ts` | session/auth, venue, service role |
| `app/api/venue/user-roles/[userId]/[roleId]/route.ts` | session/auth, venue, service role |
| `app/api/venue/user-roles/route.ts` | session/auth, venue, entity/RBAC, service role |
| `app/api/venues/[id]/reviews/route.ts` | session/auth, venue, service role |
| `app/api/venues/[id]/route.ts` | session/auth, venue |
| `app/api/venues/[id]/venue-kit/route.ts` | manual review required |
| `app/api/venues/delete/route.ts` | session/auth |
| `app/api/venues/route.ts` | session/auth |
| `app/api/webhooks/music-marketplace/[partner]/route.ts` | service role |
| `app/api/webhooks/music-royalty-payouts/route.ts` | service role |
| `app/api/webhooks/supabase/notifications/route.ts` | service role |
| `app/api/work-mode/assignments/[id]/actions/route.ts` | session/auth |
| `app/api/work-mode/assignments/[id]/respond/route.ts` | session/auth |
| `app/api/work-mode/assignments/[id]/route.ts` | session/auth |
| `app/api/work-mode/assignments/route.ts` | session/auth |
| `app/api/work-mode/communications/[id]/respond/route.ts` | session/auth, service role |
| `app/api/work-mode/events/[eventId]/route.ts` | session/auth |
| `app/api/work-mode/overview/route.ts` | session/auth |
| `app/api/work/site-maps/[id]/route.ts` | session/auth |
| `app/api/workflows/threads/[id]/events/route.ts` | manual review required |
| `app/api/workflows/threads/[id]/messages/route.ts` | manual review required |
| `app/api/workflows/threads/[id]/participants/route.ts` | manual review required |
| `app/api/workflows/threads/[id]/tasks/route.ts` | manual review required |
| `app/api/workflows/threads/route.ts` | rate limit |
| `app/api/workforce/requests/notify/route.ts` | session/auth, service role |
| `app/api/world/globe/route.ts` | manual review required |
| `app/api/world/pilot/[slug]/route.ts` | manual review required |
| `app/api/world/pilot/route.ts` | manual review required |
| `app/api/world/pilot/search/route.ts` | manual review required |
