"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, RefreshCw, UserCheck, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

type CompRequestStatus = "pending" | "approved" | "issued" | "denied"
interface CompRequest { id: string; recipientName: string; recipientEmail: string | null; quantity: number; reason: string | null; status: CompRequestStatus; approvedBy: string | null; deniedReason: string | null; createdAt: string }
interface GuestApprovalsResponse { requests: CompRequest[]; summary: { total: number; pending: number; approved: number; issued: number; denied: number }; unavailable?: boolean; unavailableReason?: string; freshAt: string }

const STATUS_BADGE: Record<CompRequestStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  approved: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  issued: "bg-green-500/20 text-green-300 border-green-500/30",
  denied: "bg-red-500/20 text-red-300 border-red-500/30",
}

/**
 * w14-guest-approvals
 * TIX-504 — Comp/guest request, approval, issuance.
 */
export function GuestApprovalsPanel({ eventId }: { eventId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [requests, setRequests] = useState<CompRequest[]>([])
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, issued: 0, denied: 0 })
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    const params = new URLSearchParams()
    if (eventId) params.set("event_id", eventId)
    try {
      const res = await fetch(`/api/admin/ticketing/guest-approvals?${params}`)
      const json = (await res.json()) as GuestApprovalsResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setRequests(json.requests ?? [])
      setSummary(json.summary ?? { total: 0, pending: 0, approved: 0, issued: 0, denied: 0 })
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [eventId])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading guest approvals…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Guest &amp; Comp Approvals</CardTitle>
            {summary.pending > 0 && <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px] px-1.5">{summary.pending} pending</Badge>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()} · {summary.total} request(s)</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {(["pending", "approved", "issued", "denied"] as const).map((k) => (
            <div key={k} className="bg-slate-800/60 rounded-sm p-2 text-center border border-slate-700/30">
              <p className="text-base font-semibold text-slate-100">{summary[k]}</p>
              <p className="text-[9px] text-slate-500 capitalize">{k}</p>
            </div>
          ))}
        </div>
        {requests.length === 0 ? (
          <div className="flex items-center gap-2 py-3 justify-center"><CheckCircle2 className="h-4 w-4 text-green-400" /><p className="text-sm text-slate-400">No comp requests.</p></div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 px-3 py-2 rounded-sm border border-slate-700/30 bg-slate-800/20">
                {req.status === "denied" ? <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200 truncate">{req.recipientName}</p>
                  {req.reason && <p className="text-[10px] text-slate-500 truncate">{req.reason}</p>}
                  {req.deniedReason && <p className="text-[10px] text-red-400 truncate">Denied: {req.deniedReason}</p>}
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">×{req.quantity}</span>
                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${STATUS_BADGE[req.status]}`}>{req.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
