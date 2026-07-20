"use client"

import { FeatureUnavailable } from "@/components/ui/feature-unavailable"

/** Venue staff analytics stub — not advertised in navigation (AUD-0093). */
export function StaffAnalytics() {
  return (
    <FeatureUnavailable
      title="Staff analytics are not available"
      description="Team performance charts and analytics are not available yet."
      fallbackHref="/venue/staff"
      fallbackLabel="Back to staff"
    />
  )
}
