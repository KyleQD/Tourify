/**
 * SEC-203 — Traveler / lodging / catering field projection.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import {
  canReadProtectedDataClass,
  projectByProtectedDataPolicy,
  type ProtectedDataClass,
} from "@/lib/admin/protected-data-policy"

/** Explicit travel-party / passenger field classes. */
export const TRAVELER_FIELD_CLASSES: Record<string, ProtectedDataClass> = {
  member_email: "traveler_contact",
  passenger_email: "traveler_contact",
  member_phone: "traveler_contact",
  phone: "traveler_contact",
  contact_email: "traveler_contact",
  contact_phone: "traveler_contact",
  passport_number: "traveler_identity",
  passport: "traveler_identity",
  government_id: "traveler_identity",
  date_of_birth: "traveler_identity",
  nationality: "traveler_identity",
  known_traveler_number: "traveler_identity",
  dietary_restrictions: "accessibility_dietary",
  dietary: "accessibility_dietary",
  accessibility_needs: "accessibility_dietary",
  accessibility: "accessibility_dietary",
  allergen_notes: "accessibility_dietary",
  medical_notes: "accessibility_dietary",
  roommate_preference: "accessibility_dietary",
}

export function canViewTravelerContact(
  capabilities: readonly AdminCapability[],
): boolean {
  return canReadProtectedDataClass({
    dataClass: "traveler_contact",
    capabilities,
  })
}

export function canViewTravelerIdentity(
  capabilities: readonly AdminCapability[],
): boolean {
  return canReadProtectedDataClass({
    dataClass: "traveler_identity",
    capabilities,
  })
}

export function canViewAccessibilityDietary(
  capabilities: readonly AdminCapability[],
): boolean {
  return canReadProtectedDataClass({
    dataClass: "accessibility_dietary",
    capabilities,
  })
}

export function projectTravelerRecord<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
}): T {
  return projectByProtectedDataPolicy({
    row: args.row,
    capabilities: args.capabilities,
    fieldClasses: TRAVELER_FIELD_CLASSES,
  })
}

export function projectTravelerRecords<T extends Record<string, unknown>>(args: {
  rows: T[]
  capabilities: readonly AdminCapability[]
}): T[] {
  return args.rows.map((row) =>
    projectTravelerRecord({ row, capabilities: args.capabilities }),
  )
}

/** Nested travel_group_members / guest blobs inside passenger rows. */
export function projectTravelerNestedRecord<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
  nestedKeys?: readonly string[]
}): T {
  const nestedKeys = args.nestedKeys || [
    "travel_group_members",
    "lodging_guest_assignments",
  ]
  const base = projectTravelerRecord({
    row: args.row,
    capabilities: args.capabilities,
  }) as Record<string, unknown>

  for (const key of nestedKeys) {
    const nested = base[key]
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      base[key] = projectTravelerRecord({
        row: nested as Record<string, unknown>,
        capabilities: args.capabilities,
      })
    } else if (Array.isArray(nested)) {
      base[key] = nested.map((item) =>
        item && typeof item === "object"
          ? projectTravelerRecord({
              row: item as Record<string, unknown>,
              capabilities: args.capabilities,
            })
          : item,
      )
    }
  }

  return base as T
}

export function projectCateringServiceRecord<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
}): T {
  const out = { ...args.row } as Record<string, unknown>
  const summaries = out.catering_dietary_summaries
  if (Array.isArray(summaries)) {
    out.catering_dietary_summaries = canViewAccessibilityDietary(args.capabilities)
      ? summaries
      : summaries.map((row) => {
          if (!row || typeof row !== "object") return row
          return projectTravelerRecord({
            row: row as Record<string, unknown>,
            capabilities: args.capabilities,
          })
        })
  }
  return projectTravelerRecord({
    row: out as T,
    capabilities: args.capabilities,
  })
}
