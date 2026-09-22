"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Truck,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

interface MetricItem {
  label: string
  percentage: number
  items: number
  completed: number
  status: string
  domain: string
}

interface LogisticsMetricsCardProps {
  tourId?: string | null
  eventId?: string | null
}

function severityClass(pct: number) {
  if (pct >= 80) return "text-green-300"
  if (pct >= 40) return "text-yellow-300"
  return "text-red-300"
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 80 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden" role="none">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

export function LogisticsMetricsCard({ tourId, eventId }: LogisticsMetricsCardProps) {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [metrics, setMetrics] = useState<Record<string, MetricItem> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tourId) params.set("tourId", tourId)
      if (eventId) params.set("eventId", eventId)
      const res = await fetch(`/api/admin/logistics/metrics?${params}`, {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      if (!res.ok) {
        setError("Unable to load logistics metrics")
        setMetrics(null)
        return
      }
      const json = await res.json().catch(() => ({}))
      setMetrics(json.metrics ?? null)
    } catch {
      setError("Unable to load logistics metrics")
      setMetrics(null)
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, eventId, isActingReady, tourId])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  // Build display items from raw metrics record.
  const items: MetricItem[] = metrics
    ? Object.entries(metrics)
        .filter(([key]) =>
          ["transportation", "equipment", "backline", "catering", "travelCoordination", "accommodations"].includes(key),
        )
        .map(([domain, v]) => ({
          label: DOMAIN_LABEL[domain] ?? domain,
          domain,
          percentage: v?.percentage ?? 0,
          items: v?.items ?? 0,
          completed: v?.completed ?? 0,
          status: v?.status ?? "Not Started",
        }))
    : []

  const hasAlerts = items.some((i) => i.percentage < 40 && i.items > 0)

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            Logistics Snapshot
          </CardTitle>
          {hasAlerts ? (
            <p className="text-xs text-yellow-400 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Some areas need attention
            </p>
          ) : items.length > 0 ? (
            <p className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              All areas on track
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/dashboard/logistics"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            Full view
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => void load()}
            disabled={isLoading}
            aria-label="Refresh logistics metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {isLoading && !metrics ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
          </div>
        ) : null}

        {!error && !isLoading && items.length === 0 && metrics !== null ? (
          <p className="text-sm text-slate-400 py-2 text-center">
            No logistics items found.
          </p>
        ) : null}

        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((item) => (
              <div
                key={item.domain}
                className="rounded-md bg-slate-800/50 border border-slate-700/50 p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 truncate">{item.label}</span>
                  <span className={`text-xs font-medium tabular-nums ${severityClass(item.percentage)}`}>
                    {item.percentage}%
                  </span>
                </div>
                <ProgressBar value={item.percentage} />
                <p className="text-xs text-slate-500">
                  {item.completed}/{item.items} · {item.status}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

const DOMAIN_LABEL: Record<string, string> = {
  transportation: "Transport",
  equipment: "Equipment",
  backline: "Backline",
  catering: "Catering",
  travelCoordination: "Travel",
  accommodations: "Lodging",
}
