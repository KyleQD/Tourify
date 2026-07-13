/**
 * Tour-manager smoke test: create a 20-city tour through the same payload +
 * AdminTourEventOperationsService path the Tour Operations Builder uses.
 *
 * Usage: npx tsx --env-file=.env.local scripts/create-electric-dreamers-tour.ts
 */

import { createClient } from "@supabase/supabase-js"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
require("module").Module._extensions[".js"] = ((original) => {
  return function patched(module: NodeModule, filename: string) {
    if (filename.includes("server-only")) {
      module.exports = {}
      return
    }
    return original(module, filename)
  }
})(require("module").Module._extensions[".js"])

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error("Missing Supabase env")

  const userId = process.env.TOUR_TEST_USER_ID || "97b9e178-b65f-47a3-910e-550864a4568a"
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Bootstrap organizer + org so admin createTour can resolve org_id.
  const { data: existingOrg } = await supabase
    .from("organizer_accounts")
    .select("id, organization_name")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle()

  if (!existingOrg) {
    const { error } = await supabase.from("organizer_accounts").insert({
      user_id: userId,
      organization_name: "Test Events & Tours LLC",
      is_active: true,
      contact_info: { email: "kyleqdaley@gmail.com" },
    })
    if (error) throw new Error(`organizer_accounts insert failed: ${error.message}`)
    console.log("Created organizer_accounts for test user")
  }

  const { ensureAdminOrgScope } = await import("../app/api/events/_lib/admin-event-persistence")
  const orgId = await ensureAdminOrgScope(supabase, userId)
  console.log("Resolved org_id", orgId)

  const { buildTourBuilderPayload, initialTourBuilderForm, makeTourStop } = await import(
    "../lib/admin/tour-builder"
  )
  const { AdminTourEventOperationsService } = await import("../lib/admin/tour-event-operations.service")

  const stops = ROUTE.map((stop, index) => ({
    ...makeTourStop(),
    name: `${stop.market} — ${stop.venue}`,
    venue: stop.venue,
    date: stop.date,
    time: "20:00",
    market: stop.market,
    leg_name: stop.leg,
    capacity: String(stop.capacity),
    advance_status: "not_started" as const,
    // stable client ids until hydrate replaces with event ids
    id: `draft-stop-${index + 1}`,
  }))

  const form = {
    ...initialTourBuilderForm,
    name: "Electric Dreamers North American Tour",
    mainArtist: "The Electric Dreamers",
    description:
      "20-city North American run testing Tour Operations Builder create/update/publish fanout.",
    status: "planning",
    startDate: "2026-09-05",
    endDate: "2026-10-12",
    markets: ROUTE.map((stop) => stop.market).join(", "),
    stops,
    attachedEventIds: [] as string[],
    transportation: "Two coaches + one truck; overnight drives capped at 6 hours where possible.",
    lodging: "Band hotels near venue; crew doubles; day-of production office.",
    budget: "1850000",
  }

  const createPayload = buildTourBuilderPayload(form, { readinessScore: 55 })
  console.log("Create payload events:", createPayload.events.length)
  console.log("Sample event fields:", createPayload.events[0])

  const created = await AdminTourEventOperationsService.createTour({
    supabase,
    userId,
    input: createPayload as any,
  })

  const tourId = String((created as any).id)
  const createdEvents = Array.isArray((created as any).events) ? (created as any).events : []
  console.log("Created tour", tourId, "events", createdEvents.length)

  if (createdEvents.length !== 20) {
    throw new Error(`Expected 20 events on create, got ${createdEvents.length}`)
  }

  // Simulate builder hydrate + edit one stop, then updateTour sync.
  const { hydrateTourBuilderForm } = await import("../lib/admin/tour-builder")
  const hydrated = hydrateTourBuilderForm(created, createdEvents)
  hydrated.stops[0] = {
    ...hydrated.stops[0],
    venue: "Climate Pledge Arena",
    date: "2026-09-06",
    market: "Seattle",
  }

  const updatePayload = buildTourBuilderPayload(hydrated, { readinessScore: 70 })
  const updated = await AdminTourEventOperationsService.updateTour({
    supabase,
    userId,
    tourId,
    input: updatePayload as any,
  })
  const updatedEvents = Array.isArray((updated as any).events) ? (updated as any).events : []
  console.log("Updated tour events", updatedEvents.length)

  const seattle = updatedEvents.find((event: any) =>
    String(event.name || "").toLowerCase().includes("seattle"),
  )
  console.log("Seattle after edit", {
    name: seattle?.name,
    venue: seattle?.venue_name,
    date: seattle?.event_date,
  })

  const published = await AdminTourEventOperationsService.publishTour({
    supabase,
    userId,
    tourId,
  })
  console.log("Published status", (published as any).status)

  const loaded = await AdminTourEventOperationsService.getTour({
    supabase,
    userId,
    tourId,
  })
  const loadedEvents = Array.isArray((loaded as any).events) ? (loaded as any).events : []
  const route = (loaded as any)?.settings?.route

  console.log(
    JSON.stringify(
      {
        ok: true,
        tourId,
        name: (loaded as any).name,
        status: (loaded as any).status,
        eventCount: loadedEvents.length,
        routeCount: Array.isArray(route) ? route.length : 0,
        firstStop: loadedEvents[0]
          ? {
              id: loadedEvents[0].id,
              name: loadedEvents[0].name,
              venue: loadedEvents[0].venue_name,
              date: loadedEvents[0].event_date,
            }
          : null,
        lastStop: loadedEvents[19]
          ? {
              id: loadedEvents[19].id,
              name: loadedEvents[19].name,
              venue: loadedEvents[19].venue_name,
              date: loadedEvents[19].event_date,
            }
          : null,
        builderUrl: `http://localhost:3000/admin/dashboard/tours/builder?draft=${tourId}`,
        hubUrl: `http://localhost:3000/admin/dashboard/tours/${tourId}`,
      },
      null,
      2,
    ),
  )
}

