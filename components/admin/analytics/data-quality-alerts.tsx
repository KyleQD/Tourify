"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

interface DataQualityAlert {
  id: string
  orgId: string
  issueType: string
  domain: string
  description: string
  status: "open" | "acknowledged" | "resolved"
  detectedAt: string
  recordId?: string
}

const DOMAIN_PATH: Record<string, string> = {
  finance: "/admin/dashboard/finances",
  ticketing: "/admin/dashboard/ticketing",
  workforce: "/admin/dashboard/hiring",
  logistics: "/admin/dashboard/logistics",
  tours: "/admin/dashboard/tours",
  events: "/admin/dashboard/events",
}

const ISSUE_LABEL: Record<string, string> = {
  orphan_record: "Orphan Record",
  unscoped_record: "Unscoped Record",
  duplicate_source: "Duplicate Source",
  negative_quantity: "Negative Quantity",
  impossible_quantity: "Impossible Quantity",
  mismatched_totals: "Mismatched Totals",
  missing_dimension: "Missing Dimension",
  stale_projection: "Stale Projection",
}

/**
 * REP-602 — Data-quality alerts section for the analytics page.
 */
export function DataQualityAlerts() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [alerts, setAlerts] = useState<DataQualityAlert[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/analytics/data-quality?status=open&limit=50", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError("Unable to load data quality alerts")
        setAlerts([])
        return
      }
      setAlerts((json.alerts ?? []) as DataQualityAlert[])
    } catch {
      setError("Unable to load data quality alerts")
      setAlerts([])
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-400" />
            Data Quality
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            {alerts.length === 0 && !isLoading ? "No open issues" : `${alerts.length} open issue(s)`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => void load()}
          disabled={isLoading}
          aria-label="Refresh data quality alerts"
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

        {isLoading && alerts.length === 0 ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-orange-400" />
          </div>
        ) : null}

        {!error && !isLoading && alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-3 text-sm text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            No open data quality issues detected.
          </div>
        ) : null}

        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-md border border-orange-500/20 bg-orange-500/5 px-3 py-2"
                role="alert"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded px-1.5 py-0.5">
                        {ISSUE_LABEL[alert.issueType] ?? alert.issueType}
                      </span>
                      <span className="text-xs text-slate-400 capitalize">{alert.domain}</span>
                    </div>
                    <p className="text-sm text-slate-200 mt-1">{alert.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Detected {new Date(alert.detectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {DOMAIN_PATH[alert.domain] ? (
                    <Link
                      href={DOMAIN_PATH[alert.domain]}
                      className="shrink-0 text-xs text-orange-300 hover:text-orange-100 flex items-center gap-1 underline-offset-2 hover:underline"
                    >
                      Review
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
