"use client"

import { useCallback, useEffect, useState } from "react"
import { FileSignature, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface Contract { id: string; counterpartyName: string | null; title: string; status: string; contractType: string | null; signedAt: string | null; expiresAt: string | null; createdAt: string }
interface ContractSummary { total: number; draft: number; under_review: number; signed: number; expired: number }
interface ContractsResponse { contracts: Contract[]; summary: ContractSummary; unavailable?: boolean; unavailableReason?: string; freshAt: string }

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  under_review: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  signed: "bg-green-500/20 text-green-300 border-green-500/30",
  expired: "bg-red-500/20 text-red-300 border-red-500/30",
  terminated: "bg-orange-500/20 text-orange-300 border-orange-500/30",
}

/**
 * w16-contract-workspace
 * CONT-501..506 — Templates, drafts, review, negotiation, signing, amendments.
 */
export function ContractWorkspacePanel() {
  const { actingAccount, actingHeaders } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [contracts, setContracts] = useState<Contract[]>([])
  const [summary, setSummary] = useState<ContractSummary>({ total: 0, draft: 0, under_review: 0, signed: 0, expired: 0 })
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    try {
      const res = await fetch("/api/admin/contracts?limit=50", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", ...actingHeaders },
      })
      const json = (await res.json()) as ContractsResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setContracts(json.contracts ?? [])
      setSummary(json.summary ?? { total: 0, draft: 0, under_review: 0, signed: 0, expired: 0 })
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [actingHeaders])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading contracts…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Contracts</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">{summary.total}</Badge>
            {summary.under_review > 0 && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] px-1.5">{summary.under_review} under review</Badge>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {(["draft", "under_review", "signed", "expired"] as const).map((k) => (
            <div key={k} className="bg-slate-800/60 rounded-sm p-2 text-center border border-slate-700/30">
              <p className="text-base font-semibold text-slate-100">{summary[k]}</p>
              <p className="text-[9px] text-slate-500 capitalize">{k.replace("_", " ")}</p>
            </div>
          ))}
        </div>
        {contracts.length === 0 ? (
          <p className="text-sm text-slate-400 py-3 text-center">No contracts.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-sm border border-slate-700/30 bg-slate-800/20">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200 truncate">{c.title}</p>
                  {c.counterpartyName && <p className="text-[10px] text-slate-500 truncate">{c.counterpartyName}</p>}
                  {c.expiresAt && <p className="text-[10px] text-slate-500">Expires: {new Date(c.expiresAt).toLocaleDateString()}</p>}
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${STATUS_BADGE[c.status] ?? STATUS_BADGE.draft}`}>{c.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
