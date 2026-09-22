/**
 * WORK-401 — Tour party model (pure).
 *
 * A tour party member is the canonical record of a person participating in a
 * specific tour. It carries:
 *   - Scoped dates (join/leave within the tour window)
 *   - Role and department context
 *   - Assignment status lifecycle (draft → offered → accepted → declined →
 *     confirmed → released → cancelled)
 *   - Traveler attributes (home base, emergency contact, accessibility,
 *     dietary — all restricted-access personal fields)
 *   - Work Mode link (the stable identifier that publications target)
 *   - Field-class projection (personal fields require elevated capability)
 *
 * Pure: no I/O, no `server-only`.
 */

import type { WorkforceFieldClass } from "@/lib/admin/workforce-field-projections"

// ---------------------------------------------------------------------------
// Assignment status lifecycle
// ---------------------------------------------------------------------------

export type TourPartyMemberStatus =
  | "draft"
  | "offered"
  | "accepted"
  | "declined"
  | "confirmed"
  | "released"
  | "cancelled"

/** Allowed forward transitions per status. */
export const TOUR_PARTY_STATUS_TRANSITIONS: Record<
  TourPartyMemberStatus,
  TourPartyMemberStatus[]
> = {
  draft:     ["offered", "confirmed", "cancelled"],
  offered:   ["accepted", "declined", "cancelled"],
  accepted:  ["confirmed", "cancelled"],
  declined:  ["offered", "cancelled"],        // re-offer is allowed
  confirmed: ["released", "cancelled"],
  released:  ["confirmed", "cancelled"],      // reinstate is allowed
  cancelled: [],
}

export class TourPartyTransitionError extends Error {
  readonly code = "invalid_tour_party_transition" as const
  constructor(from: TourPartyMemberStatus, to: TourPartyMemberStatus) {
    super(`Invalid tour-party status transition: '${from}' → '${to}'`)
    this.name = "TourPartyTransitionError"
  }
}

// ---------------------------------------------------------------------------
// Personal-field access classes
// ---------------------------------------------------------------------------

export type TourPartyFieldClass = WorkforceFieldClass

export const TOUR_PARTY_FIELD_CLASSES: Record<string, TourPartyFieldClass> = {
  // Operational — visible to any authorized tour viewer
  member_id:              "operational",
  tour_id:                "operational",
  org_id:                 "operational",
  person_id:              "operational",
  work_mode_identity_id:  "operational",
  role_title:             "operational",
  department:             "operational",
  status:                 "operational",
  join_date:              "operational",
  leave_date:             "operational",
  is_traveling:           "operational",
  created_at:             "operational",
  updated_at:             "operational",
  // Contact — workforce.view required
  email:                  "contact",
  phone:                  "contact",
  // Personnel sensitive — workforce.manage or explicit HR cap
  home_base:              "personnel_sensitive",
  emergency_contact_name: "personnel_sensitive",
  emergency_contact_phone:"personnel_sensitive",
  accessibility_notes:    "personnel_sensitive",
  dietary_notes:          "personnel_sensitive",
  // Financial — finance capability required
  rate_per_day:           "financial",
  currency:               "financial",
  per_diem_policy_id:     "financial",
  // Sensitive personal — HR/legal capability required
  date_of_birth:          "sensitive_personal",
  government_id_ref:      "sensitive_personal",
}

// ---------------------------------------------------------------------------
// Tour party member record
// ---------------------------------------------------------------------------

export interface TourPartyTravelerAttributes {
  is_traveling: boolean
  home_base: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  accessibility_notes: string | null
  dietary_notes: string | null
}

export interface TourPartyFinancialAttributes {
  rate_per_day: number | null
  currency: string | null
  per_diem_policy_id: string | null
}

