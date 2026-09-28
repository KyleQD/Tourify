"use client"
/**
 * VkDocument
 * Single-page Venue Kit document renderer.
 * Maps VKData → EPKData shape and renders it through the existing EPKPreview
 * template system, so all 12 templates work automatically.
 *
 * The mapping treats:
 *  - artistName   → venueName
 *  - bio          → bio
 *  - genre        → venueTypes joined
 *  - location     → city, state
 *  - coverUrl     → coverUrl
 *  - avatarUrl    → avatarUrl
 *  - upcomingShows → upcomingShows (re-shaped)
 *  - press        → press
 *  - photos       → photos
 *  - contact      → contact
 *  - social       → social
 */
import React from "react"
import EPKPreview from "@/components/epk/epk-preview"
import type { EPKData } from "@/lib/services/epk.service"
import type { VKData } from "@/lib/services/venue-kit.service"
import { VK_DEFAULT_SECTION_ORDER } from "@/lib/services/venue-kit.service"

function buildLocationString(vkData: VKData): string {
  const { city, state, country } = vkData.location
  return [city, state, country].filter(Boolean).join(", ")
}

/**
 * Build a one-liner that summarises venue specs for the "one-liner" EPK section.
 */
function buildVenueOneLiner(vkData: VKData): string {
  const parts: string[] = []
  if (vkData.specs.capacityTotal > 0) parts.push(`${vkData.specs.capacityTotal.toLocaleString()} cap`)
  if (vkData.venueTypes.length > 0) parts.push(vkData.venueTypes[0])
  const loc = [vkData.location.city, vkData.location.state].filter(Boolean).join(", ")
  if (loc) parts.push(loc)
  return parts.join(" · ")
}

/**
 * Map VKData into the EPKData shape the template system expects.
 * Venue-specific sections (specs, amenities) are embedded into the bio.
 */
export function mapVKDataToEPKData(vkData: VKData): EPKData {
  // Build an extended bio that includes specs info if present
  const specsText = buildSpecsText(vkData)
  const fullBio = [vkData.bio, specsText].filter(Boolean).join("\n\n")

  return {
    artistProfileId: vkData.venueProfileId,
    epkSlug: vkData.vkSlug,
    artistName: vkData.venueName,
    bio: fullBio,
    genre: vkData.venueTypes.slice(0, 3).join(", "),
    location: buildLocationString(vkData),
    avatarUrl: vkData.avatarUrl,
    coverUrl: vkData.coverUrl,
    theme: vkData.theme,
    template: vkData.template,
    isPublic: vkData.isPublic,
    stats: {
      // Repurpose stat cells for venue metrics
      followers: vkData.specs.capacityTotal,
      monthlyListeners: vkData.upcomingShows.filter(s => s.status === "upcoming").length,
      totalStreams: 0,
      eventsPlayed: vkData.upcomingShows.filter(s => s.status === "completed").length,
    },
    music: [],  // venues have no music tracks
    photos: vkData.photos,
    press: vkData.press,
    contact: {
      email: vkData.contact.email,
      phone: vkData.contact.phone,
      website: vkData.contact.website || vkData.website,
      bookingEmail: vkData.contact.bookingEmail,
      managementEmail: "",
      address: [
        vkData.location.address,
        vkData.location.city,
        vkData.location.state,
      ]
        .filter(Boolean)
        .join(", "),
      verified: { email: false, phone: false, website: false },
    },
    social: vkData.social,
    upcomingShows: vkData.upcomingShows.map((s) => ({
      id: s.id,
      date: s.date,
      venue: vkData.venueName,
      location: buildLocationString(vkData),
      ticketUrl: s.ticketUrl,
      status: s.status,
      notes: s.artistName ? `Performing: ${s.artistName}` : undefined,
    })),
    customDomain: vkData.customDomain,
    seoTitle: vkData.seoTitle,
    seoDescription: vkData.seoDescription,
    layout: {
      preset: "press",
      sectionOrder: mapSectionOrder(vkData.layout.sectionOrder),
      sectionVisibility: mapSectionVisibility(vkData.layout.sectionVisibility),
    },
    bookingAssets: {
      techRiderUrl: vkData.contact.techRiderUrl,
      stagePlotUrl: vkData.contact.stagePlotUrl,
      oneLiner: buildVenueOneLiner(vkData),
    },
    quality: { score: 0, missing: [] },
    epkFont: vkData.vkFont,
    epkAppearance: vkData.vkAppearance,
    useEpkStyleOnProfile: vkData.useVkStyleOnProfile,
  }
}

