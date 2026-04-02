export type AdminEventStatusUi =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "postponed"

export interface AdminEventNormalized {
  id: string
  name: string
  description?: string
  event_date: string
  event_time?: string
  venue_name?: string
  status: AdminEventStatusUi
  capacity?: number
  tickets_sold?: number
  ticket_price?: number
  actual_revenue?: number
  expected_revenue?: number
  expenses?: number
}

export function mapAdminEventStatus(status?: string): AdminEventStatusUi {
  const normalizedStatus = (status || "").toLowerCase()
  if (normalizedStatus === "scheduled") return "scheduled"
  if (normalizedStatus === "confirmed") return "confirmed"
  if (normalizedStatus === "in_progress" || normalizedStatus === "onsite") return "in_progress"
  if (normalizedStatus === "completed" || normalizedStatus === "settled" || normalizedStatus === "archived")
    return "completed"
  if (normalizedStatus === "cancelled") return "cancelled"
  if (normalizedStatus === "postponed") return "postponed"
  if (normalizedStatus === "advancing") return "confirmed"
  if (normalizedStatus === "inquiry" || normalizedStatus === "hold" || normalizedStatus === "offer")
    return "scheduled"
  return "scheduled"
}

export function parseIsoDateParts(value?: string | null) {
  if (!value) return { date: "", time: "" }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" }
  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
  }
}

export function formatSafeDate(value?: string | null) {
  if (!value) return "TBD"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "TBD"
  return new Intl.DateTimeFormat("en-US").format(parsed)
}

export function formatSafeDateTime(value?: string | null) {
  if (!value) return "TBD"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "TBD"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

export function formatSafeTime(value?: string | null) {
  if (!value) return "TBD"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "TBD"
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

export function normalizeAdminEvent(input: any): AdminEventNormalized {
  const settings =
    input?.settings && typeof input.settings === "object" ? (input.settings as Record<string, unknown>) : {}
  const startAt = input?.start_at || input?.startAt || null
  const parsedStart = parseIsoDateParts(startAt)
  return {
    id: input?.id || "",
    name: input?.name || input?.title || "Event",
    description:
      input?.description || (typeof settings.description === "string" ? settings.description : undefined),
    event_date: input?.event_date || input?.date || parsedStart.date,
    event_time: input?.event_time || input?.time || parsedStart.time,
    venue_name:
      input?.venue_name || (typeof settings.venue_label === "string" ? settings.venue_label : "Venue TBD"),
    status: mapAdminEventStatus(input?.status),
    capacity: Number(input?.capacity || 0),
    tickets_sold: Number(input?.tickets_sold || 0),
    ticket_price: Number(input?.ticket_price || 0),
    actual_revenue: Number(input?.actual_revenue || 0),
    expected_revenue: Number(input?.expected_revenue || 0),
    expenses: Number(input?.expenses || 0),
  }
}

export function isUpcomingAdminEvent(input: { status?: string; event_date?: string }) {
  if (!input?.event_date) return false
  if (input.status === "cancelled") return false
  const eventDate = new Date(input.event_date)
  if (Number.isNaN(eventDate.getTime())) return false
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return eventDate >= startOfToday
}