export interface TourPartyMember {
  member_id: string
  tour_id: string
  org_id: string
  /** Resolves to a person in organization_people / profiles. */
  person_id: string
  /** Stable publication-target identity used by Work Mode. */
  work_mode_identity_id: string | null
  role_title: string
  department: string | null
  status: TourPartyMemberStatus
  /** ISO date this person joins the tour party (inclusive). */
  join_date: string
  /** ISO date this person leaves the tour party (inclusive). Null = end of tour. */
  leave_date: string | null
  traveler: TourPartyTravelerAttributes
  financial: TourPartyFinancialAttributes
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export interface TourPartyTransitionResult {
  ok: boolean
  member: TourPartyMember
  error?: string
}

export function transitionTourPartyMember(
  member: TourPartyMember,
  toStatus: TourPartyMemberStatus,
  actor: string,
  at: string,
): TourPartyTransitionResult {
  const allowed = TOUR_PARTY_STATUS_TRANSITIONS[member.status]
  if (!allowed.includes(toStatus)) {
    return {
      ok: false,
      member,
      error: `Invalid tour-party status transition: '${member.status}' → '${toStatus}'`,
    }
  }
  return {
    ok: true,
    member: {
      ...member,
      status: toStatus,
      updated_by: actor,
      updated_at: at,
    },
  }
}

// ---------------------------------------------------------------------------
// Date scoping helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the member is active on a given ISO date within the tour.
 * A member with null leave_date is active through the end of the tour.
 */
export function memberIsActiveOnDate(
  member: TourPartyMember,
  isoDate: string,
): boolean {
  if (member.status === "cancelled" || member.status === "declined") return false
  if (isoDate < member.join_date) return false
  if (member.leave_date && isoDate > member.leave_date) return false
  return true
}

/** Returns all members active on a given ISO date. */
export function membersActiveOnDate(
  members: TourPartyMember[],
  isoDate: string,
): TourPartyMember[] {
  return members.filter((m) => memberIsActiveOnDate(m, isoDate))
}

/** Returns all members whose scope overlaps a date range [from, to] inclusive. */
export function membersActiveInRange(
  members: TourPartyMember[],
  fromDate: string,
  toDate: string,
): TourPartyMember[] {
  return members.filter((m) => {
    if (m.status === "cancelled" || m.status === "declined") return false
    // Member's active window: [join_date, leave_date ?? ∞]
    const memberEnd = m.leave_date ?? "9999-12-31"
    // Overlap when: member starts ≤ range end AND member ends ≥ range start
    return m.join_date <= toDate && memberEnd >= fromDate
  })
}

// ---------------------------------------------------------------------------
// Field projection
// ---------------------------------------------------------------------------

export type TourPartyProjectionLevel =
  | "operational"     // join_date, leave_date, role, department, status, Work Mode id
  | "contact"         // + email, phone
  | "full_workforce"  // + home_base, emergency, accessibility, dietary
  | "financial"       // + rate_per_day, currency, per_diem_policy_id
  | "hr_sensitive"    // + date_of_birth, government_id_ref

const PROJECTION_INCLUDED_CLASSES: Record<TourPartyProjectionLevel, TourPartyFieldClass[]> = {
  operational:    ["operational"],
  contact:        ["operational", "contact"],
  full_workforce: ["operational", "contact", "personnel_sensitive"],
  financial:      ["operational", "contact", "personnel_sensitive", "financial"],
  hr_sensitive:   ["operational", "contact", "personnel_sensitive", "financial", "sensitive_personal"],
}

/** Strip fields from a member record that are above the caller's projection level. */
export function projectTourPartyMember(
  member: TourPartyMember,
  level: TourPartyProjectionLevel,
): TourPartyMember {
  const allowedClasses = PROJECTION_INCLUDED_CLASSES[level]

  // Build a clean traveler projection
  const traveler: TourPartyTravelerAttributes = {
    is_traveling: member.traveler.is_traveling,
    home_base: allowedClasses.includes("personnel_sensitive") ? member.traveler.home_base : null,
    emergency_contact_name: allowedClasses.includes("personnel_sensitive")
      ? member.traveler.emergency_contact_name
      : null,
    emergency_contact_phone: allowedClasses.includes("personnel_sensitive")
      ? member.traveler.emergency_contact_phone
      : null,
    accessibility_notes: allowedClasses.includes("personnel_sensitive")
      ? member.traveler.accessibility_notes
      : null,
    dietary_notes: allowedClasses.includes("personnel_sensitive")
      ? member.traveler.dietary_notes
      : null,
  }

  const financial: TourPartyFinancialAttributes = allowedClasses.includes("financial")
    ? member.financial
    : { rate_per_day: null, currency: null, per_diem_policy_id: null }

  return { ...member, traveler, financial }
}

// ---------------------------------------------------------------------------
// Work Mode link
// ---------------------------------------------------------------------------

/**
 * Returns true when the member has a stable Work Mode identity link.
 * Publications targeting this member require a non-null work_mode_identity_id.
 */
export function memberIsPublicationReady(member: TourPartyMember): boolean {
  return (
    member.work_mode_identity_id != null &&
    member.status !== "cancelled" &&
    member.status !== "declined"
  )
}

// ---------------------------------------------------------------------------
// Party summary
// ---------------------------------------------------------------------------

export interface TourPartySummary {
  tour_id: string
  total: number
  by_status: Record<TourPartyMemberStatus, number>
  confirmed: number
  traveling: number
  publication_ready: number
  open_offers: number
}

export function summariseTourParty(
  tourId: string,
  members: TourPartyMember[],
): TourPartySummary {
  const byStatus: Record<TourPartyMemberStatus, number> = {
    draft: 0, offered: 0, accepted: 0, declined: 0,
    confirmed: 0, released: 0, cancelled: 0,
  }
  let traveling = 0
  let publicationReady = 0
  let openOffers = 0

  for (const m of members) {
    byStatus[m.status] = (byStatus[m.status] ?? 0) + 1
    if (m.traveler.is_traveling && m.status !== "cancelled" && m.status !== "declined") {
      traveling++
    }
    if (memberIsPublicationReady(m)) publicationReady++
    if (m.status === "offered" || m.status === "accepted") openOffers++
  }

  return {
    tour_id: tourId,
    total: members.length,
    by_status: byStatus,
    confirmed: byStatus.confirmed,
    traveling,
    publication_ready: publicationReady,
    open_offers: openOffers,
  }
}
