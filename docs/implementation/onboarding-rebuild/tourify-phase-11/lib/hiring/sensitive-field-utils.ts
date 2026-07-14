import type { SensitiveOnboardingFieldType } from "@/types/hiring-compliance"

const SENSITIVE_FIELD_TYPES = new Set<SensitiveOnboardingFieldType>([
  "ssn",
  "bank_info",
  "tax_info",
  "id_document",
])

const SENSITIVE_KEY_PATTERNS = [
  /ssn/i,
  /social.?security/i,
  /routing.?number/i,
  /account.?number/i,
  /bank/i,
  /tax/i,
  /ein/i,
  /w9/i,
]

interface RedactSensitiveResponsesArgs {
  responses: Record<string, unknown>
  fieldTypeById?: Record<string, string>
}

interface SensitiveCredentialSummary {
  fieldId: string
  type: string
  stored: boolean
  summary: string
}

export function isSensitiveField(fieldId: string, fieldType?: string): boolean {
  if (fieldType && SENSITIVE_FIELD_TYPES.has(fieldType as SensitiveOnboardingFieldType)) return true
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(fieldId))
}

export function redactSensitiveValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  if (typeof value === "object") return "[secured]"
  const text = String(value)
  if (text.length <= 4) return "••••"
  return `••••${text.slice(-4)}`
}

export function redactSensitiveResponses({
  responses,
  fieldTypeById = {},
}: RedactSensitiveResponsesArgs): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(responses).map(([key, value]) => {
      if (!isSensitiveField(key, fieldTypeById[key])) return [key, value]
      return [key, redactSensitiveValue(value)]
    })
  )
}

export function extractSensitiveCredentialSummaries({
  responses,
  fieldTypeById = {},
}: RedactSensitiveResponsesArgs): SensitiveCredentialSummary[] {
  return Object.entries(responses)
    .filter(([fieldId]) => isSensitiveField(fieldId, fieldTypeById[fieldId]))
    .map(([fieldId, value]) => ({
      fieldId,
      type: fieldTypeById[fieldId] ?? "sensitive",
      stored: Boolean(value),
      summary: redactSensitiveValue(value),
    }))
}

export function buildFieldTypeMap(fields: Array<{ id?: string; name?: string; type?: string }>): Record<string, string> {
  return Object.fromEntries(
    fields
      .map((field) => [field.id ?? field.name, field.type] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1]))
  )
}
