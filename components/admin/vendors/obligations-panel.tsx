"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ClipboardList, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface Obligation { id: string; contractId: string | null; obligationType: string; description: string | null; dueDate: string | null; status: string; responsibleParty: string | null; evidenceNote: string | null; createdAt: string }
interface ObligationsResponse { obligations: Obligation[]; overdue: number; unavailable?: boolean; unavailableReason?: string; freshAt: string }

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  fulfilled: "bg-green-500/20 text-green-300 border-green-500/30",
  waived: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  overdue: "bg-red-500/20 text-red-300 border-red-500/30",
}

/**
 * w16-obligations
 * CONT-507 / CONT-508 — Contract obligations, evidence, reminders, and finance links.
 */
export function ObligationsPanel() {
  const { actingAccount, actingHeaders } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [overdue, setOverdue] = useState(0)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    try {
      const res = await fetch("/api/admin/contracts/obligations?limit=50", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", ...actingHeaders },
      })
      const json = (await res.json()) as ObligationsResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setObligations(json.obligations ?? [])
      setOverdue(json.overdue ?? 0)
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [actingHeaders])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading obligations…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Contract Obligations</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">{obligations.length}</Badge>
            {overdue > 0 && <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px] px-1.5"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{overdue} overdue</Badge>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {obligations.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No contract obligations.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {obligations.map((ob) => {
              const isDue = ob.dueDate && new Date(ob.dueDate) < new Date() && !["fulfilled", "waived"].includes(ob.status)
              return (
                <div key={ob.id} className={`flex items-start gap-3 px-3 py-2 rounded-sm border ${isDue ? "border-red-500/30 bg-red-500/5" : "border-slate-700/30 bg-slate-800/20"}`}>
                  {isDue && <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-200 truncate capitalize">{ob.obligationType}</p>
                    {ob.description && <p className="text-[10px] text-slate-500 truncate">{ob.description}</p>}
                    {ob.dueDate && <p className="text-[10px] text-slate-500">Due: {new Date(ob.dueDate).toLocaleDateString()}</p>}
                    {ob.evidenceNote && <p className="text-[10px] text-green-400">Evidence: {ob.evidenceNote}</p>}
                  </div>
                  <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${STATUS_BADGE[isDue ? "overdue" : ob.status] ?? STATUS_BADGE.pending}`}>{isDue ? "overdue" : ob.status}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
