"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Clock, Download, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
    if (typeof j.details === "string") return j.details
    if (typeof j.message === "string") return j.message
  }
  return fallback
}

type PayrollExportStatus = "pending" | "approved" | "exported" | "superseded"

interface PayrollExport {
  exportId: string
  period: string
  status: PayrollExportStatus
  totalHours: number
  totalCostMinorUnits: number
  currency: string
  workerCount: number
  approvedBy: string | null
  approvedAt: string | null
  exportedAt: string | null
  createdAt: string | null
}

interface PayrollExportsResponse {
  exports: PayrollExport[]
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

const STATUS_BADGE: Record<PayrollExportStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  approved: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  exported: "bg-green-500/20 text-green-300 border-green-500/30",
  superseded: "bg-slate-500/20 text-slate-400 border-slate-500/30",
}

const STATUS_LABELS: Record<PayrollExportStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  exported: "Exported",
  superseded: "Superseded",
}

function fmtHours(hours: number): string {
  return `${Number(hours).toFixed(1)}h`
}

function fmtCurrency(minorUnits: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(minorUnits / 100)
  } catch {
    return `${(minorUnits / 100).toFixed(2)} ${currency}`
  }
}

export function PayrollExportPanel() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<PayrollExportsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/workforce/payroll-exports", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(extractErrorMsg(json, "Unable to load payroll exports"))
        setData(null)
        return
      }
      setData(json as PayrollExportsResponse)
    } catch {
      setError("Unable to load payroll exports")
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
          <CardTitle className="text-base text-slate-200">Payroll Exports</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          {data.unavailableReason ?? "Payroll exports not yet available."}
        </CardContent>
      </Card>
    )
  }

  const exports = data?.exports ?? []

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Download className="h-4 w-4 text-blue-400" />
            Payroll Exports
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            WORK-602 · Approved versioned payroll batches · {exports.length} record{exports.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => void load()}
          disabled={isLoading}
          aria-label="Refresh payroll exports"
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

        {!error && !isLoading && data && exports.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-slate-700/50 bg-slate-800/30 px-3 py-2 text-sm text-slate-400">
            <Clock className="h-4 w-4 shrink-0" />
            No payroll export records found for this organization.
          </div>
        ) : null}

        {exports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="py-2 pr-3 text-left font-medium">Period</th>
                  <th className="py-2 pr-3 text-right font-medium">Workers</th>
                  <th className="py-2 pr-3 text-right font-medium">Hours</th>
                  <th className="py-2 pr-3 text-right font-medium hidden md:table-cell">Cost</th>
                  <th className="py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {exports.map((exp) => (
                  <tr key={exp.exportId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 pr-3">
                      <span className="text-slate-200 text-xs font-medium tabular-nums">
                        {exp.period}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-300 text-xs tabular-nums">
                      {exp.workerCount}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-300 text-xs tabular-nums">
                      {fmtHours(exp.totalHours)}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-300 text-xs tabular-nums hidden md:table-cell">
                      {fmtCurrency(exp.totalCostMinorUnits, exp.currency)}
                    </td>
                    <td className="py-2">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${STATUS_BADGE[exp.status]}`}>
                        {exp.status === "exported" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                        {STATUS_LABELS[exp.status]}
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
