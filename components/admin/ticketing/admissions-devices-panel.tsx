"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Monitor, RefreshCw, Scan, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface ScannerDevice { id: string; deviceName: string; status: string; lastSyncedAt: string | null; gateAssignment: string | null; isOfflineMode: boolean }
interface AdmissionsSummary { total: number; admitted: number; denied: number; duplicate: number; offlineQueued: number }
interface AdmissionsResponse { devices: ScannerDevice[]; admissions: AdmissionsSummary | null; unavailable?: boolean; unavailableReason?: string; freshAt: string }

/**
 * w14-admissions-devices
 * TIX-509 / TIX-511 — Scanner/device management and admissions dashboard.
 */
export function AdmissionsDevicesPanel({ eventId }: { eventId?: string | null }) {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [devices, setDevices] = useState<ScannerDevice[]>([])
  const [admissions, setAdmissions] = useState<AdmissionsSummary | null>(null)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    const params = new URLSearchParams()
    if (eventId) params.set("event_id", eventId)
    try {
      const res = await fetch(`/api/admin/ticketing/admissions?${params}`)
      const json = (await res.json()) as AdmissionsResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setDevices(json.devices ?? [])
      setAdmissions(json.admissions)
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [eventId])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading admissions…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason ?? "Admissions not yet available."}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Admissions &amp; Devices</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()} title="Refresh"><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {admissions && (
          <div className="grid grid-cols-5 gap-1.5">
            {[
              { label: "Total", value: admissions.total, cls: "text-slate-100" },
              { label: "Admitted", value: admissions.admitted, cls: "text-green-300" },
              { label: "Denied", value: admissions.denied, cls: "text-red-300" },
              { label: "Duplicate", value: admissions.duplicate, cls: "text-amber-300" },
              { label: "Offline Q", value: admissions.offlineQueued, cls: "text-blue-300" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-slate-800/60 rounded-sm p-2 text-center border border-slate-700/30">
                <p className={`text-base font-semibold ${cls}`}>{value}</p>
                <p className="text-[9px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        )}
        {devices.length === 0 ? (
          <div className="flex items-center gap-2 py-3 justify-center"><CheckCircle2 className="h-4 w-4 text-green-400" /><p className="text-sm text-slate-400">No devices registered.</p></div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 font-medium">Devices ({devices.length})</p>
            {devices.map((dev) => (
              <div key={dev.id} className="flex items-center gap-3 px-3 py-2 rounded-sm border border-slate-700/30 bg-slate-800/20">
                <Monitor className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200">{dev.deviceName}</p>
                  {dev.gateAssignment && <p className="text-[10px] text-slate-500">Gate: {dev.gateAssignment}</p>}
                </div>
                {dev.isOfflineMode ? <WifiOff className="h-3 w-3 text-amber-400 shrink-0" /> : <Wifi className="h-3 w-3 text-green-400 shrink-0" />}
                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${dev.status === "active" ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-slate-700/60 text-slate-400 border-slate-600/40"}`}>{dev.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
