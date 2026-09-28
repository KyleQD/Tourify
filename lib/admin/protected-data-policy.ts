/**
 * SEC-203 — Platform field-level protected-data policy.
 *
 * Registry of protected classes + capability gates. Domain projectors
 * (finance / vendor / workforce / traveler) remain the enforcement points.
 */

import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import { canViewFinanceProtectedFields } from "@/lib/admin/finance-field-projection"
import { canViewVendorSensitiveFields } from "@/lib/admin/vendor-field-projection"

export type ProtectedDataClass =
  | "traveler_contact"
  | "traveler_identity"
  | "accessibility_dietary"
  | "financial_details"
  | "contract_terms"
  | "contract_signature"
  | "credentials"
  | "incidents"
  | "vendor_sensitive"
  | "workforce_sensitive"

export interface ProtectedDataClassPolicy {
  class: ProtectedDataClass
  description: string
  /** Any of these capabilities grants read of the class. */
  readAnyOf: readonly AdminCapability[]
  /** Example field keys (documentation + heuristic matching). */
  exampleFields: readonly string[]
  retentionNote: string
}

export const PROTECTED_DATA_CLASS_POLICIES: readonly ProtectedDataClassPolicy[] = [
  {
    class: "traveler_contact",
    description: "Traveler email/phone and assignment contact details",
    readAnyOf: ["logistics.manage"],
    exampleFields: ["member_email", "passenger_email", "phone", "contact_phone"],
    retentionNote: "Soft-clear 1 year after tour archive unless legal hold",
  },
  {
    class: "traveler_identity",
    description: "Government ID / passport / DOB for travel documents",
    readAnyOf: ["logistics.sensitive"],
    exampleFields: [
      "passport_number",
      "passport",
      "government_id",
      "date_of_birth",
      "nationality",
      "known_traveler_number",
    ],
    retentionNote: "Purge 90 days after tour archive unless legal hold",
  },
  {
    class: "accessibility_dietary",
    description: "Accessibility, dietary, and medical logistics needs",
    readAnyOf: ["logistics.manage", "workforce.manage", "advance.manage"],
    exampleFields: [
      "dietary_restrictions",
      "dietary",
      "accessibility_needs",
      "accessibility",
      "allergen_notes",
      "medical_notes",
    ],
    retentionNote: "Active tour + 1 year; legal hold blocks purge",
  },
  {
    class: "financial_details",
    description: "Payment references and money movement details",
    readAnyOf: ["finance.manage", "finance.pay", "finance.approve"],
    exampleFields: ["payment_reference", "payment_method", "bank_account", "routing_number"],
    retentionNote: "Align FIN-001 (typically 7 years)",
  },
  {
    class: "contract_terms",
    description: "Full commercial contract body and clauses",
    readAnyOf: ["contract.manage"],
    exampleFields: ["terms", "contract_body", "commercial_terms", "fee_schedule"],
    retentionNote: "Align CONT retention",
  },
  {
    class: "contract_signature",
    description: "Signature artifacts and signed document blobs",
    readAnyOf: ["contract.sign", "contract.manage"],
    exampleFields: ["signature", "signed_pdf_url", "signature_image"],
    retentionNote: "Align CONT retention + legal hold",
  },
  {
    class: "credentials",
    description: "Ticketing credential tokens and scan secrets",
    readAnyOf: ["ticketing.manage"],
    exampleFields: ["token", "credential_token", "qr_secret", "scan_code"],
    retentionNote: "Revoke on void/transfer; never log raw tokens",
  },
  {
    class: "incidents",
    description: "Incident narratives and embedded PII",
    readAnyOf: ["event.live_ops", "audit.view"],
    exampleFields: ["incident_narrative", "report_body", "involved_parties", "severity_notes"],
    retentionNote: "Align ADR-009 audit retention",
  },
  {
    class: "vendor_sensitive",
    description: "Vendor tax/payment/personal contacts",
    readAnyOf: ["vendor.sensitive"],
    exampleFields: ["tax_id_last4", "payment_account_last4", "primary_contact_email"],
    retentionNote: "Align VEND-103 (7 years after inactive)",
  },
  {
    class: "workforce_sensitive",
    description: "Workforce emergency/dietary/sensitive personal",
    readAnyOf: ["workforce.manage", "hiring.manage", "finance.manage"],
    exampleFields: ["emergency_contact", "ssn", "tax_id", "dietary", "accessibility"],
    retentionNote: "Align WORK roster retention",
  },
] as const

