/**
 * VEND-103 — Least-data projection for protected vendor fields.
 * vendor.view → operational only; vendor.sensitive → tax/payment/contacts/docs.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"

/** Retention policy constants (days) — see ADR VEND-103. */
export const VENDOR_RETENTION = {
  commercialYearsAfterInactive: 7,
  personalContactYearsAfterInactive: 2,
  complianceYearsAfterExpiry: 2,
} as const

/** Personal contact fields (PII). */
export const VENDOR_PROTECTED_CONTACT_FIELDS = [
  "primary_contact_name",
  "primary_contact_email",
  "primary_contact_phone",
  "contact_name",
  "contact_email",
  "contact_phone",
] as const

/** Tax / payment fields. */
export const VENDOR_PROTECTED_PAYMENT_FIELDS = [
  "tax_id_last4",
  "payment_account_last4",
  "payment_method",
  "w9_on_file",
] as const

/** Compliance document path / note fields. */
export const VENDOR_PROTECTED_COMPLIANCE_FIELDS = [
  "compliance_notes",
  "storage_path",
  "checksum",
  "verification_notes",
] as const

export type VendorProtectedField =
  | (typeof VENDOR_PROTECTED_CONTACT_FIELDS)[number]
  | (typeof VENDOR_PROTECTED_PAYMENT_FIELDS)[number]
  | (typeof VENDOR_PROTECTED_COMPLIANCE_FIELDS)[number]

export function canViewVendorSensitiveFields(
  capabilities: readonly AdminCapability[],
): boolean {
  return hasAdminCapability(capabilities, "vendor.sensitive")
}

export function canManageVendorOperational(
  capabilities: readonly AdminCapability[],
): boolean {
  return hasAdminCapability(capabilities, "vendor.manage")
}

function redactFields<T extends Record<string, unknown>>(
  row: T,
  fields: readonly string[],
): T {
  const next = { ...row } as Record<string, unknown>
  let didRedact = false
  for (const field of fields) {
    if (field in next && next[field] != null && next[field] !== "") {
      next[field] = null
      didRedact = true
    }
  }
  if (didRedact) next.__redacted = true
  return next as T
}

/**
 * Project org vendor master row for the caller's capabilities.
 */
export function projectVendorMasterRow<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
}): T {
  if (canViewVendorSensitiveFields(args.capabilities)) return args.row

  let next = redactFields(args.row, [
    ...VENDOR_PROTECTED_CONTACT_FIELDS,
    ...VENDOR_PROTECTED_PAYMENT_FIELDS,
    ...VENDOR_PROTECTED_COMPLIANCE_FIELDS,
  ])

  // Operational users keep external_accounting_id as presence-only
  if ("external_accounting_id" in next && next.external_accounting_id != null) {
    next = {
      ...next,
      external_accounting_id: null,
      has_external_accounting_id: true,
      __redacted: true,
    }
  }

  return next
}

export function projectVendorMasterRows<T extends Record<string, unknown>>(args: {
  rows: T[]
  capabilities: readonly AdminCapability[]
}): T[] {
  return args.rows.map((row) =>
    projectVendorMasterRow({ row, capabilities: args.capabilities }),
  )
}

/**
 * Project tour engagement vendor (contact blob / columns) for least data.
 */
export function projectTourVendorRow<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
}): T {
  if (canViewVendorSensitiveFields(args.capabilities)) return args.row

  const next = redactFields(args.row, [
    "contact_name",
    "contact_email",
    "contact_phone",
    "payment_status",
    "contract_amount",
  ])

  // Nested contact object used by tour_vendors.contact jsonb
  const nextMut = next as Record<string, unknown>
  if (nextMut.contact && typeof nextMut.contact === "object" && !Array.isArray(nextMut.contact)) {
    const contact = { ...(nextMut.contact as Record<string, unknown>) }
    for (const key of ["name", "email", "phone", "notes"]) {
      if (contact[key] != null) contact[key] = null
    }
    nextMut.contact = contact
    nextMut.__redacted = true
  }

  return next
}

export function projectTourVendorRows<T extends Record<string, unknown>>(args: {
  rows: T[]
  capabilities: readonly AdminCapability[]
}): T[] {
  return args.rows.map((row) =>
    projectTourVendorRow({ row, capabilities: args.capabilities }),
  )
}

/**
 * Compliance document rows — non-sensitive callers get type/status/expiry only.
 */
export function projectVendorDocumentRow<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
}): T {
  if (canViewVendorSensitiveFields(args.capabilities)) return args.row

  const allowed = new Set([
    "id",
    "org_id",
    "vendor_id",
    "doc_type",
    "title",
    "status",
    "issued_on",
    "expires_on",
    "created_at",
    "updated_at",
  ])
  const next: Record<string, unknown> = { __redacted: true }
  for (const [key, value] of Object.entries(args.row)) {
    if (allowed.has(key)) next[key] = value
  }
  return next as T
}
