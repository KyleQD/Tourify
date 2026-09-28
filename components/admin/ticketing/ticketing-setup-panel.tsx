"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, Settings2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface TicketType { ticket_type_id: string; name: string; capacity: number; price_minor_units: number; currency: string; is_active: boolean }
interface TicketingConfig { id: string; eventId: string; capacitySource: string; totalCapacity: number; currency: string; salesOpenAt: string | null; salesCloseAt: string | null; isTicketed: boolean; ticketTypes: TicketType[] }
interface SetupResponse { configs: TicketingConfig[]; unavailable?: boolean; unavailableReason?: string; freshAt: string }

/**
 * w14-ticketing-setup
 * TIX-501 — Explicit ticketing configuration and availability preview.
 */
export function TicketingSetupPanel({ eventId }: { eventId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [configs, setConfigs] = useState<TicketingConfig[]>([])
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    const params = new URLSearchParams()
    if (eventId) params.set("event_id", eventId)
    try {
      const res = await fetch(`/api/admin/ticketing/setup?${params}`)
      const json = (await res.json()) as SetupResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setConfigs(json.configs ?? [])
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [eventId])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading ticketing setup…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Ticketing Setup</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">{configs.length} event(s)</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {configs.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No ticketing configurations found. Configure ticketing via the event settings.</p>
        ) : (
          configs.map((cfg) => (
            <div key={cfg.id} className="border border-slate-700/50 rounded-sm bg-slate-800/30 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-slate-200 truncate flex-1">Event: <span className="font-mono text-slate-400">{cfg.eventId.slice(0, 8)}…</span></p>
                <Badge className={`text-[10px] px-1.5 py-0 border ${cfg.isTicketed ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-slate-700/60 text-slate-400 border-slate-600/40"}`}>
                  {cfg.isTicketed ? "ticketed" : "not ticketed"}
                </Badge>
              </div>
              {cfg.isTicketed && (
                <>
                  <div className="flex items-center gap-4 text-[10px] text-slate-400">
                    <span>Capacity: <span className="text-slate-200">{cfg.totalCapacity.toLocaleString()}</span></span>
                    <span>Currency: <span className="text-slate-200">{cfg.currency}</span></span>
                    <span>Source: <span className="text-slate-200 capitalize">{cfg.capacitySource}</span></span>
                  </div>
                  {cfg.salesOpenAt && <p className="text-[10px] text-slate-500">Sales: {new Date(cfg.salesOpenAt).toLocaleDateString()} → {cfg.salesCloseAt ? new Date(cfg.salesCloseAt).toLocaleDateString() : "TBD"}</p>}
                  {cfg.ticketTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cfg.ticketTypes.slice(0, 5).map((tt, i) => (
                        <Badge key={i} className="bg-slate-700/60 text-slate-300 border-slate-600/40 text-[10px] px-1.5">
                          {tt.name} · {tt.capacity}
                        </Badge>
                      ))}
                      {cfg.ticketTypes.length > 5 && <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/40 text-[10px] px-1.5">+{cfg.ticketTypes.length - 5} more</Badge>}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
