export const EVENT_PRODUCER_SECTION_IDS = [
  "basics",
  "schedule",
  "venue",
  "advance",
  "team",
  "vendors",
  "ticketing",
  "finance",
  "daysheet",
  "review",
] as const

export type EventProducerSectionId = (typeof EVENT_PRODUCER_SECTION_IDS)[number]

export const EVENT_PRODUCER_READINESS_SECTIONS: Record<string, EventProducerSectionId> = {
  basics: "basics",
  schedule: "schedule",
  venue: "venue",
  advancing: "advance",
  team: "team",
  finance: "finance",
  day_sheet: "daysheet",
}
