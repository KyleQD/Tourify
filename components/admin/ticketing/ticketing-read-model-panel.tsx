"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"
import type { TicketingReadModelComparison } from "@/lib/admin/ticketing-read-model"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
    if (typeof j.details === "string") return j.details
    if (typeof j.message === "string") return j.message
  }
  return fallback
}

interface TicketingReadModelPanelProps {
  eventId?: string | null
}

export function TicketingReadModelPanel({ eventId }: TicketingReadModelPanelProps) {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<TicketingReadModelComparison | null>(null)
  const [disabledMessage, setDisabledMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (eventId) params.set("event_id", eventId)
      const response = await fetch(
        `/api/admin/ticketing/read-model${params.size ? `?${params}` : ""}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: {
            ...actingHeaders,
            "Cache-Control": "no-cache",
          },
        },
      )
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(extractErrorMsg(json, "Unable to load ticketing read model"))
        setData(null)
        return
      }
      const payload = json.data
      if (payload && payload.readModelEnabled === false) {
        setDisabledMessage(payload.message || "Read model disabled")
        setData(null)
        return
      }
      setDisabledMessage(null)
      setData(payload as TicketingReadModelComparison)
    } catch {
      setError("Unable to load ticketing read model")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, eventId, isActingReady])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  if (disabledMessage) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Canonical cutover (dual-read)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {disabledMessage}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Legacy vs canonical totals</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Mismatches block <code className="text-xs">admin_ticketing_canonical_v1</code> cutover
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {data ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {data.canCutover ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cutover clear
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Cutover blocked
                </Badge>
              )}
              <Badge variant="outline">{data.mismatches.length} mismatches</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Metric label="Legacy sold" value={data.legacy.ticketsSold} />
              <Metric label="Canonical issued" value={data.canonical.issuedTicketRows} />
              <Metric label="Legacy reserved" value={data.legacy.quantityReserved} />
              <Metric label="Active reservations" value={data.canonical.quantityReserved} />
              <Metric label="Legacy revenue" value={data.legacy.revenue} money />
              <Metric label="Canonical revenue" value={data.canonical.revenue} money />
            </div>

            {data.mismatches.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {data.mismatches.map((m) => (
                  <li key={m.code} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <div className="font-medium">{m.metric}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">{m.cause}</div>
                    <div className="text-xs mt-1">
                      legacy={m.legacy} · canonical={m.canonical} · Δ={m.delta}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Legacy and canonical totals match within tolerance. Cutover may proceed when org flag is set.
              </p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Metric({
  label,
  value,
  money,
}: {
  label: string
  value: number
  money?: boolean
}) {
  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">
        {money ? `$${Number(value).toFixed(2)}` : value}
      </div>
    </div>
  )
}
