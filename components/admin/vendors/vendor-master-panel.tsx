"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, RefreshCw, Search, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface Vendor { id: string; name: string; status: string; vendorType: string | null; riskLevel: string | null; complianceStatus: string | null; createdAt: string }
interface VendorsResponse { vendors: Vendor[]; total: number; unavailable?: boolean; unavailableReason?: string; freshAt: string }

const RISK_BADGE: Record<string, string> = {
  low: "bg-green-500/20 text-green-300 border-green-500/30",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  high: "bg-red-500/20 text-red-300 border-red-500/30",
}

const COMPLIANCE_BADGE: Record<string, string> = {
  compliant: "bg-green-500/20 text-green-300 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  expired: "bg-red-500/20 text-red-300 border-red-500/30",
  waived: "bg-slate-500/20 text-slate-300 border-slate-500/30",
}

/**
 * w16-vendor-master / w16-vendor-compliance
 * VEND-501 / VEND-502 — Vendor master search, contacts, status, risk, compliance.
 */
export function VendorMasterPanel() {
  const { actingAccount, actingHeaders } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [total, setTotal] = useState(0)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Simple debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async (q: string) => {
    setState("loading")
    const params = new URLSearchParams({ limit: "50" })
    if (q) params.set("q", q)
    try {
      const res = await fetch(`/api/admin/vendors?${params}`, {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", ...actingHeaders },
      })
      const json = (await res.json()) as VendorsResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setVendors(json.vendors ?? [])
      setTotal(json.total ?? 0)
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [actingHeaders])

  useEffect(() => {
    if (actingAccount !== undefined) void load(debouncedSearch)
  }, [actingAccount, load, debouncedSearch])

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Vendor Master</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">{total}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load(debouncedSearch)} title="Refresh"><RefreshCw className={`h-3 w-3 ${state === "loading" ? "animate-spin" : ""}`} /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors…"
            className="pl-8 h-8 text-xs bg-slate-800/60 border-slate-700/50 text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {state === "unavailable" ? (
          <p className="text-sm text-slate-400 border border-dashed border-slate-700/50 rounded-sm p-4">{unavailableReason ?? "Vendor master not yet available."}</p>
        ) : state === "error" ? (
          <div><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load(debouncedSearch)}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></div>
        ) : vendors.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">{state === "loading" ? "Searching…" : "No vendors found."}</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center gap-3 px-3 py-2 rounded-sm border border-slate-700/30 bg-slate-800/20">
                <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${vendor.complianceStatus === "compliant" ? "text-green-400" : "text-slate-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-200 truncate">{vendor.name}</p>
                  {vendor.vendorType && <p className="text-[10px] text-slate-500 capitalize">{vendor.vendorType}</p>}
                </div>
                {vendor.riskLevel && (
                  <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${RISK_BADGE[vendor.riskLevel] ?? RISK_BADGE.medium}`}>
                    {vendor.riskLevel}
                  </Badge>
                )}
                {vendor.complianceStatus && (
                  <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${COMPLIANCE_BADGE[vendor.complianceStatus] ?? COMPLIANCE_BADGE.pending}`}>
                    {vendor.complianceStatus}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
