export type EventPageSectionId =
  | "hero"
  | "overview"
  | "posts"
  | "attendance"
  | "details"
  | "media"

export interface EventPageLayout {
  section_order: EventPageSectionId[]
  section_visibility: Record<EventPageSectionId, boolean>
}

export const EVENT_PAGE_SECTION_LABELS: Record<EventPageSectionId, string> = {
  hero: "Hero",
  overview: "Overview",
  posts: "Posts",
  attendance: "Attendance",
  details: "Details",
  media: "Media",
}

export const EVENT_PAGE_SECTION_DESCRIPTIONS: Record<EventPageSectionId, string> = {
  hero: "Large public page header with poster, date, venue, and RSVP actions.",
  overview: "About, setlist, artist, venue, timeline, and ticket CTA.",
  posts: "Public updates and attendee conversation.",
  attendance: "Attending and interested lists.",
  details: "Schedule, address, tickets, and social links.",
  media: "Poster, gallery, and event media.",
}

export const EVENT_PAGE_DEFAULT_SECTION_ORDER: EventPageSectionId[] = [
  "hero",
  "overview",
  "posts",
  "attendance",
  "details",
  "media",
]

const EVENT_PAGE_SECTION_SET = new Set<EventPageSectionId>(EVENT_PAGE_DEFAULT_SECTION_ORDER)

export function isEventPageSectionId(value: unknown): value is EventPageSectionId {
  return typeof value === "string" && EVENT_PAGE_SECTION_SET.has(value as EventPageSectionId)
}

function normalizeVisibility(value: unknown): Record<EventPageSectionId, boolean> {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

  return EVENT_PAGE_DEFAULT_SECTION_ORDER.reduce((acc, sectionId) => {
    acc[sectionId] = raw[sectionId] !== false
    return acc
  }, {} as Record<EventPageSectionId, boolean>)
}

export function normalizeEventPageLayout(value: unknown): EventPageLayout {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
  const rawOrder = Array.isArray(raw.section_order) ? raw.section_order : []
  const seen = new Set<EventPageSectionId>()
  const section_order = rawOrder.filter((item): item is EventPageSectionId => {
    if (!isEventPageSectionId(item) || seen.has(item)) return false
    seen.add(item)
    return true
  })

  for (const sectionId of EVENT_PAGE_DEFAULT_SECTION_ORDER) {
    if (!seen.has(sectionId)) section_order.push(sectionId)
  }

  return {
    section_order,
    section_visibility: normalizeVisibility(raw.section_visibility),
  }
}

export function getVisibleEventPageSections(layout: EventPageLayout): EventPageSectionId[] {
  return layout.section_order.filter((sectionId) => layout.section_visibility[sectionId] !== false)
}

export function getVisibleEventPageTabs(layout: EventPageLayout): Exclude<EventPageSectionId, "hero">[] {
  const tabs = getVisibleEventPageSections(layout).filter(
    (sectionId): sectionId is Exclude<EventPageSectionId, "hero"> => sectionId !== "hero",
  )
  return tabs.length ? tabs : ["overview"]
}

export function isDefaultEventPageLayout(layout: EventPageLayout): boolean {
  return (
    EVENT_PAGE_DEFAULT_SECTION_ORDER.every((sectionId, index) => layout.section_order[index] === sectionId) &&
    EVENT_PAGE_DEFAULT_SECTION_ORDER.every((sectionId) => layout.section_visibility[sectionId] !== false)
  )
}
