"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ProductEducationContext } from "./product-education-context"
import { HelpDrawer } from "./help-drawer"
import { contextualTips } from "@/lib/product-education/registry"
import { pickContextualTip } from "@/lib/product-education/matchers"
import {
  readEducationState,
  persistTipDismissal,
  persistTipSnooze,
} from "@/lib/product-education/storage"
import { getTourById } from "@/lib/product-education/tours"

function isSnoozedUntil(tipId: string, snoozedUntil: Record<string, string>) {
  const iso = snoozedUntil[tipId]
  if (!iso) return false
  return new Date(iso).getTime() > Date.now()
}

export function ProductEducationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [initialQuery, setInitialQuery] = useState("")
  const [initialArticleId, setInitialArticleId] = useState<string | null>(null)

  const [tourId, setTourId] = useState<string | null>(null)
  const [tourStepIndex, setTourStepIndex] = useState(0)

  const [tipEpoch, setTipEpoch] = useState(0)

  const activeContextTip = useMemo(() => {
    const state = readEducationState()
    const isDismissed = (id: string) => state.dismissedTipIds.includes(id)
    const isSnoozed = (id: string) => isSnoozedUntil(id, state.snoozedUntil)
    return pickContextualTip(pathname, contextualTips, isDismissed, isSnoozed)
  }, [pathname, tipEpoch])

  const openHelp = useCallback((query?: string) => {
    setInitialQuery(query ?? "")
    setInitialArticleId(null)
    setDrawerOpen(true)
  }, [])

  const openArticle = useCallback((articleId: string) => {
    setInitialQuery("")
    setInitialArticleId(articleId)
    setDrawerOpen(true)
  }, [])

  const closeHelp = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  const startTour = useCallback((id: string) => {
    if (!getTourById(id)) return
    setTourId(id)
    setTourStepIndex(0)
  }, [])

  const endTour = useCallback(() => {
    setTourId(null)
    setTourStepIndex(0)
  }, [])

  const tourAdvance = useCallback(() => {
    if (!tourId) return
    const tour = getTourById(tourId)
    if (!tour) {
      endTour()
      return
    }
    if (tourStepIndex >= tour.steps.length - 1) endTour()
    else setTourStepIndex((i) => i + 1)
  }, [tourId, tourStepIndex, endTour])

  const tourBack = useCallback(() => {
    setTourStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const dismissContextTip = useCallback(() => {
    if (!activeContextTip) return
    persistTipDismissal(activeContextTip.id)
    setTipEpoch((n) => n + 1)
  }, [activeContextTip])

  const snoozeContextTip = useCallback(() => {
    if (!activeContextTip) return
    const days = activeContextTip.snoozeDays ?? 7
    persistTipSnooze(activeContextTip.id, days)
    setTipEpoch((n) => n + 1)
  }, [activeContextTip])

  const openLearnMoreForActiveTip = useCallback(() => {
    if (!activeContextTip?.learnMoreArticleId) return
    openArticle(activeContextTip.learnMoreArticleId)
  }, [activeContextTip, openArticle])

  const resetEducation = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem("tourify:product-education:v1")
      localStorage.removeItem("tourify:venue-nav-spotlight:v1")
      localStorage.removeItem("tourify:help-favorites:v1")
      localStorage.removeItem("tourify:help-recent:v1")
    } catch {
      /* ignore */
    }
    setTipEpoch((n) => n + 1)
  }, [])

  useEffect(() => {
    const help = searchParams.get("help")
    if (help) openArticle(help)
  }, [searchParams, openArticle])

  useEffect(() => {
    const tour = searchParams.get("tour")
    if (!tour || !getTourById(tour)) return
    startTour(tour)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tour")
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }, [searchParams, pathname, router, startTour])

  const value = useMemo(
    () => ({
      openHelp,
      openArticle,
      closeHelp,
      drawerOpen,
      startTour,
      endTour,
      tourId,
      tourStepIndex,
      tourAdvance,
      tourBack,
      dismissTip: (tipId: string) => {
        persistTipDismissal(tipId)
        setTipEpoch((n) => n + 1)
      },
      snoozeTip: (tipId: string, days = 7) => {
        persistTipSnooze(tipId, days)
        setTipEpoch((n) => n + 1)
      },
      resetEducation,
      activeContextTip,
      dismissContextTip,
      snoozeContextTip,
      openLearnMoreForActiveTip,
    }),
    [
      openHelp,
      openArticle,
      closeHelp,
      drawerOpen,
      startTour,
      endTour,
      tourId,
      tourStepIndex,
      tourAdvance,
      tourBack,
      resetEducation,
      activeContextTip,
      dismissContextTip,
      snoozeContextTip,
      openLearnMoreForActiveTip,
    ],
  )

  return (
    <ProductEducationContext.Provider value={value}>
      {children}
      <HelpDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o)
          if (!o) {
            setInitialArticleId(null)
            setInitialQuery("")
          }
        }}
        initialQuery={initialQuery}
        initialArticleId={initialArticleId}
      />
    </ProductEducationContext.Provider>
  )
}
