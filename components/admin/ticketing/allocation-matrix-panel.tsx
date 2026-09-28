"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Clock, RefreshCw, Table2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface Allocation { id: string; allocationType: string; recipientType: string; recipientId: string | null; quantityAllocated: number; quantityUsed: number; expiresAt: string | null; status: string; notes: string | null; createdAt: string }
interface AllocationsResponse { allocations: Allocation[]; atRisk: number; unavailable?: boolean; unavailableReason?: string; freshAt: string }

/**
 * w14-allocation-matrix
 * TIX-503 — Tour/stop allocation and deadline management.
 */
export function AllocationMatrixPanel({ eventId, tourId }: { eventId?: string | null; tourId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [atRisk, setAtRisk] = useState(0)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    const params = new URLSearchParams()
    if (eventId) params.set("event_id", eventId)
    if (tourId) params.set("tour_id", tourId)
    try {
      const res = await fetch(`/api/admin/ticketing/allocations?${params}`)
      const json = (await res.json()) as AllocationsResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setAllocations(json.allocations ?? [])
      setAtRisk(json.atRisk ?? 0)
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [eventId, tourId])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading allocations…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Allocation Matrix</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">{allocations.length}</Badge>
            {atRisk > 0 && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5"><Clock className="h-2.5 w-2.5 mr-0.5" />{atRisk} expiring soon</Badge>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {allocations.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No allocations.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {allocations.map((alloc) => {
              const pct = alloc.quantityAllocated > 0 ? Math.round((alloc.quantityUsed / alloc.quantityAllocated) * 100) : 0
              const expiring = alloc.expiresAt && (new Date(alloc.expiresAt).getTime() - Date.now()) / 3600000 < 48
              return (
                <div key={alloc.id} className={`flex items-center gap-3 px-3 py-2 rounded-sm border ${expiring ? "border-amber-500/30 bg-amber-500/5" : "border-slate-700/30 bg-slate-800/20"}`}>
                  {expiring && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-200 capitalize">{alloc.allocationType} · {alloc.recipientType}</p>
                    <p className="text-[10px] text-slate-500">{alloc.quantityUsed}/{alloc.quantityAllocated} used ({pct}%)</p>
                    {alloc.expiresAt && <p className="text-[10px] text-slate-500">Expires: {new Date(alloc.expiresAt).toLocaleDateString()}</p>}
                  </div>
                  <Badge className={`text-[10px] px-1.5 border shrink-0 ${alloc.status === "active" ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-slate-700/60 text-slate-400 border-slate-600/40"}`}>{alloc.status}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
