"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ExternalLink, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useActingContext } from "@/hooks/use-acting-context"

interface WorkforceSloAlertItem {
  alertType: string
  orgId: string
  severity: "warning" | "critical"
  actual: number
  remediationPath: string
  label: string
}

interface WorkforceHealthResponse {
  alerts: WorkforceSloAlertItem[]
  unavailable?: boolean
  unavailableReason?: string
}

/**
 * WORK-603 — Workforce SLO banner.
 * Shows critical/warning alerts above hiring and staff pages.
 * Critical alerts cannot be dismissed; warnings are per-session dismissible.
 */
export function WorkforceSLOBanner() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [alerts, setAlerts] = useState<WorkforceSloAlertItem[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [unavailable, setUnavailable] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    try {
      const res = await fetch("/api/admin/workforce/health", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.unavailable) {
        setUnavailable(true)
        setAlerts([])
        return
      }
      setUnavailable(false)
      setAlerts((json.alerts ?? []) as WorkforceSloAlertItem[])
    } catch {
      setUnavailable(true)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void load()
    setDismissed(new Set())
  }, [load, actingContextKey])

  const visible = alerts.filter((a) => !dismissed.has(a.alertType))

  if (unavailable || visible.length === 0) return null

  return (
    <div className="space-y-1.5" role="region" aria-label="Workforce health alerts">
      {visible.map((alert) => {
        const isCritical = alert.severity === "critical"
        return (
          <div
            key={alert.alertType}
            className={`flex items-start justify-between gap-3 rounded-sm px-3 py-2.5 text-sm border ${
              isCritical
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
            }`}
            role="alert"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle
                className={`h-4 w-4 shrink-0 ${isCritical ? "text-red-400" : "text-yellow-400"}`}
                aria-hidden="true"
              />
              <span className="truncate">{alert.label}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {alert.remediationPath ? (
                <Link
                  href={alert.remediationPath}
                  className={`inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline ${
                    isCritical ? "text-red-300" : "text-yellow-300"
                  }`}
                >
                  Review
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              ) : null}
              {!isCritical ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-yellow-300 hover:text-yellow-100 hover:bg-yellow-500/10"
                  onClick={() => setDismissed((prev) => new Set([...prev, alert.alertType]))}
                  aria-label={`Dismiss ${alert.label}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
