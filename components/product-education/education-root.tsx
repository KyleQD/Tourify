"use client"

import type { ReactNode } from "react"
import { Suspense } from "react"
import { ProductEducationProvider } from "./product-education-provider"
import { EducationHotkey } from "./education-hotkey"
import { ContextTipHost } from "./context-tip-host"
import { TourController } from "./tour-controller"
import { VenueNavSpotlight } from "./venue-nav-spotlight"

export function EducationRoot({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ProductEducationProvider>
        {children}
        <EducationHotkey />
        <ContextTipHost />
        <TourController />
        <VenueNavSpotlight />
      </ProductEducationProvider>
    </Suspense>
  )
}
