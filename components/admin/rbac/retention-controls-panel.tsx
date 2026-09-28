"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Archive, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

interface RetentionHold {
  id: string
  entityType: string
  entityId: string
  reason: string
  heldBy: string
  heldAt: string
  releaseAt: string | null
  status: "active" | "released"
}

interface RetentionResponse {
  holds: RetentionHold[]
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
  }
  return fallback
}

export function RetentionControlsPanel() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<RetentionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/audit/retention", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        // If 404, the endpoint may not exist yet — degrade gracefully
        if (res.status === 404 || res.status === 501) {
          setData({
            holds: [],
            unavailable: true,
            unavailableReason: "Retention controls API not yet available.",
            freshAt: new Date().toISOString(),
          })
          return
        }
        setError(extractErrorMsg(json, "Unable to load retention holds"))
        setData(null)
        return
      }
      setData(json as RetentionResponse)
    } catch {
      // Fail gracefully — retention controls may not be wired yet
      setData({
        holds: [],
        unavailable: true,
        unavailableReason: "Retention controls not yet available in this environment.",
        freshAt: new Date().toISOString(),
      })
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
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Archive className="h-4 w-4 text-orange-400" />
            Retention Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          {data.unavailableReason ?? "Retention controls not yet available."}
          <p className="text-xs text-slate-600 mt-1">SEC-605 · Will show legal holds when wired.</p>
        </CardContent>
      </Card>
    )
  }

  const holds = data?.holds ?? []
  const active = holds.filter((h) => h.status === "active")

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Archive className="h-4 w-4 text-orange-400" />
            Retention Controls
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            SEC-605 · {active.length} active legal hold{active.length !== 1 ? "s" : ""} · Read-only view
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => void load()}
          disabled={isLoading}
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

        {!error && data && holds.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No active retention holds.</p>
        ) : null}

        {holds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="py-2 pr-3 text-left font-medium">Entity</th>
                  <th className="py-2 pr-3 text-left font-medium hidden md:table-cell">Reason</th>
                  <th className="py-2 pr-3 text-left font-medium hidden lg:table-cell">Held Since</th>
                  <th className="py-2 text-left font-medium">Release</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {holds.map((hold) => (
                  <tr key={hold.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 pr-3">
                      <span className="text-slate-300 text-xs">{hold.entityType}</span>
                      <span className="text-slate-600 text-xs ml-1 font-mono">{hold.entityId.slice(0, 8)}…</span>
                    </td>
                    <td className="py-2 pr-3 text-slate-400 text-xs hidden md:table-cell max-w-xs truncate">
                      {hold.reason}
                    </td>
                    <td className="py-2 pr-3 text-slate-500 text-xs hidden lg:table-cell">
                      {new Date(hold.heldAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-slate-500 text-xs">
                      {hold.releaseAt ? new Date(hold.releaseAt).toLocaleDateString() : "Indefinite"}
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