const ROUTE = [
  { market: "Seattle", venue: "Climate Pledge", date: "2026-09-05", leg: "West", capacity: 17000 },
  { market: "Portland", venue: "Moda Center", date: "2026-09-07", leg: "West", capacity: 19000 },
  { market: "San Francisco", venue: "Chase Center", date: "2026-09-09", leg: "West", capacity: 18000 },
  { market: "Los Angeles", venue: "Greek Theatre", date: "2026-09-11", leg: "West", capacity: 5900 },
  { market: "San Diego", venue: "Cal Coast Credit Union Open Air Theatre", date: "2026-09-13", leg: "West", capacity: 4800 },
  { market: "Phoenix", venue: "Arizona Financial Theatre", date: "2026-09-15", leg: "Southwest", capacity: 5000 },
  { market: "Denver", venue: "Red Rocks Amphitheatre", date: "2026-09-17", leg: "Southwest", capacity: 9500 },
  { market: "Dallas", venue: "The Factory", date: "2026-09-19", leg: "South", capacity: 4200 },
  { market: "Austin", venue: "Stubb's Waller Creek Amphitheater", date: "2026-09-21", leg: "South", capacity: 2200 },
  { market: "Houston", venue: "White Oak Music Hall", date: "2026-09-23", leg: "South", capacity: 4000 },
  { market: "New Orleans", venue: "Fillmore New Orleans", date: "2026-09-25", leg: "South", capacity: 2600 },
  { market: "Atlanta", venue: "Tabernacle", date: "2026-09-27", leg: "Southeast", capacity: 2600 },
  { market: "Nashville", venue: "Ryman Auditorium", date: "2026-09-29", leg: "Southeast", capacity: 2300 },
  { market: "Chicago", venue: "The Salt Shed", date: "2026-10-01", leg: "Midwest", capacity: 5000 },
  { market: "Detroit", venue: "The Fillmore Detroit", date: "2026-10-03", leg: "Midwest", capacity: 2900 },
  { market: "Toronto", venue: "History", date: "2026-10-05", leg: "Northeast", capacity: 2500 },
  { market: "Boston", venue: "Roadrunner", date: "2026-10-07", leg: "Northeast", capacity: 3500 },
  { market: "New York", venue: "Terminal 5", date: "2026-10-09", leg: "Northeast", capacity: 3000 },
  { market: "Philadelphia", venue: "The Fillmore Philadelphia", date: "2026-10-10", leg: "Northeast", capacity: 2500 },
  { market: "Washington DC", venue: "The Anthem", date: "2026-10-12", leg: "Northeast", capacity: 6000 },
]

main().catch((error) => {
  console.error("FAILED", error)
  process.exit(1)
})
