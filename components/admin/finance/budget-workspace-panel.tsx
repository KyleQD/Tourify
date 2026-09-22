"use client"

import { useCallback, useEffect, useState } from "react"
import { BookOpen, CheckCircle2, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface BudgetVersion { id: string; versionType: string; label: string | null; status: string; approvedBy: string | null; createdAt: string }
interface BudgetWorkspaceResponse { versions: BudgetVersion[]; unavailable?: boolean; unavailableReason?: string; freshAt: string }

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  scenario: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  baseline: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  forecast: "bg-amber-500/20 text-amber-300 border-amber-500/30",
}

/**
 * w15-budget-workspace
 * FIN-501 / FIN-504 — Versioned budget templates/lines, approvals, rollups.
 */
export function BudgetWorkspacePanel({ tourId, eventId }: { tourId?: string | null; eventId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [versions, setVersions] = useState<BudgetVersion[]>([])
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    const params = new URLSearchParams()
    if (tourId) params.set("tour_id", tourId)
    if (eventId) params.set("event_id", eventId)
    try {
      const res = await fetch(`/api/admin/finances/budget-workspace?${params}`)
      const json = (await res.json()) as BudgetWorkspaceResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setVersions(json.versions ?? [])
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [tourId, eventId])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading budget workspace…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Budget Versions</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">{versions.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {versions.length === 0 ? (
          <div className="flex items-center gap-2 py-4 justify-center"><CheckCircle2 className="h-4 w-4 text-slate-500" /><p className="text-sm text-slate-400">No budget versions. Create a budget for this tour or event.</p></div>
        ) : (
          versions.map((ver) => (
            <div key={ver.id} className="flex items-center gap-3 px-3 py-2 rounded-sm border border-slate-700/30 bg-slate-800/20">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-200 truncate">{ver.label ?? ver.versionType}</p>
                <p className="text-[10px] text-slate-500 capitalize">{ver.versionType} · {new Date(ver.createdAt).toLocaleDateString()}</p>
                {ver.approvedBy && <p className="text-[10px] text-green-400">Approved</p>}
              </div>
              <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${STATUS_BADGE[ver.versionType] ?? STATUS_BADGE.draft}`}>{ver.status}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
