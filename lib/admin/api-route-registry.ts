/**
 * REL-103 / SEC-104 — Admin API authorization contract registry.
 * Every app/api/admin/.../route.ts must appear here.
 * legacy_pending_migration must trend to capability_gated via SEC-104 migrations.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities";

export type AdminRouteMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type AdminRouteAuthClass =
  | "acting_context_required"
  | "authenticated_user"
  | "capability_gated"
  | "platform_admin"
  | "public_share_token"
  | "service_job"
  | "legacy_pending_migration"
  | "read_only_compat";

export interface AdminRouteContract {
  route: string;
  methods: AdminRouteMethod[];
  authClass: AdminRouteAuthClass;
  capability?: AdminCapability;
  idempotency?: boolean;
  audit?: boolean;
  auditMethods?: AdminRouteMethod[];
  owner: string;
}

export type AdminActingContextContract =
  | "acting_account_required"
  | "authenticated_user"
  | "authenticated_compatibility"
  | "platform_admin"
  | "public_share_token"
  | "service_principal";

export type AdminIdempotencyContract =
  | "not_applicable"
  | "required"
  | "legacy_missing";
export type AdminAuditContract =
  | "required"
  | "not_applicable"
  | "legacy_missing";

export type AdminTenantTargetContract =
  | "acting_organization"
  | "organization_entity"
  | "platform"
  | "public_share"
  | "service_scope";

export type AdminServiceRoleContract = "none" | "approved_job" | "legacy_bare";

export type AdminRouteVisibility =
  | "authenticated_user"
  | "organization_admin"
  | "platform_internal"
  | "public_share"
  | "service_internal";

export type AdminRouteDisposition =
  | "active"
  | "migrate"
  | "redirect"
  | "retire"
  | "internal_only";

export type AdminWorkflowId =
  | "ADM-WF-001"
  | "ADM-WF-002"
  | "ADM-WF-003"
  | "ADM-WF-004"
  | "ADM-WF-005"
  | "ADM-WF-006"
  | "ADM-WF-007"
  | "ADM-WF-008"
  | "ADM-WF-009"
  | "ADM-WF-010"
  | "ADM-WF-011"
  | "ADM-WF-012"
  | "ADM-WF-013"
  | "ADM-WF-014"
  | "ADM-WF-015"
  | "ADM-WF-016"
  | "ADM-WF-017"
  | "ADM-WF-018"
  | "ADM-WF-019"
  | "ADM-WF-020";

/**
 * Canonical REL-103 contract for one exported route handler. Schema identifiers
 * are stable inventory keys; handler/schema enforcement is migrated separately
 * without weakening this route-method inventory.
 */
export interface AdminApiMethodContract {
  route: string;
  method: AdminRouteMethod;
  actingContext: AdminActingContextContract;
  tenantTarget: AdminTenantTargetContract;
  capabilities: readonly AdminCapability[];
  capabilityMode: AdminCommandCapabilityMode;
  requestSchema: string;
  responseSchema: string;
  serviceRole: AdminServiceRoleContract;
  idempotency: AdminIdempotencyContract;
  audit: AdminAuditContract;
  auditEvent: string | null;
  workflowIds: readonly AdminWorkflowId[];
  testIds: readonly string[];
  visibility: AdminRouteVisibility;
  disposition: AdminRouteDisposition;
  owner: string;
  legacy: boolean;
}

