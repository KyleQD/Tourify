/**
 * LOG-102 — Logistics task taxonomy and authority.
 *
 * Domains are non-overlapping. Generic `logistics_tasks` track work only;
 * structured domain tables remain authoritative for inventory, capacity,
 * bookings, meals, and map state.
 */

export const LOGISTICS_TASK_DOMAINS = [
  "transportation",
  "equipment",
  "lodging",
  "catering",
  "communication",
  "backline",
  "rental",
] as const

export type LogisticsTaskDomain = (typeof LOGISTICS_TASK_DOMAINS)[number]

/** Non-overlapping categories within each domain (work labels, not entity types). */
export const LOGISTICS_DOMAIN_CATEGORIES: Record<LogisticsTaskDomain, readonly string[]> = {
  transportation: ["ground_transfer", "flight_coordination", "manifest", "coordination_review"],
  equipment: ["reservation", "setup", "movement", "inspection"],
  lodging: ["rooming", "check_in", "incidentals", "provider_followup"],
  catering: ["meal_service", "headcount", "dietary_ops", "rider_followup"],
  communication: ["channel_plan", "radio", "escalation", "ack_followup"],
  backline: ["requirement", "fulfillment", "substitution", "delivery"],
  rental: ["agreement", "pickup_return", "damage", "invoice_followup"],
}

/**
 * Structured tables that own domain state. Tasks may link via source_type/source_id
 * but must never replace these as the system of record.
 */
export const LOGISTICS_STRUCTURED_AUTHORITY: Record<
  LogisticsTaskDomain,
  {
    authoritativeTables: readonly string[]
    allowedSourceTypes: readonly string[]
    taskResponsibility: "work_tracking_only"
  }
> = {
  transportation: {
    authoritativeTables: [
      "flight_coordination",
      "ground_transportation_coordination",
      "travel_groups",
      "flight_passenger_assignments",
      "transportation_passenger_assignments",
    ],
    allowedSourceTypes: [
      "flight_coordination",
      "ground_transportation_coordination",
      "travel_groups",
    ],
    taskResponsibility: "work_tracking_only",
  },
  equipment: {
    authoritativeTables: [
      "equipment_reservations",
      "equipment_instances",
      "equipment_setup_workflows",
      "equipment_assets",
    ],
    allowedSourceTypes: [
      "equipment_reservations",
      "equipment_instances",
      "equipment_setup_workflows",
      "equipment_assets",
    ],
    taskResponsibility: "work_tracking_only",
  },
  lodging: {
    authoritativeTables: ["lodging_bookings", "hotel_room_assignments", "lodging_guest_assignments"],
    allowedSourceTypes: ["lodging_bookings", "hotel_room_assignments"],
    taskResponsibility: "work_tracking_only",
  },
  catering: {
    authoritativeTables: [
      "catering_services",
      "catering_headcount_snapshots",
      "catering_dietary_summaries",
    ],
    allowedSourceTypes: ["catering_services"],
    taskResponsibility: "work_tracking_only",
  },
  communication: {
    authoritativeTables: ["logistics_comms_plans", "logistics_comms_channels"],
    allowedSourceTypes: ["logistics_comms_plans", "logistics_comms_channels"],
    taskResponsibility: "work_tracking_only",
  },
  backline: {
    authoritativeTables: [
      "backline_requirements",
      "backline_fulfillments",
      "backline_substitution_approvals",
    ],
    allowedSourceTypes: ["backline_requirements", "backline_fulfillments"],
    taskResponsibility: "work_tracking_only",
  },
  rental: {
    authoritativeTables: ["rental_agreements", "rental_agreement_items", "rental_payments"],
    allowedSourceTypes: ["rental_agreements", "rental_agreement_items"],
    taskResponsibility: "work_tracking_only",
  },
}

/** Domains that must not be double-counted as overlapping metric buckets. */
export const LOGISTICS_NON_OVERLAPPING_METRIC_DOMAINS = LOGISTICS_TASK_DOMAINS

export function isLogisticsTaskDomain(value: unknown): value is LogisticsTaskDomain {
  return typeof value === "string" && (LOGISTICS_TASK_DOMAINS as readonly string[]).includes(value)
}

export function isLogisticsDomainCategory(
  domain: LogisticsTaskDomain,
  category: string,
): boolean {
  return (LOGISTICS_DOMAIN_CATEGORIES[domain] as readonly string[]).includes(category)
}

export function getStructuredAuthority(domain: LogisticsTaskDomain) {
  return LOGISTICS_STRUCTURED_AUTHORITY[domain]
}

export interface LogisticsTaskTaxonomyInput {
  type?: unknown
  category?: unknown
  source_type?: unknown
  source_id?: unknown
  /** Reject payloads that claim the task is the booking/inventory system of record. */
  is_authoritative?: unknown
}

export function assertLogisticsTaskTaxonomy(input: LogisticsTaskTaxonomyInput): {
  ok: true
  domain: LogisticsTaskDomain
  category: string | null
  source_type: string | null
  source_id: string | null
} | {
  ok: false
  error: string
} {
  if (!isLogisticsTaskDomain(input.type)) {
    return {
      ok: false,
      error: `Unknown or overlapping logistics domain: ${String(input.type)}. Allowed: ${LOGISTICS_TASK_DOMAINS.join(", ")}`,
    }
  }

  const domain = input.type
  const authority = getStructuredAuthority(domain)

  if (input.is_authoritative === true) {
    return {
      ok: false,
      error: `Generic logistics tasks are work-tracking only for ${domain}; structured tables own domain state (${authority.authoritativeTables.join(", ")})`,
    }
  }

  let category: string | null = null
  if (input.category != null && input.category !== "") {
    if (typeof input.category !== "string" || !isLogisticsDomainCategory(domain, input.category)) {
      return {
        ok: false,
        error: `Invalid category for domain ${domain}. Allowed: ${LOGISTICS_DOMAIN_CATEGORIES[domain].join(", ")}`,
      }
    }
    category = input.category
  }

  let source_type: string | null = null
  let source_id: string | null = null
  if (input.source_type != null && input.source_type !== "") {
    if (typeof input.source_type !== "string")
      return { ok: false, error: "source_type must be a string" }
    if (!(authority.allowedSourceTypes as readonly string[]).includes(input.source_type)) {
      return {
        ok: false,
        error: `source_type ${input.source_type} is not allowed under domain ${domain}. Allowed: ${authority.allowedSourceTypes.join(", ")}`,
      }
    }
    source_type = input.source_type
    if (input.source_id == null || input.source_id === "") {
      return { ok: false, error: "source_id is required when source_type is set" }
    }
    if (typeof input.source_id !== "string")
      return { ok: false, error: "source_id must be a UUID string" }
    source_id = input.source_id
  } else if (input.source_id != null && input.source_id !== "") {
    return { ok: false, error: "source_type is required when source_id is set" }
  }

  return { ok: true, domain, category, source_type, source_id }
}

/** Metric helper: count unique tasks by domain without overlapping labels. */
export function countTasksByDomain(
  tasks: Array<{ type?: string | null }>,
): Record<LogisticsTaskDomain, number> {
  const counts = Object.fromEntries(LOGISTICS_TASK_DOMAINS.map((d) => [d, 0])) as Record<
    LogisticsTaskDomain,
    number
  >
  for (const task of tasks) {
    if (isLogisticsTaskDomain(task.type)) counts[task.type] += 1
  }
  return counts
}
