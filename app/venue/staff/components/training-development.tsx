"use client"

import { FeatureUnavailable } from "@/components/ui/feature-unavailable"

/** Training platform stub — not advertised in staff navigation (AUD-0079). */
export default function TrainingDevelopment() {
  return (
    <FeatureUnavailable
      title="Training is not available"
      description="Staff training courses and certification tracking are not available yet."
      fallbackHref="/venue/staff"
      fallbackLabel="Back to staff"
    />
  )
}
