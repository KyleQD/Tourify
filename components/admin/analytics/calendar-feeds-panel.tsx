"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarDays, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null && typeof (json as Record<string, unknown>).error === "string") return (json as Record<string, string>).error
  return fallback
}

interface FeedToken { id: string; scope: string | null; status: string; audienceClass: string | null; createdBy: string | null; createdAt: string; expiresAt: string | null; lastUsedAt: string | null; revokedAt: string | null; revokeReason: string | null }
interface FeedsResponse { tokens: FeedToken[]; active: number; expired: number; unavailable?: boolean; unavailableReason?: string; freshAt: string }

/**
 * w17-calendar-feeds
 * EXP-604 — Scoped token feeds with stable UID and revocation.
 */
export function CalendarFeedsPanel() {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [tokens, setTokens] = useState<FeedToken[]>([])
  const [active, setActive] = useState(0)
  const [expired, setExpired] = useState(0)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    try {
      const res = await fetch("/api/admin/exports/calendar-feeds")
      const json = (await res.json()) as FeedsResponse & { error?: string }
      if (!res.ok) { setErrorMsg(extractErrorMsg(json, "Failed")); setState("error"); return }
      if (json.unavailable) { setUnavailableReason(json.unavailableReason ?? "Not yet available"); setState("unavailable"); return }
      setTokens(json.tokens ?? [])
      setActive(json.active ?? 0)
      setExpired(json.expired ?? 0)
      setFreshAt(json.freshAt)
      setState("ready")
    } catch { setErrorMsg("Network error"); setState("error") }
  }, [])

  useEffect(() => { if (actingAccount !== undefined) void load() }, [actingAccount, load])

  if (state === "idle" || state === "loading") return <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm"><CardContent className="p-4"><div className="flex items-center gap-2 text-slate-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading calendar feeds…</div></CardContent></Card>
  if (state === "unavailable") return <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm"><CardContent className="p-4"><p className="text-sm text-slate-400">{unavailableReason}</p></CardContent></Card>
  if (state === "error") return <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm"><CardContent className="p-4"><p className="text-sm text-red-400">{errorMsg}</p><Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}><RefreshCw className="h-3 w-3 mr-1" />Retry</Button></CardContent></Card>

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Calendar Feed Tokens</CardTitle>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px] px-1.5">{active} active</Badge>
            {expired > 0 && <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px] px-1.5">{expired} expired</Badge>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()}><RefreshCw className="h-3 w-3" /></Button>
        </div>
        {freshAt && <p className="text-[10px] text-slate-500 mt-0.5">Fresh at {new Date(freshAt).toLocaleTimeString()}</p>}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {tokens.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No calendar feed tokens.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {tokens.map((token) => (
              <div key={token.id} className={`flex items-center gap-3 px-3 py-2 rounded-sm border ${token.revokedAt ? "border-red-500/20 bg-red-500/5" : "border-slate-700/30 bg-slate-800/20"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200 truncate">{token.scope ?? "All events"}</p>
                  {token.audienceClass && <p className="text-[10px] text-slate-500 capitalize">{token.audienceClass}</p>}
                  <p className="text-[10px] text-slate-500">{new Date(token.createdAt).toLocaleDateString()}{token.lastUsedAt ? ` · last used ${new Date(token.lastUsedAt).toLocaleDateString()}` : ""}</p>
                  {token.revokeReason && <p className="text-[10px] text-red-400">Revoked: {token.revokeReason}</p>}
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${token.revokedAt ? "bg-red-500/20 text-red-300 border-red-500/30" : token.status === "active" ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-slate-700/60 text-slate-400 border-slate-600/40"}`}>
                  {token.revokedAt ? "revoked" : token.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
