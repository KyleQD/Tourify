"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Plane, RefreshCw, XCircle } from "lucide-react"

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

type SegmentStatus = "proposed" | "confirmed" | "cancelled" | "changed"

interface TravelSegment {
  id: string
  segmentType: string
  status: SegmentStatus
  provider: string | null
  bookingRef: string | null
  departureUtc: string | null
  arrivalUtc: string | null
  personId: string | null
  notes: string | null
}

interface SegmentSummary {
  total: number
  proposed: number
  confirmed: number
  cancelled: number
  changed: number
}

interface SegmentsResponse {
  segments: TravelSegment[]
  summary: SegmentSummary
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

const STATUS_BADGE: Record<SegmentStatus, string> = {
  proposed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  confirmed: "bg-green-500/20 text-green-300 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  changed: "bg-amber-500/20 text-amber-300 border-amber-500/30",
}

const COMMANDS = ["confirm", "cancel", "change", "reinstate"] as const

/**
 * w13-travel-commands
 * TRAVEL-302 / TRAVEL-104 — Segment state machine panel with command buttons.
 */
export function TravelCommandsPanel({ tourId, eventId }: { tourId?: string | null; eventId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [segments, setSegments] = useState<TravelSegment[]>([])
  const [summary, setSummary] = useState<SegmentSummary>({ total: 0, proposed: 0, confirmed: 0, cancelled: 0, changed: 0 })
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)
  const [commandState, setCommandState] = useState<Record<string, "idle" | "loading">>({})

  const load = useCallback(async () => {
    setState("loading")
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (tourId) params.set("tour_id", tourId)
      if (eventId) params.set("event_id", eventId)
      const res = await fetch(`/api/admin/travel/segments?${params}&limit=50`)
      const json = (await res.json()) as SegmentsResponse & { error?: string }
      if (!res.ok) {
        setErrorMsg(extractErrorMsg(json, "Failed to load segments"))
        setState("error")
        return
      }
      if (json.unavailable) {
        setUnavailableReason(json.unavailableReason ?? "Not yet available")
        setState("unavailable")
        return
      }
      setSegments(json.segments ?? [])
      setSummary(json.summary ?? { total: 0, proposed: 0, confirmed: 0, cancelled: 0, changed: 0 })
      setFreshAt(json.freshAt)
      setState("ready")
    } catch {
      setErrorMsg("Network error loading travel segments")
      setState("error")
    }
  }, [tourId, eventId])

  useEffect(() => {
    if (actingAccount !== undefined) void load()
  }, [actingAccount, load])

  async function runCommand(segmentId: string, command: string) {
    setCommandState((prev) => ({ ...prev, [segmentId]: "loading" }))
    try {
      const res = await fetch("/api/admin/travel/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentId, command }),
      })
      if (res.ok) void load()
    } finally {
      setCommandState((prev) => ({ ...prev, [segmentId]: "idle" }))
    }
  }

  if (state === "idle" || state === "loading") {
    return (
      <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
            Loading travel segments…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === "unavailable") {
    return (
      <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-slate-400">{unavailableReason ?? "Travel commands not yet available."}</p>
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{errorMsg}</p>
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
            <Plane className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Travel Segments</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()} title="Refresh">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {freshAt && (
          <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Summary row */}
        <div className="grid grid-cols-4 gap-2">
          {(["total", "proposed", "confirmed", "changed"] as const).map((key) => (
            <div key={key} className="bg-slate-800/60 rounded-sm p-2 text-center border border-slate-700/30">
              <p className="text-lg font-semibold text-slate-100">{summary[key]}</p>
              <p className="text-[10px] text-slate-500 capitalize">{key}</p>
            </div>
          ))}
        </div>

        {segments.length === 0 ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <p className="text-sm text-slate-400">No travel segments.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {segments.map((seg) => (
              <div key={seg.id} className="flex items-start gap-3 p-3 border border-slate-700/40 rounded-sm bg-slate-800/20">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-100 capitalize">{seg.segmentType}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 border ${STATUS_BADGE[seg.status]}`}>
                      {seg.status}
                    </Badge>
                  </div>
                  {seg.provider && <p className="text-xs text-slate-400">{seg.provider}</p>}
                  {seg.bookingRef && <p className="text-[10px] text-slate-500">Ref: {seg.bookingRef}</p>}
                  {seg.departureUtc && (
                    <p className="text-[10px] text-slate-500">
                      {new Date(seg.departureUtc).toLocaleString()} → {seg.arrivalUtc ? new Date(seg.arrivalUtc).toLocaleString() : "TBD"}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {COMMANDS.filter((cmd) => {
                    if (cmd === "confirm" && seg.status !== "proposed") return false
                    if (cmd === "cancel" && ["cancelled"].includes(seg.status)) return false
                    if (cmd === "change" && ["cancelled"].includes(seg.status)) return false
                    if (cmd === "reinstate" && seg.status !== "cancelled") return false
                    return true
                  }).slice(0, 2).map((cmd) => (
                    <Button
                      key={cmd}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-slate-300"
                      disabled={commandState[seg.id] === "loading"}
                      onClick={() => void runCommand(seg.id, cmd)}
                    >
                      {cmd}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
