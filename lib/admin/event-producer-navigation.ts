export const EVENT_PRODUCER_SECTION_IDS = [
  "overview",
  "basics",
  "schedule",
  "venue",
  "tour",
  "advance",
  "people",
  "vendors",
  "logistics",
  "site-map",
  "finance",
  "communications",
  "daysheet",
  "review",
] as const

export type EventProducerSectionId = (typeof EVENT_PRODUCER_SECTION_IDS)[number]

export const EVENT_PRODUCER_READINESS_SECTIONS: Record<string, EventProducerSectionId> = {
  basics: "basics",
  schedule: "schedule",
  venue: "venue",
  tour_assignment: "tour",
  advancing: "advance",
  team: "people",
  logistics: "logistics",
  finance: "finance",
  day_sheet: "daysheet",
  communications: "communications",
}

export const EVENT_PRODUCER_WORKSPACE_DESTINATIONS = [
  { id: "overview", label: "Overview", tab: "overview" },
  { id: "logistics", label: "Logistics", tab: "logistics" },
  { id: "site-map", label: "Site map", tab: "site-map" },
  { id: "staff", label: "Staff", tab: "staff" },
  { id: "vendors", label: "Vendors", tab: "vendors" },
  { id: "tickets", label: "Tickets", tab: "tickets" },
  { id: "communications", label: "Comms", tab: "communications" },
  { id: "day-sheet", label: "Day sheet", tab: "day-sheet" },
] as const

export type EventProducerWorkspaceDestination = (typeof EVENT_PRODUCER_WORKSPACE_DESTINATIONS)[number]["id"]

export function isEventProducerWorkspaceDisabled(eventId: string | null | undefined, busy: boolean): boolean {
  return !eventId || busy
}

export function shouldSaveBeforeWorkspaceNavigation(
  saveStatus: "saved" | "saving" | "unsaved" | "error",
): boolean {
  return saveStatus !== "saved"
}

export function buildEventProducerWorkspaceHref(
  eventId: string,
  destination: EventProducerWorkspaceDestination,
): string {
  const item = EVENT_PRODUCER_WORKSPACE_DESTINATIONS.find((candidate) => candidate.id === destination)
  const tab = item?.tab || "overview"
  return `/admin/dashboard/events/${encodeURIComponent(eventId)}?tab=${encodeURIComponent(tab)}`
}
