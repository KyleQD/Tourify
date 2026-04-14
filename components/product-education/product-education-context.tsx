"use client"

import { createContext, useContext } from "react"
import type { ContextualTip } from "@/lib/product-education/types"

export interface ProductEducationContextValue {
  openHelp: (query?: string) => void
  openArticle: (articleId: string) => void
  closeHelp: () => void
  drawerOpen: boolean
  startTour: (tourId: string) => void
  endTour: () => void
  tourId: string | null
  tourStepIndex: number
  tourAdvance: () => void
  tourBack: () => void
  dismissTip: (tipId: string) => void
  snoozeTip: (tipId: string, days?: number) => void
  resetEducation: () => void
  activeContextTip: ContextualTip | null
  dismissContextTip: () => void
  snoozeContextTip: () => void
  openLearnMoreForActiveTip: () => void
}

export const ProductEducationContext = createContext<ProductEducationContextValue | null>(null)

export function useProductEducation() {
  const ctx = useContext(ProductEducationContext)
  if (!ctx)
    throw new Error("useProductEducation must be used within ProductEducationProvider")
  return ctx
}
