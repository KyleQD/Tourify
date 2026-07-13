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

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function extractLast4(value: unknown): string | undefined {
  if (typeof value === "string" && value.length >= 4) return value.slice(-4)
  if (isRecordValue(value)) {
    for (const key of ["accountNumber", "taxId", "ssn", "ein", "number"]) {
      const nested = value[key]
      if (typeof nested === "string" && nested.length >= 4) return nested.slice(-4)
    }
  }
  return undefined
}

export function buildSafeSensitiveSummary(
  fieldId: string,
  fieldType: string | undefined,
  value: unknown
): Record<string, unknown> {
  const last4 = extractLast4(value)

  if (isRecordValue(value) && typeof value.document_id === "string") {
    return {
      submitted: true,
      redacted: true,
      document_id: value.document_id,
    }
  }

  if (fieldType === "id_document" && isRecordValue(value) && (value.front || value.back)) {
    return {
      submitted: Boolean(value.front && value.back),
      redacted: true,
      front: Boolean(value.front),
      back: Boolean(value.back),
      ...(isRecordValue(value.front) && typeof value.front.documentId === "string"
        ? { front_document_id: value.front.documentId }
        : {}),
      ...(isRecordValue(value.back) && typeof value.back.documentId === "string"
        ? { back_document_id: value.back.documentId }
        : {}),
    }
  }

  if (fieldType === "bank_info" || fieldType === "tax_info" || fieldType === "id_document") {
    return {
      submitted: Boolean(value),
      redacted: true,
      ...(last4 ? { last4 } : {}),
    }
  }

  return {
    submitted: Boolean(value),
    redacted: true,
    ...(last4 ? { last4 } : {}),
    summary: redactSensitiveValue(value),
  }
}

const DOCUMENT_FIELD_TYPES = new Set(["file", "id_document"])

function isSingleDocumentRefValue(value: unknown): boolean {
  if (!isRecordValue(value)) return false
  return Boolean(
    value.document_id ||
      value.documentId ||
      value.fileName ||
      value.storagePath ||
      value.path ||
      value.url
  )
}

function isDocumentRefValue(value: unknown): boolean {
  if (!isRecordValue(value)) return false
  if (isSingleDocumentRefValue(value.front) || isSingleDocumentRefValue(value.back)) return true
  return isSingleDocumentRefValue(value)
}

function isAlreadyRedactedSummary(value: unknown): boolean {
  return isRecordValue(value) && value.redacted === true
}

/**
 * Split onboarding responses into reusable (non-sensitive), sensitive (vault),
 * and document refs. Already-redacted summaries are excluded from the vault.
 */
export function partitionOnboardingResponses({
  responses,
  fieldTypeById = {},
}: RedactSensitiveResponsesArgs): {
  reusable: Record<string, unknown>
  sensitive: Record<string, unknown>
  documentRefs: Record<string, unknown>
} {
  const reusable: Record<string, unknown> = {}
  const sensitive: Record<string, unknown> = {}
  const documentRefs: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(responses)) {
    if (value === null || typeof value === "undefined" || value === "") continue

    const fieldType = fieldTypeById[key]
    const isDocument = DOCUMENT_FIELD_TYPES.has(fieldType || "") || isDocumentRefValue(value)

    if (isDocument) {
      documentRefs[key] = value
      continue
    }

    if (isSensitiveField(key, fieldType)) {
      if (isAlreadyRedactedSummary(value)) continue
      sensitive[key] = value
      continue
    }

    reusable[key] = value
  }

  return { reusable, sensitive, documentRefs }
}

export function redactSensitiveResponses({
  responses,
  fieldTypeById = {},
}: RedactSensitiveResponsesArgs): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(responses).map(([key, value]) => {
      if (!isSensitiveField(key, fieldTypeById[key])) return [key, value]
      return [key, buildSafeSensitiveSummary(key, fieldTypeById[key], value)]
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
  // Responses are keyed by field.name — prefer name so redaction matches submit payloads.
  return Object.fromEntries(
    fields
      .map((field) => [field.name ?? field.id, field.type] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1]))
  )
}
