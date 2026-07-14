export type OnboardingResponseDisplay =
  | { kind: "empty" }
  | { kind: "text"; text: string }
  | { kind: "badges"; values: string[] }
  | { kind: "file"; url: string; name: string; path?: string }
  | { kind: "lines"; lines: Array<{ label: string; value: string }> }

interface FileDescriptor {
  url: string
  path?: string
  storagePath?: string
  name?: string
  fileName?: string
  mimeType?: string
  size?: number
}

const KNOWN_RESPONSE_LABELS: Record<string, string> = {
  date_of_birth: "Date of birth",
  direct_deposit: "Payment information",
  emergency_contact: "Emergency contact",
  government_id: "Government ID",
  legal_name: "Legal full name",
  preferred_name: "Preferred name",
  w9_or_tax_form: "W-9 or tax form",
  work_authorization: "Work authorization",
  worker_waiver: "Worker agreement",
}

const LINE_LABELS: Record<string, string> = {
  accountHolder: "Account holder",
  bankName: "Bank",
  city: "City",
  classification: "Classification",
  country: "Country",
  email: "Email",
  legalName: "Legal name",
  name: "Name",
  phone: "Phone",
  postalCode: "ZIP",
  postal_code: "ZIP",
  relationship: "Relationship",
  state: "State",
  street: "Street",
  taxId: "Tax ID",
  zip: "ZIP",
}

const INTERNAL_RESPONSE_KEYS = new Set([
  "back_document_id",
  "document_id",
  "documentId",
  "front_document_id",
  "redacted",
  "submitted",
])

export function formatOnboardingResponseLabel(key: string): string {
  const known = KNOWN_RESPONSE_LABELS[key]
  if (known) return known

  return key
    .split("_")
    .map((word) => {
      const upper = word.toUpperCase()
      if (upper === "ID" || upper === "SSN" || upper === "EIN") return upper
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isFileDescriptor(value: unknown): value is FileDescriptor {
  return isRecord(value) && typeof value.url === "string"
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === ""
}

function stringifyPrimitive(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
}

function readText(value: unknown): string | null {
  if (isEmptyValue(value)) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return stringifyPrimitive(value)
  }
  return null
}

function summarizeRedactedRecord(record: Record<string, unknown>): OnboardingResponseDisplay {
  const submitted = record.submitted !== false
  if (!submitted) return { kind: "text", text: "Not submitted" }

  let text = "Submitted"
  if (record.front === true && record.back === true) {
    text += " (front and back uploaded)"
  } else if (record.front === true) {
    text += " (front uploaded)"
  } else if (record.back === true) {
    text += " (back uploaded)"
  }

  const last4 = readText(record.last4)
  if (last4) text += ` - ending in ${last4}`

  return { kind: "text", text }
}

function formatRecordLines(record: Record<string, unknown>): Array<{ label: string; value: string }> {
  return Object.entries(record)
    .filter(([key]) => !INTERNAL_RESPONSE_KEYS.has(key))
    .map(([key, value]) => {
      const text = readText(value)
      if (!text) return null
      return {
        label: LINE_LABELS[key] ?? formatOnboardingResponseLabel(key),
        value: text,
      }
    })
    .filter((line): line is { label: string; value: string } => Boolean(line))
}

function summarizeRecord(record: Record<string, unknown>): OnboardingResponseDisplay {
  if (record.redacted === true) return summarizeRedactedRecord(record)

  const fileName = readText(record.fileName ?? record.name)
  if (fileName && (record.documentId || record.document_id || record.storagePath || record.path)) {
    return { kind: "text", text: fileName }
  }

  const lines = formatRecordLines(record)
  if (lines.length > 0) return { kind: "lines", lines }

  return { kind: "text", text: "Provided" }
}

function summarizeArray(values: unknown[]): OnboardingResponseDisplay {
  if (values.length === 0) return { kind: "empty" }

  const formattedValues = values
    .map((entry) => {
      const primitive = readText(entry)
      if (primitive) return primitive
      if (isFileDescriptor(entry)) return entry.name ?? entry.fileName ?? "Uploaded file"
      if (isRecord(entry)) {
        const summary = summarizeRecord(entry)
        return summary.kind === "text" ? summary.text : "Provided"
      }
      return null
    })
    .filter((entry): entry is string => Boolean(entry))

  return formattedValues.length > 0 ? { kind: "badges", values: formattedValues } : { kind: "text", text: "Provided" }
}

export function formatOnboardingResponseValue(value: unknown): OnboardingResponseDisplay {
  if (isEmptyValue(value)) return { kind: "empty" }

  if (isFileDescriptor(value)) {
    const path =
      typeof value.path === "string"
        ? value.path
        : typeof value.storagePath === "string"
          ? value.storagePath
          : undefined
    return { kind: "file", url: value.url, name: value.name ?? value.fileName ?? "Download file", path }
  }

  if (Array.isArray(value)) return summarizeArray(value)

  const primitive = readText(value)
  if (primitive) return { kind: "text", text: primitive }

  if (isRecord(value)) return summarizeRecord(value)

  return { kind: "text", text: String(value) }
}
