// ─────────────────────────────────────────────────────────────────────────────
// VEN-015 — deterministic venue completion/readiness score.
//
// Pure function of the venue's own persisted fields (no time, no randomness,
// no external calls), so the same row always yields the same score. The
// returned checklist doubles as the editor's "finish your listing" guide.
// ─────────────────────────────────────────────────────────────────────────────

import { parseOperationalPolicies } from "./settings-shapes"

export interface VenueCompletionChecklistItem {
  key: string
  label: string
  done: boolean
  weight: number
}

export interface VenueCompletionResult {
  score: number
  isReady: boolean
  checklist: VenueCompletionChecklistItem[]
}

type ProfileLike = Record<string, unknown> | null | undefined

function hasText(value: unknown, minLength = 1): boolean {
  return typeof value === "string" && value.trim().length >= minLength
}

/**
 * Deterministic 0–100 readiness score with a weighted checklist.
 * Weights sum to exactly 100; `score` is the sum of satisfied weights.
 */
export function computeVenueCompletion(profile: ProfileLike): VenueCompletionResult {
  if (!profile || typeof profile !== "object") {
    return {
      score: 0,
      isReady: false,
      checklist: [],
    }
  }

  const settings = (profile.settings ?? {}) as Record<string, unknown>
  const policies = parseOperationalPolicies(settings.operational_policies)
  const types = Array.isArray(profile.venue_types) ? (profile.venue_types as unknown[]) : []
  const amenities = Array.isArray(profile.amenities) ? (profile.amenities as unknown[]) : []
  const social = (profile.social_links ?? {}) as Record<string, unknown>

  const checks: VenueCompletionChecklistItem[] = [
    {
      key: "venue_name",
      label: "Venue name",
      done: hasText(profile.venue_name),
      weight: 10,
    },
    {
      key: "url_slug",
      label: "Public URL slug",
      done: hasText(profile.url_slug),
      weight: 5,
    },
    {
      key: "description",
      label: "Description (50+ characters)",
      done: hasText(profile.description, 50),
      weight: 10,
    },
    {
      key: "location",
      label: "City and state/country",
      done:
        hasText(profile.city) &&
        (hasText(profile.state) || hasText(profile.country)),
      weight: 10,
    },
    {
      key: "venue_types",
      label: "At least one venue type",
      done: types.length > 0,
      weight: 10,
    },
    {
      key: "capacity",
      label: "Capacity published",
      done:
        (typeof profile.capacity_total === "number" && profile.capacity_total > 0) ||
        (typeof profile.capacity === "number" && profile.capacity > 0),
      weight: 10,
    },
    {
      key: "avatar_url",
      label: "Profile photo",
      done: hasText(profile.avatar_url, 8),
      weight: 10,
    },
    {
      key: "cover_image_url",
      label: "Cover photo",
      done: hasText(profile.cover_image_url, 8),
      weight: 5,
    },
    {
      key: "amenities",
      label: "Three or more amenities",
      done: amenities.length >= 3,
      weight: 10,
    },
    {
      key: "technical_specs",
      label: "Technical specs (stage/sound/lighting)",
      done:
        hasText(profile.stage_dimensions) ||
        hasText(profile.sound_system) ||
        hasText(profile.lighting_rig),
      weight: 10,
    },
    {
      key: "booking_contact",
      label: "Booking contact email",
      done: hasText(settings.booking_email) || hasText(settings.base_rate),
      weight: 5,
    },
    {
      key: "operational_policies",
      label: "Any operational policy detail",
      done: Object.values(policies).some(
        (v) => (typeof v === "string" && v.trim().length > 0) || v === true,
      ),
      weight: 3,
    },
    {
      key: "web_presence",
      label: "Website or social link",
      done: Object.values(social).some((v) => hasText(v)),
      weight: 2,
    },
  ]

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
  // Guard against future weight drift: renormalize to 100.
  const rawScore = checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0)
  const score = totalWeight === 100 ? rawScore : Math.round((rawScore / totalWeight) * 100)

  return {
    score,
    isReady: score >= 70,
    checklist: checks,
  }
}
