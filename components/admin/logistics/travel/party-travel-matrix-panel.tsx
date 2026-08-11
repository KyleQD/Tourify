"use client"

import { useCallback, useEffect, useState } from "react"
import { MapPin, RefreshCw } from "lucide-react"

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

type CellStatus = "confirmed" | "proposed" | "missing" | "not_required"

interface MatrixLeg {
  id: string
  legOrder: number
  mode: string
  departureUtc: string | null
  arrivalUtc: string | null
}

interface MatrixPerson {
  id: string
  lodgingNights: number
}

interface MatrixCell {
  personId: string
  legId: string
  status: CellStatus
}

interface TravelMatrix {
  legs: MatrixLeg[]
  persons: MatrixPerson[]
  cells: MatrixCell[]
}

interface MatrixResponse {
  matrix: TravelMatrix
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

const CELL_STYLE: Record<CellStatus, string> = {
  confirmed: "bg-green-500/30 text-green-200 border-green-500/40",
  proposed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  missing: "bg-red-500/20 text-red-300 border-red-500/30",
  not_required: "bg-slate-700/30 text-slate-500 border-slate-700/20",
}

const CELL_LABEL: Record<CellStatus, string> = {
  confirmed: "✓",
  proposed: "~",
  missing: "✗",
  not_required: "—",
}

/**
 * w13-party-travel-matrix
 * TRAVEL-301 / LODGE-302 — Person × route-leg coverage matrix.
 */
export function PartyTravelMatrixPanel({ tourId, eventId }: { tourId?: string | null; eventId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [matrix, setMatrix] = useState<TravelMatrix>({ legs: [], persons: [], cells: [] })
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
      const res = await fetch(`/api/admin/travel/matrix?${params}`)
      const json = (await res.json()) as MatrixResponse & { error?: string }
      if (!res.ok) {
        setErrorMsg(extractErrorMsg(json, "Failed to load travel matrix"))
        setState("error")
        return
      }
      if (json.unavailable) {
        setUnavailableReason(json.unavailableReason ?? "Not yet available")
        setState("unavailable")
        return
      }
      setMatrix(json.matrix)
      setFreshAt(json.freshAt)
      setState("ready")
    } catch {
      setErrorMsg("Network error loading travel matrix")
      setState("error")
    }
  }, [tourId, eventId])

  useEffect(() => {
    if (actingAccount !== undefined) void load()
  }, [actingAccount, load])

  if (state === "idle" || state === "loading") {
    return (
      <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
            Loading travel matrix…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === "unavailable") {
    return (
      <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-slate-400">{unavailableReason ?? "Travel matrix not yet available."}</p>
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{errorMsg ?? "Failed to load travel matrix."}</p>
          <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { legs, persons, cells } = matrix
  const getCellStatus = (personId: string, legId: string): CellStatus =>
    cells.find((c) => c.personId === personId && c.legId === legId)?.status ?? "missing"

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Party Travel Matrix</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">
              {persons.length} people · {legs.length} legs
            </Badge>
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
      <CardContent className="px-4 pb-4">
        {persons.length === 0 || legs.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            {legs.length === 0 ? "No route legs found for this tour." : "No travelers in matrix."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-slate-500 font-normal pb-2 pr-4 w-32">Person</th>
                  {legs.map((leg) => (
                    <th key={leg.id} className="text-center text-slate-500 font-normal pb-2 px-1.5 capitalize">
                      {leg.mode} {leg.legOrder}
                    </th>
                  ))}
                  <th className="text-center text-slate-500 font-normal pb-2 px-1.5">Nights</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {persons.map((person) => (
                  <tr key={person.id}>
                    <td className="text-slate-400 pr-4 py-1.5 truncate max-w-[8rem]">
                      <span className="font-mono text-[10px]">{person.id.slice(0, 8)}…</span>
                    </td>
                    {legs.map((leg) => {
                      const status = getCellStatus(person.id, leg.id)
                      return (
                        <td key={leg.id} className="text-center py-1.5 px-1.5">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-sm text-[10px] font-bold border ${CELL_STYLE[status]}`}
                            title={status}
                          >
                            {CELL_LABEL[status]}
                          </span>
                        </td>
                      )
                    })}
                    <td className="text-center text-slate-400 py-1.5 px-1.5">
                      {person.lodgingNights > 0 ? (
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] px-1">
                          {person.lodgingNights}n
                        </Badge>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {(["confirmed", "proposed", "missing"] as CellStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-sm text-[9px] font-bold border ${CELL_STYLE[s]}`}>
                    {CELL_LABEL[s]}
                  </span>
                  <span className="text-[10px] text-slate-500 capitalize">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
