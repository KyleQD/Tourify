"use client"

import { useCallback, useEffect, useState } from "react"
import { Receipt, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

function fmtCurrency(minorUnits: number, currency: string): string {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minorUnits / 100) }
  catch { return `${(minorUnits / 100).toFixed(2)} ${currency}` }
}

interface ExpenseReport { id: string; submitterId: string | null; description: string | null; status: string; totalAmountMinor: number; currency: string; approvedBy: string | null; submittedAt: string | null; createdAt: string }
interface ExpenseSummary { total: number; draft: number; submitted: number; approved: number; rejected: number; totalAmountMinor: number; currency: string }
interface ExpensesResponse { expenses: ExpenseReport[]; summary: ExpenseSummary; unavailable?: boolean; unavailableReason?: string; freshAt: string }

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  submitted: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
}

/**
 * w15-expense-operations
 * FIN-508 / FIN-509 / FIN-510 — Expenses, cash advances, per diem.
 */
export function ExpenseOperationsPanel({ tourId, eventId }: { tourId?: string | null; eventId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [expenses, setExpenses] = useState<ExpenseReport[]>([])
  const [summary, setSummary] = useState<ExpenseSummary>({ total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0, totalAmountMinor: 0, currency: "USD" })
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    const params = new URLSearchParams()
    if (tourId) params.set("tour_id", tourId)
    if (eventId) params.set("event_id", eventId)
    try {
      const res = await fetch(`/api/admin/finances/expenses?${params}`)
      const json = (await res.json()) as ExpensesResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setExpenses(json.expenses ?? [])
      setSummary(json.summary ?? { total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0, totalAmountMinor: 0, currency: "USD" })
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [tourId, eventId])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading expenses…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Expense Reports</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">{summary.total}</Badge>
            {summary.submitted > 0 && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] px-1.5">{summary.submitted} pending review</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">{fmtCurrency(summary.totalAmountMinor, summary.currency)}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
          </div>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {(["draft", "submitted", "approved", "rejected"] as const).map((k) => (
            <div key={k} className="bg-slate-800/60 rounded-sm p-2 text-center border border-slate-700/30">
              <p className="text-base font-semibold text-slate-100">{summary[k]}</p>
              <p className="text-[9px] text-slate-500 capitalize">{k}</p>
            </div>
          ))}
        </div>
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-400 py-3 text-center">No expense reports.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-3 px-3 py-2 rounded-sm border border-slate-700/30 bg-slate-800/20">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200 truncate">{exp.description ?? "Expense"}</p>
                  {exp.submittedAt && <p className="text-[10px] text-slate-500">Submitted: {new Date(exp.submittedAt).toLocaleDateString()}</p>}
                </div>
                <span className="text-xs text-slate-300 shrink-0">{fmtCurrency(exp.totalAmountMinor, exp.currency)}</span>
                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${STATUS_BADGE[exp.status] ?? STATUS_BADGE.draft}`}>{exp.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
