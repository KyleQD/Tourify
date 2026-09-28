"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Key, RefreshCw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"
import { toast } from "sonner"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
    if (typeof j.message === "string") return j.message
  }
  return fallback
}

interface EntityGrant {
  id: string
  granteeType: string
  granteeUserId: string | null
  granteeEmail: string | null
  resourceType: string
  resourceId: string
  capabilities: string[]
  expiresAt: string | null
  status: string
  reason: string | null
  createdAt: string | null
}

interface GrantsResponse {
  grants: EntityGrant[]
  unavailable?: boolean
  unavailableReason?: string
}

export function EntityGrantsPanel() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<GrantsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/entity-grants", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders, "Cache-Control": "no-cache" },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(extractErrorMsg(json, "Unable to load entity grants"))
        setData(null)
        return
      }
      const grants = Array.isArray(json.grants)
        ? json.grants.map((g: Record<string, unknown>) => ({
            id: String(g.id),
            granteeType: String(g.grantee_type ?? g.granteeType ?? "user"),
            granteeUserId: g.grantee_user_id ? String(g.grantee_user_id) : null,
            granteeEmail: g.grantee_email ? String(g.grantee_email) : null,
            resourceType: String(g.resource_type ?? g.resourceType ?? ""),
            resourceId: String(g.resource_id ?? g.resourceId ?? ""),
            capabilities: Array.isArray(g.capabilities) ? (g.capabilities as string[]) : [],
            expiresAt: g.expires_at ? String(g.expires_at) : null,
            status: String(g.status ?? "active"),
            reason: g.reason ? String(g.reason) : null,
            createdAt: g.created_at ? String(g.created_at) : null,
          }))
        : []
      setData({ grants })
    } catch {
      setError("Unable to load entity grants")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  const handleRevoke = useCallback(
    async (grantId: string) => {
      setRevoking(grantId)
      try {
        const res = await fetch("/api/admin/entity-grants", {
          method: "DELETE",
          credentials: "include",
          headers: { ...actingHeaders, "Content-Type": "application/json", "Cache-Control": "no-cache" },
          body: JSON.stringify({ id: grantId }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(extractErrorMsg(json, "Failed to revoke grant"))
          return
        }
        toast.success("Grant revoked")
        void load()
      } catch {
        toast.error("Failed to revoke grant")
      } finally {
        setRevoking(null)
      }
    },
    [actingHeaders, load],
  )

  if (data?.unavailable) {
    return (
      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm border-dashed">
        <CardContent className="pt-6 text-sm text-slate-400">
          {data.unavailableReason ?? "Entity grants not yet available."}
        </CardContent>
      </Card>
    )
  }

  const grants = data?.grants ?? []

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-400" />
            Entity Grants
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            SEC-204 · Active scoped grants · {grants.length} item{grants.length !== 1 ? "s" : ""}
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

        {!error && data && grants.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No active entity grants.</p>
        ) : null}

        {grants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="py-2 pr-3 text-left font-medium">Resource</th>
                  <th className="py-2 pr-3 text-left font-medium hidden md:table-cell">Grantee</th>
                  <th className="py-2 pr-3 text-left font-medium hidden lg:table-cell">Capabilities</th>
                  <th className="py-2 pr-3 text-left font-medium hidden md:table-cell">Expires</th>
                  <th className="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {grants.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 pr-3">
                      <span className="text-slate-300 text-xs font-medium">{g.resourceType}</span>
                      <span className="text-slate-600 text-xs ml-1 font-mono">{g.resourceId.slice(0, 8)}…</span>
                    </td>
                    <td className="py-2 pr-3 hidden md:table-cell text-slate-400 text-xs">
                      {g.granteeEmail ?? (g.granteeUserId ? `user:${g.granteeUserId.slice(0, 8)}…` : g.granteeType)}
                    </td>
                    <td className="py-2 pr-3 hidden lg:table-cell text-slate-500 text-xs">
                      {g.capabilities.slice(0, 3).join(", ")}{g.capabilities.length > 3 ? ` +${g.capabilities.length - 3}` : ""}
                    </td>
                    <td className="py-2 pr-3 hidden md:table-cell text-slate-500 text-xs">
                      {g.expiresAt ? new Date(g.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs"
                        onClick={() => void handleRevoke(g.id)}
                        disabled={revoking === g.id}
                        aria-label={`Revoke grant ${g.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {revoking === g.id ? "Revoking…" : "Revoke"}
                      </Button>
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
