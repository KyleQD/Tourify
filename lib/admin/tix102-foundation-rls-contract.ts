/**
 * TIX-102 — Foundation ticketing RLS: event/org capability + real grants.
 * Membership alone is not sufficient; has_event_ticketing_grant is grant-row-only.
 */

export const TIX102_VERIFY_RPC = "admin_verify_tix102_foundation_rls"

export const TIX102_HELPERS = [
  "can_ticketing",
  "can_ticketing_on_event",
  "has_event_ticketing_grant",
] as const

/** Surfaces named in TIX-102 AC and how they are gated after harden. */
export const TIX102_COVERED_SURFACES = [
  {
    surface: "config",
    table: "event_ticketing_config",
    gate: "can_ticketing_on_event(ticketing.view|manage) | grant view_overview / manage_ticket_types",
  },
  {
    surface: "inventory",
    table: "ticket_inventory_reservations",
    gate: "creator | can_ticketing_on_event | grant operate_box_office; reserve RPC authz",
  },
  {
    surface: "customer_order",
    table: "ticket_sales",
    gate: "SEC-108/admin_ticketing_security: buyer + has_perm(ticketing.*) — not membership FOR ALL",
  },
  {
    surface: "ticket",
    table: "tickets",
    gate: "owner | can_ticketing_on_event(view|manage|scan|refund) | attendee/scan/box-office grants",
  },
  {
    surface: "credential",
    table: "ticket_credentials",
    gate: "owner via tickets | can_ticketing_on_event | scan/box-office grants",
  },
  {
    surface: "transfer",
    table: "ticket_transfers",
    gate: "from/to party | can_ticketing_on_event(manage) | transfer_reassign grant",
  },
  {
    surface: "check_in",
    table: "ticket_checkins",
    gate: "can_ticketing_on_event(view|manage|scan) | scan/attendee grants",
  },
  {
    surface: "allocation",
    table: "ticket_allocations",
    gate: "can_ticketing_on_event | manage_guestlist / issue_comps grants",
  },
  {
    surface: "reservation",
    table: "ticket_inventory_reservations",
    gate: "same as inventory",
  },
  {
    surface: "webhook",
    table: "ticket_stripe_webhook_events",
    gate: "deny authenticated (service_role only)",
  },
  {
    surface: "analytics",
    table: "ticket_analytics_events",
    gate: "can_ticketing_on_event(view|manage); null event_id org-analytics rows readable when gated",
  },
] as const

export const TIX102_REPLACED_POLICIES = [
  "event_ticketing_config_select",
  "event_ticketing_config_write",
  "tickets_select",
  "tickets_owner_update",
  "ticket_credentials_select",
  "ticket_transfers_select",
  "ticket_transfers_insert",
  "ticket_transfers_update",
  "ticket_checkins_select",
  "ticket_checkins_insert",
  "ticket_allocations_all",
  "ticket_revenue_allocations_all",
  "event_ticketing_grants_select",
  "event_ticketing_grants_write",
  "ticket_reservations_select",
  "ticket_ownership_events_select",
  "ticket_analytics_events_select",
  "ticket_stripe_webhook_events_deny",
] as const

export const TIX102_POLICY_PREFIX = "tix102_"

export interface Tix102GrantSemantics {
  /** Pre-TIX-102: org members passed every grant check. */
  membershipImpliedGrant: false
  /** Post-TIX-102: only event_ticketing_grants row for (user, event, permission). */
  requiresGrantRow: true
}

export const TIX102_GRANT_SEMANTICS: Tix102GrantSemantics = {
  membershipImpliedGrant: false,
  requiresGrantRow: true,
}

export function assertTix102SurfaceCoverage(surfaces: readonly { surface: string }[]): {
  ok: boolean
  failures: string[]
} {
  const required = [
    "config",
    "inventory",
    "customer_order",
    "ticket",
    "credential",
    "transfer",
    "check_in",
    "allocation",
    "reservation",
    "webhook",
    "analytics",
  ] as const
  const present = new Set(surfaces.map((s) => s.surface))
  const failures = required.filter((r) => !present.has(r)).map((r) => `missing surface: ${r}`)
  return { ok: failures.length === 0, failures }
}

export function isTix102ReplacedPolicy(policyName: string): boolean {
  return (TIX102_REPLACED_POLICIES as readonly string[]).includes(policyName)
}
