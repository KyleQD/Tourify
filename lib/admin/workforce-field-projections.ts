/**
 * WORK-102 — Field-level projections for workforce records.
 *
 * Protected classes require explicit capabilities; UI never expands access.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"

export type WorkforceFieldClass =
  | "operational"
  | "contact"
  | "personnel_sensitive"
  | "financial"
  | "sensitive_personal"

/** Field → class for roster / tour party / shift payloads. */
export const WORKFORCE_FIELD_CLASSES: Record<string, WorkforceFieldClass> = {
  id: "operational",
  org_id: "operational",
  tour_id: "operational",
  team_id: "operational",
  event_id: "operational",
  user_id: "operational",
  staff_member_id: "operational",
  name: "operational",
  role: "operational",
  role_assignment: "operational",
  status: "operational",
  arrival_date: "operational",
  departure_date: "operational",
  responsibilities: "operational",
  shift_date: "operational",
  start_time: "operational",
  end_time: "operational",
  zone_assignment: "operational",
  notes: "operational",
  email: "contact",
  phone: "contact",
  contact_email: "contact",
  contact_phone: "contact",
  emergency_contact: "personnel_sensitive",
  emergency_phone: "personnel_sensitive",
  dietary: "personnel_sensitive",
  accessibility: "personnel_sensitive",
  home_base: "personnel_sensitive",
  contract_amount: "financial",
  payment_status: "financial",
  rate: "financial",
  pay_rate: "financial",
  hourly_rate: "financial",
  expected_cost: "financial",
  ssn: "sensitive_personal",
  tax_id: "sensitive_personal",
  bank_account: "sensitive_personal",
  routing_number: "sensitive_personal",
  date_of_birth: "sensitive_personal",
  government_id: "sensitive_personal",
}

export interface WorkforceProjectionOptions {
  capabilities: readonly AdminCapability[]
  /** When true, include contact fields even with only workforce.view (default true). */
  includeContactOnView?: boolean
}

function canSeeClass(
  fieldClass: WorkforceFieldClass,
  capabilities: readonly AdminCapability[],
  includeContactOnView: boolean,
): boolean {
  if (fieldClass === "operational") return true
  if (fieldClass === "contact") {
    if (includeContactOnView && hasAdminCapability(capabilities, "workforce.view")) return true
    return hasAdminCapability(capabilities, "workforce.manage")
  }
  if (fieldClass === "personnel_sensitive") {
    return (
      hasAdminCapability(capabilities, "workforce.manage")
      || hasAdminCapability(capabilities, "hiring.manage")
    )
  }
  if (fieldClass === "financial") {
    return (
      hasAdminCapability(capabilities, "finance.view")
      || hasAdminCapability(capabilities, "finance.manage")
    )
  }
  if (fieldClass === "sensitive_personal") {
    return hasAdminCapability(capabilities, "finance.manage")
  }
  return false
}

/**
 * Project a workforce row for the caller's capabilities.
 * Unknown fields default to operational (visible) unless they match sensitive key patterns.
 */
export function projectWorkforceRecord<T extends Record<string, unknown>>(
  row: T,
  options: WorkforceProjectionOptions,
): T {
  const includeContactOnView = options.includeContactOnView !== false
  const out: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    let fieldClass = WORKFORCE_FIELD_CLASSES[key]
    if (!fieldClass) {
      if (/ssn|tax|bank|routing|dob|passport|government.?id/i.test(key))
        fieldClass = "sensitive_personal"
      else if (/rate|pay|salary|wage|cost|amount/i.test(key)) fieldClass = "financial"
      else if (/emergency|dietary|accessib|medical/i.test(key)) fieldClass = "personnel_sensitive"
      else fieldClass = "operational"
    }

    if (canSeeClass(fieldClass, options.capabilities, includeContactOnView)) {
      out[key] = value
    } else {
      out[key] = null
      out[`${key}__redacted`] = true
    }
  }

  out.__projection = {
    version: 1,
    capabilities: [...options.capabilities],
  }

  return out as T
}

export function projectWorkforceRecords<T extends Record<string, unknown>>(
  rows: T[],
  options: WorkforceProjectionOptions,
): T[] {
  return rows.map((row) => projectWorkforceRecord(row, options))
}
