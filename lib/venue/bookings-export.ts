// ─────────────────────────────────────────────────────────────────────────────
// VEN-099 — permission-safe booking CSV export.
//
// Rows come exclusively from the manage_bookings-authorized API response the
// operator already loaded; this helper only shapes them. Values are escaped
// against formula/CSV injection ("=", "+", "-", "@", tab prefixes).
// ─────────────────────────────────────────────────────────────────────────────

export interface BookingCsvRow {
  id?: string
  event_name?: string | null
  event_type?: string | null
  genre?: string | null
  status?: string | null
  lifecycle_status?: string | null
  event_date?: string | null
  event_duration?: number | string | null
  expected_attendance?: number | string | null
  contact_email?: string | null
  contact_phone?: string | null
}

const HEADERS = [
  "request_id",
  "event_name",
  "event_type",
  "genre",
  "lifecycle_status",
  "status",
  "event_date",
  "duration_minutes",
  "expected_attendance",
  "contact_email",
  "contact_phone",
] as const

function escapeCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value)
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function bookingsToCsv(rows: BookingCsvRow[]): string {
  const lines = [HEADERS.join(",")]
  for (const row of rows ?? []) {
    lines.push(
      [
        row.id,
        row.event_name,
        row.event_type,
        row.genre,
        row.lifecycle_status ?? row.status,
        row.status,
        row.event_date,
        row.event_duration,
        row.expected_attendance,
        row.contact_email,
        row.contact_phone,
      ]
        .map(escapeCell)
        .join(","),
    )
  }
  return lines.join("\r\n")
}

/** Trigger a client-side download of `filename` containing `csv`. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
