"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTourById } from "@/lib/product-education/tours"
import { useProductEducation } from "./product-education-context"

const ANCHOR_ATTR = "data-education-anchor"

function queryAnchor(anchorId: string): HTMLElement | null {
  if (typeof document === "undefined") return null
  return document.querySelector(`[${ANCHOR_ATTR}="${anchorId}"]`) as HTMLElement | null
}

export function TourController() {
  const { tourId, tourStepIndex, tourAdvance, tourBack, endTour } = useProductEducation()
  const [mounted, setMounted] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(
    null,
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const tour = useMemo(() => (tourId ? getTourById(tourId) : undefined), [tourId])
  const step = tour?.steps[tourStepIndex]

  const updateRect = useCallback(() => {
    if (!step?.anchorId) {
      setRect(null)
      return
    }
    const el = queryAnchor(step.anchorId)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    })
  }, [step?.anchorId])

  useLayoutEffect(() => {
    updateRect()
  }, [updateRect, tourStepIndex, tourId])

  useEffect(() => {
    if (!tourId) return
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [tourId, updateRect])

  if (!mounted || !tour || !step) return null

  const isLast = tourStepIndex >= tour.steps.length - 1
  const placement = step.placement ?? "bottom"

  const popoverStyle: CSSProperties =
    rect && step.anchorId
      ? {
          position: "fixed",
          zIndex: 220,
          maxWidth: "min(22rem, calc(100vw - 2rem))",
          ...(placement === "right"
            ? { top: rect.top, left: Math.min(rect.left + rect.width + 12, window.innerWidth - 360) }
            : placement === "left"
              ? { top: rect.top, left: Math.max(12, rect.left - 12 - 320) }
              : placement === "top"
                ? { top: Math.max(12, rect.top - 12 - 200), left: Math.min(rect.left, window.innerWidth - 340) }
                : { top: rect.top + rect.height + 12, left: Math.min(rect.left, window.innerWidth - 340) }),
        }
      : {
          position: "fixed",
          zIndex: 220,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "min(24rem, calc(100vw - 2rem))",
        }

  const spotlight =
    rect && step.anchorId
      ? {
          position: "fixed" as const,
          zIndex: 215,
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
          pointerEvents: "none" as const,
        }
      : {
          position: "fixed" as const,
          zIndex: 215,
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          pointerEvents: "none" as const,
        }

  return createPortal(
    <>
      <div style={spotlight} aria-hidden />
      <div
        className="rounded-xl border border-slate-600 bg-slate-950 p-4 shadow-2xl"
        style={popoverStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tourify-tour-title"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p id="tourify-tour-title" className="text-sm font-semibold text-white">
            {step.title}
          </p>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={endTour}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-slate-300">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={tourBack} disabled={tourStepIndex === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button type="button" size="sm" className="bg-purple-600 hover:bg-purple-500" onClick={tourAdvance}>
            {isLast ? "Done" : "Next"}
            {!isLast ? <ChevronRight className="ml-1 h-4 w-4" /> : null}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  )
}
