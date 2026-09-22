/**
 * PUB-002 — Fail-closed publication section and field classification.
 *
 * Every included payload leaf inherits its section class unless a field rule raises
 * the sensitivity. Unknown section keys require an explicit class; callers cannot
 * lower a built-in section or protected-field class.
 */

import {
  elevatePublicationAudienceClass,
  type PublicationAudienceClass,
  type PublicationType,
} from "@/lib/admin/publication-schema"

export interface PublicationSectionPolicy {
  audienceClass: PublicationAudienceClass
  description: string
  fieldClasses?: Readonly<Record<string, PublicationAudienceClass>>
}

const PROTECTED_FIELD_CLASSES: Readonly<Record<string, PublicationAudienceClass>> = {
  "*.passport": "sensitive_traveler",
  "*.passport_number": "sensitive_traveler",
  "*.government_id": "sensitive_traveler",
  "*.date_of_birth": "sensitive_traveler",
  "*.known_traveler_number": "sensitive_traveler",
  "*.medical_notes": "sensitive_traveler",
  "*.dietary_restrictions": "sensitive_traveler",
  "*.accessibility_needs": "sensitive_traveler",
  "*.allergen_notes": "sensitive_traveler",
  "*.room_label": "sensitive_traveler",
  "*.room_number": "sensitive_traveler",
  "*.personal_phone": "sensitive_traveler",
  "*.personal_email": "sensitive_traveler",
  "*.pay_rate": "financial",
  "*.hourly_rate": "financial",
  "*.cost": "financial",
  "*.amount": "financial",
  "*.settlement": "financial",
  "*.guest_email": "personnel",
  "*.guest_phone": "personnel",
  "*.employee_id": "personnel",
  "*.incident_details": "internal",
  "*.internal_notes": "internal",
  "*.credential_code": "internal",
  "*.offline_token": "internal",
}

/**
 * Canonical section defaults shared by every publication type. Publication-type
 * renderers may use a subset. A field not listed in `fieldClasses` inherits the
 * section class, so no included leaf is left unclassified.
 */
export const PUBLICATION_SECTION_POLICIES: Readonly<Record<string, PublicationSectionPolicy>> = {
  overview: { audienceClass: "worker", description: "Tour or event identity, dates, and markets." },
  itinerary: { audienceClass: "worker", description: "Ordered stops, local times, venues, and route context." },
  stops: { audienceClass: "worker", description: "Stop schedule and venue identity." },
  route: { audienceClass: "worker", description: "Route legs and operational travel times." },
  contacts: {
    audienceClass: "personnel",
    description: "Named people and work contact details.",
    fieldClasses: { "*.personal_phone": "sensitive_traveler", "*.personal_email": "sensitive_traveler" },
  },
  travel: { audienceClass: "sensitive_traveler", description: "Traveler-specific segments, identity, and movement." },
  travel_brief: { audienceClass: "sensitive_traveler", description: "Traveler-specific itinerary and movement." },
  lodging: { audienceClass: "sensitive_traveler", description: "Traveler rooming and lodging assignments." },
  schedule: { audienceClass: "worker", description: "Calls, shifts, and assignment schedule." },
  schedules: { audienceClass: "worker", description: "Calls, shifts, and assignment schedules." },
  run_of_show: { audienceClass: "worker", description: "Operational show timeline." },
  day_sheet: { audienceClass: "worker", description: "Worker-facing event-day operating information." },
  advance: { audienceClass: "department", description: "Department advance requirements and responses." },
  advance_request: { audienceClass: "vendor", description: "Scoped request sent to a venue or vendor." },
  advance_response: { audienceClass: "department", description: "Vendor response reviewed by the owning department." },
  maps: { audienceClass: "worker", description: "Site maps with restricted tokens elevated by field rule." },
  site_map: { audienceClass: "worker", description: "Site map and access layers." },
  hospitality: { audienceClass: "department", description: "Hospitality and catering operations." },
  equipment: { audienceClass: "department", description: "Equipment manifests, custody, and department operations." },
  tickets_credentials: { audienceClass: "department", description: "Ticket allocations and credential operations." },
  emergency: { audienceClass: "worker", description: "Emergency procedures and approved contacts." },
  emergency_notice: { audienceClass: "worker", description: "Bounded emergency communication." },
  change_notice: { audienceClass: "worker", description: "Versioned change summary; protected fields retain higher classes." },
  financials: { audienceClass: "financial", description: "Budgets, settlements, rates, and monetary evidence." },
  contracts: { audienceClass: "financial", description: "Scoped commercial and obligation details." },
  personnel: { audienceClass: "personnel", description: "Roster and personnel records." },
  public: { audienceClass: "public", description: "Content explicitly approved for public access." },
}