/** Map VK section keys to closest EPK section keys */
function mapSectionOrder(vkOrder: string[]): string[] {
  const map: Record<string, string> = {
    hero:       "hero",
    bio:        "bio",
    specs:      "booking",   // repurposed: venue specs shown in booking section
    amenities:  "stats",     // repurposed: amenity chips shown in stats section
    shows:      "shows",
    gallery:    "media",
    press:      "press",
    contact:    "contact",
    social:     "social",
  }
  const mapped = vkOrder.map((k) => map[k] ?? k)
  // Add one-liner if not present
  if (!mapped.includes("one-liner")) mapped.splice(1, 0, "one-liner")
  return mapped
}

function mapSectionVisibility(vis: Record<string, boolean>): Record<string, boolean> {
  const map: Record<string, string> = {
    hero:      "hero",
    bio:       "bio",
    specs:     "booking",
    amenities: "stats",
    shows:     "shows",
    gallery:   "media",
    press:     "press",
    contact:   "contact",
    social:    "social",
  }
  const out: Record<string, boolean> = { "one-liner": true }
  for (const [k, v] of Object.entries(vis)) {
    out[map[k] ?? k] = v
  }
  return out
}

function buildSpecsText(vkData: VKData): string {
  const s = vkData.specs
  const lines: string[] = []

  if (s.capacityTotal > 0)    lines.push(`Capacity: ${s.capacityTotal.toLocaleString()} total`)
  if (s.capacityStanding > 0) lines.push(`Standing: ${s.capacityStanding.toLocaleString()}`)
  if (s.capacitySeated > 0)   lines.push(`Seated: ${s.capacitySeated.toLocaleString()}`)
  if (s.stageDimensions)      lines.push(`Stage: ${s.stageDimensions}`)
  if (s.soundSystem)          lines.push(`Sound: ${s.soundSystem}`)
  if (s.lightingRig)          lines.push(`Lighting: ${s.lightingRig}`)
  if (s.loadingDock)          lines.push("Loading dock: yes")
  if (s.greenRooms > 0)       lines.push(`Green rooms: ${s.greenRooms}`)
  if (s.parkingSpots != null && s.parkingSpots > 0) lines.push(`Parking: ${s.parkingSpots} spots`)
  if (s.curfew)               lines.push(`Curfew: ${s.curfew}`)
  if (s.ageRestrictions)      lines.push(`Age: ${s.ageRestrictions}`)

  if (lines.length === 0) return ""
  return lines.join("\n")
}

// ─────────────────────────────────────────────────────────────────────────────
// VkDocument component
// ─────────────────────────────────────────────────────────────────────────────
interface VkDocumentProps {
  vkData: VKData
  /** Show placeholder labels for empty fields (default true for builder, false for public page) */
  showPlaceholder?: boolean
  /** Enable click telemetry on public pages */
  trackingEnabled?: boolean
  /** Ref passed to wrapping div for PDF export targeting */
  containerRef?: React.RefObject<HTMLDivElement>
}

export default function VkDocument({
  vkData,
  showPlaceholder = false,
  trackingEnabled = false,
  containerRef,
}: VkDocumentProps) {
  const epkData = mapVKDataToEPKData(vkData)

  return (
    <div ref={containerRef} id="vk-document-root">
      <EPKPreview
        data={epkData}
        template={vkData.template}
        showPlaceholder={showPlaceholder}
        trackingEnabled={trackingEnabled}
      />
    </div>
  )
}
