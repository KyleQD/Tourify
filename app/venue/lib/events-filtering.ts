export type VenueEventsTab = "upcoming" | "past" | "draft" | "my-events"

export interface VenueEventFilterItem {
  id: string
  title: string
  description: string
  startDate: string
  tags: string[]
  type: string
  status?: string
}

function getEventTimestamp(event: Pick<VenueEventFilterItem, "startDate">): number {
  const parsed = Date.parse(event.startDate)
  if (Number.isNaN(parsed)) return Number.MAX_SAFE_INTEGER
  return parsed
}

function isDraftStatus(status?: string): boolean {
  const normalizedStatus = (status || "").toLowerCase()
  return normalizedStatus === "draft" || normalizedStatus === "inquiry" || normalizedStatus === "hold"
}

export function filterVenueEventsBySearch<T extends VenueEventFilterItem>(events: T[], query: string): T[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return events

  return events.filter((event) =>
    event.title.toLowerCase().includes(normalizedQuery) ||
    event.description.toLowerCase().includes(normalizedQuery) ||
    event.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
  )
}

export function filterVenueEventsByType<T extends VenueEventFilterItem>(events: T[], type: string): T[] {
  if (!type || type === "all") return events
  return events.filter((event) => event.type === type)
}

export function filterVenueEventsByTab<T extends VenueEventFilterItem>(events: T[], tab: VenueEventsTab, now = Date.now()): T[] {
  if (tab === "my-events") return events

  if (tab === "draft")
    return events.filter((event) => isDraftStatus(event.status))

  if (tab === "upcoming")
    return events.filter((event) => getEventTimestamp(event) >= now && !isDraftStatus(event.status))

  if (tab === "past")
    return events.filter((event) => getEventTimestamp(event) < now)

  return events
}
