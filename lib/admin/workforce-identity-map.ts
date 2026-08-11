/**
 * WORK-101 — Canonical map of existing person/assignment records.
 *
 * Each legacy surface has a destination, identity-resolution rule, and
 * duplicate-risk rating. Used by WORK-102+ authority and WORK-105 merge.
 */

export type WorkforceDuplicateRisk = "low" | "medium" | "high"

export type WorkforceCanonicalDestination =
  | "profiles"
  | "organization_people"
  | "tour_party_members"
  | "tour_role_assignments"
  | "work_shifts"
  | "shift_assignments"
  | "assignment_credentials"
  | "org_rbac_only"
  | "hiring_pipeline"
  | "onboarding_stage"
  | "publication_only"
  | "deprecated_migrate"

export interface WorkforceIdentityMapping {
  id: string
  sourceTable: string
  sourceSurface: string
  keyFields: string[]
  canonicalDestination: WorkforceCanonicalDestination
  identityResolutionRule: string
  duplicateRisk: WorkforceDuplicateRisk
  notes?: string
}

export interface WorkforceDuplicateRiskPattern {
  id: string
  severity: WorkforceDuplicateRisk
  title: string
  description: string
  relatedMappingIds: string[]
}

export const WORKFORCE_IDENTITY_MAPPINGS: WorkforceIdentityMapping[] = [
  {
    id: "profiles",
    sourceTable: "profiles",
    sourceSurface: "Account identity",
    keyFields: ["id"],
    canonicalDestination: "profiles",
    identityResolutionRule: "Person root = auth.users/profiles.id; never invent parallel person rows.",
    duplicateRisk: "low",
  },
  {
    id: "org_members",
    sourceTable: "org_members",
    sourceSurface: "Org RBAC",
    keyFields: ["org_id", "user_id", "role"],
    canonicalDestination: "org_rbac_only",
    identityResolutionRule: "Authorize via (org_id, user_id); do not treat as roster/person record.",
    duplicateRisk: "medium",
    notes: "Same user may lack staff_members / tour_team_members rows.",
  },
  {
    id: "staff_members",
    sourceTable: "staff_members",
    sourceSurface: "Hiring roster",
    keyFields: ["id", "user_id", "employer_entity_type", "employer_entity_id", "email"],
    canonicalDestination: "organization_people",
    identityResolutionRule:
      "Prefer (employer_entity_type, employer_entity_id, user_id); else email+employer; link onboarding_candidate_id when present.",
    duplicateRisk: "high",
    notes: "De-facto organization person today.",
  },
  {
    id: "employment_assignments",
    sourceTable: "employment_assignments",
    sourceSurface: "Work Mode assignments",
    keyFields: ["id", "user_id", "staff_member_id", "staff_shift_id", "event_id"],
    canonicalDestination: "shift_assignments",
    identityResolutionRule:
      "Prefer staff_shift_id → else staff_member_id → else (user_id, employer, role window).",
    duplicateRisk: "high",
    notes: "Can exist without roster link.",
  },
  {
    id: "staff_shifts",
    sourceTable: "staff_shifts",
    sourceSurface: "Scheduling shifts",
    keyFields: ["id", "staff_member_id", "event_id", "shift_date", "start_time", "end_time"],
    canonicalDestination: "work_shifts",
    identityResolutionRule: "Shift PK; assignee via staff_member_id → user_id when set.",
    duplicateRisk: "medium",
    notes: "Open shifts may have null staff_member_id.",
  },
  {
    id: "staff_shift_assignments",
    sourceTable: "staff_shift_assignments",
    sourceSurface: "Shift assignment bridge",
    keyFields: ["staff_member_id", "shift_id", "event_id"],
    canonicalDestination: "shift_assignments",
    identityResolutionRule: "Prefer shift_id; else (staff_member_id, event_id).",
    duplicateRisk: "high",
    notes: "Overlaps staff_shifts + employment_assignments.",
  },
  {
    id: "tour_team_members",
    sourceTable: "tour_team_members",
    sourceSurface: "Tour party / collaborators",
    keyFields: ["id", "tour_id", "user_id", "email", "role"],
    canonicalDestination: "tour_party_members",
    identityResolutionRule: "Prefer (tour_id, user_id); else email on tour; role → tour_role_assignments.",
    duplicateRisk: "high",
    notes: "Accountless profile jsonb still exists.",
  },
  {
    id: "event_participants",
    sourceTable: "event_participants",
    sourceSurface: "Event party",
    keyFields: ["event_id", "participant_type", "participant_id", "role"],
    canonicalDestination: "tour_role_assignments",
    identityResolutionRule:
      "participant_type discriminates UUID meaning (Artist vs Individual/user); never assume participant_id = user_id.",
    duplicateRisk: "high",
  },
  {
    id: "job_applications",
    sourceTable: "job_applications",
    sourceSurface: "Hiring applications",
    keyFields: ["id", "applicant_id", "applicant_email", "employer_entity_id"],
    canonicalDestination: "hiring_pipeline",
    identityResolutionRule:
      "On approve: applicant_id else invite-by-email → single organization_people upsert (WORK-103).",
    duplicateRisk: "high",
  },
  {
    id: "staff_onboarding_candidates",
    sourceTable: "staff_onboarding_candidates",
    sourceSurface: "Onboarding candidates",
    keyFields: ["id", "user_id", "email", "employer_entity_id", "status"],
    canonicalDestination: "onboarding_stage",
    identityResolutionRule: "Candidate → organization_people via onboarding_candidate_id on staff_members.",
    duplicateRisk: "medium",
  },
  {
    id: "venue_team_members",
    sourceTable: "venue_team_members",
    sourceSurface: "Legacy venue team",
    keyFields: ["venue_id", "user_id", "email"],
    canonicalDestination: "deprecated_migrate",
    identityResolutionRule: "Migrate into organization_people with employer venue; stop new writes.",
    duplicateRisk: "high",
  },
  {
    id: "venue_crew_members",
    sourceTable: "venue_crew_members",
    sourceSurface: "Venue crew profiles",
    keyFields: ["id", "venue_id", "user_id", "email"],
    canonicalDestination: "organization_people",
    identityResolutionRule: "Match user_id then email@venue; skills map to assignment_credentials.",
    duplicateRisk: "high",
  },
  {
    id: "work_mode_publications",
    sourceTable: "work_mode_publications",
    sourceSurface: "Work Mode publications",
    keyFields: ["id", "event_id", "tour_id"],
    canonicalDestination: "publication_only",
    identityResolutionRule: "Audience derived from assignments; no person identity stored here.",
    duplicateRisk: "low",
  },
]

