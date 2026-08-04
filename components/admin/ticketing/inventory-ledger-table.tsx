"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react"

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

interface InventoryEntry {
  entry_id: string
  event_id: string
  ticket_type_id: string
  movement_type: string
  quantity: number
  idempotency_key: string
  actor_id: string
  reason: string | null
  created_at: string
}

interface InventoryLedgerResponse {
  entries: InventoryEntry[]
  total: number
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

interface InventoryLedgerTableProps {
  eventId?: string | null
}

const MOVEMENT_BADGE: Record<string, { label: string; cls: string }> = {
  reserve: { label: "Reserve", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  sell: { label: "Sell", cls: "bg-green-500/20 text-green-300 border-green-500/30" },
  hold: { label: "Hold", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  comp: { label: "Comp", cls: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  transfer_in: { label: "Transfer In", cls: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
  transfer_out: { label: "Transfer Out", cls: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  release: { label: "Release", cls: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
  void: { label: "Void", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
  refund: { label: "Refund", cls: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
}

function MovementBadge({ type }: { type: string }) {
  const cfg = MOVEMENT_BADGE[type] ?? { label: type, cls: "bg-slate-500/20 text-slate-300 border-slate-500/30" }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export function InventoryLedgerTable({ eventId }: InventoryLedgerTableProps) {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<InventoryLedgerResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (eventId) params.set("event_id", eventId)
      params.set("limit", "50")
      const res = await fetch(`/api/admin/ticketing/inventory?${params}`, {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(extractErrorMsg(json, "Unable to load inventory ledger"))
        setData(null)
        return
      }
      setData(json as InventoryLedgerResponse)
    } catch {
      setError("Unable to load inventory ledger")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, eventId, isActingReady])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  if (data?.unavailable) {
    return (
      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-200">Canonical Inventory Ledger</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          {data.unavailableReason ?? "Inventory ledger not yet available."}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            Canonical Inventory Ledger
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only movement log (TIX-502) · {data?.total ?? 0} entries
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => void load()}
          disabled={isLoading}
          aria-label="Refresh inventory ledger"
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

        {!error && data && data.entries.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            No inventory movements recorded yet for this{" "}
            {eventId ? "event" : "organization"}.
          </p>
        ) : null}

        {!error && data && data.entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="py-2 pr-3 text-left font-medium">Type</th>
                  <th className="py-2 pr-3 text-right font-medium">Qty</th>
                  <th className="py-2 pr-3 text-left font-medium hidden md:table-cell">Reason</th>
                  <th className="py-2 text-left font-medium">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.entries.map((e) => (
                  <tr key={e.entry_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 pr-3">
                      <MovementBadge type={e.movement_type} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-200 font-medium">
                      {e.quantity > 0 ? `+${e.quantity}` : e.quantity}
                    </td>
                    <td className="py-2 pr-3 text-slate-400 hidden md:table-cell text-xs">
                      {e.reason ?? "—"}
                    </td>
                    <td className="py-2 text-slate-400 text-xs">
                      {new Date(e.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(data.total ?? 0) > data.entries.length ? (
              <p className="mt-3 text-xs text-slate-500 text-center">
                Showing 50 of {data.total} entries
              </p>
            ) : null}
          </div>
        ) : null}

        {isLoading && !data ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
