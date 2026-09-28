"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, Wrench } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
  }
  return fallback
}

interface LogisticsAlert {
  alertType: string
  severity: "warning" | "critical"
  count: number
  label: string
  remediationPath: string
}

interface LogisticsAlertsResponse {
  alerts: LogisticsAlert[]
  metrics: { overdueEquipmentService: number; overdueRentalReturns: number; cateringApproachingDue: number }
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

/**
 * w13-logistics-alerts
 * LOG-601 / LOG-602 — Equipment, rental, catering alerts with remediation links.
 */
export function LogisticsAlertsPanel({ tourId, eventId }: { tourId?: string | null; eventId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [alerts, setAlerts] = useState<LogisticsAlert[]>([])
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (tourId) params.set("tour_id", tourId)
      if (eventId) params.set("event_id", eventId)
      const res = await fetch(`/api/admin/logistics/alerts?${params}`)
      const json = (await res.json()) as LogisticsAlertsResponse & { error?: string }
      if (!res.ok) {
        setErrorMsg(extractErrorMsg(json, "Failed to load logistics alerts"))
        setState("error")
        return
      }
      if (json.unavailable) {
        setUnavailableReason(json.unavailableReason ?? "Not yet available")
        setState("unavailable")
        return
      }
      setAlerts(json.alerts ?? [])
      setFreshAt(json.freshAt)
      setState("ready")
    } catch {
      setErrorMsg("Network error loading logistics alerts")
      setState("error")
    }
  }, [tourId, eventId])

  useEffect(() => {
    if (actingAccount !== undefined) void load()
  }, [actingAccount, load])

  if (state === "idle" || state === "loading") {
    return null // silent load — non-intrusive
  }

  if (state === "unavailable") {
    return (
      <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm">
        <CardContent className="p-3">
          <p className="text-xs text-slate-400">{unavailableReason ?? "Logistics alerts not yet available."}</p>
        </CardContent>
      </Card>
    )
  }

  if (state === "error" || alerts.length === 0) {
    return null // no alerts = no widget
  }

  return (
    <Card className="bg-slate-900/60 border border-amber-500/30 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Logistics Alerts</CardTitle>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5">
              {alerts.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400" onClick={() => void load()} title="Refresh">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {freshAt && (
          <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1.5">
        {alerts.map((alert) => (
          <div
            key={alert.alertType}
            className={`flex items-start gap-2 p-2 rounded-sm border ${alert.severity === "critical" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}
          >
            <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${alert.severity === "critical" ? "text-red-400" : "text-amber-400"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-200">{alert.label}</p>
            </div>
            <a
              href={alert.remediationPath}
              className="text-[10px] text-cyan-400 hover:underline shrink-0"
            >
              Resolve →
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