export function getProtectedDataClassPolicy(
  dataClass: ProtectedDataClass,
): ProtectedDataClassPolicy | undefined {
  return PROTECTED_DATA_CLASS_POLICIES.find((row) => row.class === dataClass)
}

export function canReadProtectedDataClass(args: {
  dataClass: ProtectedDataClass
  capabilities: readonly AdminCapability[]
}): boolean {
  const policy = getProtectedDataClassPolicy(args.dataClass)
  if (!policy) return false

  if (args.dataClass === "financial_details")
    return canViewFinanceProtectedFields(args.capabilities)
  if (args.dataClass === "vendor_sensitive")
    return canViewVendorSensitiveFields(args.capabilities)

  return policy.readAnyOf.some((cap) => hasAdminCapability(args.capabilities, cap))
}

/** Heuristic: map a field key to a protected class (unknown → null = operational). */
export function classifyProtectedField(fieldKey: string): ProtectedDataClass | null {
  const key = fieldKey.toLowerCase()
  if (
    /passport|government.?id|date_of_birth|^dob$|nationality|known_traveler|tsa|redress/.test(key)
  ) {
    return "traveler_identity"
  }
  if (/dietary|accessib|allergen|medical_notes|roommate_preference/.test(key))
    return "accessibility_dietary"
  if (
    /member_email|passenger_email|contact_email|contact_phone|^phone$|mobile/.test(key)
  ) {
    return "traveler_contact"
  }
  if (/payment_reference|payment_method|bank_account|routing_number|receipt_url/.test(key))
    return "financial_details"
  if (/contract_body|commercial_terms|fee_schedule|^terms$/.test(key)) return "contract_terms"
  if (/signature|signed_pdf/.test(key)) return "contract_signature"
  if (/credential_token|^token$|qr_secret|scan_code/.test(key)) return "credentials"
  if (/incident_narrative|report_body|involved_parties|severity_notes/.test(key))
    return "incidents"
  if (/tax_id|payment_account|primary_contact/.test(key)) return "vendor_sensitive"
  if (/emergency_contact|emergency_phone|^ssn$/.test(key)) return "workforce_sensitive"
  return null
}

export function projectByProtectedDataPolicy<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
  /** Extra explicit field → class overrides. */
  fieldClasses?: Record<string, ProtectedDataClass>
}): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(args.row)) {
    const dataClass = args.fieldClasses?.[key] ?? classifyProtectedField(key)
    if (!dataClass) {
      out[key] = value
      continue
    }
    if (canReadProtectedDataClass({ dataClass, capabilities: args.capabilities })) {
      out[key] = value
    } else {
      out[key] = null
      out[`${key}__redacted`] = true
    }
  }
  return out as T
}

export function projectByProtectedDataPolicyRows<T extends Record<string, unknown>>(args: {
  rows: T[]
  capabilities: readonly AdminCapability[]
  fieldClasses?: Record<string, ProtectedDataClass>
}): T[] {
  return args.rows.map((row) =>
    projectByProtectedDataPolicy({
      row,
      capabilities: args.capabilities,
      fieldClasses: args.fieldClasses,
    }),
  )
}

/** Ticketing credential: scan may see presence; manage sees token. */
export function projectCredentialRecord<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
}): T {
  const canManage = hasAdminCapability(args.capabilities, "ticketing.manage")
  const canScan = hasAdminCapability(args.capabilities, "ticketing.scan")
  if (canManage) return args.row

  const out: Record<string, unknown> = { ...args.row }
  for (const key of ["token", "credential_token", "qr_secret", "scan_code"] as const) {
    if (key in out && out[key] != null) {
      out[key] = null
      out[`${key}__redacted`] = true
      if (canScan) out[`${key}__present`] = true
    }
  }
  return out as T
}

/** Incident narrative redaction for viewers without live_ops/audit. */
export function projectIncidentRecord<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
}): T {
  if (canReadProtectedDataClass({ dataClass: "incidents", capabilities: args.capabilities }))
    return args.row
  return projectByProtectedDataPolicy({
    row: args.row,
    capabilities: args.capabilities,
  })
}

/** Contract terms/signatures. */
export function projectContractRecord<T extends Record<string, unknown>>(args: {
  row: T
  capabilities: readonly AdminCapability[]
}): T {
  return projectByProtectedDataPolicy({
    row: args.row,
    capabilities: args.capabilities,
  })
}
