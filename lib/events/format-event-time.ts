/**
 * Format event schedule TIME values for public display (12-hour clock).
 * Accepts bare TIME strings (`HH:mm`, `HH:mm:ss`) or ISO / Date-parseable values.
 */

const TIME_ONLY = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/

export function formatEventTime(value?: string | null): string {
  if (!value) return ""

  const trimmed = value.trim()
  if (!trimmed) return ""

  const timeMatch = TIME_ONLY.exec(trimmed)
  if (timeMatch) {
    const hours = Number(timeMatch[1])
    const minutes = Number(timeMatch[2])
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return ""
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return ""

    const period = hours >= 12 ? "PM" : "AM"
    const hour12 = hours % 12 === 0 ? 12 : hours % 12
    return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return ""

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed)
}
