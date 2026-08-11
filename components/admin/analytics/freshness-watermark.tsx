"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

interface SourceWatermark {
  sourceId: string
  sourceName: string
  lastCompletedAt: string | null
  watermarkAt: string | null
  isStale: boolean
  isPartial: boolean
  completenessPercent: number
  available: boolean
}

interface FreshnessView {
  reportId: string
  generatedAt: string
  sources: SourceWatermark[]
  allFresh: boolean
  staleSourceCount: number
  partialSourceCount: number
}

/**
 * REP-601 — Report freshness watermark panel.
 * Shows per-domain last-updated timestamps and staleness flags on the
 * analytics page.
 */
export function FreshnessWatermark() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [freshness, setFreshness] = useState<FreshnessView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/analytics/freshness", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError("Unable to load reporting freshness")
        setFreshness(null)
        return
      }
      setFreshness((json.freshness ?? null) as FreshnessView | null)
    } catch {
      setError("Unable to load reporting freshness")
      setFreshness(null)
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  function formatAge(isoOrNull: string | null) {
    if (!isoOrNull) return "Never"
    const diff = Date.now() - new Date(isoOrNull).getTime()
    const h = Math.floor(diff / 3_600_000)
    if (h < 1) return "< 1h ago"
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            Data Freshness
          </CardTitle>
          {freshness ? (
            <p className="text-xs text-slate-500 mt-0.5">
              {freshness.allFresh
                ? "All sources current"
                : `${freshness.staleSourceCount + freshness.partialSourceCount} source(s) stale or partial`}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => void load()}
          disabled={isLoading}
          aria-label="Refresh data freshness"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {isLoading && !freshness ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
          </div>
        ) : null}

        {freshness ? (
          <div className="space-y-2">
            {freshness.sources.map((src) => (
              <div
                key={src.sourceId}
                className="flex items-center justify-between gap-3 rounded-md bg-slate-800/40 border border-slate-700/40 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {src.isStale || src.isPartial ? (
                    <AlertTriangle
                      className={`h-3.5 w-3.5 shrink-0 ${src.isPartial ? "text-slate-400" : "text-yellow-400"}`}
                      aria-label={src.isPartial ? "Unavailable" : "Stale"}
                    />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" aria-label="Fresh" />
                  )}
                  <span className="text-sm text-slate-200 truncate">{src.sourceName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400 tabular-nums">
                    {formatAge(src.lastCompletedAt)}
                  </span>
                  {src.isStale && src.available ? (
                    <span className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded px-1.5 py-0.5">
                      Stale
                    </span>
                  ) : src.isPartial ? (
                    <span className="text-xs text-slate-400 bg-slate-700/50 border border-slate-600/30 rounded px-1.5 py-0.5">
                      N/A
                    </span>
                  ) : (
                    <span className="text-xs text-green-300 bg-green-500/10 border border-green-500/30 rounded px-1.5 py-0.5">
                      Fresh
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