export const WORKFORCE_DUPLICATE_RISK_REPORT: WorkforceDuplicateRiskPattern[] = [
  {
    id: "dup-cross-surface-user",
    severity: "high",
    title: "Same user_id across roster, RBAC, tour party, and event participants",
    description:
      "A single profiles.id may appear in staff_members, org_members, tour_team_members, and event_participants without a shared organization_people / assignment key.",
    relatedMappingIds: ["staff_members", "org_members", "tour_team_members", "event_participants"],
  },
  {
    id: "dup-roster-workmode-drift",
    severity: "high",
    title: "Roster ↔ Work Mode drift",
    description:
      "staff_members can exist without employment_assignments, and employment_assignments can reference null staff_member_id.",
    relatedMappingIds: ["staff_members", "employment_assignments"],
  },
  {
    id: "dup-triple-shift-write",
    severity: "high",
    title: "Triple shift write path",
    description:
      "One invite may write staff_shifts, employment_assignments.staff_shift_id, and staff_shift_assignments for the same engagement.",
    relatedMappingIds: ["staff_shifts", "employment_assignments", "staff_shift_assignments"],
  },
  {
    id: "dup-hiring-email-convert",
    severity: "high",
    title: "Hiring convert without account",
    description:
      "Approve-by-email can create a roster row with null user_id; later account link creates a second row.",
    relatedMappingIds: ["job_applications", "staff_members", "staff_onboarding_candidates"],
  },
  {
    id: "dup-polymorphic-party",
    severity: "high",
    title: "Polymorphic / accountless party rows",
    description:
      "event_participants.participant_id meaning depends on participant_type; tour_team_members may store name/email/profile jsonb without user_id.",
    relatedMappingIds: ["event_participants", "tour_team_members", "venue_crew_members"],
  },
]

export const WORKFORCE_REQUIRED_SURFACES = [
  "roster",
  "team",
  "participant",
  "staff",
  "employment",
  "work_mode",
] as const

/** Surfaces covered by at least one mapping (for AC completeness). */
export function workforceSurfacesCovered(): Record<(typeof WORKFORCE_REQUIRED_SURFACES)[number], boolean> {
  const tables = new Set(WORKFORCE_IDENTITY_MAPPINGS.map((row) => row.sourceTable))
  return {
    roster: tables.has("staff_members"),
    team: tables.has("tour_team_members") || tables.has("venue_team_members"),
    participant: tables.has("event_participants"),
    staff: tables.has("staff_members") || tables.has("staff_shifts"),
    employment: tables.has("employment_assignments"),
    work_mode: tables.has("employment_assignments") || tables.has("work_mode_publications"),
  }
}

export function assertWorkforceIdentityMapComplete(): void {
  const covered = workforceSurfacesCovered()
  for (const surface of WORKFORCE_REQUIRED_SURFACES) {
    if (!covered[surface]) throw new Error(`WORK-101 missing mapping coverage for surface: ${surface}`)
  }
  for (const mapping of WORKFORCE_IDENTITY_MAPPINGS) {
    if (!mapping.canonicalDestination) throw new Error(`Missing destination for ${mapping.id}`)
    if (!mapping.identityResolutionRule.trim()) throw new Error(`Missing resolution rule for ${mapping.id}`)
  }
  if (WORKFORCE_DUPLICATE_RISK_REPORT.length < 5)
    throw new Error("WORK-101 requires a duplicate risk report with at least 5 patterns")
}
