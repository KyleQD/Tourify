import { getLegacyVenueProfileRedirect, normalizeVenueSlug } from "@/lib/venue/routing"

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label} failed. Expected "${expected}", got "${actual}"`)
  }
}

function run() {
  assertEqual(normalizeVenueSlug("The Echo Lounge"), "the-echo-lounge", "normalize basic slug")
  assertEqual(normalizeVenueSlug("  Venue___2026 "), "venue-2026", "normalize punctuation")
  assertEqual(getLegacyVenueProfileRedirect("/venue/echolounge"), "/venues/echolounge", "redirect legacy route")
  assertEqual(getLegacyVenueProfileRedirect("/venue"), null, "ignore venue root")
  assertEqual(getLegacyVenueProfileRedirect("/venue/bookings/open"), null, "ignore nested account routes")

  console.log("Venue routing assertions passed")
}

run()
