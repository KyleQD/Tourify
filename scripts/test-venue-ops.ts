import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { filterVenueEventsBySearch, filterVenueEventsByTab } from "../app/venue/lib/events-filtering"

function runFilteringAssertions() {
  const referenceNow = Date.parse("2026-04-01T12:00:00.000Z")
  const sampleEvents = [
    {
      id: "event-upcoming",
      title: "Summer Showcase",
      description: "Live performance",
      startDate: "2026-05-01T18:00:00.000Z",
      tags: ["music"],
      type: "performance",
      status: "confirmed",
    },
    {
      id: "event-past",
      title: "Winter Session",
      description: "Past event",
      startDate: "2026-01-01T18:00:00.000Z",
      tags: ["session"],
      type: "meeting",
      status: "confirmed",
    },
    {
      id: "event-draft",
      title: "Draft Event",
      description: "Needs approval",
      startDate: "2026-06-01T18:00:00.000Z",
      tags: ["draft"],
      type: "media",
      status: "draft",
    },
  ]

  assert.equal(filterVenueEventsByTab(sampleEvents, "upcoming", referenceNow).length, 1)
  assert.equal(filterVenueEventsByTab(sampleEvents, "past", referenceNow).length, 1)
  assert.equal(filterVenueEventsByTab(sampleEvents, "draft", referenceNow).length, 1)
  assert.equal(filterVenueEventsByTab(sampleEvents, "my-events", referenceNow).length, 3)
  assert.equal(filterVenueEventsBySearch(sampleEvents, "winter").length, 1)
}

function runBookingAuthorizationAssertions() {
  const routePath = resolve(process.cwd(), "app/api/booking-requests/route.ts")
  const routeSource = readFileSync(routePath, "utf8")
  const patchStart = routeSource.indexOf("export async function PATCH")
  assert.ok(patchStart >= 0, "PATCH handler should exist for booking requests")

  const patchBlock = routeSource.slice(patchStart)
  assert.ok(
    patchBlock.includes("getManageableVenueIds"),
    "PATCH venue flow should check manageable venue IDs"
  )
  assert.ok(
    patchBlock.includes("respond_to_booking_request"),
    "PATCH venue flow should use booking response RPC"
  )
  assert.ok(
    !patchBlock.includes('.eq("requester_id", user.id)'),
    "PATCH venue flow should not use requester_id authorization"
  )
}

function runRevalidationAssertions() {
  const actionPath = resolve(process.cwd(), "app/venue/actions/event-actions.ts")
  const actionSource = readFileSync(actionPath, "utf8")

  const requiredPaths = [
    "/venue/bookings",
    "/venue/dashboard/events",
    "/venue/dashboard/calendar",
    "/venue/overview",
  ]

  for (const route of requiredPaths) {
    assert.ok(
      actionSource.includes(`'${route}'`) || actionSource.includes(`"${route}"`),
      `Revalidation should include ${route}`
    )
  }
}

function main() {
  runFilteringAssertions()
  runBookingAuthorizationAssertions()
  runRevalidationAssertions()
  console.log("Venue ops safeguards passed")
}

main()
