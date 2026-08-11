/**
 * EVENT-103 / EVENT-202 / TIX-105 — Explicit event setup checklist + completeness view.
 *
 * Returned on event creation and persisted under settings.setup_checklist_status.
 * Domains: staffing, ticketing, advance, logistics, finance.
 * Ticketing is ready only with provisioned types or explicit not_ticketed.
 *
 * EVENT-202: each domain includes owner + directAction; unmet deps → blocked;
 * dependency/count evaluation failures → unknown.
 */

import { resolveEventTicketingSetupMode } from "@/lib/admin/event-ticketing-setup"

export type EventSetupDomain =
  | "staffing"
  | "ticketing"
  | "advance"
  | "logistics"
  | "finance"

export type EventSetupDomainStatus =
  | "not_started"
  | "in_progress"
  | "ready"
  | "blocked"
  | "unknown"

export interface EventSetupDomainOwner {
  /** Accountable role for the domain (not a capability grant). */
  role: string
  /** Ops owner when assigned on the event. */
  userId: string | null
  /** Human label: department owner, ops owner placeholder, or Unassigned. */
  label: string
}

export interface EventSetupDirectAction {
  label: string
  href: string
}

export interface EventSetupChecklistItem {
  domain: EventSetupDomain
  status: EventSetupDomainStatus
  label: string
  summary: string
  nextAction: string | null
  /** Admin API path for reviewed provisioning when applicable. */
  provisionPath: string | null
  /** Always false — checklist never invents operational rows. */
  inventsData: false
  evidence: Record<string, unknown>
  /** EVENT-202 — accountable owner for the domain. */
  owner: EventSetupDomainOwner
  /** EVENT-202 — deep link into the ops surface for this domain. */
  directAction: EventSetupDirectAction
  /** Hard dependencies that must evaluate true before work can complete. */
  dependsOn: string[]
}

export interface EventSetupChecklist {
  version: 1
  eventId: string
  generatedAt: string
  items: EventSetupChecklistItem[]
  /** Domains still needing reviewed provisioning or setup work. */
  pendingDomains: EventSetupDomain[]
}

/** Hard dependency keys used for blocked vs unknown. */
export type EventSetupDependencyKey = "venue" | "schedule"

const DOMAIN_DEFAULT_OWNERS: Record<EventSetupDomain, { role: string }> = {
  staffing: { role: "Staffing lead" },
  ticketing: { role: "Ticketing lead" },
  advance: { role: "Advance lead" },
  logistics: { role: "Logistics lead" },
  finance: { role: "Finance lead" },
}

const DOMAIN_DEPENDENCIES: Record<EventSetupDomain, EventSetupDependencyKey[]> = {
  staffing: ["schedule"],
  ticketing: ["schedule"],
  advance: ["venue"],
  logistics: ["venue"],
  finance: [],
}

function readSettings(row: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const settings = row?.settings
  if (settings && typeof settings === "object" && !Array.isArray(settings))
    return settings as Record<string, unknown>
  return {}
}

function readIntent(settings: Record<string, unknown>): Record<string, unknown> {
  const intent = settings.setup_intent
  if (intent && typeof intent === "object" && !Array.isArray(intent))
    return intent as Record<string, unknown>
  return {}
}

function readOwnership(settings: Record<string, unknown>): {
  opsOwnerUserId: string | null
  departmentOwner: string | null
} {
  const setup =
    settings.setup && typeof settings.setup === "object" && !Array.isArray(settings.setup)
      ? (settings.setup as Record<string, unknown>)
      : {}
  const ownership =
    setup.ownership && typeof setup.ownership === "object" && !Array.isArray(setup.ownership)
      ? (setup.ownership as Record<string, unknown>)
      : {}
  const opsOwnerUserId =
    typeof ownership.ops_owner_user_id === "string" && ownership.ops_owner_user_id
      ? ownership.ops_owner_user_id
      : typeof settings.ops_owner_user_id === "string" && settings.ops_owner_user_id
        ? settings.ops_owner_user_id
        : null
  const departmentOwner =
    typeof ownership.department_owner === "string" && ownership.department_owner.trim()
      ? ownership.department_owner.trim()
      : typeof settings.department_owner === "string" && settings.department_owner.trim()
        ? settings.department_owner.trim()
        : null
  return { opsOwnerUserId, departmentOwner }
}

