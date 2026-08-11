"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, DollarSign, RefreshCw, TrendingUp } from "lucide-react"

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

interface BudgetRollup {
  budgetVersionId: string
  status: string
  totalBudget: number
  committed: number
  actuals: number
  remaining: number
  utilizationPct: number
  currency: string
}

interface BudgetRollupResponse {
  rollup: BudgetRollup | null
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

interface BudgetRollupCardProps {
  tourId?: string | null
  eventId?: string | null
}

function minorToMajor(minor: number, currency: string): number {
  // Most currencies use 2 decimal places; JPY and some others use 0.
  const zeroDecimalCurrencies = ["JPY", "KRW", "VND", "CLP", "PYG", "GNF", "IDR", "KMF", "MGA", "RWF", "UGX", "XAF", "XOF", "XPF"]
  const decimals = zeroDecimalCurrencies.includes(currency.toUpperCase()) ? 0 : 2
  return minor / Math.pow(10, decimals)
}

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  baseline: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  forecast: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  scenario: "bg-purple-500/20 text-purple-300 border-purple-500/30",
}

export function BudgetRollupCard({ tourId, eventId }: BudgetRollupCardProps) {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<BudgetRollupResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (tourId) params.set("tour_id", tourId)
      if (eventId) params.set("event_id", eventId)
      const res = await fetch(`/api/admin/finances/budget-rollup?${params}`, {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(extractErrorMsg(json, "Unable to load budget rollup"))
        setData(null)
        return
      }
      setData(json as BudgetRollupResponse)
    } catch {
      setError("Unable to load budget rollup")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, eventId, isActingReady, tourId])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  if (data?.unavailable) {
    return (
      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-200">Budget Rollup</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          {data.unavailableReason ?? "Budget rollup not yet available."}
        </CardContent>
      </Card>
    )
  }

  const rollup = data?.rollup ?? null
  const currency = rollup?.currency ?? "USD"
  const fmt = (minor: number) =>
    formatSafeCurrency(minorToMajor(minor, currency), { currency })

  const utilizationColor =
    !rollup ? "bg-slate-600" :
    rollup.utilizationPct >= 90 ? "bg-red-500" :
    rollup.utilizationPct >= 70 ? "bg-yellow-500" :
    "bg-green-500"

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-400" />
            Budget Rollup
          </CardTitle>
          {rollup ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${STATUS_BADGE[rollup.status] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
                {rollup.status.charAt(0).toUpperCase() + rollup.status.slice(1)}
              </span>
              <span className="text-xs text-slate-500">FIN-504</span>
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => void load()}
          disabled={isLoading}
          aria-label="Refresh budget rollup"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {isLoading && !data ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
          </div>
        ) : null}

        {!error && !isLoading && !rollup && data ? (
          <p className="text-sm text-slate-400 py-2 text-center">
            No approved budget found for this organization.
          </p>
        ) : null}

        {rollup ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-md bg-slate-800/50 border border-slate-700/50 p-3">
                <div className="text-xs text-slate-400 mb-1">Total Budget</div>
                <div className="text-base font-semibold text-white tabular-nums">
                  {fmt(rollup.totalBudget)}
                </div>
              </div>
              <div className="rounded-md bg-slate-800/50 border border-slate-700/50 p-3">
                <div className="text-xs text-slate-400 mb-1">Committed</div>
                <div className="text-base font-semibold text-yellow-300 tabular-nums">
                  {fmt(rollup.committed)}
                </div>
              </div>
              <div className="rounded-md bg-slate-800/50 border border-slate-700/50 p-3">
                <div className="text-xs text-slate-400 mb-1">Actuals</div>
                <div className="text-base font-semibold text-blue-300 tabular-nums">
                  {fmt(rollup.actuals)}
                </div>
              </div>
              <div className="rounded-md bg-slate-800/50 border border-slate-700/50 p-3">
                <div className="text-xs text-slate-400 mb-1">Remaining</div>
                <div className={`text-base font-semibold tabular-nums ${rollup.remaining < 0 ? "text-red-400" : "text-green-300"}`}>
                  {fmt(rollup.remaining)}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Budget Utilization
                </span>
                <span className={`font-medium tabular-nums ${rollup.utilizationPct >= 90 ? "text-red-400" : rollup.utilizationPct >= 70 ? "text-yellow-300" : "text-green-300"}`}>
                  {rollup.utilizationPct}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${utilizationColor}`}
                  style={{ width: `${Math.min(100, rollup.utilizationPct)}%` }}
                  role="progressbar"
                  aria-valuenow={rollup.utilizationPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
