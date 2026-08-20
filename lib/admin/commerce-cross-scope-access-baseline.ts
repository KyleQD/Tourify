export type CommerceAccessPersona =
  | "anonymous"
  | "platform_admin"
  | "org_a_owner"
  | "org_a_finance"
  | "org_a_ticketing"
  | "org_a_support"
  | "org_a_moderator"
  | "org_a_auditor"
  | "org_b_owner"
  | "event_a_ticketing_grant"
  | "seller_self"

export type CommerceAccessSurface =
  | "marketplace_admin_orders"
  | "marketplace_admin_order_detail"
  | "marketplace_payout_retry"
  | "finance_reconciliation"
  | "finance_settlements"
  | "ticketing_admin_read_model"
  | "ticketing_refund"
  | "subscription_admin_reconciliation"
  | "paid_promotion_admin_reconciliation"

export type CommerceAccessDecision = "allow" | "deny" | "unavailable"

export type CommerceScopeBoundary =
  | "platform"
  | "organization"
  | "event"
  | "seller_self"
  | "legacy_global_admin"
  | "not_implemented"

export interface CommerceCrossScopeAccessCase {
  surface: CommerceAccessSurface
  route: string
  persona: CommerceAccessPersona
  targetOrg: "org_a" | "org_b" | null
  targetEvent: "event_a" | "event_b" | null
  decision: CommerceAccessDecision
  boundary: CommerceScopeBoundary
  currentEvidence: string
  commerceRequirement: string
}