function resolveOwner(
  domain: EventSetupDomain,
  ownership: { opsOwnerUserId: string | null; departmentOwner: string | null },
): EventSetupDomainOwner {
  const role = DOMAIN_DEFAULT_OWNERS[domain].role
  if (ownership.departmentOwner)
    return { role, userId: ownership.opsOwnerUserId, label: ownership.departmentOwner }
  if (ownership.opsOwnerUserId)
    return { role, userId: ownership.opsOwnerUserId, label: "Ops owner assigned" }
  return { role, userId: null, label: "Unassigned" }
}

function resolveDirectAction(domain: EventSetupDomain, eventId: string): EventSetupDirectAction {
  const base = `/admin/dashboard/events/${eventId}`
  switch (domain) {
    case "staffing":
      return { label: "Open people & shifts", href: `${base}?tab=people` }
    case "ticketing":
      return { label: "Open ticketing", href: `${base}?tab=tickets` }
    case "advance":
      return { label: "Open advancing", href: `${base}/advancing` }
    case "logistics":
      return { label: "Open logistics", href: `${base}?tab=logistics` }
    case "finance":
      return { label: "Open finance", href: `${base}?tab=money` }
  }
}

function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return Number.isFinite(value)
  return Boolean(value)
}

export function buildEventSetupChecklist(input: {
  eventId: string
  event?: Record<string, unknown> | null
  /** Optional live counts from child tables (omit on fresh create). */
  counts?: {
    staffShifts?: number
    ticketTypes?: number
    advancingDocuments?: number
    logisticsTasks?: number
    financeRecords?: number
  }
  /**
   * EVENT-202 — when a count query fails for a domain, status becomes `unknown`.
   * Keys are setup domains.
   */
  countErrors?: Partial<Record<EventSetupDomain, string>>
  /**
   * EVENT-202 — when evaluating a hard dependency fails (e.g. venue lookup error),
   * dependent domains become `unknown` instead of blocked/not_started.
   */
  dependencyErrors?: Partial<Record<EventSetupDependencyKey, string>>
}): EventSetupChecklist {
  const settings = readSettings(input.event)
  const intent = readIntent(settings)
  const ownership = readOwnership(settings)
  const staffingIntent =
    intent.staffing_intent && typeof intent.staffing_intent === "object"
      ? (intent.staffing_intent as Record<string, unknown>)
      : {}
  const ticketingIntent =
    intent.ticketing_intent && typeof intent.ticketing_intent === "object"
      ? (intent.ticketing_intent as Record<string, unknown>)
      : {}

  const proposedStaff = Array.isArray(staffingIntent.proposed_staff_ids)
    ? staffingIntent.proposed_staff_ids
    : []
  const hasTicketPriceIntent =
    typeof ticketingIntent.general_admission_price === "number"
    || typeof ticketingIntent.vip_price === "number"
    || typeof settings.ticket_price === "number"
  const ticketingSetupMode = resolveEventTicketingSetupMode(settings)
  const isNotTicketed = ticketingSetupMode === "not_ticketed"

  const staffShiftCount = input.counts?.staffShifts ?? 0
  const ticketTypeCount = input.counts?.ticketTypes ?? 0
  const advancingCount = input.counts?.advancingDocuments ?? 0
  const logisticsTaskCount = input.counts?.logisticsTasks ?? 0
  const financeCount = input.counts?.financeRecords ?? 0

  const hasVenue = Boolean(input.event?.venue_id || settings.venue_account_id || settings.venue_label)
  const hasSchedule = filled(input.event?.start_at) || filled(settings.event_date)
  const hasFinanceIntent =
    typeof settings.expected_revenue === "number"
    || typeof settings.expected_expenses === "number"
    || Boolean(settings.settlement_terms)

  const dependencyState: Record<EventSetupDependencyKey, boolean> = {
    venue: hasVenue,
    schedule: hasSchedule,
  }

  function applyDependencyGate(args: {
    domain: EventSetupDomain
    status: EventSetupDomainStatus
    summary: string
    nextAction: string | null
  }): Pick<EventSetupChecklistItem, "status" | "summary" | "nextAction"> {
    const deps = DOMAIN_DEPENDENCIES[args.domain]
    const countError = input.countErrors?.[args.domain]
    if (countError) {
      return {
        status: "unknown",
        summary: `Could not evaluate ${args.domain} completeness (${countError}).`,
        nextAction: "Retry setup completeness or check domain API health",
      }
    }

    for (const dep of deps) {
      const depError = input.dependencyErrors?.[dep]
      if (depError) {
        return {
          status: "unknown",
          summary: `Dependency “${dep}” could not be evaluated (${depError}).`,
          nextAction: `Resolve ${dep} data access, then refresh completeness`,
        }
      }
      if (!dependencyState[dep] && args.status !== "ready") {
        return {
          status: "blocked",
          summary: `Blocked until ${dep} is set on the event.`,
          nextAction: dep === "venue"
            ? "Add a venue name, venue id, or venue profile"
            : "Set a show date / start time",
        }
      }
    }

    return {
      status: args.status,
      summary: args.summary,
      nextAction: args.nextAction,
    }
  }

  const staffingBase = applyDependencyGate({
    domain: "staffing",
    status:
      staffShiftCount > 0
        ? "ready"
        : proposedStaff.length > 0
          ? "in_progress"
          : "not_started",
    summary:
      staffShiftCount > 0
        ? `${staffShiftCount} reviewed shift(s) provisioned.`
        : proposedStaff.length > 0
          ? `${proposedStaff.length} crew invited as intent only — shifts not created.`
          : "No staffing intent or shifts yet.",
    nextAction:
      staffShiftCount > 0
        ? null
        : "POST /api/admin/events/{id}/provision with reviewed staff_shifts",
  })

  const ticketingBase = applyDependencyGate({
    domain: "ticketing",
    status:
      ticketTypeCount > 0 || isNotTicketed
        ? "ready"
        : hasTicketPriceIntent || ticketingSetupMode === "explicit_setup"
          ? "in_progress"
          : "not_started",
    summary:
      ticketTypeCount > 0
        ? `${ticketTypeCount} ticket type(s) provisioned with explicit quantities.`
        : isNotTicketed
          ? "Marked not ticketed — no GA/VIP inventory will be invented."
          : hasTicketPriceIntent
            ? "Price intent recorded — inventory quantities not invented."
            : "Choose explicit ticket setup or mark not ticketed (no silent defaults).",
    nextAction:
      ticketTypeCount > 0 || isNotTicketed
        ? null
        : "Set settings.ticketing_setup=not_ticketed or provision reviewed ticket_types with positive quantity",
  })

  const advanceBase = applyDependencyGate({
    domain: "advance",
    status: advancingCount > 0 ? "in_progress" : "not_started",
    summary:
      advancingCount > 0
        ? "Advancing document exists — complete sections and approvals separately."
        : "No advancing package yet. Create via advancing API (no auto-seed on create).",
    nextAction:
      advancingCount > 0
        ? "Complete advancing sections in command center"
        : "GET/POST /api/admin/events/{id}/advancing",
  })

  const logisticsBase = applyDependencyGate({
    domain: "logistics",
    status:
      logisticsTaskCount > 0
        ? "ready"
        : hasVenue || Boolean(settings.travel || settings.lodging || settings.equipment)
          ? "in_progress"
          : "not_started",
    summary:
      logisticsTaskCount > 0
        ? `${logisticsTaskCount} logistics task(s) on record.`
        : hasVenue
          ? "Venue/travel intent present — tasks not auto-created."
          : "No logistics venue or travel intent yet.",
    nextAction: logisticsTaskCount > 0 ? null : "Add venue and logistics tasks explicitly",
  })

  const financeBase = applyDependencyGate({
    domain: "finance",
    status:
      financeCount > 0
        ? "ready"
        : hasFinanceIntent
          ? "in_progress"
          : "not_started",
    summary:
      financeCount > 0
        ? `${financeCount} finance record(s) on file.`
        : hasFinanceIntent
          ? "Budget/settlement intent recorded — ledger rows not invented."
          : "No finance intent yet.",
    nextAction: financeCount > 0 ? null : "Capture expected revenue/expenses or settlement terms",
  })

  const items: EventSetupChecklistItem[] = [
    {
      domain: "staffing",
      ...staffingBase,
      label: "Staffing",
      provisionPath: `/api/admin/events/${input.eventId}/provision`,
      inventsData: false,
      evidence: {
        proposed_staff_count: proposedStaff.length,
        staff_shift_count: staffShiftCount,
        has_schedule: hasSchedule,
        count_error: input.countErrors?.staffing ?? null,
      },
      owner: resolveOwner("staffing", ownership),
      directAction: resolveDirectAction("staffing", input.eventId),
      dependsOn: DOMAIN_DEPENDENCIES.staffing,
    },
    {
      domain: "ticketing",
      ...ticketingBase,
      label: "Ticketing",
      provisionPath: isNotTicketed
        ? null
        : `/api/admin/events/${input.eventId}/provision`,
      inventsData: false,
      evidence: {
        has_price_intent: hasTicketPriceIntent,
        ticket_type_count: ticketTypeCount,
        ticketing_setup: ticketingSetupMode,
        has_schedule: hasSchedule,
        count_error: input.countErrors?.ticketing ?? null,
      },
      owner: resolveOwner("ticketing", ownership),
      directAction: resolveDirectAction("ticketing", input.eventId),
      dependsOn: DOMAIN_DEPENDENCIES.ticketing,
    },
    {
      domain: "advance",
      ...advanceBase,
      label: "Advance",
      provisionPath: `/api/admin/events/${input.eventId}/advancing`,
      inventsData: false,
      evidence: {
        advancing_document_count: advancingCount,
        has_venue: hasVenue,
        count_error: input.countErrors?.advance ?? null,
      },
      owner: resolveOwner("advance", ownership),
      directAction: resolveDirectAction("advance", input.eventId),
      dependsOn: DOMAIN_DEPENDENCIES.advance,
    },
    {
      domain: "logistics",
      ...logisticsBase,
      label: "Logistics",
      provisionPath: null,
      inventsData: false,
      evidence: {
        has_venue: hasVenue,
        logistics_task_count: logisticsTaskCount,
        count_error: input.countErrors?.logistics ?? null,
      },
      owner: resolveOwner("logistics", ownership),
      directAction: resolveDirectAction("logistics", input.eventId),
      dependsOn: DOMAIN_DEPENDENCIES.logistics,
    },
    {
      domain: "finance",
      ...financeBase,
      label: "Finance",
      provisionPath: null,
      inventsData: false,
      evidence: {
        has_finance_intent: hasFinanceIntent,
        finance_record_count: financeCount,
        count_error: input.countErrors?.finance ?? null,
      },
      owner: resolveOwner("finance", ownership),
      directAction: resolveDirectAction("finance", input.eventId),
      dependsOn: DOMAIN_DEPENDENCIES.finance,
    },
  ]

  return {
    version: 1,
    eventId: input.eventId,
    generatedAt: new Date().toISOString(),
    items,
    pendingDomains: items
      .filter((item) =>
        item.status === "not_started"
        || item.status === "in_progress"
        || item.status === "blocked"
        || item.status === "unknown",
      )
      .map((item) => item.domain),
  }
}

/** Persist checklist under settings without inventing operational rows. */
export function mergeSetupChecklistIntoSettings(
  settings: Record<string, unknown>,
  checklist: EventSetupChecklist,
): Record<string, unknown> {
  return {
    ...settings,
    setup_checklist_status: checklist,
  }
}