export const ADMIN_API_ROUTE_REGISTRY: AdminRouteContract[] = [
  {
    route: "/api/admin/event-merges",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: true,
    audit: true,
    owner: "event-discovery",
  },
  {
    route: "/api/admin/event-claims",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: true,
    audit: true,
    owner: "event-discovery",
  },
  {
    route: "/api/admin/event-providers",
    methods: ["GET"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    owner: "event-discovery",
  },
  {
    route: "/api/admin/event-sync",
    methods: ["GET"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    owner: "event-discovery",
  },
  {
    route: "/api/admin/analytics/export",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "audit.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/analytics/top-performers",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/applications/[id]/audit",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/applications/[id]",
    methods: ["PATCH"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/applications",
    methods: ["GET", "PATCH", "POST"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/artists/[id]",
    methods: ["DELETE", "GET", "PATCH"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/artists",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/assets/search",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: true,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/audit",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "audit.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/calendar/export",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-calendar",
  },
  {
    route: "/api/admin/calendar",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-calendar",
  },
  {
    route: "/api/admin/calendar/token",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "org.settings.manage",
    idempotency: false,
    audit: false,
    owner: "ops-calendar",
  },
  {
    route: "/api/admin/capabilities",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/communications",
    methods: ["GET", "PATCH", "POST"],
    authClass: "legacy_pending_migration",
    capability: "communications.send",
    idempotency: false,
    audit: false,
    owner: "comms",
  },
  {
    route: "/api/admin/content/[id]",
    methods: ["PATCH"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: true,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content/music/certifications",
    methods: ["GET", "PATCH"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content/music/rights/disputes",
    methods: ["GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content/music/rights/review",
    methods: ["GET", "PATCH"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content/music",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content/posts",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content-hub/analytics",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content-hub/integrations",
    methods: ["DELETE", "GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: true,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content-hub/integrations/sync",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: true,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content-hub/moderation/[id]",
    methods: ["PATCH"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: true,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content-hub/moderation",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content-hub/overview",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/content-hub/posts",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/creator-cooperative/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-digital-commons/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-federation/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-interoperability-convention/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-interoperability-institution/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-interoperability-organization/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-multilateral-treaty-operations/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-protocol-constitution/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-public-infrastructure/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-treaty-system-renewal/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/creator-treaty-system-legacy/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/dashboard/command-center",
    methods: ["GET"],
    authClass: "acting_context_required",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-dashboard",
  },
  {
    route: "/api/admin/dashboard/stats",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/error-reporting",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/entity-grants",
    methods: ["DELETE", "GET", "POST"],
    authClass: "capability_gated",
    capability: "org.roles.manage",
    idempotency: false,
    audit: true,
    owner: "platform-security",
  },
  {
    route: "/api/admin/effective-capabilities",
    methods: ["GET"],
    authClass: "acting_context_required",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "platform-security",
  },
  {
    route: "/api/admin/events/[id]/advancing/export",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: false,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/advancing",
    methods: ["GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "advance.manage",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/analytics",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: false,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/communication-settings",
    methods: ["GET", "PATCH"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/communications",
    methods: ["GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/day-sheet/acknowledge",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/day-sheet/distribute",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/day-sheet",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "event.manage",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/documents",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "event.manage",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/export",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: false,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/group-chats",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/participants",
    methods: ["DELETE", "GET", "POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: false,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/publish",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "event.publish",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/readiness",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: false,
    audit: false,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/setup-completeness",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: false,
    audit: false,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]",
    methods: ["DELETE", "GET", "PATCH"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/provision",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "event.manage",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/secure-uploads",
    methods: ["DELETE", "GET", "POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/task-messages",
    methods: ["GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/tour-assignments",
    methods: ["DELETE", "GET", "POST", "PUT"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/vendor-requests",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: false,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/[id]/work-mode",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events/export",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: false,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/events",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "event.view",
    idempotency: true,
    audit: true,
    owner: "ops-events",
  },
  {
    route: "/api/admin/features/[key]",
    methods: ["DELETE", "PATCH"],
    authClass: "capability_gated",
    capability: "org.settings.manage",
    idempotency: true,
    audit: true,
    owner: "platform-governance",
  },
  {
    route: "/api/admin/features",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "org.settings.manage",
    idempotency: true,
    audit: true,
    owner: "platform-governance",
  },
  {
    route: "/api/admin/finances",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: true,
    audit: true,
    owner: "commerce-finance",
  },
  {
    route: "/api/admin/finances/commands",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: true,
    audit: true,
    owner: "commerce-finance",
  },
  {
    route: "/api/admin/finances/scope-search",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: false,
    audit: false,
    owner: "commerce-finance",
  },
  {
    route: "/api/admin/finances/settlements",
    methods: ["GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: true,
    audit: true,
    owner: "commerce-finance",
  },
  {
    route: "/api/admin/institutional/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/job-postings/[id]",
    methods: ["GET", "PATCH"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/job-postings",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/licensing/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/lodging",
    methods: ["DELETE", "GET", "POST", "PUT"],
    authClass: "legacy_pending_migration",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/backline",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/catering",
    methods: ["GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/comms-plans",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/communications-command-center",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/equipment/catalog",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/equipment/reservations",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/items/[id]/equipment",
    methods: ["DELETE", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/commands",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "logistics.manage",
    idempotency: true,
    audit: true,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/items/[id]",
    methods: ["DELETE", "PUT"],
    authClass: "capability_gated",
    capability: "logistics.manage",
    idempotency: false,
    audit: true,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/items/[id]/status",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "logistics.manage",
    idempotency: false,
    audit: true,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/items/bulk",
    methods: ["PUT"],
    authClass: "capability_gated",
    capability: "logistics.manage",
    idempotency: false,
    audit: true,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/items",
    methods: ["GET", "POST"],
    authClass: "acting_context_required",
    capability: "logistics.manage",
    idempotency: false,
    audit: true,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/metrics",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/plans",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/plans/[tourId]",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/plans/[tourId]/hydrate",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "logistics.manage",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/plans/[tourId]/preview-hydration",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "logistics.manage",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/plans/[tourId]/validate",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "logistics.manage",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-map-templates",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/activity",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/collaborators",
    methods: ["DELETE", "GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/elements/[elementId]",
    methods: ["DELETE", "GET", "PUT"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    auditMethods: ["DELETE", "PUT"],
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/elements",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/export",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: true,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/notes",
    methods: ["GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/public-link",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/publish-work-mode",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "site_map.edit",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]",
    methods: ["DELETE", "GET", "PUT"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/save-template",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/share",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/tasks/[taskId]",
    methods: ["DELETE", "PATCH"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/tasks",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/tents/[tentId]",
    methods: ["DELETE", "GET", "PUT"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/tents",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/versions",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/zones/[zoneId]",
    methods: ["DELETE", "GET", "PUT"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/zones/bulk-assign",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/[id]/zones",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/import",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/issues/[id]",
    methods: ["DELETE", "GET", "PATCH", "PUT"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/issues",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/layers/[id]",
    methods: ["DELETE", "GET", "PATCH", "PUT"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/layers",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/measurements/[id]",
    methods: ["DELETE", "GET", "PATCH", "PUT"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps/measurements",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/site-maps",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/transport",
    methods: ["GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/vendor/dashboard",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/vendor/inventory",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/vendor/workflows",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/logistics/vendors",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/marketplace/moderation",
    methods: ["GET", "PATCH"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    owner: "commerce",
  },
  {
    route: "/api/admin/marketplace/orders/[id]",
    methods: ["GET"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    owner: "commerce",
  },
  {
    route: "/api/admin/marketplace/orders",
    methods: ["GET"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    owner: "commerce",
  },
  {
    route: "/api/admin/marketplace/payouts/[id]/retry",
    methods: ["POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    owner: "commerce",
  },
  {
    route: "/api/admin/messages/broadcast",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "communications.send",
    idempotency: false,
    audit: false,
    owner: "comms",
  },
  {
    route: "/api/admin/messages/list",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "communications.send",
    idempotency: false,
    audit: false,
    owner: "comms",
  },
  {
    route: "/api/admin/messages/threads",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "communications.send",
    idempotency: false,
    audit: false,
    owner: "comms",
  },
  {
    route: "/api/admin/music/royalties/imports",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/music-marketplace/ops",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: true,
    owner: "content",
  },
  {
    route: "/api/admin/notifications",
    methods: ["GET", "PATCH", "POST"],
    authClass: "legacy_pending_migration",
    capability: "communications.send",
    idempotency: false,
    audit: false,
    owner: "comms",
  },
  {
    route: "/api/admin/onboarding/add-existing-user",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/candidates/[id]/credentials",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/onboarding/candidates/[id]",
    methods: ["PATCH", "POST"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/onboarding/candidates",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/onboarding/dashboard",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/documents/[documentId]/review",
    methods: ["PATCH"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/enhanced-invite",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/initialize-templates",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/invite-new-user",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/review",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/templates/[id]",
    methods: ["DELETE", "GET", "PATCH"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/templates/clone",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/templates/role-packs",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/templates",
    methods: ["DELETE", "GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/update-status",
    methods: ["PATCH"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/workflows/advance",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/workflows/analytics",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/onboarding/workflows",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/publication/outbox",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/outbox/replay",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/rbac/assign-role",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "org.roles.manage",
    idempotency: false,
    audit: false,
    owner: "org",
  },
  {
    route: "/api/admin/rbac/entity/[entityType]/[entityId]/assignments",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "org.roles.manage",
    idempotency: false,
    audit: false,
    owner: "org",
  },
  {
    route: "/api/admin/rbac/entity/[entityType]/[entityId]/audit",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "org.roles.manage",
    idempotency: false,
    audit: false,
    owner: "org",
  },
  {
    route: "/api/admin/rbac/roles/[id]",
    methods: ["DELETE"],
    authClass: "capability_gated",
    capability: "org.roles.manage",
    idempotency: false,
    audit: false,
    owner: "org",
  },
  {
    route: "/api/admin/rbac/roles",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "org.roles.manage",
    idempotency: false,
    audit: false,
    owner: "org",
  },
  {
    route: "/api/admin/request",
    methods: ["POST"],
    authClass: "authenticated_user",
    idempotency: false,
    audit: false,
    owner: "access-control",
  },
  {
    route: "/api/admin/rentals",
    methods: ["DELETE", "GET", "POST", "PUT"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/rights-admin/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/rights-intelligence/ops",
    methods: ["GET", "POST"],
    authClass: "platform_admin",
    idempotency: false,
    audit: false,
    auditMethods: ["POST"],
    owner: "admin-misc",
  },
  {
    route: "/api/admin/staff/dashboard",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staff",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staff-operations/channels",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staff-operations/channels/[id]",
    methods: ["GET", "PATCH"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staff-operations/summary",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staffing/job-postings",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staffing/performance",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staffing/shifts/[id]",
    methods: ["DELETE", "PATCH"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staffing/shifts/publish",
    methods: ["POST"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staffing/shifts",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/staffing/zones",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/store",
    methods: ["GET", "PATCH", "POST"],
    authClass: "legacy_pending_migration",
    capability: "content.view",
    idempotency: false,
    audit: false,
    owner: "commerce",
  },
  {
    route: "/api/admin/tasks",
    methods: ["GET", "PATCH"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/team-members",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/test",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/ticketing/commands",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "ticketing.view",
    idempotency: true,
    audit: true,
    owner: "commerce-ticketing",
  },
  {
    route: "/api/admin/ticketing/read-model",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "ticketing.view",
    idempotency: false,
    audit: true,
    owner: "commerce-ticketing",
  },
  {
    route: "/api/admin/ticketing/enhanced",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "ticketing.view",
    idempotency: true,
    audit: true,
    owner: "commerce-ticketing",
  },
  {
    route: "/api/admin/ticketing/refund",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "ticketing.refund",
    idempotency: true,
    audit: true,
    owner: "commerce-ticketing",
  },
  {
    route: "/api/admin/tours/[id]/calendar-token",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/collaboration-invites",
    methods: ["DELETE", "GET", "POST"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/events",
    methods: ["DELETE", "GET", "POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/export",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/grant-admins",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/logistics-summary",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: true,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/tours/[id]/publish",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.publish",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/quick-start-events",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/delete-preview",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.delete",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/archive-preview",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.archive",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/duplicate-preview",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/duplicate",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/duplicate/[jobId]/resume",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/summary",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/summary/projection",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/transitions/[command]",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]",
    methods: ["DELETE", "GET", "PATCH"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/plan",
    methods: ["GET", "PUT"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/plan/reconcile-preview",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/plan/backfill",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/plan/quarantine",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/readiness",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/holds",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/stops/impact",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/publication/audience-preview",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.publish",
    idempotency: false,
    audit: false,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/publish",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.publish",
    idempotency: true,
    audit: true,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/deliveries",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/deliveries/retry",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: true,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/deliveries/export",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: true,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/share-links",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: true,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/share-links/[id]/revoke",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: true,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/snapshots/[id]/retract",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: true,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/snapshots/[id]/supersede",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: true,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/publication/history",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-publication",
  },
  {
    route: "/api/admin/tours/bulk-preview",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/bulk",
    methods: ["POST"],
    authClass: "acting_context_required",
    capability: "tour.view",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/tags",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/[id]/tags",
    methods: ["PUT"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: false,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/saved-views",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/saved-views/[id]",
    methods: ["DELETE", "PATCH"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/artists",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/events",
    methods: ["DELETE", "POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/observability",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/team-members",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/teams",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/vendors",
    methods: ["DELETE", "GET", "PATCH", "POST"],
    authClass: "capability_gated",
    capability: "tour.manage",
    idempotency: true,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/tours/venues",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: true,
    owner: "ops-tours",
  },
  {
    route: "/api/admin/travel/flight-lookup",
    methods: ["GET"],
    authClass: "legacy_pending_migration",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/travel-coordination",
    methods: ["DELETE", "GET", "POST", "PUT"],
    authClass: "legacy_pending_migration",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "ops-logistics",
  },
  {
    route: "/api/admin/users/search",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: true,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/vendor-requests/[id]",
    methods: ["PATCH"],
    authClass: "capability_gated",
    capability: "vendor.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/vendor-requests",
    methods: ["POST"],
    authClass: "capability_gated",
    capability: "vendor.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/venues/[id]",
    methods: ["GET", "PATCH"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/venues",
    methods: ["GET", "POST"],
    authClass: "legacy_pending_migration",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/workforce/people",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "admin-misc",
  },
  {
    route: "/api/admin/workforce/identity-merge",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "workforce.manage",
    idempotency: true,
    audit: true,
    owner: "workforce",
  },
  {
    route: "/api/admin/analytics/data-quality",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "insights",
  },
  {
    route: "/api/admin/analytics/freshness",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "insights",
  },
  {
    route: "/api/admin/contracts",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "contract.view",
    idempotency: false,
    audit: false,
    owner: "contracts",
  },
  {
    route: "/api/admin/contracts/obligations",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "contract.view",
    idempotency: false,
    audit: false,
    owner: "contracts",
  },
  {
    route: "/api/admin/exports/calendar-feeds",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: false,
    owner: "exports",
  },
  {
    route: "/api/admin/exports/jobs",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "content.view",
    idempotency: false,
    audit: false,
    owner: "exports",
  },
  {
    route: "/api/admin/exports/tour-book",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "exports",
  },
  {
    route: "/api/admin/finances/budget-rollup",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: false,
    audit: false,
    owner: "finance",
  },
  {
    route: "/api/admin/finances/budget-workspace",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: false,
    audit: false,
    owner: "finance",
  },
  {
    route: "/api/admin/finances/commitments",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: false,
    audit: false,
    owner: "finance",
  },
  {
    route: "/api/admin/finances/expenses",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: false,
    audit: false,
    owner: "finance",
  },
  {
    route: "/api/admin/finances/reconciliation",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: false,
    audit: false,
    owner: "finance",
  },
  {
    route: "/api/admin/logistics/alerts",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "logistics",
  },
  {
    route: "/api/admin/logistics/comms-thread",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: true,
    owner: "logistics",
  },
  {
    route: "/api/admin/organization/communications-settings",
    methods: ["GET", "PATCH"],
    authClass: "capability_gated",
    capability: "org.settings.manage",
    idempotency: false,
    audit: true,
    owner: "organization",
  },
  {
    route: "/api/admin/organization/finance-settings",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "finance.view",
    idempotency: false,
    audit: false,
    owner: "organization",
  },
  {
    route: "/api/admin/organization/overview",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "organization",
  },
  {
    route: "/api/admin/organization/publication-health",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.publish",
    idempotency: false,
    audit: false,
    owner: "organization",
  },
  {
    route: "/api/admin/organization/security-summary",
    methods: ["GET"],
    authClass: "acting_context_required",
    capability: "audit.view",
    idempotency: false,
    audit: false,
    owner: "organization-security",
  },
  {
    route: "/api/admin/organization/settings",
    methods: ["GET", "PATCH"],
    authClass: "capability_gated",
    capability: "org.settings.manage",
    idempotency: false,
    audit: true,
    owner: "organization",
  },
  {
    route: "/api/admin/organization/ticketing-settings",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "ticketing.view",
    idempotency: false,
    audit: false,
    owner: "organization",
  },
  {
    route: "/api/admin/organization/tours-health",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "tour.view",
    idempotency: false,
    audit: false,
    owner: "organization",
  },
  {
    route: "/api/admin/organization/vendor-governance",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "vendor.view",
    idempotency: false,
    audit: false,
    owner: "organization",
  },
  {
    route: "/api/admin/organization/workforce-settings",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "workforce.manage",
    idempotency: false,
    audit: false,
    owner: "organization",
  },
  {
    route: "/api/admin/rbac/members",
    methods: ["DELETE", "GET"],
    authClass: "capability_gated",
    capability: "org.roles.manage",
    idempotency: true,
    audit: true,
    owner: "organization-security",
  },
  {
    route: "/api/admin/ticketing/admissions",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "ticketing.scan",
    idempotency: false,
    audit: false,
    owner: "ticketing",
  },
  {
    route: "/api/admin/ticketing/allocations",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "ticketing.view",
    idempotency: false,
    audit: false,
    owner: "ticketing",
  },
  {
    route: "/api/admin/ticketing/guest-approvals",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "ticketing.view",
    idempotency: false,
    audit: false,
    owner: "ticketing",
  },
  {
    route: "/api/admin/ticketing/inventory",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "ticketing.view",
    idempotency: false,
    audit: false,
    owner: "ticketing",
  },
  {
    route: "/api/admin/ticketing/setup",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "ticketing.view",
    idempotency: false,
    audit: false,
    owner: "ticketing",
  },
  {
    route: "/api/admin/travel/documents",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "travel",
  },
  {
    route: "/api/admin/travel/matrix",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "travel",
  },
  {
    route: "/api/admin/travel/segments",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: true,
    owner: "travel",
  },
  {
    route: "/api/admin/travel/slo",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "logistics.view",
    idempotency: false,
    audit: false,
    owner: "travel",
  },
  {
    route: "/api/admin/vendors",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "vendor.view",
    idempotency: false,
    audit: false,
    owner: "vendors",
  },
  {
    route: "/api/admin/workforce/attendance",
    methods: ["GET", "POST"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: true,
    owner: "workforce",
  },
  {
    route: "/api/admin/workforce/conflicts",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/workforce/conversions",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "hiring.manage",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/workforce/health",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "workforce.view",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
  {
    route: "/api/admin/workforce/payroll-exports",
    methods: ["GET"],
    authClass: "capability_gated",
    capability: "workforce.manage",
    idempotency: false,
    audit: false,
    owner: "workforce",
  },
];

export function isRegisteredAdminRoute(routePath: string): boolean {
  const normalized = routePath.replace(/\\/g, "/").replace(/\/route\.ts$/, "");
  return ADMIN_API_ROUTE_REGISTRY.some(
    (entry) => normalized === entry.route || normalized.endsWith(entry.route),
  );
}

const WRITE_CAPABILITY_BY_BASE: Partial<
  Record<AdminCapability, AdminCapability>
> = {
  "tour.view": "tour.manage",
  "event.view": "event.manage",
  "logistics.view": "logistics.manage",
  "workforce.view": "workforce.manage",
  "vendor.view": "vendor.manage",
  "contract.view": "contract.manage",
  "finance.view": "finance.manage",
  "ticketing.view": "ticketing.manage",
  "site_map.view": "site_map.edit",
  "content.view": "content.manage",
};

const ADMIN_COMMAND_CAPABILITY_OVERRIDES: Readonly<
  Record<string, readonly AdminCapability[]>
> = {
  "/api/admin/audit#GET": ["audit.view"],
  "/api/admin/analytics/export#GET": ["audit.view"],
  "/api/admin/artists/[id]#DELETE": ["workforce.manage"],
  "/api/admin/artists/[id]#PATCH": ["workforce.manage"],
  "/api/admin/artists#POST": ["workforce.manage"],
  "/api/admin/calendar/export#GET": [
    "tour.view",
    "event.view",
    "workforce.view",
  ],
  "/api/admin/dashboard/command-center#GET": [
    "tour.view",
    "event.view",
    "logistics.view",
    "workforce.view",
    "vendor.view",
    "contract.view",
    "finance.view",
    "ticketing.view",
    "site_map.view",
    "content.view",
  ],
  "/api/admin/events/[id]/advancing/export#GET": [
    "advance.manage",
    "audit.view",
  ],
  "/api/admin/events/[id]/day-sheet/distribute#POST": [
    "event.live_ops",
    "communications.send",
  ],
  "/api/admin/events/[id]/publish#POST": ["event.publish"],
  "/api/admin/finances/settlements#PATCH": ["finance.approve", "finance.pay"],
  "/api/admin/publication/audience-preview#POST": ["tour.publish"],
  "/api/admin/publication/deliveries/export#GET": [
    "tour.publish",
    "audit.view",
  ],
  "/api/admin/publication/deliveries/retry#POST": [
    "tour.publish",
    "communications.send",
  ],
  "/api/admin/publication/publish#POST": ["tour.publish"],
  "/api/admin/publication/share-links#POST": ["tour.publish"],
  "/api/admin/publication/share-links/[id]/revoke#POST": ["tour.publish"],
  "/api/admin/publication/snapshots/[id]/retract#POST": ["tour.publish"],
  "/api/admin/publication/snapshots/[id]/supersede#POST": ["tour.publish"],
  "/api/admin/tours/[id]/transitions/[command]#POST": [
    "tour.manage",
    "tour.publish",
    "finance.approve",
    "tour.archive",
  ],
  "/api/admin/staff-operations/channels#GET": [
    "communications.broadcast",
    "workforce.manage",
  ],
  "/api/admin/staff-operations/channels#POST": [
    "communications.broadcast",
    "workforce.manage",
  ],
  "/api/admin/staff-operations/channels/[id]#GET": [
    "communications.broadcast",
    "workforce.manage",
  ],
  "/api/admin/staff-operations/channels/[id]#PATCH": [
    "communications.broadcast",
    "workforce.manage",
  ],
  "/api/admin/ticketing/refund#POST": ["ticketing.refund"],
  "/api/admin/tours/[id]/archive#POST": ["tour.archive"],
  "/api/admin/tours/[id]/publish#POST": ["tour.publish"],
};

/**
 * SEC-003 capability decision for one concrete route method.
 *
 * The companion `adminCommandCapabilityMode` decides whether a multi-capability
 * entry is cumulative, alternative, or selected by a validated action
 * discriminator. SEC-104 enforces those decisions at the route/command layer.
 * Public-share and service-job contracts return an empty list because their
 * explicit non-user principal contract is the authority boundary.
 */
export function adminCommandCapabilities(
  contract: AdminRouteContract,
  method: AdminRouteMethod,
): readonly AdminCapability[] {
  if (!contract.methods.includes(method)) return [];
  if (
    contract.authClass === "authenticated_user" ||
    contract.authClass === "platform_admin" ||
    contract.authClass === "public_share_token" ||
    contract.authClass === "service_job"
  )
    return [];

  const override =
    ADMIN_COMMAND_CAPABILITY_OVERRIDES[`${contract.route}#${method}`];
  if (override) return override;
  if (!contract.capability) return [];
  if (method === "GET") return [contract.capability];
  return [WRITE_CAPABILITY_BY_BASE[contract.capability] ?? contract.capability];
}

export type AdminCommandCapabilityMode =
  | "allOf"
  | "anyOf"
  | "actionScoped"
  | "principal";

const ADMIN_COMMAND_CAPABILITY_MODE_OVERRIDES: Readonly<
  Record<string, AdminCommandCapabilityMode>
> = {
  "/api/admin/calendar/export#GET": "anyOf",
  "/api/admin/dashboard/command-center#GET": "anyOf",
  "/api/admin/finances/settlements#PATCH": "actionScoped",
  "/api/admin/tours/[id]/transitions/[command]#POST": "actionScoped",
  "/api/admin/staff-operations/channels#GET": "anyOf",
  "/api/admin/staff-operations/channels#POST": "anyOf",
  "/api/admin/staff-operations/channels/[id]#GET": "anyOf",
  "/api/admin/staff-operations/channels/[id]#PATCH": "anyOf",
};

export function adminCommandCapabilityMode(
  contract: AdminRouteContract,
  method: AdminRouteMethod,
): AdminCommandCapabilityMode {
  if (
    contract.authClass === "platform_admin" ||
    contract.authClass === "public_share_token" ||
    contract.authClass === "service_job"
  ) {
    return "principal";
  }
  return (
    ADMIN_COMMAND_CAPABILITY_MODE_OVERRIDES[`${contract.route}#${method}`] ??
    "allOf"
  );
}

function actingContextContract(
  contract: AdminRouteContract,
): AdminActingContextContract {
  if (contract.authClass === "authenticated_user") return "authenticated_user";
  if (contract.authClass === "platform_admin") return "platform_admin";
  if (contract.authClass === "public_share_token") return "public_share_token";
  if (contract.authClass === "service_job") return "service_principal";
  if (contract.authClass === "read_only_compat")
    return "authenticated_compatibility";
  return "acting_account_required";
}

function schemaContractId(
  contract: AdminRouteContract,
  method: AdminRouteMethod,
  direction: "request" | "response",
) {
  return `admin:${method.toLowerCase()}:${contract.route}:${direction}`;
}

function idempotencyContract(
  contract: AdminRouteContract,
  method: AdminRouteMethod,
): AdminIdempotencyContract {
  if (method === "GET") return "not_applicable";
  return contract.idempotency === true ? "required" : "legacy_missing";
}

function auditContract(
  contract: AdminRouteContract,
  method: AdminRouteMethod,
): AdminAuditContract {
  const audited =
    contract.auditMethods?.includes(method) || contract.audit === true;
  if (method === "GET" && !audited) return "not_applicable";
  return audited ? "required" : "legacy_missing";
}

const APPROVED_SERVICE_ROLE_ROUTES = new Set([
  "/api/admin/logistics/comms-thread",
  "/api/admin/staff-operations/channels",
  "/api/admin/staff-operations/channels/[id]",
]);
const LEGACY_BARE_SERVICE_ROLE_ROUTES = new Set<string>();

function isPlatformInternalRoute(route: string) {
  return (
    route === "/api/admin/event-merges" ||
    route === "/api/admin/event-claims" ||
    route === "/api/admin/event-providers" ||
    route === "/api/admin/event-sync" ||
    route === "/api/admin/features" ||
    route.startsWith("/api/admin/features/") ||
    route.startsWith("/api/admin/creator-") ||
    route.startsWith("/api/admin/institutional/") ||
    route.startsWith("/api/admin/licensing/") ||
    route.startsWith("/api/admin/marketplace/") ||
    route.startsWith("/api/admin/music/") ||
    route.startsWith("/api/admin/music-marketplace/") ||
    route.startsWith("/api/admin/rights-admin/") ||
    route.startsWith("/api/admin/rights-intelligence/") ||
    route === "/api/admin/test"
  );
}

function visibilityContract(
  contract: AdminRouteContract,
): AdminRouteVisibility {
  if (contract.authClass === "authenticated_user") return "authenticated_user";
  if (contract.authClass === "platform_admin") return "platform_internal";
  if (contract.authClass === "public_share_token") return "public_share";
  if (contract.authClass === "service_job") return "service_internal";
  if (isPlatformInternalRoute(contract.route)) return "platform_internal";
  return "organization_admin";
}

function tenantTargetContract(
  contract: AdminRouteContract,
): AdminTenantTargetContract {
  if (contract.authClass === "authenticated_user") return "platform";
  if (contract.authClass === "platform_admin") return "platform";
  const visibility = visibilityContract(contract);
  if (visibility === "public_share") return "public_share";
  if (visibility === "service_internal") return "service_scope";
  if (visibility === "platform_internal") return "platform";
  return contract.route.includes("[")
    ? "organization_entity"
    : "acting_organization";
}

function serviceRoleContract(
  contract: AdminRouteContract,
): AdminServiceRoleContract {
  if (LEGACY_BARE_SERVICE_ROLE_ROUTES.has(contract.route)) return "legacy_bare";
  if (
    APPROVED_SERVICE_ROLE_ROUTES.has(contract.route) ||
    contract.authClass === "service_job"
  )
    return "approved_job";
  return "none";
}

function dispositionContract(
  contract: AdminRouteContract,
): AdminRouteDisposition {
  if (contract.route === "/api/admin/test") return "retire";
  const visibility = visibilityContract(contract);
  if (visibility === "platform_internal" || visibility === "service_internal")
    return "internal_only";
  if (contract.authClass === "read_only_compat") return "redirect";
  if (contract.authClass === "legacy_pending_migration") return "migrate";
  return "active";
}

function workflowIdsForRoute(route: string): readonly AdminWorkflowId[] {
  if (
    route === "/api/admin/event-merges" ||
    route === "/api/admin/event-claims" ||
    route === "/api/admin/event-providers" ||
    route === "/api/admin/event-sync"
  ) {
    return ["ADM-WF-003", "ADM-WF-020"];
  }
  if (route.startsWith("/api/admin/publication/"))
    return ["ADM-WF-004", "ADM-WF-005", "ADM-WF-006", "ADM-WF-012"];
  if (
    route.startsWith("/api/admin/entity-grants") ||
    route.startsWith("/api/admin/effective-capabilities") ||
    route.startsWith("/api/admin/capabilities") ||
    route.startsWith("/api/admin/rbac/")
  ) {
    return ["ADM-WF-001", "ADM-WF-002", "ADM-WF-018"];
  }
  if (
    route.startsWith("/api/admin/job-postings") ||
    route.startsWith("/api/admin/applications") ||
    route.startsWith("/api/admin/onboarding")
  ) {
    return ["ADM-WF-007"];
  }
  if (
    route.startsWith("/api/admin/staff") ||
    route.startsWith("/api/admin/staffing") ||
    route.startsWith("/api/admin/workforce")
  ) {
    return ["ADM-WF-008"];
  }
  if (route.startsWith("/api/admin/artists")) return ["ADM-WF-009"];
  if (route.startsWith("/api/admin/venues")) return ["ADM-WF-010"];
  if (
    route.startsWith("/api/admin/messages") ||
    route.startsWith("/api/admin/communications")
  ) {
    return ["ADM-WF-011", "ADM-WF-012"];
  }
  if (route.startsWith("/api/admin/notifications")) return ["ADM-WF-012"];
  if (
    route.startsWith("/api/admin/logistics") ||
    route.startsWith("/api/admin/travel") ||
    route.startsWith("/api/admin/lodging") ||
    route.startsWith("/api/admin/rentals")
  ) {
    return ["ADM-WF-013"];
  }
  if (route.startsWith("/api/admin/finances")) return ["ADM-WF-014"];
  if (
    route.startsWith("/api/admin/contracts") ||
    route.startsWith("/api/admin/vendors") ||
    route.startsWith("/api/admin/vendor-requests")
  ) {
    return ["ADM-WF-015"];
  }
  if (route.startsWith("/api/admin/ticketing")) return ["ADM-WF-019"];
  if (route.startsWith("/api/admin/events")) return ["ADM-WF-004"];
  if (route.startsWith("/api/admin/tours")) return ["ADM-WF-005"];
  if (route.startsWith("/api/admin/organization")) return ["ADM-WF-018"];
  if (
    isPlatformInternalRoute(route) ||
    route.startsWith("/api/admin/content") ||
    route.startsWith("/api/admin/store")
  ) {
    return ["ADM-WF-020"];
  }
  if (
    route.startsWith("/api/admin/calendar") ||
    route.startsWith("/api/admin/dashboard") ||
    route.startsWith("/api/admin/analytics") ||
    route.startsWith("/api/admin/assets/search")
  ) {
    return ["ADM-WF-016", "ADM-WF-017"];
  }
  return ["ADM-WF-017"];
}

function testIdsForContract(contract: AdminRouteContract): readonly string[] {
  const ids = [
    "scripts/ci/check-admin-route-registry.mjs",
    "__tests__/admin/admin-route-capability-matrix.test.ts",
  ];
  if (serviceRoleContract(contract) !== "none")
    ids.push("scripts/ci/check-service-role-allowlist.mjs");
  return ids;
}

function auditEventContract(
  contract: AdminRouteContract,
  method: AdminRouteMethod,
) {
  if (auditContract(contract, method) === "not_applicable") return null;
  const routeName = contract.route
    .replace(/^\/api\/admin\//, "")
    .replace(/\[([^\]]+)\]/g, "by-$1")
    .replace(/[^a-zA-Z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .toLowerCase();
  return `admin.${routeName}.${method.toLowerCase()}`;
}

export function adminCommandCapabilityMatrix(): AdminApiMethodContract[] {
  return ADMIN_API_ROUTE_REGISTRY.flatMap((contract) =>
    contract.methods.map((method) => ({
      route: contract.route,
      method,
      actingContext: actingContextContract(contract),
      tenantTarget: tenantTargetContract(contract),
      owner: contract.owner,
      capabilities: adminCommandCapabilities(contract, method),
      capabilityMode: adminCommandCapabilityMode(contract, method),
      requestSchema: schemaContractId(contract, method, "request"),
      responseSchema: schemaContractId(contract, method, "response"),
      serviceRole: serviceRoleContract(contract),
      idempotency: idempotencyContract(contract, method),
      audit: auditContract(contract, method),
      auditEvent: auditEventContract(contract, method),
      workflowIds: workflowIdsForRoute(contract.route),
      testIds: testIdsForContract(contract),
      visibility: visibilityContract(contract),
      disposition: dispositionContract(contract),
      legacy: contract.authClass === "legacy_pending_migration",
    })),
  );
}

export function adminRouteRegistryStats() {
  const total = ADMIN_API_ROUTE_REGISTRY.length;
  const legacy = ADMIN_API_ROUTE_REGISTRY.filter(
    (r) => r.authClass === "legacy_pending_migration",
  ).length;
  const gated = ADMIN_API_ROUTE_REGISTRY.filter(
    (r) => r.authClass === "capability_gated",
  ).length;
  return {
    total,
    legacy,
    gated,
    classifiedPct: total === 0 ? 100 : Math.round(((total - 0) / total) * 100),
  };
}