export const COMMERCE_CROSS_SCOPE_ACCESS_BASELINE: CommerceCrossScopeAccessCase[] = [
  {
    surface: "marketplace_admin_orders",
    route: "GET /api/admin/marketplace/orders",
    persona: "org_a_owner",
    targetOrg: "org_b",
    targetEvent: null,
    decision: "allow",
    boundary: "legacy_global_admin",
    currentEvidence: "Uses withAdminAuth and direct marketplace_orders reads without an org target predicate.",
    commerceRequirement: "Migrate to commerce.view plus organization/seller/event scope before canonical Commerce HQ uses it.",
  },
  {
    surface: "marketplace_admin_order_detail",
    route: "GET /api/admin/marketplace/orders/[id]",
    persona: "org_a_owner",
    targetOrg: "org_b",
    targetEvent: null,
    decision: "allow",
    boundary: "legacy_global_admin",
    currentEvidence: "Checks profiles.role === admin and loads order detail with payout ledger by id.",
    commerceRequirement: "Migrate to commerce.view/commerce.view_customers with scoped order access and PII projection rules.",
  },
  {
    surface: "marketplace_payout_retry",
    route: "POST /api/admin/marketplace/payouts/[id]/retry",
    persona: "org_a_owner",
    targetOrg: "org_b",
    targetEvent: null,
    decision: "allow",
    boundary: "legacy_global_admin",
    currentEvidence: "COM-011 inventory found local payout retry is not yet commerce capability gated or provider-reconciled.",
    commerceRequirement: "Require commerce.manage_payouts, scoped payout ownership, reason, idempotency, provider re-fetch, duplicate payout detection, and audit.",
  },
  {
    surface: "finance_reconciliation",
    route: "GET /api/admin/finances/reconciliation",
    persona: "org_a_finance",
    targetOrg: "org_a",
    targetEvent: null,
    decision: "allow",
    boundary: "organization",
    currentEvidence: "Uses withAdminCapability('finance.view') and filters finance_reconciliation_mismatches by admin.orgId.",
    commerceRequirement: "Bridge finance.view to commerce.manage_settlements or commerce.view_audit when Commerce routes are added.",
  },
  {
    surface: "finance_reconciliation",
    route: "GET /api/admin/finances/reconciliation",
    persona: "org_b_owner",
    targetOrg: "org_a",
    targetEvent: null,
    decision: "deny",
    boundary: "organization",
    currentEvidence: "Route reads only admin.orgId and does not accept a cross-org target override.",
    commerceRequirement: "Keep organization scope mandatory for Commerce reconciliation reads.",
  },
  {
    surface: "finance_settlements",
    route: "GET /api/admin/finances/settlements",
    persona: "org_a_finance",
    targetOrg: "org_a",
    targetEvent: null,
    decision: "allow",
    boundary: "organization",
    currentEvidence: "Uses withAdminCapability('finance.view'), validates event/tour references, and filters settlements by admin.orgId.",
    commerceRequirement: "Bridge finance.view to commerce.manage_settlements or commerce.view_audit when Commerce routes are added.",
  },
  {
    surface: "finance_settlements",
    route: "GET /api/admin/finances/settlements?event_id=event_b",
    persona: "org_a_finance",
    targetOrg: "org_b",
    targetEvent: "event_b",
    decision: "deny",
    boundary: "organization",
    currentEvidence: "assertOrgEntityReferences rejects event ids outside the acting organization.",
    commerceRequirement: "Keep event references scoped to the acting Commerce context.",
  },
  {
    surface: "ticketing_admin_read_model",
    route: "GET /api/admin/ticketing/read-model?event_id=event_a",
    persona: "org_a_ticketing",
    targetOrg: "org_a",
    targetEvent: "event_a",
    decision: "allow",
    boundary: "event",
    currentEvidence: "Uses withAdminCapability('ticketing.view') and assertOrgEntityReferences for event scope.",
    commerceRequirement: "Bridge ticketing.view to commerce.view and preserve event/org scoping.",
  },
  {
    surface: "ticketing_admin_read_model",
    route: "GET /api/admin/ticketing/read-model?event_id=event_b",
    persona: "org_a_ticketing",
    targetOrg: "org_b",
    targetEvent: "event_b",
    decision: "deny",
    boundary: "event",
    currentEvidence: "assertOrgEntityReferences rejects event ids outside the acting organization.",
    commerceRequirement: "Keep event references scoped to the acting Commerce context.",
  },
  {
    surface: "ticketing_refund",
    route: "POST /api/admin/ticketing/refund",
    persona: "org_a_ticketing",
    targetOrg: "org_a",
    targetEvent: "event_a",
    decision: "allow",
    boundary: "event",
    currentEvidence: "COM-010 found the route requires ticketing.refund, reason, service-role job wrapper, org target verification, and idempotency.",
    commerceRequirement: "Bridge ticketing.refund to commerce.issue_refunds and preserve scoped event/order validation.",
  },
  {
    surface: "ticketing_refund",
    route: "POST /api/admin/ticketing/refund",
    persona: "org_a_ticketing",
    targetOrg: "org_b",
    targetEvent: "event_b",
    decision: "deny",
    boundary: "event",
    currentEvidence: "Refund command verifies org/event/order target before provider mutation.",
    commerceRequirement: "Never issue cross-org Commerce refunds from an event-scoped actor.",
  },
  {
    surface: "subscription_admin_reconciliation",
    route: "GET /api/admin/commerce/subscriptions",
    persona: "org_a_finance",
    targetOrg: "org_a",
    targetEvent: null,
    decision: "unavailable",
    boundary: "not_implemented",
    currentEvidence: "COM-012 and COM-020 found no admin Commerce subscription reconciliation route or entitlement coupling.",
    commerceRequirement: "Return an explicit unavailable/error state until commerce.manage_subscriptions scoped reads exist.",
  },
  {
    surface: "paid_promotion_admin_reconciliation",
    route: "GET /api/admin/commerce/promotions",
    persona: "org_a_finance",
    targetOrg: "org_a",
    targetEvent: null,
    decision: "unavailable",
    boundary: "not_implemented",
    currentEvidence: "COM-013 and COM-020 found no paid promotion payment source or payment-to-activation route.",
    commerceRequirement: "Return an explicit unavailable/error state until paid promotion commerce exists.",
  },
  {
    surface: "marketplace_admin_orders",
    route: "GET /api/admin/marketplace/orders",
    persona: "anonymous",
    targetOrg: null,
    targetEvent: null,
    decision: "deny",
    boundary: "legacy_global_admin",
    currentEvidence: "withAdminAuth requires an authenticated admin surface user.",
    commerceRequirement: "Keep anonymous users denied on all Commerce Operations surfaces.",
  },
]

export function assertCommerceCrossScopeBaseline(cases = COMMERCE_CROSS_SCOPE_ACCESS_BASELINE) {
  const missingEvidence = cases.filter((item) => !item.currentEvidence || !item.commerceRequirement)
  const crossOrgAllows = cases.filter(
    (item) =>
      item.targetOrg === "org_b"
      && item.decision === "allow"
      && item.boundary !== "legacy_global_admin",
  )
  const unavailableWithoutReason = cases.filter(
    (item) => item.decision === "unavailable" && item.boundary !== "not_implemented",
  )

  return {
    ok: missingEvidence.length === 0 && crossOrgAllows.length === 0 && unavailableWithoutReason.length === 0,
    missingEvidence,
    crossOrgAllows,
    unavailableWithoutReason,
  }
}

export function listCommerceLegacyGlobalAdminSurfaces(cases = COMMERCE_CROSS_SCOPE_ACCESS_BASELINE) {
  return cases
    .filter((item) => item.boundary === "legacy_global_admin")
    .map((item) => item.surface)
}
