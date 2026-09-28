"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"

import { useActingContext } from "@/hooks/use-acting-context"
import Link from "next/link"

interface TravelSloAlert {
  alertType: string
  orgId: string
  severity: "warning" | "critical"
  actual: number
  remediationPath: string
  label: string
}

interface TravelSloResponse {
  alerts: TravelSloAlert[]
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

const ALERT_LABELS: Record<string, string> = {
  missing_next_72h_segments: "Travel Segments",
  missing_next_72h_rooms: "Lodging Rooms",
  capacity_conflict: "Capacity Conflict",
  stale_confirmation: "Stale Confirmation",
  delay_impact: "Delay Impact",
  import_failure: "Import Failure",
  notification_failure: "Notification Failure",
}

export function TravelSLOBanner() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<TravelSloResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/travel/slo", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setData(json as TravelSloResponse)
    } catch {
      // Fail open — don't block the parent page
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  // Don't render anything when unavailable or loading initial data
  if (data?.unavailable || (isLoading && !data)) return null

  const alerts = data?.alerts ?? []
  if (!isLoading && alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Travel &amp; lodging SLOs satisfied — all segments confirmed within 72h window.</span>
      </div>
    )
  }

  const critical = alerts.filter((a) => a.severity === "critical")
  const warnings = alerts.filter((a) => a.severity === "warning")

  return (
    <div className="space-y-2">
      {critical.map((alert) => (
        <div
          key={alert.alertType}
          className="flex items-start gap-2 rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-medium">{ALERT_LABELS[alert.alertType] ?? alert.alertType}: </span>
            {alert.label}
          </div>
          <Link
            href={alert.remediationPath}
            className="shrink-0 text-xs text-red-400 hover:text-red-200 underline whitespace-nowrap"
          >
            Resolve →
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            aria-label="Refresh travel SLO"
            className="shrink-0 text-red-400 hover:text-red-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      ))}
      {warnings.map((alert) => (
        <div
          key={alert.alertType}
          className="flex items-start gap-2 rounded-sm border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-medium">{ALERT_LABELS[alert.alertType] ?? alert.alertType}: </span>
            {alert.label}
          </div>
          <Link
            href={alert.remediationPath}
            className="shrink-0 text-xs text-yellow-400 hover:text-yellow-200 underline whitespace-nowrap"
          >
            Resolve →
          </Link>
        </div>
      ))}
    </div>
  )
}
