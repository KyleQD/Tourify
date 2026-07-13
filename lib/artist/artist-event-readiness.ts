import type { BuilderConflict, BuilderReadinessSummary, ReadinessItem, ReadinessState } from "@/lib/admin/operations-readiness"
import type { ArtistEventProducerFormState } from "@/lib/artist/event-producer-builder"

function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return Number.isFinite(value) && value > 0
  if (Array.isArray(value)) return value.length > 0
  return Boolean(value)
}

function readinessScore(items: ReadinessItem[]): number {
  if (items.length === 0) return 0
  const weights: Record<ReadinessState, number> = {
    missing: 0,
    blocked: 0,
    needs_advance: 0.35,
    in_progress: 0.65,
    ready: 1,
    settled: 1,
  }
  const total = items.reduce((sum, item) => sum + weights[item.state], 0)
  return Math.round((total / items.length) * 100)
}

export function getArtistEventReadiness(form: ArtistEventProducerFormState): BuilderReadinessSummary {
  const hasVenue = filled(form.venueName) || filled(form.city)
  const hasSchedule = filled(form.date)
  const hasTicketing = filled(form.ticketUrl) || filled(form.ticketPriceMin)
  const hasLineup = form.supportingArtists.length > 0 || filled(form.lineupNotes)
  const hasMarketing = filled(form.shareBlurb) || filled(form.marketingNotes) || filled(form.posterUrl)

  const items: ReadinessItem[] = [
    {
      id: "basics",
      label: "Basics",
      state: filled(form.title) ? "ready" : "missing",
      blocksPublish: true,
      detail: filled(form.title) ? "Title set" : "Add an event title",
    },
    {
      id: "schedule",
      label: "Schedule",
      state: hasSchedule ? "ready" : "missing",
      blocksPublish: true,
      detail: hasSchedule ? form.date : "Pick a show date",
    },
    {
      id: "venue",
      label: "Venue / location",
      state: hasVenue ? "ready" : "missing",
      blocksPublish: true,
      detail: hasVenue
        ? [form.venueName, form.city].filter(Boolean).join(" · ")
        : "Add a venue name or city",
    },
    {
      id: "lineup",
      label: "Lineup",
      state: hasLineup ? "ready" : "needs_advance",
      detail: hasLineup ? "Lineup notes ready" : "Optional supporting artists",
    },
    {
      id: "ticketing",
      label: "Ticketing",
      state: hasTicketing ? "ready" : "needs_advance",
      detail: hasTicketing ? "Ticket link or price set" : "Add an external ticket URL (Phase 1)",
    },
    {
      id: "marketing",
      label: "Marketing",
      state: hasMarketing ? "ready" : "in_progress",
      detail: hasMarketing ? "Share assets ready" : "Add poster or share blurb",
    },
  ]

  const conflicts: BuilderConflict[] = []
  if (filled(form.ticketPriceMin) && filled(form.ticketPriceMax)) {
    const min = Number(form.ticketPriceMin)
    const max = Number(form.ticketPriceMax)
    if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
      conflicts.push({
        id: "price_range",
        severity: "warning",
        label: "Price range inverted",
        detail: "Min ticket price is higher than max.",
      })
    }
  }

  return {
    score: readinessScore(items),
    items,
    blockers: items.filter((item) => item.blocksPublish && (item.state === "missing" || item.state === "blocked")),
    conflicts,
  }
}
