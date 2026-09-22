/**
 * VEN-017 — permission-scoped staff DTOs.
 *
 * Roster surfaces must never project HR/pay/PII fields unless the caller holds a
 * separate sensitive-data authority. This module is the single source of truth for
 * which columns are safe to expose and how raw rows are sanitized before leaving
 * the server. (Field-level enforcement across canonical staff_members lands with
 * VEN-142; these definitions are its foundation.)
 *
 * Sensitive classes (never in summary DTOs):
 *  - PII: date_of_birth, address, city, state, country, postal_code
 *  - Emergency: emergency_contact
 *  - Pay: hourly_rate, pay_frequency
 *  - HR/internal notes: admin_notes, internal_notes, notes
 *  - Performance: last_performance_review, next_review_date, performance_metrics
 */

export const STAFF_SENSITIVE_COLUMNS = [
  "date_of_birth",
  "address",
  "city",
  "state",
  "country",
  "postal_code",
  "emergency_contact",
  "hourly_rate",
  "pay_frequency",
  "admin_notes",
  "internal_notes",
  "notes",
  "last_performance_review",
  "next_review_date",
  "performance_metrics",
] as const

/** Explicit allowlist — use in `.select(...)` instead of `*` for roster reads. */
export const STAFF_SUMMARY_COLUMNS = [
  "id",
  "user_id",
  "venue_id",
  "name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "avatar_url",
  "role",
  "department",
  "employment_type",
  "status",
  "hire_date",
  "permissions",
  "is_available",
  "onboarding_completed",
  "last_active",
  "created_at",
  "updated_at",
] as const

const SENSITIVE_SET = new Set<string>(STAFF_SENSITIVE_COLUMNS)

export interface StaffSummaryDto {
  id: string
  venueId: string | null
  userId: string | null
  name: string
  email: string
  role: string | null
  department: string | null
  employmentType: string | null
  status: string
  avatarUrl: string | null
  hireDate: string | null
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase())
}

/** Strips every sensitive column from a raw DB row (defense-in-depth). */
export function stripSensitiveStaffFields<T extends Record<string, unknown>>(row: T): Omit<T, (typeof STAFF_SENSITIVE_COLUMNS)[number]> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (!SENSITIVE_SET.has(key)) {
      out[key] = value
    }
  }
  return out as Omit<T, (typeof STAFF_SENSITIVE_COLUMNS)[number]>
}

/** Projects a raw row onto the typed summary DTO handed to roster UIs. */
export function toStaffSummaryDto(row: Record<string, unknown>): StaffSummaryDto {
  const safe = stripSensitiveStaffFields(row)
  const composedName = `${safe.first_name ?? ""} ${safe.last_name ?? ""}`.trim()
  return {
    id: String(safe.id ?? ""),
    venueId: (safe.venue_id as string) ?? null,
    userId: (safe.user_id as string) ?? null,
    name: String(safe.name || composedName || "Team member"),
    email: String(safe.email ?? ""),
    role: (safe.role as string) ?? null,
    department: (safe.department as string) ?? null,
    employmentType: (safe.employment_type as string) ?? null,
    status: String(safe.status ?? "inactive"),
    avatarUrl: (safe.avatar_url as string) ?? null,
    hireDate: (safe.hire_date as string) ?? null,
  }
}

export function staffSummarySelect(): string {
  return STAFF_SUMMARY_COLUMNS.join(", ")
}

export { snakeToCamel }
