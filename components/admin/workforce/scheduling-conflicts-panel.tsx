"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
    if (typeof j.message === "string") return j.message
  }
  return fallback
}

interface ConflictSummary {
  total: number
  open: number
  critical: number
  warning: number
}

interface SchedulingConflict {
  id: string
  tourId: string | null
  shiftId: string | null
  personId: string | null
  conflictType: string
  severity: "warning" | "critical"
  source: string
  description: string | null
  overrideReason: string | null
  status: string
  createdAt: string
}

interface ConflictsResponse {
  conflicts: SchedulingConflict[]
  summary: ConflictSummary
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

const CONFLICT_TYPE_LABELS: Record<string, string> = {
  labor_rule: "Labor Rule",
  availability: "Availability",
  credential: "Credential",
  double_booking: "Double Booking",
  rest_period: "Rest Period",
  scheduling: "Scheduling",
}

function ConflictRow({ conflict }: { conflict: SchedulingConflict }) {
  const isCritical = conflict.severity === "critical"
  return (
    <div className={`flex items-start gap-3 p-3 rounded-sm border ${isCritical ? "border-red-500/30 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
      {isCritical ? (
        <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-slate-100">
            {CONFLICT_TYPE_LABELS[conflict.conflictType] ?? conflict.conflictType}
          </span>
          <Badge className={`text-[10px] px-1.5 py-0 border ${isCritical ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
            {conflict.severity}
          </Badge>
          <Badge className="text-[10px] px-1.5 py-0 border bg-slate-700/60 text-slate-300 border-slate-600/50">
            {conflict.status}
          </Badge>
        </div>
        {conflict.description && (
          <p className="text-xs text-slate-400">{conflict.description}</p>
        )}
        {conflict.overrideReason && (
          <p className="text-xs text-green-400 mt-1">Override: {conflict.overrideReason}</p>
        )}
        <p className="text-[10px] text-slate-500 mt-1">
          Source: {conflict.source} · {new Date(conflict.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

/**
 * w12-scheduling-conflicts
 * WORK-408 / WORK-410 — Scheduling conflict review and resolution panel.
 * Mounts in the Scheduling tab (conflicts sub-view).
 */
export function SchedulingConflictsPanel() {
  const { actingAccount, actingHeaders } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([])
  const [summary, setSummary] = useState<ConflictSummary>({ total: 0, open: 0, critical: 0, warning: 0 })
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/admin/workforce/conflicts?limit=50&status=open", {
        credentials: "include",
        headers: actingHeaders,
      })
      const json = (await res.json()) as ConflictsResponse & { error?: string }
      if (!res.ok) {
        setErrorMsg(extractErrorMsg(json, "Failed to load scheduling conflicts"))
        setState("error")
        return
      }
      if (json.unavailable) {
        setUnavailableReason(json.unavailableReason ?? "Not yet available")
        setState("unavailable")
        return
      }
      setConflicts(json.conflicts ?? [])
      setSummary(json.summary ?? { total: 0, open: 0, critical: 0, warning: 0 })
      setFreshAt(json.freshAt)
      setState("ready")
    } catch {
      setErrorMsg("Network error loading conflicts")
      setState("error")
    }
  }, [actingHeaders])

  useEffect(() => {
    if (actingAccount !== undefined) void load()
  }, [actingAccount, load])

  if (state === "idle" || state === "loading") {
    return (
      <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
            Loading conflict review…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === "unavailable") {
    return (
      <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-slate-400">{unavailableReason ?? "Conflict data not yet available."}</p>
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{errorMsg ?? "Failed to load conflicts."}</p>
          <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Scheduling Conflicts</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()} title="Refresh">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {freshAt && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            Fresh at {new Date(freshAt).toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Summary row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: summary.total, cls: "text-slate-100" },
            { label: "Open", value: summary.open, cls: "text-blue-300" },
            { label: "Critical", value: summary.critical, cls: "text-red-300" },
            { label: "Warning", value: summary.warning, cls: "text-amber-300" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-slate-800/60 rounded-sm p-2 text-center border border-slate-700/30">
              <p className={`text-lg font-semibold ${cls}`}>{value}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {conflicts.length === 0 ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <p className="text-sm text-slate-400">No open conflicts.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {conflicts.map((c) => <ConflictRow key={c.id} conflict={c} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
