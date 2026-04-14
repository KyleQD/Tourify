"use client"

import { useEffect, useState } from "react"
import { X, Clock, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProductEducation } from "./product-education-context"

export function ContextTipHost() {
  const pathname = usePathname()
  const { dismissContextTip, snoozeContextTip, openLearnMoreForActiveTip, activeContextTip } =
    useProductEducation()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const tip = activeContextTip
  if (!mounted || !tip) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-[120] sm:left-auto sm:right-4 sm:w-[min(100%,22rem)]"
    >
      <div className="pointer-events-auto rounded-xl border border-slate-700/80 bg-slate-950/95 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{tip.headline}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{tip.body}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-slate-500 hover:text-white"
            onClick={dismissContextTip}
            aria-label="Dismiss tip"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {tip.primaryAction ? (
            <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-500">
              <a href={tip.primaryAction.href}>{tip.primaryAction.label}</a>
            </Button>
          ) : null}
          {tip.learnMoreArticleId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-200"
              onClick={openLearnMoreForActiveTip}
            >
              <BookOpen className="mr-1 h-3.5 w-3.5" />
              Learn more
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-slate-400"
            onClick={snoozeContextTip}
          >
            <Clock className="mr-1 h-3.5 w-3.5" />
            Snooze
          </Button>
        </div>
      </div>
    </div>
  )
}
