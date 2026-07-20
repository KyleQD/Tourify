"use client"

import { FeatureUnavailable } from "@/components/ui/feature-unavailable"

/** Legacy press-kit stub — use the live EPK builder instead (AUD quarantine). */
export function PressKitBuilder() {
  return (
    <FeatureUnavailable
      title="Press kit builder is not available"
      description="This legacy builder is retired. Use the Electronic Press Kit (EPK) tools to manage your public kit."
      fallbackHref="/artist/epk"
      fallbackLabel="Open EPK"
    />
  )
}