export interface ResolvedPublicationFieldClassification {
  publicationType: PublicationType
  sectionKey: string
  sectionAudienceClass: PublicationAudienceClass
  accessClassification: PublicationAudienceClass
  fieldAudienceClasses: Record<string, PublicationAudienceClass>
}

function normalizePath(path: string): string {
  return path.replace(/\[\d+\]/g, "[]")
}

function payloadLeafPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return prefix ? [prefix] : ["$"]
  if (Array.isArray(value)) {
    if (value.length === 0) return prefix ? [`${prefix}[]`] : ["[]"]
    return value.flatMap((item, index) => payloadLeafPaths(item, `${prefix}[${index}]`))
  }
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return prefix ? [prefix] : ["$"]
  return entries.flatMap(([key, child]) => payloadLeafPaths(child, prefix ? `${prefix}.${key}` : key))
}

function policyForPath(
  path: string,
  policies: Readonly<Record<string, PublicationAudienceClass>>,
): PublicationAudienceClass | undefined {
  const normalized = normalizePath(path)
  if (policies[normalized]) return policies[normalized]
  const leaf = normalized.split(".").at(-1)?.replace(/\[\]$/, "") || normalized
  return policies[`*.${leaf}`]
}

export class PublicationFieldClassificationError extends Error {
  readonly status = 422

  constructor(message: string) {
    super(message)
    this.name = "PublicationFieldClassificationError"
  }
}

export function classifyPublicationSection(input: {
  publicationType: PublicationType
  sectionKey: string
  payload: unknown
  audienceClass?: PublicationAudienceClass
  fieldAudienceClasses?: Readonly<Record<string, PublicationAudienceClass>>
}): ResolvedPublicationFieldClassification {
  const key = input.sectionKey.trim().toLowerCase()
  const policy = PUBLICATION_SECTION_POLICIES[key]
  if (!policy && !input.audienceClass) {
    throw new PublicationFieldClassificationError(
      `Section "${input.sectionKey}" has no publication audience classification.`,
    )
  }

  const sectionAudienceClass = policy
    ? input.audienceClass
      ? elevatePublicationAudienceClass(policy.audienceClass, input.audienceClass)
      : policy.audienceClass
    : (input.audienceClass as PublicationAudienceClass)
  const fieldAudienceClasses: Record<string, PublicationAudienceClass> = {}
  let accessClassification = sectionAudienceClass

  for (const rawPath of payloadLeafPaths(input.payload)) {
    const path = normalizePath(rawPath)
    const requiredClass = policyForPath(path, {
      ...PROTECTED_FIELD_CLASSES,
      ...(policy?.fieldClasses || {}),
    })
    const requestedClass = policyForPath(path, input.fieldAudienceClasses || {})
    const resolved = requiredClass
      ? requestedClass
        ? elevatePublicationAudienceClass(
            sectionAudienceClass,
            elevatePublicationAudienceClass(requiredClass, requestedClass),
          )
        : elevatePublicationAudienceClass(sectionAudienceClass, requiredClass)
      : requestedClass
        ? elevatePublicationAudienceClass(sectionAudienceClass, requestedClass)
        : sectionAudienceClass
    fieldAudienceClasses[path] = resolved
    accessClassification = elevatePublicationAudienceClass(accessClassification, resolved)
  }

  return {
    publicationType: input.publicationType,
    sectionKey: key,
    sectionAudienceClass,
    accessClassification,
    fieldAudienceClasses,
  }
}
