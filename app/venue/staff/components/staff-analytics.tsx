"use client"

import { FeatureUnavailable } from "@/components/ui/feature-unavailable"

/** Staff analytics stub — not advertised in staff navigation (AUD-0078). */
export default function StaffAnalytics() {
  return (
    <FeatureUnavailable
      title="Staff analytics are not available"
      description="Interactive staff analytics and performance charts are not available yet."
      fallbackHref="/venue/staff"
      fallbackLabel="Back to staff"
    />
  )
}
