"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"
import { formatSafeCurrency } from "@/lib/format/number-format"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
    if (typeof j.details === "string") return j.details
    if (typeof j.message === "string") return j.message
  }
  return fallback
}

interface ReconciliationMismatch {
  id: string
  type: string
  date: string | null
  currency: string
  eventId: string | null
  providerId: string | null
  sourceTotal: number
  financeEntryTotal: number
  variance: number
  owner: string | null
  status: "open" | "under_review"
  evidence: string | null
  createdAt: string | null
}

interface ReconciliationResponse {
  mismatches: ReconciliationMismatch[]
  total: number
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-red-500/20 text-red-300 border-red-500/30",
  under_review: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
}

const TYPE_LABELS: Record<string, string> = {
  invoice_total: "Invoice Total",
  fx_converted_amount: "FX Converted",
  bank_statement: "Bank Statement",
  settlement_variance: "Settlement",
  tax_variance: "Tax",
  receipt_amount: "Receipt Amount",
}

export function FinanceReconciliationTable() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<ReconciliationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/finances/reconciliation", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(extractErrorMsg(json, "Unable to load reconciliation data"))
        setData(null)
        return
      }
      setData(json as ReconciliationResponse)
    } catch {
      setError("Unable to load reconciliation data")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  if (data?.unavailable) {
    return (
      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-200">Finance Reconciliation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          {data.unavailableReason ?? "Finance reconciliation not yet available."}
        </CardContent>
      </Card>
    )
  }

  const mismatches = data?.mismatches ?? []
  const fmt = (amount: number, currency: string) =>
    formatSafeCurrency(amount / 100, { currency })

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            Finance Reconciliation
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            FIN-601 · Open/under-review mismatches · {data?.total ?? 0} item{data?.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => void load()}
          disabled={isLoading}
          aria-label="Refresh reconciliation data"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {isLoading && !data ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
          </div>
        ) : null}

        {!error && !isLoading && data && mismatches.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            No open reconciliation mismatches. Finance entries match source totals.
          </div>
        ) : null}

        {mismatches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="py-2 pr-3 text-left font-medium">Type</th>
                  <th className="py-2 pr-3 text-right font-medium">Source</th>
                  <th className="py-2 pr-3 text-right font-medium">Finance</th>
                  <th className="py-2 pr-3 text-right font-medium">Variance</th>
                  <th className="py-2 pr-3 text-left font-medium hidden lg:table-cell">Date</th>
                  <th className="py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mismatches.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 pr-3">
                      <span className="text-slate-300 text-xs font-medium">
                        {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-300 text-xs">
                      {fmt(m.sourceTotal, m.currency)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-300 text-xs">
                      {fmt(m.financeEntryTotal, m.currency)}
                    </td>
                    <td className={`py-2 pr-3 text-right tabular-nums text-xs font-medium ${m.variance > 0 ? "text-red-400" : m.variance < 0 ? "text-orange-400" : "text-green-400"}`}>
                      {m.variance > 0 ? "+" : ""}{fmt(m.variance, m.currency)}
                    </td>
                    <td className="py-2 pr-3 text-slate-500 text-xs hidden lg:table-cell">
                      {m.date ?? "—"}
                    </td>
                    <td className="py-2">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${STATUS_BADGE[m.status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
                        {m.status === "open" ? "Open" : "Under Review"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
